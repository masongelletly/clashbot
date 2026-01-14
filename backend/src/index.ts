import "dotenv/config";
import express from "express";
import cors from "cors";

import { scanClanForPlayer } from "./services/clans.js";
import { getPlayerDetails } from "./services/players.js";
import { calculateEthicsScore } from "./services/ethics.js";
import { getCardNameEntry } from "./services/mongo.js";

const BASE_URL = "https://api.clashroyale.com/v1";
const apiKey = process.env.CLASH_ROYALE_API_KEY;

const DEFAULT_CORS_ORIGINS = ["http://localhost:5173"];
const envCorsOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedCorsOrigins = new Set([...DEFAULT_CORS_ORIGINS, ...envCorsOrigins]);
const allowAnyCorsOrigin = allowedCorsOrigins.has("*");

// connect with our local frontend
const app = express();
app.use(express.json());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowAnyCorsOrigin) {
        callback(null, true);
        return;
      }
      if (allowedCorsOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);
if (!apiKey) {
  throw new Error("Missing CLASH_ROYALE_API_KEY in environment");
}
// backend boot
const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});


// --- ENDPOINTS ---
// health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// GET /api/players/scan?playerName=<name>&clanName=<clanName>
app.get("/api/players/scan", async (req, res) => {
  try {
    const playerName = String(req.query.playerName ?? "");
    const clanName = String(req.query.clanName ?? "");

    const matches = await scanClanForPlayer({ playerName, clanName });

    const first = matches[0];
    const playerDetails = first ? await getPlayerDetails(first.playerTag) : null;

    return res.json({ matches, playerDetails });
  } catch (e: any) {
    res.status(400).send(e?.message ?? String(e));
  }
});

// GET /api/ethics?playerTag=<tag>
app.get("/api/ethics", async (req, res) => {
  try {
    const playerTag = String(req.query.playerTag ?? "");
    if (!playerTag) {
      return res.status(400).send("playerTag is required");
    }

    const ethicsResult = await calculateEthicsScore(playerTag);
    return res.json(ethicsResult);
  } catch (e: any) {
    res.status(400).send(e?.message ?? String(e));
  }
});

// GET /api/values/card-names
app.get("/api/values/card-names", async (_req, res) => {
  try {
    const value = await getCardNameEntry();
    return res.json({ value });
  } catch (e: any) {
    res.status(500).send(e?.message ?? String(e));
  }
});

// GET /api/test-badges?playerTag=<tag> - Test endpoint to see badge data
app.get("/api/test-badges", async (req, res) => {
  try {
    const playerTag = String(req.query.playerTag ?? "");
    if (!playerTag) {
      return res.status(400).send("playerTag is required");
    }

    const { getPlayerDetails } = await import("./services/players.js");
    const playerProfile = await getPlayerDetails(playerTag);

    // Get all badges
    const allBadges = playerProfile.badges ?? [];
    console.log(`Total badges found: ${allBadges.length}`);

    // Filter to only badges with a target (card-related badges)
    const cardBadges = allBadges.filter(badge => badge.target != null && badge.target !== undefined);
    console.log(`Card-related badges: ${cardBadges.length}`);

    // Get the first card-related badge
    const testBadge = cardBadges[0];

    if (!testBadge) {
      return res.json({
        success: false,
        message: "No card-related badges found",
        totalBadges: allBadges.length,
        cardBadges: cardBadges.length,
        allBadgesSample: allBadges.slice(0, 3).map(b => ({
          name: b.name,
          hasTarget: b.target != null,
          target: b.target,
          level: b.level,
          maxLevel: b.maxLevel,
          progress: b.progress
        }))
      });
    }

    // Find the associated card
    const associatedCard = playerProfile.cards.find(c => c.id === testBadge.target);

    return res.json({
      success: true,
      totalBadges: allBadges.length,
      cardRelatedBadges: cardBadges.length,
      testBadge: {
        name: testBadge.name,
        level: testBadge.level,
        maxLevel: testBadge.maxLevel,
        progress: testBadge.progress,
        target: testBadge.target,
        iconUrls: testBadge.iconUrls,
        fullBadge: testBadge
      },
      associatedCard: associatedCard ? {
        id: associatedCard.id,
        name: associatedCard.name,
        level: associatedCard.level,
        elixirCost: associatedCard.elixirCost,
        iconUrls: associatedCard.iconUrls
      } : null,
      allCardBadges: cardBadges.map(b => ({
        name: b.name,
        target: b.target,
        level: b.level,
        maxLevel: b.maxLevel,
        progress: b.progress
      }))
    });
  } catch (e: any) {
    console.error("Error in test-badges endpoint:", e);
    res.status(400).json({
      success: false,
      error: e?.message ?? String(e),
      stack: e?.stack
    });
  }
});
