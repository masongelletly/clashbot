import type { ScanPlayersResponse } from "../../../shared/types/cr-api-types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";


export async function scanPlayerByNameAndClan(
  playerName: string,
  clanName: string
): Promise<ScanPlayersResponse> {
  const qs = new URLSearchParams({ playerName, clanName });
  const res = await fetch(`${API_BASE}/api/players/scan?${qs.toString()}`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error (${res.status}): ${text}`);
  }

  return (await res.json()) as ScanPlayersResponse;
}

export async function scanPlayerByTag(
  playerTag: string
): Promise<ScanPlayersResponse> {
  const qs = new URLSearchParams({ playerTag });
  const res = await fetch(`${API_BASE}/api/players/by-tag?${qs.toString()}`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error (${res.status}): ${text}`);
  }

  return (await res.json()) as ScanPlayersResponse;
}
