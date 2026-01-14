export type StoredValue = {
  id: string;
  key: string;
  value: string;
  createdAt: string;
};

export type CardNameEntry = {
  _id: string;
  cardName: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

export async function getCardNameEntry(): Promise<CardNameEntry | null> {
  const res = await fetch(`${API_BASE}/api/values/card-names`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { value: CardNameEntry | null };
  return data.value ?? null;
}
