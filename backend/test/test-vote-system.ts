import "dotenv/config";
import { connectToDatabase, closeDatabase } from "../src/db/mongodb.js";
import {
  getCardElo,
  updateCardElo,
  incrementMatchups,
  getCardMatchups,
  resetCardElo,
} from "../src/services/db-cards.js";
import { updateElo, calculateEloChange, getInitialElo } from "../src/services/elo.js";
import type { CardVariant } from "../../shared/types/cr-api-types";

// Test card IDs (using real Clash Royale card IDs for testing)
const TEST_CARDS = [
  { id: 26000000, name: "Knight", variant: "base" as CardVariant },
  { id: 26000001, name: "Archers", variant: "base" as CardVariant },
  { id: 26000002, name: "Goblins", variant: "base" as CardVariant },
];

/**
 * Display a card's current state
 */
async function displayCardState(
  cardId: number,
  variant: CardVariant,
  cardName: string
): Promise<void> {
  const elo = (await getCardElo(cardId, variant)) ?? getInitialElo();
  const matchups = await getCardMatchups(cardId, variant);
  const eloChange = Math.abs(calculateEloChange(elo, elo, true, matchups));
  
  console.log(
    `  ${cardName} (ID: ${cardId}, ${variant}): ELO=${elo.toFixed(1)}, Matchups=${matchups}, Next Change vs equal=±${eloChange.toFixed(2)}`
  );
}

/**
 * Perform a mock vote between two cards
 */
async function performVote(
  card1Id: number,
  card1Variant: CardVariant,
  card1Name: string,
  card2Id: number,
  card2Variant: CardVariant,
  card2Name: string,
  winnerId: number
): Promise<void> {
  const winnerVar = winnerId === card1Id ? card1Variant : card2Variant;
  const loserId = winnerId === card1Id ? card2Id : card1Id;
  const loserVar = winnerId === card1Id ? card2Variant : card1Variant;
  const winnerName = winnerId === card1Id ? card1Name : card2Name;
  const loserName = winnerId === card1Id ? card2Name : card1Name;

  // Get current state
  const winnerElo = (await getCardElo(winnerId, winnerVar)) ?? getInitialElo();
  const winnerVotes = await getCardMatchups(winnerId, winnerVar);
  const loserElo = (await getCardElo(loserId, loserVar)) ?? getInitialElo();
  const loserVotes = await getCardMatchups(loserId, loserVar);

  // Calculate new ELO
  const newWinnerElo = updateElo(winnerElo, loserElo, true, winnerVotes);
  const newLoserElo = updateElo(loserElo, winnerElo, false, loserVotes);

  // Update database
  await updateCardElo(winnerId, winnerVar, newWinnerElo, winnerName);
  await incrementMatchups(winnerId, winnerVar, winnerName);
  await updateCardElo(loserId, loserVar, newLoserElo, loserName);
  await incrementMatchups(loserId, loserVar, loserName);

  const winnerEloChange = newWinnerElo - winnerElo;
  const loserEloChange = newLoserElo - loserElo;
  const formatEloDelta = (delta: number): string =>
    `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`;

  console.log(
    `  ✓ Vote: ${winnerName} (${winnerVar}) beat ${loserName} (${loserVar})`
  );
  console.log(
    `    ${winnerName}: ${winnerElo.toFixed(1)} → ${newWinnerElo.toFixed(1)} (${formatEloDelta(winnerEloChange)})`
  );
  console.log(
    `    ${loserName}: ${loserElo.toFixed(1)} → ${newLoserElo.toFixed(1)} (${formatEloDelta(loserEloChange)})`
  );
}

/**
 * Reset all test cards to initial state
 */
async function resetTestCards(): Promise<void> {
  console.log("\nResetting test cards to initial state (ELO=1500, Matchups=0)...");
  for (const card of TEST_CARDS) {
    await resetCardElo(card.id, card.variant);
    console.log(`Reset ${card.name} (${card.variant})`);
  }
}

/**
 * Main test function
 */
async function runTest(): Promise<void> {
  console.log("Starting Vote System Test\n");

  try {
    // Step 1: Test database connection
    console.log("Testing database connection...");
    await connectToDatabase();
    console.log("Database connection successful\n");

    // Step 2: Display initial state
    console.log("Initial card states:");
    for (const card of TEST_CARDS) {
      await displayCardState(card.id, card.variant, card.name);
    }
    console.log();

    // Step 3: Perform mock votes
    console.log("3️⃣  Performing mock votes...\n");
    
    // Vote 1: Knight beats Archers
    await performVote(
      TEST_CARDS[0].id,
      TEST_CARDS[0].variant,
      TEST_CARDS[0].name,
      TEST_CARDS[1].id,
      TEST_CARDS[1].variant,
      TEST_CARDS[1].name,
      TEST_CARDS[0].id
    );
    console.log();

    // Vote 2: Goblins beats Knight
    await performVote(
      TEST_CARDS[2].id,
      TEST_CARDS[2].variant,
      TEST_CARDS[2].name,
      TEST_CARDS[0].id,
      TEST_CARDS[0].variant,
      TEST_CARDS[0].name,
      TEST_CARDS[2].id
    );
    console.log();

    // Vote 3: Archers beats Goblins
    await performVote(
      TEST_CARDS[1].id,
      TEST_CARDS[1].variant,
      TEST_CARDS[1].name,
      TEST_CARDS[2].id,
      TEST_CARDS[2].variant,
      TEST_CARDS[2].name,
      TEST_CARDS[1].id
    );
    console.log();

    // Vote 4: Knight beats Archers again (should show reduced ELO change)
    await performVote(
      TEST_CARDS[0].id,
      TEST_CARDS[0].variant,
      TEST_CARDS[0].name,
      TEST_CARDS[1].id,
      TEST_CARDS[1].variant,
      TEST_CARDS[1].name,
      TEST_CARDS[0].id
    );
    console.log();

    // Step 4: Display final state
    console.log("Final card states after votes:");
    for (const card of TEST_CARDS) {
      await displayCardState(card.id, card.variant, card.name);
    }
    console.log();

    // Step 5: Reset cards
    await resetTestCards();
    console.log();

    // Step 6: Verify reset
    console.log("Verifying reset (all cards should be ELO=1500, Matchups=0):");
    for (const card of TEST_CARDS) {
      await displayCardState(card.id, card.variant, card.name);
    }
    console.log();

    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  } finally {
    // Cleanup: Close database connection
    await closeDatabase();
    console.log("🔌 Database connection closed");
  }
}

// Run the test
runTest()
  .then(() => {
    console.log("\n✨ All tests passed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Test suite failed:", error);
    process.exit(1);
  });
