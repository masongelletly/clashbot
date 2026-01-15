

// ELO Configuration Constants
export const ELO_NEUTRAL = 1500; // Baseline: cards start here (ethically neutral)
export const ELO_SENSITIVITY = 400; // Controls how fast scores approach ±2.0
export const ELO_BASE_CHANGE = 32; // Base K-factor before vote-count reduction
export const ELO_EXPECTED_SCALE = 400; // Rating difference scale for expected score
export const ELO_VOLATILITY_MULTIPLIER = 1.3; // 1.3x volatility scaling

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
 * Calculate expected score given the opponent rating
 *
 * Formula: expected = 1 / (1 + 10^((opponent - current) / ELO_EXPECTED_SCALE))
 */
export function calculateExpectedScore(
  currentElo: number,
  opponentElo: number
): number {
  return 1 / (1 + Math.pow(10, (opponentElo - currentElo) / ELO_EXPECTED_SCALE));
}

/**
 * Calculate ELO change per vote (includes opponent strength and volatility scaling)
 *
 * Formula: Δ = K * V * (actual - expected)
 * K = max(8, ELO_BASE_CHANGE / sqrt(number_of_votes))
 * V = ELO_VOLATILITY_MULTIPLIER (1.3x)
 */
export function calculateEloChange(
  currentElo: number,
  opponentElo: number,
  isWinner: boolean,
  numberOfVotes: number
): number {
  let baseK = ELO_BASE_CHANGE;
  if (numberOfVotes > 0) {
    const volatilityReduction = ELO_BASE_CHANGE / Math.sqrt(numberOfVotes);
    baseK = Math.max(8, volatilityReduction);
  }
  const kFactor = baseK * ELO_VOLATILITY_MULTIPLIER;
  const expectedScore = calculateExpectedScore(currentElo, opponentElo);
  const actualScore = isWinner ? 1 : 0;
  return kFactor * (actualScore - expectedScore);
}

/**
 * Calculate new ELO after a vote
 */
export function updateElo(
  currentElo: number,
  opponentElo: number,
  isWinner: boolean,
  numberOfVotes: number
): number {
  const eloChange = calculateEloChange(
    currentElo,
    opponentElo,
    isWinner,
    numberOfVotes
  );
  return currentElo + eloChange;
}

/**
 * Get initial ELO for a new card
 */
export function getInitialElo(): number {
  return ELO_NEUTRAL;
}
