import "dotenv/config";
import express from "express";
import cors from "cors";

import { scanClanForPlayer } from "./services/clans"
import { getPlayerDetails } from "./services/players";
import { crFetch } from "./crFetch";

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
