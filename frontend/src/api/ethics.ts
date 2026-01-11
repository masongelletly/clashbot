import type * as CRTypes from "../../../../shared/types/cr-api-types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

export async function getEthicsScore(
  playerTag: string
): Promise<CRTypes.EthicsCalculationResult> {
  const qs = new URLSearchParams({ playerTag });
  const res = await fetch(`${API_BASE}/api/ethics?${qs.toString()}`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error (${res.status}): ${text}`);
  }

  return (await res.json()) as CRTypes.EthicsCalculationResult;
}

