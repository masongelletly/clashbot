import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { scanPlayerByNameAndClan } from "../../api/players";
import ActivePlayerBadge from "../../components/ActivePlayerBadge/ActivePlayerBadge";
import { useActivePlayer } from "../../state/ActivePlayerContext";
import "./Home.css";

import type * as CRTypes from "../../../../shared/types/cr-api-types";

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [clanName, setClanName] = useState("");
  const [data, setData] = useState<CRTypes.ScanPlayersResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { player: activePlayer, setPlayer, setPlayerProfile } = useActivePlayer();
  const [showSearchForm, setShowSearchForm] = useState(!activePlayer);

  async function onFetch() {
    setErr(null);
    setData(null);
    setShowSearchForm(true);

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
  const primaryMatch = matches[0];
  const showWelcomeCard = !!activePlayer && !showSearchForm && !data && !loading;

  useEffect(() => {
    if (!primaryMatch) {
      return;
    }
    if (activePlayer?.playerTag === primaryMatch.playerTag) {
      return;
    }
    setPlayer(primaryMatch);
  }, [activePlayer?.playerTag, primaryMatch, setPlayer]);

  useEffect(() => {
    if (!data?.playerDetails) {
      return;
    }
    setPlayerProfile(data.playerDetails);
  }, [data?.playerDetails, setPlayerProfile]);

  useEffect(() => {
    if (activePlayer) {
      setShowSearchForm(false);
    }
  }, [activePlayer]);

  function onSwitchPlayer() {
    setPlayer(null);
    setData(null);
    setErr(null);
    setPlayerName("");
    setClanName("");
    setShowSearchForm(true);
  }

  return (
    <div className="home">
      <div className="home__orb home__orb--one" />
      <div className="home__orb home__orb--two" />
      <div className="home__orb home__orb--three" />

      <div className="home__layout">
        <div className="home__topbar">
          <ActivePlayerBadge />
        </div>
        <header className="home__hero">
          <div className="home__copy">
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
            <div className="home__vote-cta">
              <Link className="home__primary-btn" to="/vote">
                Help us improve our Ethics matrix, Vote Here
              </Link>
            </div>
          </div>

          {!showWelcomeCard ? (
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
                <button
                  className="home__primary-btn"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Searching..." : "Search Clash Royale"}
                </button>
              </div>
            </form>
          ) : (
            <div className="home__active-card">
              <div>
                <h2>Welcome back</h2>
                <div className="home__results-count">
                  Active player detected.
                </div>
              </div>
              {activePlayer && (
                <div className="home__active-player">
                  <strong>{activePlayer.matchedMemberName}</strong>{" "}
                  <span className="home__match-meta">
                    {activePlayer.playerTag}
                  </span>
                  <div className="home__match-meta">
                    Clan: {activePlayer.clanName} ({activePlayer.clanTag})
                  </div>
                </div>
              )}
              <div className="home__action-row">
                <Link className="home__primary-btn" to="/ethics">
                  Ethics check
                </Link>
                <Link className="home__primary-btn" to="/builder">
                  Deck builder
                </Link>
              </div>
              <div className="home__vote-cta">
                <Link className="home__primary-btn" to="/vote">
                  Help us improve our Ethics matrix, Vote Here
                </Link>
              </div>
              <button className="home__ghost-btn" type="button" onClick={onSwitchPlayer}>
                Search another player
              </button>
            </div>
          )}
        </header>

        <section className="home__results">
          {err && <div className="home__error">{err}</div>}

          {noResults && (
            <div className="home__hint">
              No players found matching that name in that clan.
            </div>
          )}

          {hasResults && primaryMatch && (
            <>
              <div className="home__found">
                <div className="home__found-header">
                  <h3 className="home__found-title">Found player</h3>
                </div>
                <div>
                  <strong>{primaryMatch.matchedMemberName}</strong>{" "}
                  <span className="home__match-meta">{primaryMatch.playerTag}</span>
                  <div className="home__match-meta">
                    Clan: {primaryMatch.clanName} ({primaryMatch.clanTag})
                  </div>
                </div>
                <div className="home__action-row">
                  <Link
                    className="home__primary-btn"
                    to="/ethics"
                    state={{ player: primaryMatch }}
                    onClick={() => setPlayer(primaryMatch)}
                  >
                    Ethics check
                  </Link>
                  <Link
                    className="home__primary-btn"
                    to="/builder"
                    state={{ player: primaryMatch }}
                    onClick={() => setPlayer(primaryMatch)}
                  >
                    Deck builder
                  </Link>
                </div>
                <div className="home__vote-cta">
                  <Link className="home__primary-btn" to="/vote">
                    Help us improve our Ethics matrix, Vote Here
                  </Link>
                </div>
              </div>

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
        </section>
      </div>
    </div>
  );
}
