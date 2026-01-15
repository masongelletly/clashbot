

// ELO Configuration Constants
export const ELO_NEUTRAL = 1500; // Baseline: cards start here (ethically neutral)
export const ELO_SENSITIVITY = 400; // Controls how fast scores approach ±2.0
export const ELO_BASE_CHANGE = 32; // Base ELO change per vote (reduces over time)

/**
 * Convert ELO rating to ethical score
 * 
 * Formula: ethical_score = 2 * tanh((elo - ELO_NEUTRAL) / ELO_SENSITIVITY)
 * 
 * This maps unbounded ELO to a bounded ethical score in the range (-2.0, +2.0)
 * 
 * eloToEthicalScore(1500) // 0.0 (neutral)
 * eloToEthicalScore(1700) // ≈ +1.10
 * eloToEthicalScore(1300) // ≈ -1.10
 */
export function eloToEthicalScore(elo: number): number {
  const normalizedElo = (elo - ELO_NEUTRAL) / ELO_SENSITIVITY;
  return 2 * Math.tanh(normalizedElo);
}

/**
 * Calculate ELO change per vote based on number of votes
 * 
 * Reduces volatility over time to prevent manipulation and stabilize mature cards.
 * Formula: K = max(8, ELO_BASE_CHANGE / sqrt(number_of_votes))
 * 
 * calculateEloChange(1)   // 32 (new card)
 * calculateEloChange(16)  // 8 (mature card)
 * calculateEloChange(100) // 8 (very mature card)
 */
export function calculateEloChange(numberOfVotes: number): number {
  if (numberOfVotes <= 0) {
    return ELO_BASE_CHANGE;
  }
  const volatilityReduction = ELO_BASE_CHANGE / Math.sqrt(numberOfVotes);
  return Math.max(8, volatilityReduction);
}

/**
 * Calculate new ELO after a vote
 */
export function updateElo(
  currentElo: number,
  isWinner: boolean,
  numberOfVotes: number
): number {
  const eloChange = calculateEloChange(numberOfVotes);
  return isWinner 
    ? currentElo + eloChange 
    : currentElo - eloChange;
}

/**
 * Get initial ELO for a new card
 */
export function getInitialElo(): number {
  return ELO_NEUTRAL;
}
