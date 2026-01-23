import cardUpgradeCountsData from "./cardUpgradeCounts.json";

export type CardUpgradeRarity =
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "champion";

export type CardUpgradeCounts = {
  levels: number[];
  rarities: Record<CardUpgradeRarity, Record<string, number>>;
};

export const cardUpgradeCounts = cardUpgradeCountsData as CardUpgradeCounts;
