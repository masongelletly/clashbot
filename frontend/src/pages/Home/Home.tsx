import { useState } from "react";
import { scanPlayerByNameAndClan } from "../../api/players";
import "./Home.css";

import type * as CRTypes from "../../../../shared/types/cr-api-types";

export default function Home() {
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
  const hasResults = matches.length > 0;
  const noResults = !!data && matches.length === 0;

  return (
    <div className="home">
      <div className="home__orb home__orb--one" />
      <div className="home__orb home__orb--two" />
      <div className="home__orb home__orb--three" />

      <div className="home__layout">
        <header className="home__hero">
          <div className="home__copy">
            <span className="home__tag">No login. Just clash.</span>
            <h1>Clashbot</h1>
            <p>
              Clashbot is a Clash Royale deck builder and ethics evaluator. Player name and Clan name are required to retrieve your information.
            </p>
            <div className="home__hint-row">
              <div className="home__hint">
                Build a deck that considers your card levels and the current meta
              </div>
              <div className="home__hint">
                Let Clashbot determine if you are an ethical ruler
              </div>
            </div>
          </div>

          <form
            className="home__form-card"
            onSubmit={(event) => {
              event.preventDefault();
              void onFetch();
            }}
          >
            <div>
              <h2>Find your player</h2>
              <div className="home__results-count">
                Start with the player and clan name.
              </div>
            </div>
            <div className="home__form-grid">
              <label className="home__field">
                Player name
                <input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. clashbot"
                  disabled={loading}
                />
              </label>
              <label className="home__field">
                Clan name
                <input
                  value={clanName}
                  onChange={(e) => setClanName(e.target.value)}
                  placeholder="e.g. supersell"
                  disabled={loading}
                />
              </label>
            </div>
            <div className="home__actions">
              <button className="home__primary-btn" type="submit" disabled={loading}>
                {loading ? "Searching..." : "Search Clash Royale"}
              </button>
            </div>
          </form>
        </header>

        <section className="home__results">
          {err && <div className="home__error">{err}</div>}

          {noResults && (
            <div className="home__hint">
              No players found matching that name in that clan.
            </div>
          )}

          {hasResults && (
            <>
              <div className="home__results-header">
                <h3>Matches</h3>
                <div className="home__results-count">{matches.length} found</div>
              </div>
              <div className="home__grid">
                {matches.map((m) => (
                  <div
                    key={`${m.clanTag}:${m.playerTag}`}
                    className="home__match-card"
                  >
                    <div>
                      <strong>{m.matchedMemberName}</strong>{" "}
                      <span className="home__match-meta">{m.playerTag}</span>
                    </div>
                    <div className="home__match-meta">
                      Clan: {m.clanName} ({m.clanTag})
                    </div>
                    <div className="home__match-meta">
                      Trophies: {m.matchedTrophies}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {data?.playerDetails && (
            <details className="home__details">
              <summary>Raw player details</summary>
              <pre>{JSON.stringify(data.playerDetails, null, 2)}</pre>
            </details>
          )}
        </section>
      </div>
    </div>
  );
}
