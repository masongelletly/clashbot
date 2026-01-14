/**
 * Service to get all cards with their ELO and ethics values
 */

import type * as CRTypes from "../../../shared/types/cr-api-types";
import { getAllCards } from "./cards.js";
import { getCardElo } from "./cardElo.js";
import { eloToEthicalScore, getInitialElo } from "./elo.js";
import { getCardElo as getCardEloFromDb } from "./dbCards.js";

/**
 * Get all cards with their ELO and ethics values
 * Includes base cards and information about evo/hero variants
 */
export async function getAllCardsWithElo(): Promise<CRTypes.CardWithElo[]> {
  const cardsResponse = await getAllCards();
  const allCards = cardsResponse.items;

  // Fetch ELO and calculate ethical scores for each card (base variants)
  const cardsWithElo = await Promise.all(
    allCards.map(async (card) => {
      // Get base card ELO from database
      const cardElo = await getCardEloFromDb(card.id, "base");
      const elo = cardElo ?? getInitialElo();

      // Convert ELO to ethical score
      const ethicalScore = eloToEthicalScore(elo);

      // Check if card has evo/hero variants
      const hasEvo = !!card.iconUrls?.evolutionMedium;
      const hasHero = !!card.iconUrls?.heroMedium;

      return {
        ...card,
        elo,
        ethicalScore,
        hasEvo,
        hasHero,
      };
    })
  );

  // Also create entries for evo/hero variants if they exist
  // Each variant has its own separate ELO in the database
  const variantCards: CRTypes.CardWithElo[] = [];

  for (const baseCard of cardsWithElo) {
    // Create evo variant entry with separate ELO
    if (baseCard.hasEvo && baseCard.iconUrls?.evolutionMedium) {
      const evoName = `${baseCard.name} (Evo)`;
      
      // Fetch separate ELO for evo variant
      const evoElo = await getCardEloFromDb(baseCard.id, "evo");
      const elo = evoElo ?? getInitialElo();
      const ethicalScore = eloToEthicalScore(elo);
      
      variantCards.push({
        id: baseCard.id, // Same ID, but we'll differentiate by name
        name: evoName,
        maxLevel: baseCard.maxLevel,
        iconUrls: {
          medium: baseCard.iconUrls.evolutionMedium,
          evolutionMedium: baseCard.iconUrls.evolutionMedium,
        },
        elo, // Separate ELO for evo variant
        ethicalScore, // Separate ethical score for evo variant
        hasEvo: true,
        hasHero: false,
      });
    }

    // Create hero variant entry with separate ELO
    if (baseCard.hasHero && baseCard.iconUrls?.heroMedium) {
      const heroName = `${baseCard.name} (Hero)`;
      
      // Fetch separate ELO for hero variant
      const heroElo = await getCardEloFromDb(baseCard.id, "hero");
      const elo = heroElo ?? getInitialElo();
      const ethicalScore = eloToEthicalScore(elo);
      
      variantCards.push({
        id: baseCard.id, // Same ID, but we'll differentiate by name
        name: heroName,
        maxLevel: baseCard.maxLevel,
        iconUrls: {
          medium: baseCard.iconUrls.heroMedium,
          heroMedium: baseCard.iconUrls.heroMedium,
        },
        elo, // Separate ELO for hero variant
        ethicalScore, // Separate ethical score for hero variant
        hasEvo: false,
        hasHero: true,
      });
    }
  }

  // Combine base cards and variants, sort by name
  const allCardsWithVariants = [...cardsWithElo, ...variantCards];
  allCardsWithVariants.sort((a, b) => a.name.localeCompare(b.name));

  return allCardsWithVariants;
}

