import type * as CRTypes from "../../../shared/types/cr-api-types";
import { getCardWeight, CARD_WEIGHTS } from "../config/cardWeights.js";
import { getPlayerDetails } from "./players.js";

/**
 * Get weight for a card, checking for evo/hero variants first
 * Only uses evo/hero weights if the card actually has those variants (based on iconUrls)
 * Supports both formats: "CardName (Evo)" and "CardName(Evo)"
 */
function getCardWeightWithVariants(
  cardName: string, 
  isEvo: boolean, 
  isHero: boolean,
  hasEvoIcon: boolean,
  hasHeroIcon: boolean
): number {
  // Only try evo/hero specific weights if:
  // 1. The slot is showing evo/hero (isEvo/isHero is true)
  // 2. The card actually has that variant (hasEvoIcon/hasHeroIcon is true)
  if (isEvo && hasEvoIcon) {
    // Try both formats: with space and without space
    const evoKeyWithSpace = `${cardName} (Evo)`;
    const evoKeyNoSpace = `${cardName}(Evo)`;
    if (evoKeyWithSpace in CARD_WEIGHTS) {
      return getCardWeight(evoKeyWithSpace);
    }
    if (evoKeyNoSpace in CARD_WEIGHTS) {
      return getCardWeight(evoKeyNoSpace);
    }
  }
  if (isHero && hasHeroIcon) {
    // Try both formats: with space and without space
    const heroKeyWithSpace = `${cardName} (Hero)`;
    const heroKeyNoSpace = `${cardName}(Hero)`;
    if (heroKeyWithSpace in CARD_WEIGHTS) {
      return getCardWeight(heroKeyWithSpace);
    }
    if (heroKeyNoSpace in CARD_WEIGHTS) {
      return getCardWeight(heroKeyNoSpace);
    }
  }
  // Fall back to base card weight
  return getCardWeight(cardName);
}

/**
 * Calculate ethics score for a player based on their current deck
 */
export async function calculateEthicsScore(
  playerTag: string
): Promise<CRTypes.EthicsCalculationResult> {
  // Fetch player data
  const playerProfile = await getPlayerDetails(playerTag);
  const trophies = playerProfile.trophies ?? 0;
  const evoSlotCount = trophies > 3000 ? 2 : 1;

  // Get current deck directly from player profile
  const currentDeck = playerProfile.currentDeck ?? [];
  console.log(`Current deck has ${currentDeck.length} cards, trophies: ${trophies}`);
  
  // Create deck slots (8 slots total)
  const deckSlots: Array<{
    id: number;
    name: string;
    level: number;
    maxLevel?: number;
    elixirCost: number;
    iconUrl?: string;
    weight: number;
    isEvo: boolean;
    isHero: boolean;
    slotIndex: number;
  } | null> = Array.from({ length: 8 }, () => null);
  
  // Fill slots with cards from current deck
  currentDeck.forEach((card, index) => {
    if (index < 8) {
      const evolutionLevel = (card as any).evolutionLevel;
      const hasEvolution = evolutionLevel === 1 || evolutionLevel === 3;
      const hasHero = evolutionLevel === 2 || evolutionLevel === 3;
      
      const isEvolutionSlot = index < evoSlotCount;
      const isHeroSlot = index >= 2 && index < 4;
      
      // Check if card actually has evo/hero variants (based on iconUrls from API)
      const hasEvoIcon = !!card.iconUrls?.evolutionMedium;
      const hasHeroIcon = !!card.iconUrls?.heroMedium;
      
      // Determine if this slot should show evo/hero
      // Only show if the card has the variant AND meets slot/trophy requirements
      const showEvo = isEvolutionSlot && hasEvolution && hasEvoIcon;
      const showHero = isHeroSlot && hasHero && hasHeroIcon && 
        ((index === 2 && trophies >= 5000) || (index === 3 && trophies >= 10000));
      
      // Get appropriate icon
      let iconUrl: string | undefined;
      if (showEvo && card.iconUrls?.evolutionMedium) {
        iconUrl = card.iconUrls.evolutionMedium;
      } else if (showHero && card.iconUrls?.heroMedium) {
        iconUrl = card.iconUrls.heroMedium;
      } else {
        iconUrl = card.iconUrls?.medium ?? card.iconUrls?.evolutionMedium ?? card.iconUrls?.heroMedium;
      }
      
      // Get weight (check for evo/hero variants only if card actually has them)
      const weight = getCardWeightWithVariants(card.name, showEvo, showHero, hasEvoIcon, hasHeroIcon);
      
      deckSlots[index] = {
        id: card.id,
        name: card.name,
        level: card.level,
        maxLevel: card.maxLevel,
        elixirCost: card.elixirCost,
        iconUrl,
        weight,
        isEvo: showEvo,
        isHero: showHero,
        slotIndex: index,
      };
    }
  });
  
  // Calculate total deck score
  let deckScore = 0;
  deckSlots.forEach(slot => {
    if (slot) {
      deckScore += slot.weight;
    }
  });
  
  console.log(`Deck score: ${deckScore.toFixed(3)}`);

  // Calculate donation ratio score
  // Ratio = donationsReceived / donations
  // 2:1 ratio (received:donated = 2:1, ratio = 2) = -1
  // 1:2 ratio (received:donated = 1:2, ratio = 0.5) = +1
  // 1:1 ratio (ratio = 1) = 0
  const donations = playerProfile.donations ?? 0;
  const donationsReceived = playerProfile.donationsReceived ?? 0;
  
  let donationScore = 0;
  if (donations > 0) {
    const ratio = donationsReceived / donations;
    
    if (ratio >= 2) {
      // Maximum negative: -1
      donationScore = -1;
    } else if (ratio <= 0.5) {
      // Maximum positive: +1
      donationScore = 1;
    } else if (ratio > 1) {
      // Between 1 and 2: linear from (1, 0) to (2, -1)
      // slope = -1/(2-1) = -1
      // score = 0 - 1*(ratio - 1) = 1 - ratio
      donationScore = 1 - ratio;
    } else {
      // Between 0.5 and 1: linear from (0.5, +1) to (1, 0)
      // slope = -1/(1-0.5) = -2
      // score = 1 - 2*(ratio - 0.5) = 2 - 2*ratio
      donationScore = 2 - 2 * ratio;
    }
  } else if (donationsReceived > 0 && donations === 0) {
    // Edge case: received donations but never donated = very unethical
    donationScore = -1;
  }
  // If both are 0, donationScore remains 0 (neutral)
  
  console.log(`Donation ratio: ${donationsReceived}:${donations} = ${(donations > 0 ? donationsReceived / donations : 0).toFixed(2)}, Score: ${donationScore.toFixed(3)}`);

  // Calculate total ethics score (deck + donation)
  const ethicsScore = deckScore + donationScore;

  return {
    ethicsScore: ethicsScore,
    deckScore: deckScore,
    donationScore: donationScore,
    donationRatio: donations > 0 ? donationsReceived / donations : (donationsReceived > 0 ? 2 : 1),
    donations: donations,
    donationsReceived: donationsReceived,
    deckSlots: deckSlots,
  };
}
