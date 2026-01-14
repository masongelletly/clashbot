/**
 * Service to get all cards with their ELO and ethics values
 * 
 * Efficiently batches database queries to avoid connection issues
 */

import type * as CRTypes from "../../../shared/types/cr-api-types";
import { getAllCards } from "./cards.js";
import { eloToEthicalScore, getInitialElo } from "./elo.js";
import { batchGetCardElos } from "./dbCards.js";

/**
 * Get all cards with their ELO and ethics values
 */
export async function getAllCardsWithElo(): Promise<CRTypes.CardWithElo[]> {
  // Step 1: Fetch all cards from Clash Royale API
  const cardsResponse = await getAllCards();
  const allCards = cardsResponse.items;

  // Step 2: Build list of all card variants we need ELO for
  const cardVariantsToFetch: Array<{ cardId: number; variant: "base" | "evo" | "hero" }> = [];
  
  for (const card of allCards) {
    // Always need base variant
    cardVariantsToFetch.push({ cardId: card.id, variant: "base" });
    
    // Add evo/hero variants if they exist
    if (card.iconUrls?.evolutionMedium) {
      cardVariantsToFetch.push({ cardId: card.id, variant: "evo" });
    }
    if (card.iconUrls?.heroMedium) {
      cardVariantsToFetch.push({ cardId: card.id, variant: "hero" });
    }
  }

  // Step 3: Batch fetch all ELOs in ONE database query
  const eloMap = await batchGetCardElos(cardVariantsToFetch);

  // Helper function to get ELO from map
  const getElo = (cardId: number, variant: "base" | "evo" | "hero"): number => {
    const key = `${cardId}-${variant}`;
    return eloMap.get(key) ?? getInitialElo();
  };

  // Step 4: Build base cards with ELO data
  const cardsWithElo: CRTypes.CardWithElo[] = allCards.map((card) => {
    const elo = getElo(card.id, "base");
    const ethicalScore = eloToEthicalScore(elo);
    const hasEvo = !!card.iconUrls?.evolutionMedium;
    const hasHero = !!card.iconUrls?.heroMedium;

    return {
      ...card,
      elo,
      ethicalScore,
      hasEvo,
      hasHero,
    };
  });

  // Step 5: Create variant entries with their ELO data
  const variantCards: CRTypes.CardWithElo[] = [];

  for (const baseCard of cardsWithElo) {
    // Create evo variant entry
    if (baseCard.hasEvo && baseCard.iconUrls?.evolutionMedium) {
      const evoName = `${baseCard.name} (Evo)`;
      const elo = getElo(baseCard.id, "evo");
      const ethicalScore = eloToEthicalScore(elo);
      
      variantCards.push({
        id: baseCard.id,
        name: evoName,
        maxLevel: baseCard.maxLevel,
        iconUrls: {
          medium: baseCard.iconUrls.evolutionMedium,
          evolutionMedium: baseCard.iconUrls.evolutionMedium,
        },
        elo,
        ethicalScore,
        hasEvo: true,
        hasHero: false,
      });
    }

    // Create hero variant entry
    if (baseCard.hasHero && baseCard.iconUrls?.heroMedium) {
      const heroName = `${baseCard.name} (Hero)`;
      const elo = getElo(baseCard.id, "hero");
      const ethicalScore = eloToEthicalScore(elo);
      
      variantCards.push({
        id: baseCard.id,
        name: heroName,
        maxLevel: baseCard.maxLevel,
        iconUrls: {
          medium: baseCard.iconUrls.heroMedium,
          heroMedium: baseCard.iconUrls.heroMedium,
        },
        elo,
        ethicalScore,
        hasEvo: false,
        hasHero: true,
      });
    }
  }

  // Step 6: Combine and sort
  const allCardsWithVariants = [...cardsWithElo, ...variantCards];
  allCardsWithVariants.sort((a, b) => a.name.localeCompare(b.name));

  return allCardsWithVariants;
}

