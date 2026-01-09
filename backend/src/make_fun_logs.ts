import "dotenv/config";
import { scanClanForPlayer } from "./services/clans.js";
import { getPlayerDetails } from "./services/players.js";

const apiKey = process.env.CR_API_KEY;
if (!apiKey) {
  throw new Error("Set CR_API_KEY in your environment");
}

/* MANUAL INPUT FILL */
const playerName = "megafoon";
const clanName = "Kings Dominion";

// get player from basic clan information
const playerResults = await scanClanForPlayer({
  playerName: playerName,
  clanName: clanName,
});
const playerResult = playerResults[0]; // no need to handle this multi-match edge case now
console.log("Found player: " + playerResult.matchedMemberName + " " + playerResult.playerTag)

// get details on found player
let playerDetails = await getPlayerDetails(
    playerResult.playerTag
)

// evaluate level of mega knight
const playerCards = playerDetails.cards
const cardObj = playerCards.find(
  card => card.name.toLowerCase() === 'mega knight'
);
if (cardObj) {
  const megaKnightLevel = cardObj?.level + 8 // legendary adjustment
  console.log("Level of your Mega Knight: " + megaKnightLevel)
}

// output
const wins = playerDetails.wins;
console.log("Wins: " + wins)
const losses = playerDetails.losses;
console.log("Losses: " + losses)
const donations = playerDetails.donations
console.log("Donations Given: " + donations)
const donationsReceived = playerDetails.donationsReceived
console.log("Donations Received: " + donationsReceived)

console.log("\nThinking...")
console.log("You are an angel.")