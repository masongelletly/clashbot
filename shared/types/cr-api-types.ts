// players.ts
export type PlayerProfileResponse = {
  tag: string;
  name: string;
  expLevel: number;
  donations: number;
  donationsReceived: number;
  trophies: number;
  wins: number;
  losses: number;
  leagueStatistics: PlayerLeagueStatistics;
  arena?: {
    id: number;
    name?: string;
  };
  cards: Array<{
    name: string;
    id: number;
    level: number;
    maxLevel?: number;
    count?: number;
    elixirCost: number;
    evolutionLevel?: number;
    maxEvolutionLevel?: number;
    rarity?: string;
    iconUrls?: {
      medium?: string;
      evolutionMedium?: string;
      heroMedium?: string;
    };
  }>;
  currentDeck?: Array<{
    name: string;
    id: number;
    level: number;
    maxLevel?: number;
    elixirCost: number;
    iconUrls?: {
      medium?: string;
      evolutionMedium?: string;
      heroMedium?: string;
    };
  }>;
  badges?: Array<{
    name: string;
    progress: number;
    level: number;
    maxLevel: number;
    target: number; // Card ID
    iconUrls?: {
      medium?: string;
      large?: string;
    };
  }>;
};
export type PlayerLeagueStatistics = {
  bestSeason?: LeagueSeasonResult;
  previousSeason?: LeagueSeasonResult;
  currentSeason?: LeagueSeasonResult;
};
export type LeagueSeasonResult = {
  id: string;
  trophies: number;
};
export type scanClanForPlayerInput = {
  playerName: string;
  clanName: string;
  maxClansToScan?: number;
  apiKey?: string;
};

export type scanClanForPlayerResponse = {
  playerTag: string;
  playerName: string;
  clanTag: string;
  clanName: string;
  role: string;
  matchedMemberName?: string;
  matchedTrophies?: number;
};

export type ScanPlayersResponse = {
  matches: scanClanForPlayerResponse[];
  playerDetails: PlayerProfileResponse | null;
};

// cards.ts
export type Card = {
  id: number;
  name: string;
  maxLevel?: number;
  iconUrls?: {
    medium?: string;
    evolutionMedium?: string;
    heroMedium?: string;
  };
};

export type CardsResponse = {
  items: Card[];
};

// badges.ts
export type Badge = {
  id?: number;
  name: string;
  progress: number;
  level: number;
  maxLevel: number;
  target: number; // Card ID
  iconUrls?: {
    medium?: string;
    large?: string;
  };
};

export type PlayerBadgesResponse = {
  items: Badge[];
};

// Extended player profile with badges and current deck
export type ExtendedPlayerProfileResponse = PlayerProfileResponse & {
  currentDeck?: Array<{
    id: number;
    name: string;
    level: number;
    maxLevel?: number;
    elixirCost: number;
    iconUrls?: {
      medium?: string;
      evolutionMedium?: string;
      heroMedium?: string;
    };
  }>;
  badges?: Badge[];
};

// ethics.ts
export type EthicsCalculationResult = {
  playerName?: string;
  ethicsScore: number;
  deckScore: number;
  donationScore: number;
  donationRatio: number;
  donations: number;
  donationsReceived: number;
  deckSlots: Array<{
    id: number;
    name: string;
    level: number;
    maxLevel?: number;
    elixirCost: number;
    iconUrl?: string;
    weight: number;
    isEvo: boolean;
    isHero: boolean;
    slotIndex: number;
  } | null>;
};

export type EthicsOverviewRequest = {
  playerTag: string;
};

export type EthicsOverviewResponse = {
  overview: string;
};

// vote.ts
export type CardVariant = "base" | "evo" | "hero";

export type VoteRequest = {
  card1Id: number;
  card1Variant: CardVariant;
  card2Id: number;
  card2Variant: CardVariant;
  winnerCardId: number | null; // null means neither was selected
  winnerVariant?: CardVariant; // Required if winnerCardId is not null
};

export type VoteEloDelta = {
  cardId: number;
  variant: CardVariant;
  delta: number;
};

export type VoteResponse = {
  success: boolean;
  message?: string;
  eloDeltas?: VoteEloDelta[];
};

export type RandomCardsResponse = {
  card1: Card;
  card2: Card;
  card1Variant: CardVariant;
  card2Variant: CardVariant;
};

// cards-elo.ts
export type CardWithElo = {
  id: number;
  name: string;
  maxLevel?: number;
  iconUrls?: {
    medium?: string;
    evolutionMedium?: string;
    heroMedium?: string;
  };
  elo: number;
  ethicalScore: number;
  matchups?: number;
  hasEvo?: boolean;
  hasHero?: boolean;
};

export type CardsWithEloResponse = {
  items: CardWithElo[];
};

// clans.ts
export type ClanMember = {
  tag: string;
  name: string;
  role: string;
  expLevel: number;
  trophies: number;
  arena?: {
    id: number;
    name?: string;
  };
  clanRank: number;
  previousClanRank: number;
  donations: number;
  donationsReceived: number;
};

export type ClanMembersResponse = {
  items: ClanMember[];
};

export type Clan = {
  tag: string;
  name: string;
  type: string;
  description?: string;
  badgeId?: number;
  clanScore?: number;
  clanWarTrophies?: number;
  location?: {
    id: number;
    name: string;
    isCountry: boolean;
    countryCode?: string;
  };
  requiredTrophies?: number;
  donationsPerWeek?: number;
  clanChestStatus?: string;
  clanChestLevel?: number;
  clanChestMaxLevel?: number;
  members: number;
  memberList?: ClanMember[];
};

export type ClanSearchResponse = {
  items: Clan[];
};
