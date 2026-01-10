import type * as CRTypes from "../../../shared/types/cr-api-types";
import { arenaAverageLevels } from "../config/arenaAverageLevels";

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
};

const LEVEL_AGNOSTIC_CARDS = new Set(["freeze", "rage", "vines"]);

// win conditions
const WIN_CON_OFFENSE = new Set(["boss bandit", "mega knight", "goblin giant", "balloon", "battering ram", "giant", "royal giant", "ram rider", "three musketeers"])
const WIN_CON_DEFENSE = new Set(["mortar", "hogrider", "royal hogs", "goblin drill", "xbow", "rocket"])
const WIN_CON_SECONDARY = new Set(["goblin barrel", "wall breakers", "skeleton barrel", "suspicious bush", "princess", "royal ghost", "bandit", "prince", "dark prince", "firecracker", "dart goblin", "goblin gang"])
const WIN_CON_BEATDOWN = new Set(["elixir golem", "golem", "lava hound", "electro giant"])

// support cards 
// - cards that primarily support pushes 
const SUPPORT = new Set(["skeleton dragons", "night witch", "lumberjack", "witch", "furnace", "electro dragon", "mini pekka", "battle healer", "goblin demolisher", "prince", "wizard", "executioner", "sparky"])

// damage dealing
// - cards to take down big threats
const GROUND_DAMAGE = new Set(["little prince", "bats", "cannon", "musketeer", "archers", "skeleton army", "goblin gang", "dart goblin", "mini pekka", "prince", "dark prince", "hunter", "furnace", "minion horde", "rascals", "archer queen", "boss bandit", "spirit empress", "flying machine"])
const AIR_DAMAGE = new Set(["little prince", "bats", "musketeer", "archers", "dart goblin", "hunter", "furnace", "minion horde", "archer queen", "flying machine"])

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
const MINI_SPELLS = new Set(["log", "giant snowball", "zap", "royal delivery", "barbarian barrel", "rage", "goblin curse", "vines", "earthquake"])

// big spells
const BIG_SPELLS = new Set(["freeze", "fireball", "poison", "rocket", "lightning", "arrows"])

// pure defense
const DEFENSE = new Set(["ice wizard", "guards", "cannon cart", "fisherman", "little prince", "zappies"])


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


export function buildOptimalDeck({
  cards,
  trophies,
  arenaId,
}: BuildDeckInput): BuildDeckResult {

  void trophies;
  const arenaStats = arenaAverageLevels[arenaId];
  const targetLevel = Math.round(arenaStats?.averageCardLevel ?? 16);
  const minLevel = targetLevel - 1; // one level under rounded average allowed
  const levelReadyCards = cards.filter((card) => {
    if (LEVEL_AGNOSTIC_CARDS.has(card.name.toLowerCase())) {
      return true;
    }
    return normalizeCardLevel(card) >= minLevel;
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
  const placeInBaseSlot = (card: PlayerCard) => {
    const slotIndex = nextBaseSlot();
    if (slotIndex === null || placedIds.has(card.id)) {
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

  const pickCandidate = (group: Set<string>) =>
    normalizedCards
      .filter((entry) => group.has(entry.name) && !placedIds.has(entry.card.id))
      .sort(sortByLevel)[0];

  const remainingWinCons = selectedWinCons.filter(
    (card) => !placedIds.has(card.id)
  );
  for (const card of remainingWinCons) {
    placeInBaseSlot(card);
  }

  const ensureGroup = (group: Set<string>) => {
    if (countInGroup(group) > 0) {
      return;
    }
    const candidate = pickCandidate(group);
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
    while (count < desired) {
      const candidate = pickCandidate(group);
      if (!candidate) {
        break;
      }
      if (!placeInBaseSlot(candidate.card)) {
        break;
      }
      count += 1;
    }
  };

  if (winConType === "defense" || winConType === "secondary") {
    ensureCount(MINI_TANK, 1);
    ensureCount(CYCLE, 2);
    ensureCount(STRUCTURES, 1);
  } else if (winConType === "offense") {
    ensureCount(MINI_TANK, 1);
    ensureCount(CYCLE, 1);
    ensureCount(STRUCTURES, 1);
  } else if (winConType === "beatdown") {
    ensureCount(SUPPORT, 2);
  }

  const remainingCards = normalizedCards
    .filter((entry) => !placedIds.has(entry.card.id))
    .sort(sortByLevel);
  for (const entry of remainingCards) {
    if (!placeInBaseSlot(entry.card)) {
      break;
    }
  }

  return { deck: slots };
}
