import { Link, useLocation } from "react-router-dom";
import ActivePlayerBadge from "../../components/ActivePlayerBadge/ActivePlayerBadge";
import { useActivePlayer } from "../../state/ActivePlayerContext";
import "./Ethics.css";

import type * as CRTypes from "../../../../shared/types/cr-api-types";

type PlayerMatch = CRTypes.scanClanForPlayerResponse;

type EthicsLocationState = {
  player?: PlayerMatch;
};

export default function Ethics() {
  const location = useLocation();
  const state = location.state as EthicsLocationState | null;
  const player = state?.player;
  const { player: activePlayer } = useActivePlayer();
  const displayPlayer = player ?? activePlayer;

  return (
    <div className="page ethics">
      <div className="page__layout">
        <header className="page__header">
          <div>
            <span className="page__eyebrow">Ethics check</span>
            <h1 className="page__title">Ethics</h1>
            <p className="page__subtitle">
              Let's take a look at your playstyle.
            </p>
          </div>
          <div className="page__header-actions">
            <ActivePlayerBadge />
            <Link className="page__link" to="/">
              Back to home
            </Link>
          </div>
        </header>

        <section className="page__card ethics__card">
          <h2>You are an angel</h2>
          <p className="ethics__copy">
            If frustrated by lack of content, please direct anger toward 'Breggen' of clan 'Plankton'
          </p>
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
