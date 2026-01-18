import type * as CRTypes from "../../../shared/types/cr-api-types";

type DeckSnapshot = {
  name: string;
  level: number;
  weight: number;
  variant: "base" | "evo" | "hero";
};

type EthicsOverviewInput = CRTypes.EthicsCalculationResult;

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_OVERVIEW_CHARS = 220;
const OVERVIEW_CACHE_TTL_MS = 5 * 60 * 1000;

const overviewCache = new Map<string, { overview: string; expiresAt: number }>();
const CULTURE_NOTES = [
  "Yawning emotes are unethical.",
  "Crying emotes are unethical.",
  "Laughing emotes are unethical.",
  "The pig shaking booty emote is unethical.",
  "Emotes with humping insinuations are unethical.",
  "Players blame matchup for their losses.",
  "Players can be hardstuck in trophies or arena.",
  "Players are generally toxic with emotes.",
  "There's a joke that well-placed cards counter anything.",
];

function toDeckSnapshot(
  deckSlots: CRTypes.EthicsCalculationResult["deckSlots"]
): DeckSnapshot[] {
  return deckSlots
    .filter((slot): slot is NonNullable<typeof slot> => slot != null)
    .map((slot) => ({
      name: typeof slot.name === "string" ? slot.name : String(slot.name),
      level: slot.level,
      weight: Number(slot.weight.toFixed(2)),
      variant: slot.isEvo ? "evo" : slot.isHero ? "hero" : "base",
    }));
}

function selectFeaturedCard(deckSnapshot: DeckSnapshot[]): DeckSnapshot | null {
  if (deckSnapshot.length === 0) {
    return null;
  }

  return deckSnapshot.reduce<DeckSnapshot | null>((best, card) => {
    if (!best) {
      return card;
    }
    return Math.abs(card.weight) > Math.abs(best.weight) ? card : best;
  }, null);
}

function buildFallbackOverview(
  input: EthicsOverviewInput,
  deckSnapshot: DeckSnapshot[],
  featuredCard: DeckSnapshot | null
): string {
  const playerName = "Player";
  const featuredName = featuredCard?.name;
  const deckNames = deckSnapshot.map((card) => card.name).filter(Boolean);
  const deckCallout = featuredName
    ? featuredName
    : deckNames.length > 1
      ? `${deckNames[0]} and ${deckNames[1]}`
      : deckNames[0] ?? "that deck";
  const ethicsScore = input.ethicsScore.toFixed(2);
  const donationScore = input.donationScore.toFixed(2);

  return `Clashbot says ${playerName}'s ${deckCallout} lineup lands an ethics score of ${ethicsScore} with a donation swing of ${donationScore}, so expect polite chaos.`;
}

function normalizeOverviewText(text: string, fallback: string): string {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return fallback;
  }

  const withoutQuotes = firstLine.replace(/^["']+|["']+$/g, "");
  const compact = withoutQuotes.replace(/\s+/g, " ").trim();
  if (!compact) {
    return fallback;
  }

  const clipped = compact.length > MAX_OVERVIEW_CHARS
    ? `${compact.slice(0, MAX_OVERVIEW_CHARS - 3).trimEnd()}...`
    : compact;

  return /[.!?]$/.test(clipped) ? clipped : `${clipped}.`;
}

function buildCacheKey(
  input: EthicsOverviewInput,
  deckSnapshot: DeckSnapshot[],
  playerName: string,
  donations: number,
  donationsReceived: number
): string {
  return JSON.stringify({
    playerName,
    ethicsScore: Number(input.ethicsScore.toFixed(2)),
    deckScore: Number(input.deckScore.toFixed(2)),
    donationScore: Number(input.donationScore.toFixed(2)),
    donations,
    donationsReceived,
    deck: deckSnapshot,
  });
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickCultureNotes(seed: string, count: number): string[] {
  if (CULTURE_NOTES.length === 0 || count <= 0) {
    return [];
  }
  const selected: string[] = [];
  let cursor = hashString(seed);
  for (let i = 0; i < Math.min(count, CULTURE_NOTES.length); i += 1) {
    const index = cursor % CULTURE_NOTES.length;
    selected.push(CULTURE_NOTES[index]);
    cursor = hashString(`${cursor}-${i}`);
  }
  return Array.from(new Set(selected));
}

function getCachedOverview(key: string): string | null {
  const cached = overviewCache.get(key);
  if (!cached) {
    return null;
  }
  if (cached.expiresAt <= Date.now()) {
    overviewCache.delete(key);
    return null;
  }
  return cached.overview;
}

function setCachedOverview(key: string, overview: string) {
  overviewCache.set(key, {
    overview,
    expiresAt: Date.now() + OVERVIEW_CACHE_TTL_MS,
  });
}

export async function generateClashbotOverview(
  input: EthicsOverviewInput
): Promise<CRTypes.EthicsOverviewResponse> {
  const playerName = input.playerName?.trim() || "Player";
  const donations = Number.isFinite(input.donations) ? input.donations : 0;
  const donationsReceived = Number.isFinite(input.donationsReceived)
    ? input.donationsReceived
    : 0;
  const deckSnapshot = toDeckSnapshot(input.deckSlots ?? []);
  const featuredCard = selectFeaturedCard(deckSnapshot);
  const cacheKey = buildCacheKey(
    input,
    deckSnapshot,
    playerName,
    donations,
    donationsReceived
  );
  const cachedOverview = getCachedOverview(cacheKey);
  if (cachedOverview) {
    return { overview: cachedOverview };
  }
  const cultureNotes = pickCultureNotes(cacheKey, 2);
  const fallback = buildFallbackOverview(
    { ...input, playerName, donations, donationsReceived },
    deckSnapshot,
    featuredCard
  );
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    setCachedOverview(cacheKey, fallback);
    return { overview: fallback };
  }

  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const cultureNotesText = cultureNotes.length > 0 ? cultureNotes.join(" ") : "None.";

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 80,
        messages: [
          {
            role: "system",
            content:
              "You are Clashbot, a rowdy, personable clan-chat announcer inside a Clash Royale ethics dashboard. Write one punchy comedic sentence (under 25 words) that references the player's deck plus their deck score and donation score. You may mention a card name if it helps the joke, but it is optional. If the combined vibe is positive, praise them; if negative, playfully roast without being mean; if neutral, be mischievous. Weave in at most one culture note if it fits. Avoid stock phrasing, vary structure, use no emojis, and do not curse.",
          },
          {
            role: "user",
            content: `Deck Score: ${input.deckScore.toFixed(2)}\nDonation Score: ${input.donationScore.toFixed(2)}\nCulture Notes: ${cultureNotesText}\nDeck Details: ${JSON.stringify(deckSnapshot)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`OpenAI request failed: ${response.status} ${response.statusText}`);
      setCachedOverview(cacheKey, fallback);
      return { overview: fallback };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = data.choices?.[0]?.message?.content ?? "";
    const overview = normalizeOverviewText(raw, fallback);
    setCachedOverview(cacheKey, overview);
    return { overview };
  } catch (error) {
    console.warn("OpenAI request error:", error);
    setCachedOverview(cacheKey, fallback);
    return { overview: fallback };
  }
}
