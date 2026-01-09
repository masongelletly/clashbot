import "dotenv/config";

const BASE_URL = "https://api.clashroyale.com/v1";

const apiKey = process.env.CLASH_ROYALE_API_KEY;
if (!apiKey) throw new Error("Missing CLASH_ROYALE_API_KEY in environment");

export async function crFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ClashRoyale API error (${res.status}): ${text}`);
  }

  return JSON.parse(text) as T;
}
