import type * as CRTypes from "../../../shared/types/cr-api-types";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:3001").replace(/\/+$/, "");

function assertValidVoteRequest(voteRequest: CRTypes.VoteRequest): void {
  if (voteRequest.card1Id === voteRequest.card2Id) {
    throw new Error("card1Id and card2Id must be different");
  }

  if (voteRequest.winnerCardId === null) {
    if (voteRequest.winnerVariant != null) {
      throw new Error("winnerVariant must be omitted when winnerCardId is null");
    }
    return;
  }

  if (voteRequest.winnerVariant == null) {
    throw new Error("winnerVariant is required when winnerCardId is not null");
  }

  if (voteRequest.winnerCardId !== voteRequest.card1Id && voteRequest.winnerCardId !== voteRequest.card2Id) {
    throw new Error("winnerCardId must match card1Id or card2Id");
  }

  const expectedVariant =
    voteRequest.winnerCardId === voteRequest.card1Id ? voteRequest.card1Variant : voteRequest.card2Variant;
  if (voteRequest.winnerVariant !== expectedVariant) {
    throw new Error("winnerVariant must match the selected card's variant");
  }
}

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
 * @param voteRequest - Vote payload with card IDs/variants and the winner (or skip)
 */
export async function submitVote(
  voteRequest: CRTypes.VoteRequest
): Promise<CRTypes.VoteResponse> {
  assertValidVoteRequest(voteRequest);
  const res = await fetch(`${API_BASE}/api/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(voteRequest),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error (${res.status}): ${text}`);
  }

  return (await res.json()) as CRTypes.VoteResponse;
}
