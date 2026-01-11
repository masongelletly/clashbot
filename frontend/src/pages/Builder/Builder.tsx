import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { Link, useLocation } from "react-router-dom";
import ActivePlayerBadge from "../../components/ActivePlayerBadge/ActivePlayerBadge";
import { useActivePlayer } from "../../state/ActivePlayerContext";
import {
  buildWinConditionDecks,
  normalizeCardLevel,
  type PreferredWinCondition,
} from "../../utils/deckBuilder";
import "./Builder.css";

import type * as CRTypes from "../../../../shared/types/cr-api-types";

type PlayerMatch = CRTypes.scanClanForPlayerResponse;
type PlayerCard = CRTypes.PlayerProfileResponse["cards"][number];

type BuilderLocationState = {
  player?: PlayerMatch;
};

const WIN_CONDITION_CONTENT: Record<
  PreferredWinCondition,
  { title: string; description: string }
> = {
  defense: {
    title: "Control",
    description: "One win condition alongside cycle and defense",
  },
  beatdown: {
    title: "Beatdown",
    description: "Heavy pushes with supporting cards built to overwhelm",
  },
  offense: {
    title: "Offensive",
    description: "Aggressive win conditions that maintain pressure",
  },
  secondary: {
    title: "Bait",
    description: "Several highly dangerous cards that can exhuast counters",
  },
};

const DECK_SLOT_COUNT = 8;

export default function Builder() {
  const location = useLocation();
  const state = location.state as BuilderLocationState | null;
  const player = state?.player;
  const { player: activePlayer, playerProfile } = useActivePlayer();
  const displayPlayer = player ?? activePlayer;

  const deckData = useMemo(() => {
    if (!playerProfile) {
      return { decks: [], optimalIndex: 0 };
    }
    return buildWinConditionDecks({
      cards: playerProfile.cards,
      trophies: playerProfile.trophies,
      arenaId: playerProfile.arena?.id ?? 0,
    });
  }, [playerProfile]);

  const deckCount = deckData.decks.length;
  const [activeIndex, setActiveIndex] = useState(deckData.optimalIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef(0);
  const activePointerId = useRef<number | null>(null);
  const swipeRef = useRef<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState(0);

  useEffect(() => {
    if (deckCount === 0) {
      setActiveIndex(0);
      setDragOffset(0);
      setIsDragging(false);
      return;
    }
    setActiveIndex(deckData.optimalIndex);
    setDragOffset(0);
    setIsDragging(false);
  }, [deckCount, deckData.optimalIndex]);

  useLayoutEffect(() => {
    const node = swipeRef.current;
    if (!node || deckCount === 0) {
      setCardWidth(0);
      return;
    }
    const updateWidth = () => {
      setCardWidth(node.getBoundingClientRect().width);
    };
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, [deckCount]);

  const canSwipe = deckCount > 1;
  const swipeThreshold = Math.max(80, cardWidth * 0.25);
  const trackOffset =
    cardWidth === 0
      ? 0
      : -activeIndex * cardWidth + (isDragging ? dragOffset : 0);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canSwipe) {
      return;
    }
    activePointerId.current = event.pointerId;
    dragStartX.current = event.clientX;
    setIsDragging(true);
    setDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || activePointerId.current !== event.pointerId) {
      return;
    }
    const delta = event.clientX - dragStartX.current;
    const atStart = activeIndex === 0 && delta > 0;
    const atEnd = activeIndex === deckCount - 1 && delta < 0;
    const resisted = atStart || atEnd ? delta * 0.35 : delta;
    setDragOffset(resisted);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || activePointerId.current !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const delta = event.clientX - dragStartX.current;
    if (Math.abs(delta) > swipeThreshold) {
      const direction = delta < 0 ? 1 : -1;
      setActiveIndex((prev) => {
        const next = prev + direction;
        if (next < 0 || next >= deckCount) {
          return prev;
        }
        return next;
      });
    }
    setIsDragging(false);
    setDragOffset(0);
    activePointerId.current = null;
  };

  const cardNameFallback = (card: PlayerCard) => {
    if (typeof card.name === "string") {
      return card.name;
    }
    const nameObj = card.name as unknown as { name?: string; en?: string };
    return nameObj?.name ?? nameObj?.en ?? `Card ${card.id}`;
  };
  const cardIconUrl = (card: PlayerCard) => {
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
  const emptyStateCopy = displayPlayer
    ? "We need your player profile to build decks. Try searching again."
    : "No player context was provided. Head back and run a search.";

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

        <section className="builder__swipe-shell">
          <div className="builder__swipe-header">
            <div>
              <h2>Your Best Decks</h2>
              <p className="builder__copy">
                Start on the optimal build and swipe to
                explore.
              </p>
            </div>
          </div>

          {deckCount > 0 ? (
            <>
              <div
                className={`builder__swipe${isDragging ? " builder__swipe--dragging" : ""}`}
                ref={swipeRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                role="region"
                aria-roledescription="deck carousel"
                aria-label="Swipeable decks by win condition"
              >
                <div
                  className={`builder__swipe-track${isDragging ? " is-dragging" : ""}`}
                  style={{ transform: `translateX(${trackOffset}px)` }}
                >
                  {deckData.decks.map((deck, deckIndex) => {
                    const deckSlots = Array.from(
                      { length: DECK_SLOT_COUNT },
                      (_, slotIndex) => deck.deck[slotIndex] ?? null
                    );
                    const deckContent = WIN_CONDITION_CONTENT[deck.winConditionType];
                    const isOptimal = deckIndex === deckData.optimalIndex;
                    return (
                      <article
                        key={deck.winConditionType}
                        className={`builder__deck${
                          deckIndex === activeIndex ? " is-active" : ""
                        }`}
                      >
                        <header className="builder__deck-header">
                          <div>
                            <div className="builder__deck-title">
                              <span className="builder__deck-label">
                                {deckContent.title}
                              </span>
                              {isOptimal && (
                                <span className="builder__deck-chip">Optimal</span>
                              )}
                            </div>
                            <p className="builder__deck-description">
                              {deckContent.description}
                            </p>
                          </div>
                          <div className="builder__deck-stat">
                            <span className="builder__deck-stat-label">Avg elixir</span>
                            <span className="builder__deck-stat-value">
                              {deck.averageElixir ? deck.averageElixir.toFixed(1) : "—"}
                            </span>
                          </div>
                        </header>

                        <div
                          className="builder__deck-grid"
                          aria-label={`${deckContent.title} deck slots`}
                        >
                          {deckSlots.map((card, slotIndex) => {
                            const isEvolutionSlot = slotIndex < 2;
                            const isHeroSlot = slotIndex >= 2 && slotIndex < 4;
                            const hasEvolution =
                              card?.evolutionLevel === 1 ||
                              card?.evolutionLevel === 3;
                            const hasHero =
                              card?.evolutionLevel === 2 || card?.evolutionLevel === 3;
                            const iconUrl =
                              card &&
                              isEvolutionSlot &&
                              hasEvolution &&
                              card.iconUrls?.evolutionMedium
                                ? card.iconUrls.evolutionMedium
                                : card &&
                                    isHeroSlot &&
                                    hasHero &&
                                    card.iconUrls?.heroMedium
                                  ? card.iconUrls.heroMedium
                                  : card
                                    ? cardIconUrl(card)
                                    : null;
                            const cardName = card ? cardNameFallback(card) : "Empty";
                            const cardLevel = card ? normalizeCardLevel(card) : null;
                            return (
                              <div
                                key={`${deck.winConditionType}-${card?.id ?? "empty"}-${slotIndex}`}
                                className={`builder__slot${
                                  card ? " builder__slot--filled" : ""
                                }`}
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
                                          draggable={false}
                                        />
                                      ) : (
                                        <span className="builder__card-name">
                                          {cardName}
                                        </span>
                                      )}
                                    </div>
                                    <div className="builder__card-level">
                                      Lvl {cardLevel}
                                    </div>
                                  </>
                                ) : (
                                  <span className="builder__card-empty">Empty</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {deckCount > 1 && (
                <div className="builder__swipe-hint">
                  Swipe left or right to switch decks.
                </div>
              )}

              {deckCount > 1 && (
                <div className="builder__swipe-dots" aria-hidden="true">
                  {deckData.decks.map((deck, deckIndex) => (
                    <span
                      key={`${deck.winConditionType}-${deckIndex}`}
                      className={`builder__swipe-dot${
                        deckIndex === activeIndex ? " is-active" : ""
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="page__player">{emptyStateCopy}</div>
          )}
        </section>
      </div>
    </div>
  );
}
