import type * as CRTypes from "../../../shared/types/cr-api-types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

/**
 * Get two random cards for voting
 */
export async function getRandomCards(): Promise<CRTypes.RandomCardsResponse> {
  const res = await fetch(`${API_BASE}/api/vote/random-cards`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error (${res.status}): ${text}`);
  }

  return (await res.json()) as CRTypes.RandomCardsResponse;
}

/**
 * Submit a vote between two cards
 * @param card1Id - ID of the first card
 * @param card1Variant - Variant of the first card ("base", "evo", or "hero")
 * @param card2Id - ID of the second card
 * @param card2Variant - Variant of the second card ("base", "evo", or "hero")
 * @param winnerCardId - ID of the winning card, or null if neither was selected
 * @param winnerVariant - Variant of the winning card (required if winnerCardId is not null)
 */
export async function submitVote(
  card1Id: number,
  card1Variant: CRTypes.CardVariant,
  card2Id: number,
  card2Variant: CRTypes.CardVariant,
  winnerCardId: number | null,
  winnerVariant?: CRTypes.CardVariant
): Promise<CRTypes.VoteResponse> {
  const res = await fetch(`${API_BASE}/api/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      card1Id,
      card1Variant,
      card2Id,
      card2Variant,
      winnerCardId,
      winnerVariant,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error (${res.status}): ${text}`);
  }

  return (await res.json()) as CRTypes.VoteResponse;
}

