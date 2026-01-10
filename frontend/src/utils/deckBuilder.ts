import type * as CRTypes from "../../../shared/types/cr-api-types";
import { arenaAverageLevels } from "../config/arenaAverageLevels";
import { cardWinRates } from "../config/cardWinRates";

export type PlayerCard = CRTypes.PlayerProfileResponse["cards"][number];

const COMMON_MAX_LEVEL = 16;
const RARITY_OFFSETS: Record<string, number> = {
  common: 0,
  rare: 2,
  epic: 5,
  legendary: 8,
  champion: 10,
};

export type BuildDeckInput = {
  cards: PlayerCard[];
  trophies: number;
  arenaId: number;
};

export type BuildDeckResult = {
  deck: Array<PlayerCard | null>;
  averageElixir: number;
};

const LEVEL_AGNOSTIC_CARDS = new Set(["freeze", "rage", "vines", "skeletons", "skeleton army"]);
  const TARGET_AVERAGE_ELIXIR = 3.6;
  const ELIXIR_WEIGHT = 1;
  const LEVEL_WEIGHT = 2;

// win conditions
const WIN_CON_OFFENSE = new Set(["boss bandit", "mega knight", "goblin giant", "balloon", "battering ram", "giant", "royal giant", "ram rider", "three musketeers"])
const WIN_CON_DEFENSE = new Set(["mortar", "hogrider", "royal hogs", "goblin drill", "xbow", "rocket"])
const WIN_CON_SECONDARY = new Set(["goblin barrel", "wall breakers", "skeleton barrel", "suspicious bush", "princess", "royal ghost", "bandit", "prince", "dark prince", "firecracker", "dart goblin", "goblin gang"])
const WIN_CON_BEATDOWN = new Set(["elixir golem", "golem", "lava hound", "electro giant"])

// support cards 
// - cards that primarily support pushes 
const SUPPORT = new Set(["baby dragon", "skeleton dragons", "night witch", "lumberjack", "witch", "furnace", "electro dragon", "mini pekka", "battle healer", "goblin demolisher", "prince", "wizard", "executioner", "sparky"])

// damage dealing
// - cards to take down big threats
const GROUND_DAMAGE = new Set(["little prince", "bats", "cannon", "inferno tower", "musketeer", "archers", "skeleton army", "goblin gang", "dart goblin", "mini pekka", "prince", "dark prince", "hunter", "furnace", "minion horde", "rascals", "archer queen", "boss bandit", "spirit empress", "flying machine"])
const AIR_DAMAGE = new Set(["little prince", "bats", "musketeer", "inferno tower", "archers", "dart goblin", "hunter", "furnace", "minion horde", "archer queen", "flying machine"])

// structures
// - buildings
const STRUCTURES = new Set(["cannon", "goblin hut", "bomb tower", "tesla", "inferno tower", "barbarian hut"])

// cycle cards
// - low elixir
const CYCLE = new Set(["skeletons", "ice spirit", "fire spirit", "heal spirit", "electro spirit", "spear goblins", "goblins", "bats"])

// mini tank
// - everyday life good cards for defense that are generally low elixer
const MINI_TANK = new Set(["fisherman", "berserker", "ice golem", "knight", "valkyrie", "miner", "royal ghost", "dark prince", "golden knight", "skeleton king", "mighty miner"])

// mini spells
const MINI_SPELLS = new Set(["the log", "giant snowball", "zap", "royal delivery", "barbarian barrel", "rage", "goblin curse", "vines", "earthquake"])

// big spells
const BIG_SPELLS = new Set(["freeze", "fireball", "poison", "rocket", "lightning", "arrows"])

// pure defense
const DEFENSE = new Set(["ice wizard", "guards", "cannon cart", "fisherman", "little prince", "zappies"])

// tanks
const TANKS = new Set(["giant", "goblin giant", "electro giant", "golem", "elixer golem", "royal giant"])


export function normalizeCardLevel(card: PlayerCard): number {
  const maxLevelOffset =
    typeof card.maxLevel === "number"
      ? Math.max(0, COMMON_MAX_LEVEL - card.maxLevel)
      : null;
  if (maxLevelOffset !== null) {
    return card.level + maxLevelOffset;
  }

  const rarity = (card as { rarity?: string }).rarity?.toLowerCase();
  const rarityOffset = RARITY_OFFSETS[rarity ?? ""] ?? 0;
  return card.level + rarityOffset;
}

function getElixirCost(card: PlayerCard): number {
  return typeof card.elixirCost === "number" ? card.elixirCost : 0;
}

function calculateAverageElixir(cards: Array<PlayerCard | null>): number {
  const filled = cards.filter((card): card is PlayerCard => Boolean(card));
  if (filled.length === 0) {
    return 0;
  }
  const total = filled.reduce((sum, card) => sum + getElixirCost(card), 0);
  return Number((total / filled.length).toFixed(1));
}

const getCardWinRate = (card: PlayerCard): number => {
  const idEntry = cardWinRates[String(card.id)];
  if (idEntry && Number.isFinite(idEntry.winRate)) {
    return idEntry.winRate;
  }
  const nameEntry = cardWinRates[`name:${card.name.toLowerCase()}`];
  if (nameEntry && Number.isFinite(nameEntry.winRate)) {
    return nameEntry.winRate;
  }
  return 0;
};


export function buildOptimalDeck({
  cards,
  trophies,
  arenaId,
}: BuildDeckInput): BuildDeckResult {

  void trophies;
  const arenaStats = arenaAverageLevels[arenaId];
  const targetLevel = Math.round(arenaStats?.averageCardLevel ?? 16);
  const minLevel = targetLevel - 1; // one level under rounded average allowed
  const agnosticMinLevel = targetLevel - 2;
  const levelReadyCards = cards.filter((card) => {
    const normalizedLevel = normalizeCardLevel(card);
    if (LEVEL_AGNOSTIC_CARDS.has(card.name.toLowerCase())) {
      return normalizedLevel >= agnosticMinLevel;
    }
    return normalizedLevel >= minLevel;
  });
  const normalizedCards = levelReadyCards.map((card, index) => {
    const typedCard = card as PlayerCard & {
      evolutionLevel?: number;
    };
    const evoLevel = typedCard.evolutionLevel;
    const hasEvolution = evoLevel === 1 || evoLevel === 3;
    const hasHero = evoLevel === 2 || evoLevel === 3;

    return {
      card,
      name: card.name.toLowerCase(),
      level: normalizeCardLevel(card),
      index,
      hasEvolution,
      hasHero,
    };
  });
  const selectedWinCons: PlayerCard[] = [];
  const selectedIds = new Set<number>();
  const addSelectedCard = (card: PlayerCard | undefined) => {
    if (!card || selectedIds.has(card.id)) {
      return false;
    }
    selectedWinCons.push(card);
    selectedIds.add(card.id);
    return true;
  };

  const primaryPriority = [
    WIN_CON_DEFENSE,
    WIN_CON_BEATDOWN,
    WIN_CON_OFFENSE,
  ];
  const primaryCandidates = normalizedCards.filter((entry) =>
    primaryPriority.some((set) => set.has(entry.name))
  );
  const maxPrimaryLevel = primaryCandidates.reduce(
    (max, entry) => Math.max(max, entry.level),
    -Infinity
  );
  if (Number.isFinite(maxPrimaryLevel)) {
    for (const winConSet of primaryPriority) {
      const match = normalizedCards.find(
        (entry) => winConSet.has(entry.name) && entry.level === maxPrimaryLevel
      );
      if (match) {
        addSelectedCard(match.card);
        break;
      }
    }
  }
  if (selectedWinCons.length === 0) {
    const secondaryCandidates = normalizedCards
      .filter((entry) => WIN_CON_SECONDARY.has(entry.name))
      .sort((a, b) => {
        if (b.level !== a.level) {
          return b.level - a.level;
        }
        const winRateDiff = getCardWinRate(b.card) - getCardWinRate(a.card);
        if (winRateDiff !== 0) {
          return winRateDiff;
        }
        return a.index - b.index;
      });
    let secondaryCount = 0;
    for (const entry of secondaryCandidates) {
      if (addSelectedCard(entry.card)) {
        secondaryCount += 1;
      }
      if (secondaryCount === 2) {
        break;
      }
    }
  }
  const pickBest = (entries: typeof normalizedCards) =>
    [...entries].sort((a, b) => {
      if (b.level !== a.level) {
        return b.level - a.level;
      }
      const winRateDiff = getCardWinRate(b.card) - getCardWinRate(a.card);
      if (winRateDiff !== 0) {
        return winRateDiff;
      }
      return a.index - b.index;
    })[0];

  let hasHeroSlot = normalizedCards.some(
    (entry) => selectedIds.has(entry.card.id) && entry.hasHero
  );
  let hasEvolutionSlot = normalizedCards.some(
    (entry) => selectedIds.has(entry.card.id) && entry.hasEvolution
  );

  if (!hasHeroSlot) {
    const heroCandidate = pickBest(
      normalizedCards.filter(
        (entry) => entry.hasHero && !selectedIds.has(entry.card.id)
      )
    );
    if (heroCandidate) {
      addSelectedCard(heroCandidate.card);
      hasHeroSlot = true;
    }
  }

  if (!hasEvolutionSlot) {
    const evoCandidate = pickBest(
      normalizedCards.filter(
        (entry) => entry.hasEvolution && !selectedIds.has(entry.card.id)
      )
    );
    if (evoCandidate && addSelectedCard(evoCandidate.card)) {
      hasEvolutionSlot = true;
    }
  }

  const deckPool = levelReadyCards.filter((card) => !selectedIds.has(card.id));
  const championWinCons = selectedWinCons.filter(
    (card) => card.rarity?.toLowerCase() === "champion"
  );
  const slots: Array<PlayerCard | null> = Array.from({ length: 8 }, () => null);

  const sortByLevel = (
    a: (typeof normalizedCards)[number],
    b: (typeof normalizedCards)[number]
  ) => {
    if (b.level !== a.level) {
      return b.level - a.level;
    }
    const winRateDiff = getCardWinRate(b.card) - getCardWinRate(a.card);
    if (winRateDiff !== 0) {
      return winRateDiff;
    }
    return a.index - b.index;
  };

  let championIndex = 0;
  for (const slotIndex of [2, 3]) {
    if (championWinCons[championIndex]) {
      slots[slotIndex] = championWinCons[championIndex];
      championIndex += 1;
    }
  }

  const placedIds = new Set(
    slots.filter((card): card is PlayerCard => Boolean(card)).map((card) => card.id)
  );

  const heroCandidates = normalizedCards
    .filter((entry) => entry.hasHero)
    .sort(sortByLevel);

  for (const slotIndex of [2, 3]) {
    if (slots[slotIndex]) {
      continue;
    }
    for (const entry of heroCandidates) {
      console.log(
        `[DeckBuilder] hero slot ${slotIndex} evaluating ${entry.card.name} (lvl ${entry.level})`
      );
      if (placedIds.has(entry.card.id)) {
        continue;
      }
      slots[slotIndex] = entry.card;
      placedIds.add(entry.card.id);
      break;
    }
  }

  const evoCandidates = normalizedCards
    .filter((entry) => entry.hasEvolution)
    .sort(sortByLevel);
  console.log(
    "[DeckBuilder] evolution candidates",
    evoCandidates.map((entry) => ({
      name: entry.card.name,
      level: entry.level,
      evolutionLevel: (entry.card as { evolutionLevel?: number }).evolutionLevel,
    }))
  );

  for (const slotIndex of [0, 1]) {
    if (slots[slotIndex]) {
      continue;
    }
    for (const entry of evoCandidates) {
      console.log(
        `[DeckBuilder] evolution slot ${slotIndex} evaluating ${entry.card.name} (lvl ${entry.level})`
      );
      if (placedIds.has(entry.card.id)) {
        continue;
      }
      slots[slotIndex] = entry.card;
      placedIds.add(entry.card.id);
      break;
    }
  }

  console.log("[DeckBuilder] special slots filled", {
    evoSlotsFilled: [0, 1].filter((slot) => Boolean(slots[slot])).length,
    heroSlotsFilled: [2, 3].filter((slot) => Boolean(slots[slot])).length,
  });

  const missingSpecialSlots = [0, 1, 2, 3].some((slot) => !slots[slot]);
  const baseSlots = missingSpecialSlots
    ? Array.from({ length: 8 }, (_, index) => index)
    : [4, 5, 6, 7];
  const nextBaseSlot = () => baseSlots.find((slot) => !slots[slot]) ?? null;
  const placeInBaseSlot = (card: PlayerCard, debugLabel?: string) => {
    const slotIndex = nextBaseSlot();
    if (slotIndex === null || placedIds.has(card.id)) {
      if (debugLabel) {
        console.log(`[DeckBuilder] ${debugLabel} placeInBaseSlot skipped`, {
          card: card.name,
          hasSlot: slotIndex !== null,
          alreadyPlaced: placedIds.has(card.id),
          openBaseSlots: baseSlots.filter((slot) => !slots[slot]),
        });
      }
      return false;
    }
    slots[slotIndex] = card;
    placedIds.add(card.id);
    return true;
  };

  const countInGroup = (group: Set<string>) =>
    slots.filter(
      (card) => card && group.has(card.name.toLowerCase())
    ).length;

  const entryById = new Map(
    normalizedCards.map((entry) => [entry.card.id, entry])
  );

  const elixirState = () => {
    const filled = slots.filter((card): card is PlayerCard => Boolean(card));
    const total = filled.reduce((sum, card) => sum + getElixirCost(card), 0);
    return { total, count: filled.length };
  };
  const elixirScore = (card: PlayerCard) => {
    const { total, count } = elixirState();
    const nextAvg = (total + getElixirCost(card)) / Math.max(1, count + 1);
    return Math.abs(nextAvg - TARGET_AVERAGE_ELIXIR);
  };
  const combinedScore = (card: PlayerCard, level: number) =>
    LEVEL_WEIGHT * level - ELIXIR_WEIGHT * elixirScore(card);
  const pickCandidate = (group: Set<string>) => {
    const candidates = normalizedCards.filter(
      (entry) => group.has(entry.name) && !placedIds.has(entry.card.id)
    );
    return candidates.reduce<typeof normalizedCards[number] | null>(
      (best, entry) => {
        if (!best) {
          return entry;
        }
        const score = combinedScore(entry.card, entry.level);
        const bestScore = combinedScore(best.card, best.level);
        if (score !== bestScore) {
          return score > bestScore ? entry : best;
        }
        if (entry.level !== best.level) {
          return entry.level > best.level ? entry : best;
        }
        const winRateDiff = getCardWinRate(entry.card) - getCardWinRate(best.card);
        if (winRateDiff !== 0) {
          return winRateDiff > 0 ? entry : best;
        }
        return entry.index < best.index ? entry : best;
      },
      null
    );
  };

  const remainingWinCons = selectedWinCons.filter(
    (card) => !placedIds.has(card.id)
  );
  for (const card of remainingWinCons) {
    placeInBaseSlot(card);
  }

  const ensureGroup = (group: Set<string>) => {
    const existingCount = countInGroup(group);
    if (existingCount > 0) {
      return;
    }
    const candidate = pickCandidate(group);
    console.log("[DeckBuilder] ensureGroup", {
      groupSize: group.size,
      existingCount,
      candidate: candidate?.card.name ?? null,
    });
    if (candidate) {
      placeInBaseSlot(candidate.card);
    }
  };

  ensureGroup(BIG_SPELLS);
  ensureGroup(MINI_SPELLS);
  ensureGroup(GROUND_DAMAGE);
  ensureGroup(AIR_DAMAGE);

  const winConType = (() => {
    const names = selectedWinCons.map((card) => card.name.toLowerCase());
    if (names.some((name) => WIN_CON_DEFENSE.has(name))) {
      return "defense";
    }
    if (names.some((name) => WIN_CON_BEATDOWN.has(name))) {
      return "beatdown";
    }
    if (names.some((name) => WIN_CON_OFFENSE.has(name))) {
      return "offense";
    }
    if (names.some((name) => WIN_CON_SECONDARY.has(name))) {
      return "secondary";
    }
    return "unknown";
  })();

  const ensureCount = (group: Set<string>, desired: number) => {
    let count = countInGroup(group);
    if (group === STRUCTURES) {
      console.log("[DeckBuilder] ensureCount STRUCTURES start", {
        desired,
        existingCount: count,
        openBaseSlots: baseSlots.filter((slot) => !slots[slot]),
        currentStructureCards: slots
          .filter((card): card is PlayerCard => Boolean(card))
          .filter((card) => STRUCTURES.has(card.name.toLowerCase()))
          .map((card) => card.name),
      });
    }
    while (count < desired) {
      const candidate = pickCandidate(group);
      if (group === STRUCTURES) {
        console.log("[DeckBuilder] STRUCTURES candidate", {
          candidate: candidate?.card.name ?? null,
          level: candidate?.level ?? null,
        });
      }
      if (!candidate) {
        break;
      }
      if (!placeInBaseSlot(candidate.card, "STRUCTURES")) {
        break;
      }
      count += 1;
    }
    if (group === STRUCTURES) {
      console.log("[DeckBuilder] ensureCount STRUCTURES end", {
        finalCount: countInGroup(group),
        finalStructureCards: slots
          .filter((card): card is PlayerCard => Boolean(card))
          .filter((card) => STRUCTURES.has(card.name.toLowerCase()))
          .map((card) => card.name),
      });
    }
  };

  const pickReplacementSlot = (preferredSlots: number[]) => {
    const allSlots = slots.map((_, index) => index);
    const slotCandidates = (slotList: number[]) =>
      slotList.filter((slot) => {
        const card = slots[slot];
        return (
          card &&
          !selectedIds.has(card.id) &&
          !STRUCTURES.has(card.name.toLowerCase())
        );
      });

    let candidates = slotCandidates(preferredSlots);
    if (candidates.length === 0) {
      candidates = slotCandidates(allSlots.filter((slot) => slot >= 4));
    }
    if (candidates.length === 0) {
      candidates = slotCandidates(allSlots);
    }
    if (candidates.length === 0) {
      return null;
    }

    return candidates.reduce((bestSlot, slot) => {
      const bestCard = slots[bestSlot] as PlayerCard;
      const candidateCard = slots[slot] as PlayerCard;
      const bestEntry = entryById.get(bestCard.id);
      const candidateEntry = entryById.get(candidateCard.id);
      const bestScore = bestEntry
        ? combinedScore(bestEntry.card, bestEntry.level)
        : combinedScore(bestCard, normalizeCardLevel(bestCard));
      const candidateScore = candidateEntry
        ? combinedScore(candidateEntry.card, candidateEntry.level)
        : combinedScore(candidateCard, normalizeCardLevel(candidateCard));
      return candidateScore < bestScore ? slot : bestSlot;
    }, candidates[0]);
  };

  const forceInsertGroup = (group: Set<string>, label: string) => {
    if (countInGroup(group) > 0) {
      return;
    }
    const candidate = pickCandidate(group);
    if (!candidate) {
      return;
    }
    const preferred = baseSlots.filter((slot) => slot >= 4);
    const replaceSlot = pickReplacementSlot(preferred);
    if (replaceSlot === null) {
      return;
    }
    const replaced = slots[replaceSlot];
    console.log(`[DeckBuilder] forceInsert ${label}`, {
      replaceSlot,
      replaced: replaced?.name ?? null,
      incoming: candidate.card.name,
    });
    if (replaced) {
      placedIds.delete(replaced.id);
    }
    slots[replaceSlot] = candidate.card;
    placedIds.add(candidate.card.id);
  };

  if (winConType === "defense" || winConType === "secondary") {
    console.log("[DeckBuilder] winConType constraints", winConType);
    ensureCount(MINI_TANK, 1);
    ensureCount(CYCLE, 2);
    ensureCount(STRUCTURES, 1);
    forceInsertGroup(STRUCTURES, "STRUCTURES");
  } else if (winConType === "offense") {
    console.log("[DeckBuilder] winConType constraints", winConType);
    ensureCount(MINI_TANK, 1);
    ensureCount(CYCLE, 1);
    ensureCount(STRUCTURES, 1);
    forceInsertGroup(STRUCTURES, "STRUCTURES");
  } else if (winConType === "beatdown") {
    console.log("[DeckBuilder] winConType constraints", winConType);
    ensureCount(SUPPORT, 2);
  }

  let remainingCandidates = normalizedCards.filter(
    (entry) => !placedIds.has(entry.card.id)
  );
  while (nextBaseSlot() !== null && remainingCandidates.length > 0) {
    const bestCandidate = remainingCandidates.reduce<
      typeof normalizedCards[number] | null
    >((best, entry) => {
      if (!best) {
        return entry;
      }
      const score = combinedScore(entry.card, entry.level);
      const bestScore = combinedScore(best.card, best.level);
      if (score !== bestScore) {
        return score > bestScore ? entry : best;
      }
      if (entry.level !== best.level) {
        return entry.level > best.level ? entry : best;
      }
      const winRateDiff = getCardWinRate(entry.card) - getCardWinRate(best.card);
      if (winRateDiff !== 0) {
        return winRateDiff > 0 ? entry : best;
      }
      return entry.index < best.index ? entry : best;
    }, null);
    if (!bestCandidate) {
      break;
    }
    if (placeInBaseSlot(bestCandidate.card)) {
      remainingCandidates = remainingCandidates.filter(
        (entry) => entry.card.id !== bestCandidate.card.id
      );
    } else {
      break;
    }
  }

  const isTank = (card: PlayerCard) => TANKS.has(card.name.toLowerCase());
  const tankSlots = slots
    .map((card, index) => (card && isTank(card) ? index : null))
    .filter((slot): slot is number => slot !== null);
  if (tankSlots.length > 1) {
    const getEntryLevel = (card: PlayerCard) => {
      const entry = entryById.get(card.id);
      return entry?.level ?? normalizeCardLevel(card);
    };
    const keepSlot = tankSlots.reduce((bestSlot, slot) => {
      const bestCard = slots[bestSlot] as PlayerCard;
      const candidateCard = slots[slot] as PlayerCard;
      const bestScore = combinedScore(bestCard, getEntryLevel(bestCard));
      const candidateScore = combinedScore(
        candidateCard,
        getEntryLevel(candidateCard)
      );
      if (candidateScore !== bestScore) {
        return candidateScore > bestScore ? slot : bestSlot;
      }
      return slot < bestSlot ? slot : bestSlot;
    }, tankSlots[0]);

    for (const slot of tankSlots) {
      if (slot === keepSlot) {
        continue;
      }
      const outgoing = slots[slot];
      if (outgoing) {
        placedIds.delete(outgoing.id);
      }
      const replacement = normalizedCards
        .filter(
          (entry) =>
            !placedIds.has(entry.card.id) && !TANKS.has(entry.name)
        )
        .sort((a, b) => {
          const scoreA = combinedScore(a.card, a.level);
          const scoreB = combinedScore(b.card, b.level);
          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          const winRateDiff = getCardWinRate(b.card) - getCardWinRate(a.card);
          if (winRateDiff !== 0) {
            return winRateDiff;
          }
          return a.index - b.index;
        })[0];

      if (replacement) {
        slots[slot] = replacement.card;
        placedIds.add(replacement.card.id);
      }
    }
  }

  return { deck: slots, averageElixir: calculateAverageElixir(slots) };
}
