import type * as CRTypes from "../../../shared/types/cr-api-types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

/**
 * Get all cards with their ELO and ethics values
 * Includes base cards and evo/hero variants
 */
export async function getAllCardsWithElo(): Promise<CRTypes.CardsWithEloResponse> {
  const res = await fetch(`${API_BASE}/api/cards`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error (${res.status}): ${text}`);
  }

  return (await res.json()) as CRTypes.CardsWithEloResponse;
}

