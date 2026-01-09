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
  cards: Array<{
    name: string;
    id: number;
    level: number;
    maxLevel: number;
    count: number;
    iconUrls?: {
      medium?: string;
      evolutionMedium?: string;
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