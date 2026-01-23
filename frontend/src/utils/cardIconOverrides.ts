const HERO_ICON_OVERRIDES: Record<string, string> = {
  "ice golem": "/images/hero-ice-golem.png",
};

export const getHeroIconOverride = (cardName: string): string | null => {
  const normalized = cardName.toLowerCase().trim();
  return HERO_ICON_OVERRIDES[normalized] ?? null;
};
