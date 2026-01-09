import { useState } from "react";
import { scanPlayerByNameAndClan } from "./api/players";

import type * as CRTypes from "../../shared/types/cr-api-types";

export default function App() {
  const [playerName, setPlayerName] = useState("");
  const [clanName, setClanName] = useState("");
  const [data, setData] = useState<CRTypes.ScanPlayersResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFetch() {
    setErr(null);
    setData(null);

    if (!playerName.trim() || !clanName.trim()) {
      setErr("Player name and clan name are required");
      return;
    }

    setLoading(true);
    try {
      const resp = await scanPlayerByNameAndClan(
        playerName.trim(),
        clanName.trim()
      );

      setData(resp);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  const matches = data?.matches ?? [];
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 900, color: "#111" }}>
      <h1>Clash Royale Viewer</h1>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Player name"
          style={{ padding: 8, width: 200 }}
        />
        <input
          value={clanName}
          onChange={(e) => setClanName(e.target.value)}
          placeholder="Clan name"
          style={{ padding: 8, width: 200 }}
        />
        <button onClick={onFetch} disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {err && (
        <pre style={{ marginTop: 16, padding: 12, background: "#fee", whiteSpace: "pre-wrap" }}>
          {err}
        </pre>
      )}

      {data && matches.length === 0 && (
        <div style={{ marginTop: 16, color: "#666" }}>
          No players found matching that name in that clan.
        </div>
      )}

      {matches.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>Matches ({matches.length})</h3>

          <div style={{ display: "grid", gap: 12 }}>
            {matches.map((m) => (
              <div
                key={`${m.clanTag}:${m.playerTag}`}
                style={{ padding: 12, background: "#f6f6f6", borderRadius: 6 }}
              >
                <div>
                  <strong>{m.matchedMemberName}</strong>{" "}
                  <span style={{ color: "#666" }}>{m.playerTag}</span>
                </div>
                <div style={{ fontSize: 14, color: "#444" }}>
                  Clan: {m.clanName} ({m.clanTag})
                </div>
                <div style={{ fontSize: 14 }}>Trophies: {m.matchedTrophies}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.playerDetails && (
        <pre style={{ marginTop: 16, padding: 12, background: "#f6f6f6", overflowX: "auto" }}>
          {JSON.stringify(data.playerDetails, null, 2)}
        </pre>
      )}
    </div>
  );
}
