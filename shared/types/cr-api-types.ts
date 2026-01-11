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
  rank: number;
  trophies: number;
  bestTrophies: number;
};


// clans.ts
export type ClanSearchResponse = {
  items: Array<{
    tag: string;
    name: string;
    members: number;
  }>;
};
export type ClanMembersResponse = {
  items: Array<{
    tag: string;
    name: string;
    trophies: number;
    role?: string;
  }>;
};
export type scanClanForPlayerInput = {
  apiKey: string;
  playerName: string;
  clanName: string;
  maxClansToScan?: number;
};
export type scanClanForPlayerResponse = {
  playerTag: string;
  clanTag: string;
  clanName: string;
  matchedMemberName: string;
  matchedTrophies: number;
};
export type ScanPlayersResponse = { // proxy api response
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
