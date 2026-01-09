import { Link, useLocation } from "react-router-dom";
import ActivePlayerBadge from "../../components/ActivePlayerBadge/ActivePlayerBadge";
import { useActivePlayer } from "../../state/ActivePlayerContext";
import "./Builder.css";

import type * as CRTypes from "../../../../shared/types/cr-api-types";

type PlayerMatch = CRTypes.scanClanForPlayerResponse;

type BuilderLocationState = {
  player?: PlayerMatch;
};

export default function Builder() {
  const location = useLocation();
  const state = location.state as BuilderLocationState | null;
  const player = state?.player;
  const { player: activePlayer } = useActivePlayer();
  const displayPlayer = player ?? activePlayer;

  return (
    <div className="page builder">
      <div className="page__layout">
        <header className="page__header">
          <div>
            <span className="page__eyebrow">Deck builder</span>
            <h1 className="page__title">Builder</h1>
            <p className="page__subtitle">
              Let's help you build an unstoppable deck.
            </p>
          </div>
          <div className="page__header-actions">
            <ActivePlayerBadge />
            <Link className="page__link" to="/">
              Back to home
            </Link>
          </div>
        </header>

        <section className="page__card builder__card">
          <h2>Your Optimal Deck</h2>
          <p className="builder__copy">
            This is your best possible deck considering card levels, trophies, and meta.
          </p>
          {displayPlayer && (
            <div className="page__player">
              <strong>{displayPlayer.matchedMemberName}</strong>{" "}
              <div>
                {displayPlayer.clanName}
              </div>
            </div>
          )}
          {!displayPlayer && (
            <div className="page__player">
              No player context was provided. Head back and run a search.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
