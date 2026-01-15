import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllCardsWithElo } from "../../api/cards";
import "./Cards.css";

import type * as CRTypes from "../../../../shared/types/cr-api-types";

export default function Cards() {
  const [cards, setCards] = useState<CRTypes.CardWithElo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const isSearching = search.trim().length > 0;
  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => b.elo - a.elo),
    [cards]
  );
  const filteredCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return sortedCards;
    }
    return sortedCards.filter((card) =>
      card.name.toLowerCase().includes(normalizedSearch)
    );
  }, [sortedCards, search]);

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
            <span className="page__eyebrow">Card Collection</span>
            <h1 className="page__title">All Cards</h1>
            <p className="page__subtitle">
              View all cards with their current ELO ratings and ethics values.
            </p>
          </div>
          <div className="page__header-actions">
            <Link className="page__link page__link--primary" to="/vote">
              Back to vote
            </Link>
            <Link className="page__link page__link--primary" to="/">
              Back to home
            </Link>
          </div>
        </header>

        <div className="cards__search">
          <input
            className="cards__search-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search cards"
            aria-label="Search cards"
          />
        </div>

        {loading ? (
          <section className="page__card">
            <div className="cards__loading">Loading cards...</div>
          </section>
        ) : error ? (
          <section className="page__card">
            <div className="cards__error">Error: {error}</div>
          </section>
        ) : (
          <section className={`cards__table${isSearching ? " cards__table--searching" : ""}`}>
            <div className="cards__table-header">
              {!isSearching && <div className="cards__col cards__col--rank">#</div>}
              <div className="cards__col cards__col--card">Card</div>
              <div className="cards__col cards__col--elo">ELO</div>
              <div className="cards__col cards__col--ethics">Ethics</div>
            </div>
            <div className="cards__table-body">
              {filteredCards.length === 0 ? (
                <div className="cards__empty">No cards match your search.</div>
              ) : (
                filteredCards.map((card, index) => {
                  const ethicsClass =
                    card.ethicalScore > 0
                      ? "cards__metric cards__metric--positive"
                      : card.ethicalScore < 0
                        ? "cards__metric cards__metric--negative"
                        : "cards__metric cards__metric--neutral";

                  return (
                    <div key={`${card.id}-${card.name}`} className="cards__row">
                      {!isSearching && (
                        <div className="cards__cell cards__cell--rank" data-label="Rank">
                          {index + 1}
                        </div>
                      )}
                      <div className="cards__cell cards__cell--card" data-label="Card">
                        <div className="cards__card-media">
                          <div className="cards__card-figure">
                            {card.iconUrls?.medium ? (
                              <img
                                className="cards__card-img"
                                src={card.iconUrls.medium}
                                alt={card.name}
                                loading="lazy"
                              />
                            ) : (
                              <span className="cards__card-fallback">{card.name}</span>
                            )}
                          </div>
                          <div className="cards__card-meta">
                            <div className="cards__card-title">{card.name}</div>
                          </div>
                        </div>
                      </div>
                      <div className="cards__cell cards__cell--elo" data-label="ELO">
                        <span className="cards__metric">{card.elo.toFixed(0)}</span>
                      </div>
                      <div className="cards__cell cards__cell--ethics" data-label="Ethics">
                        <span className={ethicsClass}>
                          {card.ethicalScore > 0 ? "+" : ""}
                          {card.ethicalScore.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
