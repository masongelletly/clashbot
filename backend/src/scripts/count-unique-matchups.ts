import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
dotenv.config({ path: envPath });
import { closeDatabase, getCardsCollection } from "../db/mongodb.js";

type MatchupSide = {
  cardId: number;
  variant: string;
};

const buildMatchupKey = (a: MatchupSide, b: MatchupSide) => {
  const left = `${a.cardId}:${a.variant}`;
  const right = `${b.cardId}:${b.variant}`;
  return left < right ? `${left}|${right}` : `${right}|${left}`;
};

async function main() {
  const collection = await getCardsCollection();
  const cursor = collection.find(
    {},
    {
      projection: {
        cardId: 1,
        variant: 1,
        matchups: 1,
        history: 1,
      },
    }
  );

  const uniqueMatchups = new Set<string>();
  let totalMatchups = 0;
  let totalHistoryEntries = 0;
  let cardsProcessed = 0;
  let skippedEntries = 0;

  try {
    for await (const doc of cursor) {
      cardsProcessed += 1;
      if (Number.isFinite(doc.matchups)) {
        totalMatchups += doc.matchups;
      }
      const history = doc.history ?? [];
      for (const entry of history) {
        if (
          !entry ||
          typeof entry.opponentCardId !== "number" ||
          typeof entry.opponentVariant !== "string"
        ) {
          skippedEntries += 1;
          continue;
        }
        totalHistoryEntries += 1;
        const key = buildMatchupKey(
          { cardId: doc.cardId, variant: doc.variant },
          { cardId: entry.opponentCardId, variant: entry.opponentVariant }
        );
        uniqueMatchups.add(key);
      }
    }
  } finally {
    await closeDatabase();
  }

  const totalVotes = totalMatchups / 2;
  const hasOddMatchups = totalMatchups % 2 !== 0;

  console.log("Total votes", totalVotes);
  if (hasOddMatchups) {
    console.log("Warning: total matchups is odd; votes may be inconsistent.");
  }
  console.log("Skipped entries:", skippedEntries);
  console.log("Unique matchups:", uniqueMatchups.size);
}

main().catch((error) => {
  console.error("Failed to count unique matchups:", error);
  process.exit(1);
});
