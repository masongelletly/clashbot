import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ActivePlayerBadge from "../../components/ActivePlayerBadge/ActivePlayerBadge";
import { useActivePlayer } from "../../state/ActivePlayerContext";
import { getEthicsScore } from "../../api/ethics";
import { normalizeCardLevel } from "../../utils/deckBuilder";
import "./Ethics.css";

import type * as CRTypes from "../../../../shared/types/cr-api-types";
import type { PlayerCard } from "../../utils/deckBuilder";

type PlayerMatch = CRTypes.scanClanForPlayerResponse;

type EthicsLocationState = {
  player?: PlayerMatch;
};

/**
 * Calculate position on gradient line (0-100%)
 * Score range: -5 to +5 (adjustable)
 * Center (grey) is at 50%
 */
function calculateGradientPosition(score: number): number {
  // Normalize score to 0-100% range
  // Assuming score range of -5 to +5, adjust as needed
  const minScore = -6;
  const maxScore = 6;
  const normalized = (score - minScore) / (maxScore - minScore);
  const clamped = Math.max(0, Math.min(1, normalized));
  return clamped * 100;
}

function formatDonationRatio(donated: number, received: number): string {
  if (!Number.isFinite(donated) || !Number.isFinite(received)) {
    return "—";
  }
  if (received === 0) {
    return donated === 0 ? "0.0" : "N/A";
  }
  const ratio = donated / received;
  return ratio.toFixed(1);
}

function scoreColor(score: number): string | null {
  if (score > 0) {
    return "#28a745";
  }
  if (score < 0) {
    return "#dc3545";
  }
  return null;
}

export default function Ethics() {
  const location = useLocation();
  const state = location.state as EthicsLocationState | null;
  const player = state?.player;
  const { player: activePlayer } = useActivePlayer();
  const displayPlayer = player ?? activePlayer;

  const [ethicsData, setEthicsData] = useState<CRTypes.EthicsCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!displayPlayer?.playerTag) {
      setEthicsData(null);
      return;
    }

    setLoading(true);
    setError(null);
    getEthicsScore(displayPlayer.playerTag)
      .then((data) => {
        setEthicsData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load ethics data");
        setLoading(false);
      });
  }, [displayPlayer?.playerTag]);

  const gradientPosition = ethicsData ? calculateGradientPosition(ethicsData.ethicsScore) : 50;
  const donationRatioDisplay = ethicsData
    ? formatDonationRatio(ethicsData.donations, ethicsData.donationsReceived)
    : "—";
  const deckScoreColor = ethicsData ? scoreColor(ethicsData.deckScore) : null;
  const donationScoreColor = ethicsData
    ? scoreColor(ethicsData.donationScore)
    : null;

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
            <Link className="page__link page__link--primary" to="/">
              Back to home
            </Link>
          </div>
        </header>

        {!displayPlayer ? (
          <section className="page__card ethics__card">
            <div className="page__player">
              No player context was provided. Head back and run a search.
            </div>
          </section>
        ) : loading ? (
          <section className="page__card ethics__card">
            <div className="ethics__loading">Loading ethics data...</div>
          </section>
        ) : error ? (
          <section className="page__card ethics__card">
            <div className="ethics__error">Error: {error}</div>
          </section>
        ) : ethicsData ? (
          <>
            <section className="page__card ethics__card">
              <h2>Ethics Score</h2>
              <div className="ethics__score-display">
                <div className="ethics__score-value">{ethicsData.ethicsScore.toFixed(2)}</div>
                <div className="ethics__score-breakdown">
                  <span style={deckScoreColor ? { color: deckScoreColor } : undefined}>
                    Deck: {ethicsData.deckScore.toFixed(2)}
                  </span>
                  <span 
                    style={donationScoreColor ? { color: donationScoreColor } : undefined}
                  >
                    Donations: {ethicsData.donationScore > 0 ? '+' : ''}{ethicsData.donationScore.toFixed(2)}
                  </span>
                </div>
                <div className="ethics__donation-info">
                  <span>
                    {ethicsData.donations} donated / {ethicsData.donationsReceived} received
                    {(ethicsData.donations > 0 || ethicsData.donationsReceived > 0) && (
                      <span className="ethics__donation-ratio">
                        {' '}({donationRatioDisplay} ratio)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Gradient Line */}
              <div className="ethics__gradient-container">
                <div className="ethics__gradient-line">
                  <div
                    className="ethics__gradient-dot"
                    style={{ left: `${gradientPosition}%` }}
                    title={`Ethics Score: ${ethicsData.ethicsScore.toFixed(2)}`}
                  />
                </div>
                <div className="ethics__gradient-labels">
                  <span>Unethical</span>
                  <span>Neutral</span>
                  <span>Ethical</span>
                </div>
              </div>

              {/* Current Battle Deck */}
              <div className="ethics__deck">
                <h3>Your Battle Deck</h3>
                {ethicsData.deckSlots.some(slot => slot !== null) ? (
                  <div className="ethics__deck-grid" aria-label="Current battle deck slots">
                    {ethicsData.deckSlots.map((slot, index) => {
                      if (!slot) {
                        return (
                          <div key={`empty-${index}`} className="ethics__slot">
                            <span className="ethics__card-empty">Empty</span>
                          </div>
                        );
                      }
                      
                      const cardNameFallback = (name: string) => {
                        if (typeof name === "string") {
                          return name;
                        }
                        const nameObj = name as unknown as { name?: string; en?: string };
                        return nameObj?.name ?? nameObj?.en ?? `Card ${slot.id}`;
                      };
                      
                      const cardName = cardNameFallback(slot.name);
                      const cardLevel = normalizeCardLevel(slot as PlayerCard);    
                                        
                      return (
                        <div
                          key={`${slot.id}-${index}`}
                          className={`ethics__slot ethics__slot--filled`}
                        >
                          <div className="ethics__card-figure">
                            {slot.iconUrl ? (
                              <img
                                className="ethics__card-img"
                                src={slot.iconUrl}
                                alt={cardName}
                                loading="lazy"
                              />
                            ) : (
                              <span className="ethics__card-name">{cardName}</span>
                            )}
                          </div>
                          <div className="ethics__card-level">Lvl {cardLevel}</div>
                          <div 
                            className="ethics__card-weight"
                            style={{ 
                              color: slot.weight > 0 ? '#28a745' : slot.weight < 0 ? '#dc3545' : '#6c757d' 
                            }}
                          >
                            {slot.weight > 0 ? '+' : ''}{slot.weight.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ethics__no-deck">
                    <p>No deck data available for this player.</p>
                    <p className="ethics__no-deck-hint">The player may not have a current battle deck set.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
