import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllCardsWithElo } from "../../api/cards";
import "./Cards.css";

import type * as CRTypes from "../../../../shared/types/cr-api-types";

const getCardKey = (card: CRTypes.CardWithElo) => `${card.id}-${card.name}`;

export default function Cards() {
  const [cards, setCards] = useState<CRTypes.CardWithElo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isInverted, setIsInverted] = useState(false);
  const baseSortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      const ethicsDiff = b.ethicalScore - a.ethicalScore;
      if (ethicsDiff !== 0) {
        return ethicsDiff;
      }
      const nameDiff = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      if (nameDiff !== 0) {
        return nameDiff;
      }
      return a.id - b.id;
    });
  }, [cards]);
  const sortedCards = useMemo(() => {
    if (!isInverted) {
      return baseSortedCards;
    }
    return [...baseSortedCards].reverse();
  }, [baseSortedCards, isInverted]);
  const rankLookup = useMemo(() => {
    return new Map(
      baseSortedCards.map((card, index) => [getCardKey(card), index + 1])
    );
  }, [baseSortedCards]);
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
          <button
            className={`cards__sort-toggle${isInverted ? " is-active" : ""}`}
            type="button"
            onClick={() => setIsInverted((prev) => !prev)}
            aria-pressed={isInverted}
          >
            Inverse order
          </button>
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
          <section className="cards__table">
            <div className="cards__table-header">
              <div className="cards__col cards__col--rank">#</div>
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
                  const rowKey = getCardKey(card);
                  const rankValue = rankLookup.get(rowKey) ?? index + 1;

                  return (
                    <div key={rowKey} className="cards__row">
                      <div className="cards__cell cards__cell--rank" data-label="Rank">
                        {rankValue}
                      </div>
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
