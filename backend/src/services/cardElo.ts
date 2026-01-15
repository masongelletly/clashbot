
import { eloToEthicalScore, getInitialElo } from "./elo.js";
import { getCardElo as getCardEloFromDb } from "./dbCards.js";

export type CardVariant = "base" | "evo" | "hero";

/**
 * Get ethical score for a card from ELO in database
 * 
 * @param cardId - The card's ID
 * @param cardName - The card's name (for variant lookup)
 * @param isEvo - Whether this is an evolution variant
 * @param isHero - Whether this is a hero variant
 * @returns Ethical score in range (-2.0, +2.0)
 */
export async function getCardEthicalScore(
  cardId: number,
  cardName: string,
  isEvo: boolean = false,
  isHero: boolean = false
): Promise<number> {
  // Determine variant type
  const variant: CardVariant = isEvo ? "evo" : isHero ? "hero" : "base";
  
  // Fetch ELO from database for this specific variant
  const cardElo = await getCardElo(cardId, variant, cardName);
  
  // If ELO not found in database, use initial ELO (1500 = neutral)
  const elo = cardElo ?? getInitialElo();
  
  // Convert ELO to ethical score
  return eloToEthicalScore(elo);
}

/**
 * Get ELO rating for a card variant from database
 */
export async function getCardElo(
  cardId: number,
  variant: CardVariant = "base",
  cardName?: string
): Promise<number | null> {
  // Fetch from MongoDB database
  return await getCardEloFromDb(cardId, variant);
}

