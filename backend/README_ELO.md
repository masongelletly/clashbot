# ELO Rating System for Card Ethics

This document explains how the ELO rating system works for determining card ethical scores in Clashbot.

## Overview

The system uses an **unbounded ELO rating** internally, which is then converted to a **bounded ethical score** using a tanh function. This approach is inspired by chess rating systems and ensures:

- No hard caps that prevent cards from improving
- Smooth, bounded ethical scores that never exceed ±2.0
- Resistance to manipulation through volatility reduction
- Community consensus emerges naturally over time

## Core Principles

### 1. Unbounded ELO Internally

**Solution:** Let ELO be unbounded internally, only cap during conversion to ethical scale.

### 2. Neutral Baseline

All cards start at **ELO_NEUTRAL = 1500**, which represents ethically neutral (0.0 on the ethical scale).

- **1500** = ethically neutral (0.0)
- **Higher** = more ethical
- **Lower** = less ethical

### 3. ELO Updates

When a card wins a vote:
- ELO increases by `K` points
- Where `K = max(8, 32 / sqrt(number_of_votes))`

When a card loses a vote:
- ELO decreases by `K` points

**Volatility Reduction:**
- New cards (1 vote): ±32 ELO change
- Mature cards (16 votes): ±8 ELO change
- Very mature cards (100+ votes): ±8 ELO change (minimum)

This prevents manipulation and stabilizes cards over time.

## Conversion: ELO → Ethical Score

### Formula

```
ethical_score = 2 * tanh((elo - 1500) / 400)
```

Where:
- `elo` = card's current ELO rating
- `1500` = ELO_NEUTRAL (baseline)
- `400` = ELO_SENSITIVITY (controls how fast scores approach ±2.0)
- `tanh` = hyperbolic tangent function

### Why tanh?

The tanh function naturally maps:
- `(-∞, +∞)` → `(-1, +1)`
- Smooth and symmetric
- Used in rating systems and machine learning for this reason
- Prevents extreme cards from dominating forever
- Compresses outliers while keeping mid-range differences meaningful

### Numerical Examples

| ELO | Ethical Score | Interpretation |
|-----|---------------|----------------|
| 1100 | ≈ -1.66 | Very unethical |
| 1300 | ≈ -1.10 | Unethical |
| 1500 | 0.00 | Neutral |
| 1700 | ≈ +1.10 | Ethical |
| 1900 | ≈ +1.66 | Very ethical |
| ∞ | +2.00 | Maximum (theoretical) |
| -∞ | -2.00 | Minimum (theoretical) |

**Key Insight:** Cards need consistent voting to approach extremes. No single card instantly becomes "max unethical" or "max ethical".

## Deck Ethics Calculation

For a deck of 8 cards:

```
deck_ethics = sum(ethical_score(card_i) for i in 1..8)
```

**Bounds:**
- Worst possible deck: `-2.0 × 8 = -16`
- Best possible deck: `+2.0 × 8 = +16`

**Optional Normalization:**
```
normalized_deck_score = deck_ethics / 16
```
This gives a range of `[-1, +1]` if you want percentages later.

## Implementation Details

### Constants

```typescript
ELO_NEUTRAL = 1500      // Baseline ELO (ethically neutral)
ELO_SENSITIVITY = 400   // Controls tanh curve steepness
ELO_BASE_CHANGE = 32    // Base ELO change per vote
```

### Key Functions

#### `eloToEthicalScore(elo: number): number`
Converts ELO rating to ethical score using tanh.

#### `calculateEloChange(numberOfVotes: number): number`
Calculates ELO change based on vote count (volatility reduction).

#### `updateElo(currentElo: number, isWinner: boolean, numberOfVotes: number): number`
Calculates new ELO after a vote.

#### `getInitialElo(): number`
Returns initial ELO for new cards (1500).

## Database Schema

Each card should have:
- `elo: number` - Current ELO rating (default: 1500)
- `matchups: number` - Total number of votes received (default: 0)

## Vote Processing Flow

1. User votes between two cards
2. Fetch current ELO and matchups for both cards from database
3. Calculate ELO change using `calculateEloChange(matchups)`
4. Update winner: `newElo = currentElo + change`
5. Update loser: `newElo = currentElo - change`
6. Increment matchups for both cards
7. Store updated values in database

## Why This System Works

### Philosophical Reasons

Ethics isn't binary:
- Extremes should be rare
- Consensus should emerge slowly
- No card should be "objectively evil" instantly

### Technical Benefits

- **Lets community values emerge** - No predetermined weights
- **Resists manipulation** - Volatility reduction prevents brigading
- **Produces interpretable results** - Bounded scores are easy to understand
- **Scales indefinitely** - Works with any number of cards and votes

## Future Enhancements

### Confidence Weighting (Advanced)

Track `votes_per_card` and display:
- Ethical score
- Confidence level (low / medium / high)

This helps users understand uncertainty in the ratings.

### Example Implementation

```typescript
function getConfidenceLevel(votes: number): string {
  if (votes < 10) return "low";
  if (votes < 50) return "medium";
  return "high";
}
```

## References

This system is inspired by:
- Chess ELO rating systems
- Machine learning normalization techniques
- Community-driven rating systems (e.g., Reddit, Stack Overflow)

## Summary

**TL;DR:**
- Keep ELO unbounded internally
- Win = +K, Loss = -K (where K reduces over time)
- Neutral = 1500
- Convert ELO → ethics: `ethical_score = 2 * tanh((elo - 1500) / 400)`
- Deck ethics = sum of 8 card ethical scores
- Range = [-16, +16] for full deck

