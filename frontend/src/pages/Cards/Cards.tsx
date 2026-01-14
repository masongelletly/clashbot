import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ActivePlayerBadge from "../../components/ActivePlayerBadge/ActivePlayerBadge";
import { getAllCardsWithElo } from "../../api/cards";
import "./Cards.css";

import type * as CRTypes from "../../../../shared/types/cr-api-types";

export default function Cards() {
  const [cards, setCards] = useState<CRTypes.CardWithElo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCards = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getAllCardsWithElo();
        setCards(response.items);
      } catch (e: any) {
        setError(e?.message || "Failed to load cards");
      } finally {
        setLoading(false);
      }
    };

    void loadCards();
  }, []);

  return (
    <div className="page cards">
      <div className="page__layout">
        <header className="page__header">
          <div>
            <span className="page__eyebrow">Card database</span>
            <h1 className="page__title">All Cards</h1>
            <p className="page__subtitle">
              View all cards with their current ELO ratings and ethics values.
            </p>
          </div>
          <div className="page__header-actions">
            <ActivePlayerBadge />
            <Link className="page__link" to="/vote">
              Back to vote
            </Link>
            <Link className="page__link" to="/">
              Back to home
            </Link>
          </div>
        </header>

        {loading ? (
          <section className="page__card cards__card">
            <div className="cards__loading">Loading cards...</div>
          </section>
        ) : error ? (
          <section className="page__card cards__card">
            <div className="cards__error">Error: {error}</div>
          </section>
        ) : (
          <section className="page__card cards__card">
            <div className="cards__grid">
              {cards.map((card) => (
                <div key={`${card.id}-${card.name}`} className="cards__card-item">
                  <div className="cards__card-figure">
                    {card.iconUrls?.medium ? (
                      <img
                        className="cards__card-img"
                        src={card.iconUrls.medium}
                        alt={card.name}
                        loading="lazy"
                      />
                    ) : (
                      <span className="cards__card-name">{card.name}</span>
                    )}
                  </div>
                  <div className="cards__card-info">
                    <div className="cards__card-title">{card.name}</div>
                    <div className="cards__card-stats">
                      <div className="cards__stat">
                        <span className="cards__stat-label">ELO:</span>
                        <span className="cards__stat-value">{card.elo.toFixed(0)}</span>
                      </div>
                      <div className="cards__stat">
                        <span className="cards__stat-label">Ethics:</span>
                        <span
                          className="cards__stat-value"
                          style={{
                            color:
                              card.ethicalScore > 0
                                ? "#28a745"
                                : card.ethicalScore < 0
                                  ? "#dc3545"
                                  : "#6c757d",
                          }}
                        >
                          {card.ethicalScore > 0 ? "+" : ""}
                          {card.ethicalScore.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {(card.hasEvo || card.hasHero) && (
                      <div className="cards__card-variants">
                        {card.hasEvo && <span className="cards__variant-badge">Evo</span>}
                        {card.hasHero && <span className="cards__variant-badge">Hero</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

