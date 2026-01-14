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

