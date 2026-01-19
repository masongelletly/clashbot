import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type * as CRTypes from "../../../shared/types/cr-api-types";
import { crFetch } from "../crFetch.js";
import { encodeTag, sleep } from "../utils/utils.js";

type BattleLogEntry = {
  arenaId?: number;
  arena?: { id?: number };
  team?: Array<{
    crowns?: number;
    cards?: Array<{
      id?: number;
      name?: string;
      level?: number;
      maxLevel?: number;
      rarity?: string;
    }>;
  }>;
  opponent?: Array<{
    crowns?: number;
    cards?: Array<{
      id?: number;
      name?: string;
      level?: number;
      maxLevel?: number;
      rarity?: string;
    }>;
  }>;
};

type ArenaAccumulator = {
  totalLevel: number;
  cardCount: number;
  battleCount: number;
  clanTags: Set<string>;
  playerTags: Set<string>;
};

type DiscoveredClan = {
  tag: string;
  name?: string;
};

type ArenaAverageLevelEntry = {
  arenaId: number;
  averageCardLevel: number;
  sampleSize: number;
  battleCount: number;
  clanCount: number;
  playerCount: number;
  lastUpdated: string;
};

type MergedAccumulator = {
  totalLevel: number;
  cardCount: number;
  battleCount: number;
  clanCount: number;
  playerCount: number;
};

type CardWinRateEntry = {
  cardId: number | null;
  name: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  lastUpdated: string;
};

type CardStatsAccumulator = {
  cardId: number | null;
  name: string;
  wins: number;
  losses: number;
};

const CLAN_DISCOVERY_QUERIES: string[] = [
  "winning",
  "losing",
  "body",
  "coffee",
  "jynx",
  "large",
  "bien",
  "spanish",
  "peanuts",
  "major",
  "general",
  "bean"
];
const COMMON_MAX_LEVEL = 16;
const MAX_CLANS = Number(process.env.ARENA_CLAN_LIMIT ?? 100);
const MAX_MEMBERS_PER_CLAN = Number(process.env.ARENA_MEMBER_LIMIT ?? 50);
const MAX_BATTLES_PER_PLAYER = Number(process.env.ARENA_BATTLE_LIMIT ?? 10);
const BATTLE_DELAY_MS = Number(process.env.ARENA_BATTLE_DELAY_MS ?? 150);
const CLAN_SEARCH_DELAY_MS = Number(process.env.ARENA_SEARCH_DELAY_MS ?? 120);
const CLAN_DISCOVERY_LIMIT = Number(process.env.ARENA_DISCOVERY_LIMIT ?? 10);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.resolve(
  __dirname,
  "../../../frontend/src/config/arenaAverageLevels.ts"
);
const CARD_CONFIG_PATH = path.resolve(
  __dirname,
  "../../../frontend/src/config/cardWinRates.ts"
);

async function fetchClanMembers(clanTag: string) {
  return crFetch<CRTypes.ClanMembersResponse>(
    `/clans/${encodeTag(clanTag)}/members`
  );
}

async function discoverClanTags(queries: string[]) {
  const discovered: DiscoveredClan[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const search = await crFetch<CRTypes.ClanSearchResponse>(
      `/clans?name=${encodeURIComponent(query)}&limit=${CLAN_DISCOVERY_LIMIT}`
    );
    for (const clan of search.items ?? []) {
      if (seen.has(clan.tag)) {
        continue;
      }
      seen.add(clan.tag);
      discovered.push({ tag: clan.tag, name: clan.name });
    }
    await sleep(CLAN_SEARCH_DELAY_MS);
  }

  return discovered;
}

async function fetchBattleLog(playerTag: string) {
  return crFetch<BattleLogEntry[]>(
    `/players/${encodeTag(playerTag)}/battlelog`
  );
}

function getArenaId(battle: BattleLogEntry) {
  return battle.arena?.id ?? battle.arenaId ?? null;
}

function normalizeLevel(card: { level?: number; maxLevel?: number; rarity?: string }) {
  if (typeof card.level !== "number") {
    return null;
  }
  if (typeof card.maxLevel === "number") {
    return card.level + Math.max(0, COMMON_MAX_LEVEL - card.maxLevel);
  }
  const rarity = card.rarity?.toLowerCase();
  const rarityOffsets: Record<string, number> = {
    common: 0,
    rare: 2,
    epic: 5,
    legendary: 8,
    champion: 10,
  };
  return card.level + (rarityOffsets[rarity ?? ""] ?? 0);
}

function getBattleCards(battle: BattleLogEntry) {
  const teamCards = battle.team?.[0]?.cards ?? [];
  const opponentCards = battle.opponent?.[0]?.cards ?? [];
  return [...teamCards, ...opponentCards].filter(
    (card) => typeof card.level === "number"
  ) as Array<{ level: number; maxLevel?: number; rarity?: string }>;
}

function getBattleOutcome(battle: BattleLogEntry) {
  const teamCrowns = battle.team?.[0]?.crowns;
  const opponentCrowns = battle.opponent?.[0]?.crowns;
  if (typeof teamCrowns !== "number" || typeof opponentCrowns !== "number") {
    return null;
  }
  if (teamCrowns === opponentCrowns) {
    return null;
  }
  return teamCrowns > opponentCrowns ? "team" : "opponent";
}

function recordCardStats(
  stats: Map<string, CardStatsAccumulator>,
  cards: Array<{ id?: number; name?: string }>,
  didWin: boolean
) {
  for (const card of cards) {
    const key =
      typeof card.id === "number"
        ? String(card.id)
        : card.name
          ? `name:${card.name.toLowerCase()}`
          : null;
    if (!key) {
      continue;
    }
    const existing = stats.get(key) ?? {
      cardId: typeof card.id === "number" ? card.id : null,
      name: card.name ?? "Unknown",
      wins: 0,
      losses: 0,
    };
    if (didWin) {
      existing.wins += 1;
    } else {
      existing.losses += 1;
    }
    stats.set(key, existing);
  }
}

function ensureArena(acc: Map<number, ArenaAccumulator>, arenaId: number) {
  const existing = acc.get(arenaId);
  if (existing) {
    return existing;
  }
  const next: ArenaAccumulator = {
    totalLevel: 0,
    cardCount: 0,
    battleCount: 0,
    clanTags: new Set(),
    playerTags: new Set(),
  };
  acc.set(arenaId, next);
  return next;
}

async function buildArenaAverages() {
  const arenaAccumulators = new Map<number, ArenaAccumulator>();
  const cardStats = new Map<string, CardStatsAccumulator>();
  const searchTerms = [
    ...CLAN_DISCOVERY_QUERIES,
  ].filter(Boolean);
  const discovered = searchTerms.length
    ? await discoverClanTags(searchTerms)
    : [];
  const clansToSample = Array.from(
    new Map(
      [...discovered].map((clan) => [clan.tag, clan])
    ).values()
  ).slice(0, MAX_CLANS);

  for (const clan of clansToSample) {
    console.log(`Evaluating clan: ${clan.name ?? clan.tag}`);
    const members = await fetchClanMembers(clan.tag);
    for (const member of (members.items ?? []).slice(0, MAX_MEMBERS_PER_CLAN)) {
      const battles = await fetchBattleLog(member.tag);
      for (const battle of (battles ?? []).slice(0, MAX_BATTLES_PER_PLAYER)) {
        const arenaId = getArenaId(battle);
        if (!arenaId) {
          continue;
        }
        const cards = getBattleCards(battle);
        const normalizedLevels = cards
          .map((card) => normalizeLevel(card))
          .filter((level): level is number => typeof level === "number");
        if (normalizedLevels.length === 0) {
          continue;
        }

        const arenaStats = ensureArena(arenaAccumulators, arenaId);
        arenaStats.totalLevel += normalizedLevels.reduce((sum, level) => sum + level, 0);
        arenaStats.cardCount += normalizedLevels.length;
        arenaStats.battleCount += 1;
        arenaStats.clanTags.add(clan.tag);
        arenaStats.playerTags.add(member.tag);

        const outcome = getBattleOutcome(battle);
        if (outcome) {
          const teamCards = battle.team?.[0]?.cards ?? [];
          const opponentCards = battle.opponent?.[0]?.cards ?? [];
          recordCardStats(cardStats, teamCards, outcome === "team");
          recordCardStats(cardStats, opponentCards, outcome === "opponent");
        }
      }

      await sleep(BATTLE_DELAY_MS);
    }
  }

  return { arenaAccumulators, cardStats };
}

function renderConfig(
  arenas: Map<number, MergedAccumulator>,
  lastUpdated: string
) {
  const entries = Array.from(arenas.entries()).sort(
    ([a], [b]) => Number(a) - Number(b)
  );

  const lines = entries.map(([arenaId, stats]) => {
    const average = stats.cardCount
      ? Number((stats.totalLevel / stats.cardCount).toFixed(2))
      : 0;
    return `  ${arenaId}: {
    arenaId: ${arenaId},
    averageCardLevel: ${average},
    sampleSize: ${stats.cardCount},
    battleCount: ${stats.battleCount},
    clanCount: ${stats.clanCount},
    playerCount: ${stats.playerCount},
    lastUpdated: "${lastUpdated}",
  },`;
  });

  return `export type ArenaAverageLevelEntry = {
  arenaId: number;
  averageCardLevel: number;
  sampleSize: number;
  battleCount: number;
  clanCount: number;
  playerCount: number;
  lastUpdated: string;
};

export const arenaAverageLevels: Record<number, ArenaAverageLevelEntry> = {
${lines.join("\n")}
};
`;
}

function renderCardConfig(
  cardStats: Map<string, CardStatsAccumulator>,
  lastUpdated: string
) {
  const entries = Array.from(cardStats.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const lines = entries.map(([key, stats]) => {
    const totalGames = stats.wins + stats.losses;
    const winRate = totalGames
      ? Number(((stats.wins / totalGames) * 100).toFixed(2))
      : 0;
    return `  "${key}": {
    cardId: ${stats.cardId ?? "null"},
    name: "${stats.name.replace(/"/g, '\\"')}",
    wins: ${stats.wins},
    losses: ${stats.losses},
    totalGames: ${totalGames},
    winRate: ${winRate},
    lastUpdated: "${lastUpdated}",
  },`;
  });

  return `export type CardWinRateEntry = {
  cardId: number | null;
  name: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  lastUpdated: string;
};

export const cardWinRates: Record<string, CardWinRateEntry> = {
${lines.join("\n")}
};
`;
}

async function writeConfig(contents: string) {
  await fs.writeFile(CONFIG_PATH, contents, "utf-8");
}

async function writeCardConfig(contents: string) {
  await fs.writeFile(CARD_CONFIG_PATH, contents, "utf-8");
}

async function loadExistingConfig() {
  try {
    await fs.access(CONFIG_PATH);
  } catch {
    return {} as Record<number, ArenaAverageLevelEntry>;
  }

  const configModule = await import(pathToFileURL(CONFIG_PATH).href);
  return (configModule.arenaAverageLevels ?? {}) as Record<
    number,
    ArenaAverageLevelEntry
  >;
}

async function loadExistingCardConfig() {
  try {
    await fs.access(CARD_CONFIG_PATH);
  } catch {
    return {} as Record<string, CardWinRateEntry>;
  }

  const configModule = await import(pathToFileURL(CARD_CONFIG_PATH).href);
  return (configModule.cardWinRates ?? {}) as Record<string, CardWinRateEntry>;
}

function mergeArenaStats(
  existing: Record<number, ArenaAverageLevelEntry>,
  latest: Map<number, ArenaAccumulator>
) {
  const merged = new Map<number, MergedAccumulator>();

  for (const [arenaKey, entry] of Object.entries(existing)) {
    const arenaId = Number(arenaKey);
    if (!Number.isFinite(arenaId)) {
      continue;
    }
    merged.set(arenaId, {
      totalLevel: entry.averageCardLevel * entry.sampleSize,
      cardCount: entry.sampleSize,
      battleCount: entry.battleCount,
      clanCount: entry.clanCount,
      playerCount: entry.playerCount,
    });
  }

  for (const [arenaId, stats] of latest.entries()) {
    const current =
      merged.get(arenaId) ?? {
        totalLevel: 0,
        cardCount: 0,
        battleCount: 0,
        clanCount: 0,
        playerCount: 0,
      };
    current.totalLevel += stats.totalLevel;
    current.cardCount += stats.cardCount;
    current.battleCount += stats.battleCount;
    current.clanCount += stats.clanTags.size;
    current.playerCount += stats.playerTags.size;
    merged.set(arenaId, current);
  }

  return merged;
}

function mergeCardStats(
  existing: Record<string, CardWinRateEntry>,
  latest: Map<string, CardStatsAccumulator>
) {
  const merged = new Map<string, CardStatsAccumulator>();

  for (const [key, entry] of Object.entries(existing)) {
    merged.set(key, {
      cardId: entry.cardId ?? null,
      name: entry.name,
      wins: entry.wins,
      losses: entry.losses,
    });
  }

  for (const [key, stats] of latest.entries()) {
    const current =
      merged.get(key) ?? {
        cardId: stats.cardId,
        name: stats.name,
        wins: 0,
        losses: 0,
      };
    current.wins += stats.wins;
    current.losses += stats.losses;
    merged.set(key, current);
  }

  return merged;
}

async function main() {
  if (CLAN_DISCOVERY_QUERIES.length === 0) {
    throw new Error(
      "Add at least one clan tag or search term before running."
    );
  }

  const existingConfig = await loadExistingConfig();
  const existingCardConfig = await loadExistingCardConfig();
  const { arenaAccumulators, cardStats } = await buildArenaAverages();
  const mergedStats = mergeArenaStats(existingConfig, arenaAccumulators);
  const mergedCardStats = mergeCardStats(existingCardConfig, cardStats);
  const lastUpdated = new Date().toISOString();
  await writeConfig(renderConfig(mergedStats, lastUpdated));
  await writeCardConfig(renderCardConfig(mergedCardStats, lastUpdated));
}

void main();
