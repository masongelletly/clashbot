import "dotenv/config";
import express from "express";
import type { Request } from "express";
import cors from "cors";

import { scanClanForPlayer } from "./services/clans.js";
import { getPlayerDetails } from "./services/players.js";
import { calculateEthicsScore } from "./services/ethics.js";
import { generateClashbotOverview } from "./services/clashbot.js";
import { getRandomCards, processVote } from "./services/vote.js";
import { getAllCardsWithElo } from "./services/cards-elo.js";
import { closeDatabase, getConnectionStatus, isDatabaseConnected } from "./db/mongodb.js";
import type * as CRTypes from "../../shared/types/cr-api-types";

const BASE_URL = "https://api.clashroyale.com/v1";
const apiKey = process.env.CLASH_ROYALE_API_KEY;

const DEFAULT_CORS_ORIGINS = ["http://localhost:5173"];
const envCorsOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedCorsOrigins = new Set([...DEFAULT_CORS_ORIGINS, ...envCorsOrigins]);
const allowAnyCorsOrigin = allowedCorsOrigins.has("*");
const isCardVariant = (value: unknown): value is "base" | "evo" | "hero" =>
  value === "base" || value === "evo" || value === "hero";

const OVERVIEW_RATE_LIMIT_WINDOW_MS = 60_000;
const OVERVIEW_RATE_LIMIT_MAX = 6;
const overviewRateLimit = new Map<string, { count: number; windowStart: number }>();

const getClientIp = (req: Request): string =>
  req.ip || req.socket.remoteAddress || "unknown";

const checkOverviewRateLimit = (ip: string): { limited: boolean; retryAfterMs: number } => {
  const now = Date.now();
  const entry = overviewRateLimit.get(ip);

  if (!entry || now - entry.windowStart >= OVERVIEW_RATE_LIMIT_WINDOW_MS) {
    overviewRateLimit.set(ip, { count: 1, windowStart: now });
    return { limited: false, retryAfterMs: 0 };
  }

  if (entry.count >= OVERVIEW_RATE_LIMIT_MAX) {
    return {
      limited: true,
      retryAfterMs: entry.windowStart + OVERVIEW_RATE_LIMIT_WINDOW_MS - now,
    };
  }

  entry.count += 1;
  return { limited: false, retryAfterMs: 0 };
};

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
const server = app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

// Graceful shutdown: Close MongoDB connections when server stops
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Closing MongoDB connections...`);
  try {
    await closeDatabase();
    console.log("MongoDB connections closed.");
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));


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

// POST /api/ethics/overview
app.post("/api/ethics/overview", async (req, res) => {
  try {
    const payload = req.body as Partial<CRTypes.EthicsOverviewRequest>;
    if (!payload) {
      return res.status(400).send("Request body is required");
    }

    const playerTag = typeof payload.playerTag === "string"
      ? payload.playerTag.trim()
      : "";
    if (!playerTag) {
      return res.status(400).send("playerTag is required");
    }

    const clientIp = getClientIp(req);
    const rateLimit = checkOverviewRateLimit(clientIp);
    if (rateLimit.limited) {
      const retryAfterSeconds = Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000));
      res.set("Retry-After", String(retryAfterSeconds));
      return res
        .status(429)
        .send(`Rate limit exceeded. Try again in ${retryAfterSeconds}s.`);
    }

    const ethicsResult = await calculateEthicsScore(playerTag);
    const overview = await generateClashbotOverview(ethicsResult);
    return res.json(overview);
  } catch (e: any) {
    res.status(400).send(e?.message ?? String(e));
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

// GET /api/vote/random-cards - Get two random cards for voting
app.get("/api/vote/random-cards", async (req, res) => {
  try {
    const randomCards = await getRandomCards();
    return res.json(randomCards);
  } catch (e: any) {
    res.status(400).send(e?.message ?? String(e));
  }
});

// POST /api/vote - Submit a vote between two cards
app.post("/api/vote", async (req, res) => {
  try {
    const voteRequest = req.body;
    
    // Validate request
    if (typeof voteRequest.card1Id !== "number" || typeof voteRequest.card2Id !== "number") {
      return res.status(400).send("card1Id and card2Id are required numbers");
    }
    if (voteRequest.card1Id === voteRequest.card2Id) {
      return res.status(400).send("card1Id and card2Id must be different");
    }
    if (!voteRequest.card1Variant || !voteRequest.card2Variant) {
      return res.status(400).send("card1Variant and card2Variant are required");
    }
    if (!isCardVariant(voteRequest.card1Variant) || !isCardVariant(voteRequest.card2Variant)) {
      return res.status(400).send("card1Variant and card2Variant must be 'base', 'evo', or 'hero'");
    }
    if (voteRequest.winnerCardId === null) {
      if (voteRequest.winnerVariant != null) {
        return res.status(400).send("winnerVariant must be omitted when winnerCardId is null");
      }
    } else {
      if (typeof voteRequest.winnerCardId !== "number") {
        return res.status(400).send("winnerCardId must be a number or null");
      }
      if (voteRequest.winnerVariant == null) {
        return res.status(400).send("winnerVariant is required when winnerCardId is not null");
      }
      if (!isCardVariant(voteRequest.winnerVariant)) {
        return res.status(400).send("winnerVariant must be 'base', 'evo', or 'hero'");
      }
      if (voteRequest.winnerCardId !== voteRequest.card1Id && 
          voteRequest.winnerCardId !== voteRequest.card2Id) {
        return res.status(400).send("winnerCardId must match card1Id or card2Id");
      }
      const expectedWinnerVariant =
        voteRequest.winnerCardId === voteRequest.card1Id ? voteRequest.card1Variant : voteRequest.card2Variant;
      if (voteRequest.winnerVariant !== expectedWinnerVariant) {
        return res.status(400).send("winnerVariant must match the selected card's variant");
      }
    }

    const voteResponse = await processVote(voteRequest);
    return res.json(voteResponse);
  } catch (e: any) {
    res.status(400).send(e?.message ?? String(e));
  }
});

// GET /api/cards - Get all cards with ELO and ethics values
app.get("/api/cards", async (req, res) => {
  try {
    const cardsWithElo = await getAllCardsWithElo();
    return res.json({ items: cardsWithElo });
  } catch (e: any) {
    res.status(400).send(e?.message ?? String(e));
  }
});
