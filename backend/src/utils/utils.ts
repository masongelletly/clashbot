export function encodeTag(tag: string): string {
    const normalized = tag.startsWith("#") ? tag : `#${tag}`;
    return encodeURIComponent(normalized);
}

export async function sleep(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
}

export function normalizeName(s: string): string {
    return s.trim().toLowerCase();
}