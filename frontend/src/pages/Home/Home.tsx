import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { scanPlayerByNameAndClan, scanPlayerByTag } from "../../api/players";
import ActivePlayerBadge from "../../components/ActivePlayerBadge/ActivePlayerBadge";
import { useActivePlayer } from "../../state/ActivePlayerContext";
import "./Home.css";

import type * as CRTypes from "../../../../shared/types/cr-api-types";

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [clanName, setClanName] = useState("");
  const [playerTag, setPlayerTag] = useState("");
  const [data, setData] = useState<CRTypes.ScanPlayersResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { player: activePlayer, setPlayer, setPlayerProfile } = useActivePlayer();
  const [showSearchForm, setShowSearchForm] = useState(!activePlayer);
  const [usePlayerTag, setUsePlayerTag] = useState(false);

  async function onFetch() {
    setErr(null);
    setData(null);
    setShowSearchForm(true);

    const trimmedPlayerName = playerName.trim();
    const trimmedClanName = clanName.trim();
    const trimmedPlayerTag = playerTag.trim();

    if (usePlayerTag) {
      if (!trimmedPlayerTag) {
        setErr("Player tag is required");
        return;
      }
    } else {
      if (!trimmedPlayerName || !trimmedClanName) {
        setErr("Player name and clan name are required");
        return;
      }
    }

    setLoading(true);
    try {
      const resp = usePlayerTag
        ? await scanPlayerByTag(trimmedPlayerTag)
        : await scanPlayerByNameAndClan(trimmedPlayerName, trimmedClanName);
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
  const noResultsMessage = usePlayerTag
    ? "No player found with that tag."
    : "No players found. If your clan name is popular, use your player tag to search instead.";
  const primaryMatch = matches[0];
  const showWelcomeCard = !!activePlayer && !showSearchForm && !data && !loading;
  const errorMessage = (() => {
    if (!err) {
      return null;
    }
    const match = err.match(/\b(\d{3})\b/);
    if (!match) {
      return err;
    }
    const status = Number(match[1]);
    if (Number.isNaN(status)) {
      return err;
    }
    if (status >= 500) {
      return "Server issue. Try again later.";
    }
    if (status >= 400) {
      return "We couldn't find that player. Double-check the details and try again.";
    }
    return err;
  })();

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

  function onSwitchPlayer() {
    setPlayer(null);
    setData(null);
    setErr(null);
    setPlayerName("");
    setClanName("");
    setPlayerTag("");
    setUsePlayerTag(false);
    setShowSearchForm(true);
  }

  function onToggleSearchMode() {
    setUsePlayerTag((prev) => !prev);
    setErr(null);
    if (!data?.matches?.length) {
      setData(null);
    }
    setPlayerName("");
    setClanName("");
    setPlayerTag("");
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
              Clashbot is a Clash Royale deck builder and ethics evaluator. Start with player and clan names, or use a player tag if you already have it.
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
              <Link className="home__primary-btn home__vote-btn" to="/vote">
                Vote on Card Ethics
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
              <div className="home__form-header">
                <div>
                  <h2>Find your player</h2>
                </div>
                <button
                  className="cards__sort-toggle"
                  type="button"
                  onClick={onToggleSearchMode}
                  aria-pressed={usePlayerTag}
                  disabled={loading}
                >
                  {usePlayerTag ? "Use name + clan" : "Use player tag"}
                </button>
              </div>
              <div className="home__form-grid">
                <div
                  className={`home__form-mode home__form-mode--tag${
                    usePlayerTag ? " is-active" : ""
                  }`}
                  aria-hidden={!usePlayerTag}
                >
                  <label className="home__field">
                    Player tag
                    <input
                      value={playerTag}
                      onChange={(e) => setPlayerTag(e.target.value)}
                      placeholder="e.g. 298P8QUPG"
                      maxLength={30}
                      disabled={loading || !usePlayerTag}
                    />
                  </label>
                </div>
                <div
                  className={`home__form-mode home__form-mode--name${
                    usePlayerTag ? "" : " is-active"
                  }`}
                  aria-hidden={usePlayerTag}
                >
                  <label className="home__field">
                    Player name
                    <input
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="e.g. clashbot"
                      maxLength={30}
                      disabled={loading || usePlayerTag}
                    />
                  </label>
                  <label className="home__field">
                    Clan name
                    <input
                      value={clanName}
                      onChange={(e) => setClanName(e.target.value)}
                      placeholder="e.g. supersell"
                      maxLength={30}
                      disabled={loading || usePlayerTag}
                    />
                  </label>
                </div>
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
              <button className="home__ghost-btn" type="button" onClick={onSwitchPlayer}>
                Search another player
              </button>
            </div>
          )}
        </header>

        <section className="home__results">
          {errorMessage && <div className="home__error">{errorMessage}</div>}

          {!errorMessage && noResults && (
            <div className="home__hint">
              {noResultsMessage}
            </div>
          )}

          {!errorMessage && hasResults && primaryMatch && (
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
              </div>
            </>
          )}
        </section>

        <footer className="home__contact">
          <span>Contact us on</span>
          <a
            href="https://www.instagram.com/clashbot.wtf/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>
        </footer>
      </div>
    </div>
  );
}
