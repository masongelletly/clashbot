import type * as CRTypes from "../../../shared/types/cr-api-types";
import { getAllCards } from "./cards.js";
import {
  getInitialElo,
  updateElo,
  calculateEloChange,
  ELO_BASE_CHANGE,
} from "./elo.js";
import { getCardElo, type CardVariant } from "./cardElo.js";
import {
  getCardElo as getCardEloFromDb,
  getCardMatchups,
  updateCardElo,
  incrementMatchups,
} from "./dbCards.js";

// Cache for all cards (including evo/hero variants)
let cachedCards: CRTypes.Card[] | null = null;

/**
 * Load and cache all cards from the Clash Royale API
 * Cards include evo/hero variants (indicated by evolutionMedium/heroMedium in iconUrls)
 * This avoids multiple API requests by caching the list
 */
async function getCachedCards(): Promise<CRTypes.Card[]> {
  if (cachedCards !== null) {
    return cachedCards;
  }

  // Fetch all cards from API (only once)
  const cardsResponse = await getAllCards();
  const allCards = cardsResponse.items;

  if (allCards.length < 2) {
    throw new Error(
      `Not enough cards available. Found ${allCards.length} cards.`
    );
  }

  // Cache all cards (includes base cards with evo/hero variant indicators)
  cachedCards = allCards;
  return cachedCards;
}

/**
 * Get two random cards from the Clash Royale API
 * Randomly selects base, evo, or hero variants when available
 * Uses cached cards to avoid multiple API requests
 */
export async function getRandomCards(): Promise<CRTypes.RandomCardsResponse & {
  card1Variant: CRTypes.CardVariant;
  card2Variant: CRTypes.CardVariant;
}> {
  const cards = await getCachedCards();

  // Get two random distinct cards
  const index1 = Math.floor(Math.random() * cards.length);
  let index2 = Math.floor(Math.random() * cards.length);
  while (index2 === index1) {
    index2 = Math.floor(Math.random() * cards.length);
  }

  const card1 = cards[index1];
  const card2 = cards[index2];

  // Randomly select variant for each card (base, evo, or hero if available)
  const getRandomVariant = (card: CRTypes.Card): CRTypes.CardVariant => {
    const hasEvo = !!card.iconUrls?.evolutionMedium;
    const hasHero = !!card.iconUrls?.heroMedium;
    
    if (!hasEvo && !hasHero) {
      return "base";
    }
    
    // Randomly choose between available variants
    const variants: CRTypes.CardVariant[] = ["base"];
    if (hasEvo) variants.push("evo");
    if (hasHero) variants.push("hero");
    
    return variants[Math.floor(Math.random() * variants.length)];
  };

  const card1Variant = getRandomVariant(card1);
  const card2Variant = getRandomVariant(card2);

  return {
    card1,
    card2,
    card1Variant,
    card2Variant,
  };
}

/**
 * Process a vote between two cards using the ELO rating system
 * 
 * This function:
 * - Fetches current ELO and vote counts from database
 * - Updates winner's ELO (increases based on volatility reduction)
 * - Updates loser's ELO (decreases based on volatility reduction)
 * - Increments matchup count for both cards
 * 
 * ELO is unbounded internally and converted to ethical scores using tanh.
 * See elo.ts and README.md for full documentation.
 * 
 */
export async function processVote(
  voteRequest: CRTypes.VoteRequest
): Promise<CRTypes.VoteResponse> {
  const { card1Id, card1Variant, card2Id, card2Variant, winnerCardId, winnerVariant } = voteRequest;
  
  if (winnerCardId === null || !winnerVariant) {
    // Neither card was selected - just increment matchup counts
    await incrementMatchups(card1Id, card1Variant);
    await incrementMatchups(card2Id, card2Variant);
    console.log(`Neither card selected. Matchups incremented for card ${card1Id} (${card1Variant}) and card ${card2Id} (${card2Variant})`);
  } else {
    // One card was selected as winner
    const winnerId = winnerCardId;
    const winnerVar = winnerVariant;
    const loserId = winnerId === card1Id ? card2Id : card1Id;
    const loserVar = winnerId === card1Id ? card2Variant : card1Variant;

    // Get current ELO and matchups from database
    const winnerElo = (await getCardEloFromDb(winnerId, winnerVar)) ?? getInitialElo();
    const winnerVotes = await getCardMatchups(winnerId, winnerVar);
    const newWinnerElo = updateElo(winnerElo, true, winnerVotes);
    await updateCardElo(winnerId, winnerVar, newWinnerElo);
    await incrementMatchups(winnerId, winnerVar);

    const loserElo = (await getCardEloFromDb(loserId, loserVar)) ?? getInitialElo();
    const loserVotes = await getCardMatchups(loserId, loserVar);
    const newLoserElo = updateElo(loserElo, false, loserVotes);
    await updateCardElo(loserId, loserVar, newLoserElo);
    await incrementMatchups(loserId, loserVar);

    const winnerEloChange = calculateEloChange(winnerVotes);
    const loserEloChange = calculateEloChange(loserVotes);

    console.log(
      `Vote processed: Card ${winnerId} (${winnerVar}) won (ELO +${winnerEloChange.toFixed(1)}), Card ${loserId} (${loserVar}) lost (ELO -${loserEloChange.toFixed(1)}). Matchups incremented for both.`
    );
  }

  return {
    success: true,
    message: "Vote processed successfully",
  };
}
