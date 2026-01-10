import { Link, useLocation } from "react-router-dom";
import ActivePlayerBadge from "../../components/ActivePlayerBadge/ActivePlayerBadge";
import { useActivePlayer } from "../../state/ActivePlayerContext";
import { buildOptimalDeck, normalizeCardLevel } from "../../utils/deckBuilder";
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
  const { player: activePlayer, playerProfile } = useActivePlayer();
  const displayPlayer = player ?? activePlayer;
  const deckCards = playerProfile
    ? buildOptimalDeck({
        cards: playerProfile.cards,
        trophies: playerProfile.trophies,
        arenaId: playerProfile.arena?.id ?? 0,
      }).deck
    : [];
  console.log(playerProfile?.arena?.id)
  const deckSlots = Array.from({ length: 8 }, (_, index) => deckCards[index] ?? null);
  const cardNameFallback = (card: CRTypes.PlayerProfileResponse["cards"][number]) => {
    if (typeof card.name === "string") {
      return card.name;
    }
    const nameObj = card.name as unknown as { name?: string; en?: string };
    return nameObj?.name ?? nameObj?.en ?? `Card ${card.id}`;
  };
  const cardIconUrl = (card: CRTypes.PlayerProfileResponse["cards"][number]) => {
    const icons = card.iconUrls as Record<string, string | undefined> | undefined;
    if (!icons) {
      return null;
    }
    return (
      icons.medium ??
      icons.evolutionMedium ??
      icons.heroMedium ??
      icons.large ??
      icons.small ??
      Object.values(icons).find(Boolean) ??
      null
    );
  };

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
          <div className="builder__deck-grid" aria-label="Optimal deck slots">
            {deckSlots.map((card, index) => {
              const isEvolutionSlot = index < 2;
              const isHeroSlot = index >= 2 && index < 4;
              const hasEvolution =
                card?.evolutionLevel === 1 || card?.evolutionLevel === 3;
              const hasHero =
                card?.evolutionLevel === 2 || card?.evolutionLevel === 3;
              const iconUrl =
                card && isEvolutionSlot && hasEvolution && card.iconUrls?.evolutionMedium
                  ? card.iconUrls.evolutionMedium
                  : card && isHeroSlot && hasHero && card.iconUrls?.heroMedium
                    ? card.iconUrls.heroMedium
                    : card
                      ? cardIconUrl(card)
                      : null;
              const cardName = card ? cardNameFallback(card) : "Empty";
              const cardLevel = card ? normalizeCardLevel(card) : null;
              return (
                <div
                  key={`${card?.id ?? "empty"}-${index}`}
                  className={`builder__slot${card ? " builder__slot--filled" : ""}`}
                >
                  {card ? (
                    <>
                      <div className="builder__card-figure">
                        {iconUrl ? (
                          <img
                            className="builder__card-img"
                            src={iconUrl}
                            alt={cardName}
                            loading="lazy"
                          />
                        ) : (
                          <span className="builder__card-name">{cardName}</span>
                        )}
                      </div>
                      <div className="builder__card-level">Lvl {cardLevel}</div>
                    </>
                  ) : (
                    <span className="builder__card-empty">Empty</span>
                  )}
                </div>
              );
            })}
          </div>
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
