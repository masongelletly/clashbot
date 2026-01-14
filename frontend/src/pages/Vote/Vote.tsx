import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ActivePlayerBadge from "../../components/ActivePlayerBadge/ActivePlayerBadge";
import { getRandomCards, submitVote } from "../../api/vote";
import "./Vote.css";

import type * as CRTypes from "../../../../shared/types/cr-api-types";

const ELO_CHANGE = 32; // Should match backend ELO_BASE_CHANGE (reduces over time)

type EloAnimation = {
  id: string;
  cardId: number;
  value: number;
  isPositive: boolean;
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

    // Show ELO animations
    if (winnerCardId !== null) {
      const winnerId = winnerCardId;
      const loserId = winnerId === card1.id ? card2.id : card1.id;
      
      const newAnimations: EloAnimation[] = [
        {
          id: `winner-${Date.now()}-${Math.random()}`,
          cardId: winnerId,
          value: ELO_CHANGE,
          isPositive: true,
        },
        {
          id: `loser-${Date.now()}-${Math.random()}`,
          cardId: loserId,
          value: -ELO_CHANGE,
          isPositive: false,
        },
      ];
      
      setEloAnimations(newAnimations);
      
      // Remove animations after they finish
      setTimeout(() => {
        setEloAnimations([]);
      }, 2000);
    }

    try {
      await submitVote(card1.id, card1Variant, card2.id, card2Variant, winnerCardId, winnerVariant);
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
            <span className="page__eyebrow">Card comparison</span>
            <h1 className="page__title">Vote</h1>
            <p className="page__subtitle">
              Which card do you prefer? Or skip if you can't decide.
            </p>
          </div>
          <div className="page__header-actions">
            <ActivePlayerBadge />
            <Link className="page__link" to="/cards">
              View All Cards
            </Link>
            <Link className="page__link" to="/">
              Back to home
            </Link>
          </div>
        </header>

        {loading && !card1 && !card2 ? (
          <section className="page__card vote__card">
            <div className="vote__loading">Loading cards...</div>
          </section>
        ) : error ? (
          <section className="page__card vote__card">
            <div className="vote__error">Error: {error}</div>
          </section>
        ) : card1 && card2 ? (
          <section className="page__card vote__card">
            <div className="vote__container">
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
                      {getCardIconUrl(card1, card1Variant) ? (
                        <img
                          className="vote__card-img"
                          src={getCardIconUrl(card1, card1Variant)}
                          alt={card1.name}
                          loading="lazy"
                        />
                      ) : (
                        <span className="vote__card-name">{card1.name}</span>
                      )}
                    </div>
                    <div className="vote__card-label">{card1.name}</div>
                  </button>
                  {eloAnimations
                    .filter((anim) => anim.cardId === card1.id)
                    .map((anim) => (
                      <div
                        key={anim.id}
                        className={`vote__elo-animation ${
                          anim.isPositive ? "vote__elo-animation--positive" : "vote__elo-animation--negative"
                        }`}
                      >
                        {anim.isPositive ? "+" : ""}{anim.value}
                      </div>
                    ))}
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
                      {getCardIconUrl(card2, card2Variant) ? (
                        <img
                          className="vote__card-img"
                          src={getCardIconUrl(card2, card2Variant)}
                          alt={card2.name}
                          loading="lazy"
                        />
                      ) : (
                        <span className="vote__card-name">{card2.name}</span>
                      )}
                    </div>
                    <div className="vote__card-label">{card2.name}</div>
                  </button>
                  {eloAnimations
                    .filter((anim) => anim.cardId === card2.id)
                    .map((anim) => (
                      <div
                        key={anim.id}
                        className={`vote__elo-animation ${
                          anim.isPositive ? "vote__elo-animation--positive" : "vote__elo-animation--negative"
                        }`}
                      >
                        {anim.isPositive ? "+" : ""}{anim.value}
                      </div>
                    ))}
                </div>
              </div>

              {/* Skip button */}
              <button
                className="vote__skip-button"
                onClick={() => handleVote(null)}
                disabled={voting || loading}
              >
                {voting ? "Submitting..." : "Skip (Neither)"}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

