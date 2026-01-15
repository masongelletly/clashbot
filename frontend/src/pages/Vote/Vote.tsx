import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRandomCards, submitVote } from "../../api/vote";
import "./Vote.css";

import type * as CRTypes from "../../../../shared/types/cr-api-types";

type EloAnimation = {
  id: string;
  cardId: number;
  delta: number;
};

const formatEloDelta = (delta: number): string => {
  const rounded = Math.round(delta);
  if (rounded === 0) {
    return "0";
  }
  return `${rounded > 0 ? "+" : ""}${rounded}`;
};

export default function Vote() {
  const [card1, setCard1] = useState<CRTypes.Card | null>(null);
  const [card2, setCard2] = useState<CRTypes.Card | null>(null);
  const [card1Variant, setCard1Variant] = useState<CRTypes.CardVariant>("base");
  const [card2Variant, setCard2Variant] = useState<CRTypes.CardVariant>("base");
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eloAnimations, setEloAnimations] = useState<EloAnimation[]>([]);

  // Get the appropriate icon URL based on variant
  const getCardIconUrl = (card: CRTypes.Card, variant: CRTypes.CardVariant): string | undefined => {
    if (variant === "evo" && card.iconUrls?.evolutionMedium) {
      return card.iconUrls.evolutionMedium;
    }
    if (variant === "hero" && card.iconUrls?.heroMedium) {
      return card.iconUrls.heroMedium;
    }
    return card.iconUrls?.medium;
  };

  const card1IconUrl = card1 ? getCardIconUrl(card1, card1Variant) : undefined;
  const card2IconUrl = card2 ? getCardIconUrl(card2, card2Variant) : undefined;

  // Load random cards on mount and after vote
  const loadCards = async () => {
    setLoading(true);
    setError(null);
    try {
      const cards = await getRandomCards();
      setCard1(cards.card1);
      setCard2(cards.card2);
      setCard1Variant(cards.card1Variant);
      setCard2Variant(cards.card2Variant);
    } catch (e: any) {
      setError(e?.message || "Failed to load cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCards();
  }, []);

  const handleVote = async (winnerCardId: number | null) => {
    if (!card1 || !card2 || voting) {
      return;
    }

    setVoting(true);
    setError(null);

    // Determine winner variant
    const winnerVariant = winnerCardId === card1.id ? card1Variant : 
                          winnerCardId === card2.id ? card2Variant : undefined;

    try {
      const response = await submitVote({
        card1Id: card1.id,
        card1Variant,
        card2Id: card2.id,
        card2Variant,
        winnerCardId,
        winnerVariant,
      });

      if (response.eloDeltas && response.eloDeltas.length > 0) {
        const timestamp = Date.now();
        const newAnimations = response.eloDeltas
          .filter((delta) => delta.delta !== 0)
          .map((delta, index) => ({
            id: `${delta.cardId}-${timestamp}-${index}`,
            cardId: delta.cardId,
            delta: delta.delta,
          }));

        if (newAnimations.length > 0) {
          setEloAnimations(newAnimations);
          setTimeout(() => {
            setEloAnimations([]);
          }, 2000);
        }
      }

      // Small delay to let animations play before loading new cards
      setTimeout(async () => {
        await loadCards();
      }, 500);
    } catch (e: any) {
      setError(e?.message || "Failed to submit vote");
      setEloAnimations([]);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="page vote">
      <div className="page__layout">
        <header className="page__header">
          <div>
            <span className="page__eyebrow">Ethics Voting</span>
            <h1 className="page__title">Vote</h1>
          </div>
          <div className="page__header-actions">
            <Link className="page__link page__link--primary" to="/cards">
              View All Cards
            </Link>
            <Link className="page__link page__link--primary" to="/">
              Back to home
            </Link>
          </div>
        </header>

        {loading && !card1 && !card2 ? (
          <div className="vote__status">
            <div className="vote__loading">Loading cards...</div>
          </div>
        ) : error ? (
          <div className="vote__status">
            <div className="vote__error">Error: {error}</div>
          </div>
        ) : card1 && card2 ? (
          <div className="vote__container">
            <div className="vote__prompt">Which Card is More Ethical?</div>
            <div className="vote__cards">
              {/* Card 1 */}
              <div className="vote__card-wrapper">
                <button
                  className="vote__card-button"
                  onClick={() => handleVote(card1.id)}
                  disabled={voting || loading}
                  aria-label={`Select ${card1.name}`}
                >
                  <div className="vote__card-figure">
                    {card1IconUrl ? (
                      <img
                        className="vote__card-img"
                        src={card1IconUrl}
                        alt={card1.name}
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  {eloAnimations
                    .filter((anim) => anim.cardId === card1.id)
                    .map((anim) => (
                      <div
                        key={anim.id}
                        className={`vote__elo-animation ${
                          anim.delta >= 0 ? "vote__elo-animation--positive" : "vote__elo-animation--negative"
                        }`}
                      >
                        {formatEloDelta(anim.delta)}
                      </div>
                    ))}
                </button>
                <div className="vote__card-label">{card1.name}</div>
              </div>

              {/* VS divider */}
              <div className="vote__divider">VS</div>

              {/* Card 2 */}
              <div className="vote__card-wrapper">
                <button
                  className="vote__card-button"
                  onClick={() => handleVote(card2.id)}
                  disabled={voting || loading}
                  aria-label={`Select ${card2.name}`}
                >
                  <div className="vote__card-figure">
                    {card2IconUrl ? (
                      <img
                        className="vote__card-img"
                        src={card2IconUrl}
                        alt={card2.name}
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  {eloAnimations
                    .filter((anim) => anim.cardId === card2.id)
                    .map((anim) => (
                      <div
                        key={anim.id}
                        className={`vote__elo-animation ${
                          anim.delta >= 0 ? "vote__elo-animation--positive" : "vote__elo-animation--negative"
                        }`}
                      >
                        {formatEloDelta(anim.delta)}
                      </div>
                    ))}
                </button>
                <div className="vote__card-label">{card2.name}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
