import { getCardsCollection, type CardDocument } from "../db/mongodb.js";
import { getInitialElo } from "./elo.js";
import type { CardVariant } from "./cardElo.js";

/**
 * Get a card's ELO rating from the database
 */
export async function getCardElo(
  cardId: number,
  variant: CardVariant = "base"
): Promise<number | null> {
  try {
    const collection = await getCardsCollection();
    const card = await collection.findOne({ cardId, variant });
    return card?.elo ?? null;
  } catch (error) {
    console.error(`Error fetching ELO for card ${cardId} (${variant}):`, error);
    return null;
  }
}

/**
 * Get a card's matchup count from the database
 */
export async function getCardMatchups(
  cardId: number,
  variant: CardVariant = "base"
): Promise<number> {
  try {
    const collection = await getCardsCollection();
    const card = await collection.findOne({ cardId, variant });
    return card?.matchups ?? 0;
  } catch (error) {
    console.error(`Error fetching matchups for card ${cardId} (${variant}):`, error);
    return 0;
  }
}

/**
 * Update a card's ELO rating in the database
 */
export async function updateCardElo(
  cardId: number,
  variant: CardVariant,
  elo: number,
  cardName?: string
): Promise<void> {
  try {
    const collection = await getCardsCollection();
    await collection.updateOne(
      { cardId, variant },
      {
        $set: {
          cardId,
          variant,
          elo,
          cardname: cardName || `Card ${cardId}`,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error(`Error updating ELO for card ${cardId} (${variant}):`, error);
    throw error;
  }
}

/**
 * Increment a card's matchup count

 */
export async function incrementMatchups(
  cardId: number,
  variant: CardVariant,
  cardName?: string
): Promise<void> {
  try {
    const collection = await getCardsCollection();
    await collection.updateOne(
      { cardId, variant },
      {
        $setOnInsert: {
          cardId,
          variant,
          elo: getInitialElo(),
          cardname: cardName || `Card ${cardId}`,
          // Don't set matchups here - $inc will handle it
        },
        $inc: { matchups: 1 },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error(`Error incrementing matchups for card ${cardId} (${variant}):`, error);
    throw error;
  }
}

/**
 * Reset a card's ELO and matchups to initial values
 */
export async function resetCardElo(
  cardId: number,
  variant: CardVariant
): Promise<void> {
  try {
    const collection = await getCardsCollection();
    await collection.updateOne(
      { cardId, variant },
      {
        $set: {
          elo: getInitialElo(),
          matchups: 0,
        },
      }
    );
  } catch (error) {
    console.error(`Error resetting ELO for card ${cardId} (${variant}):`, error);
    throw error;
  }
}

/**
 * Get all cards with their ELO and matchups
 */
export async function getAllCardsFromDb(
  cardIds?: number[]
): Promise<CardDocument[]> {
  try {
    const collection = await getCardsCollection();
    const query = cardIds ? { cardId: { $in: cardIds } } : {};
    const cards = await collection.find(query).toArray();
    return cards;
  } catch (error) {
    console.error("Error fetching all cards:", error);
    return [];
  }
}

/**
 * Batch fetch ELO ratings for multiple card variants
 * Returns a map: `${cardId}-${variant}` -> elo
 * This is much more efficient than individual queries
 */
export async function batchGetCardElos(
  cardVariants: Array<{ cardId: number; variant: CardVariant }>
): Promise<Map<string, number>> {
  try {
    if (cardVariants.length === 0) {
      return new Map();
    }

    const collection = await getCardsCollection();
    
    // Build query to fetch all card variants at once
    const query = {
      $or: cardVariants.map(({ cardId, variant }) => ({
        cardId,
        variant,
      })),
    };

    // Fetch all matching documents in one query
    const cards = await collection.find(query).toArray();

    // Build a map for quick lookup: "cardId-variant" -> elo
    const eloMap = new Map<string, number>();
    for (const card of cards) {
      const key = `${card.cardId}-${card.variant}`;
      eloMap.set(key, card.elo);
    }

    return eloMap;
  } catch (error) {
    console.error("Error batch fetching ELOs:", error);
    return new Map();
  }
}

/**
 * Batch fetch ELO and matchups for multiple card variants
 * Returns maps: `${cardId}-${variant}` -> value
 * This is much more efficient than individual queries
 */
export async function batchGetCardElosAndMatchups(
  cardVariants: Array<{ cardId: number; variant: CardVariant }>
): Promise<{
  eloMap: Map<string, number>;
  matchupsMap: Map<string, number>;
}> {
  try {
    if (cardVariants.length === 0) {
      return { eloMap: new Map(), matchupsMap: new Map() };
    }

    const collection = await getCardsCollection();
    
    // Build query to fetch all card variants at once
    const query = {
      $or: cardVariants.map(({ cardId, variant }) => ({
        cardId,
        variant,
      })),
    };

    // Fetch all matching documents in one query
    const cards = await collection.find(query).toArray();

    // Build maps for quick lookup: "cardId-variant" -> value
    const eloMap = new Map<string, number>();
    const matchupsMap = new Map<string, number>();
    
    for (const card of cards) {
      const key = `${card.cardId}-${card.variant}`;
      eloMap.set(key, card.elo);
      matchupsMap.set(key, card.matchups ?? 0);
    }

    return { eloMap, matchupsMap };
  } catch (error) {
    console.error("Error batch fetching ELOs and matchups:", error);
    return { eloMap: new Map(), matchupsMap: new Map() };
  }
}

