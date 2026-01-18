import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent,
} from "react";
import { Link, useLocation } from "react-router-dom";
import ActivePlayerBadge from "../../components/ActivePlayerBadge/ActivePlayerBadge";
import { useActivePlayer } from "../../state/ActivePlayerContext";
import {
  buildWinConditionDecks,
  buildWarDecks,
  normalizeCardLevel,
  type DeckOption,
  type WarDeckStrategy,
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

type DeckSwipeState = {
  activeIndex: number;
  isDragging: boolean;
  trackOffset: number;
  swipeRef: MutableRefObject<HTMLDivElement | null>;
  canSwipe: boolean;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  handlePointerEnd: (event: PointerEvent<HTMLDivElement>) => void;
};

const useDeckSwipe = (deckCount: number, initialIndex = 0): DeckSwipeState => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
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
    const nextIndex = Math.min(Math.max(0, initialIndex), deckCount - 1);
    setActiveIndex(nextIndex);
    setDragOffset(0);
    setIsDragging(false);
  }, [deckCount, initialIndex]);

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

  return {
    activeIndex,
    isDragging,
    trackOffset,
    swipeRef,
    canSwipe,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  };
};

export default function Builder() {
  const location = useLocation();
  const state = location.state as BuilderLocationState | null;
  const player = state?.player;
  const { player: activePlayer, playerProfile } = useActivePlayer();
  const displayPlayer = player ?? activePlayer;
  const trophies = playerProfile?.trophies ?? 0;
  const evoSlots =
    trophies > 3000 ? new Set([0, 1]) : new Set([0]);
  const heroSlots =
    trophies > 10000
      ? new Set([2, 3])
      : trophies > 5000
        ? new Set([2])
        : new Set<number>();

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
  const [spreadLove, setSpreadLove] = useState(true);
  const warStrategy: WarDeckStrategy = spreadLove ? "balanced" : "stacked";
  const warDecks = useMemo<DeckOption[]>(() => {
    if (!playerProfile) {
      return [];
    }
    return buildWarDecks({
      cards: playerProfile.cards,
      trophies: playerProfile.trophies ?? 0,
      arenaId: playerProfile.arena?.id ?? 0,
    }, { strategy: warStrategy });
  }, [playerProfile, warStrategy]);

  const warDeckCount = warDecks.length;
  const optimalSwipe = useDeckSwipe(deckCount, deckData.optimalIndex);
  const warSwipe = useDeckSwipe(warDeckCount, 0);

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
  const heroIconUrl = (card: PlayerCard) => {
    const cardName = cardNameFallback(card).toLowerCase();
    if (cardName === "wizard") {
      // TEMP: hero wizard is missing a hero iconUrl upstream, so fall back to base.
      return cardIconUrl(card);
    }
    return card.iconUrls?.heroMedium ?? cardIconUrl(card);
  };
  const getAverageLevel = (deck: DeckOption): number | null => {
    const filled = deck.deck.filter((card): card is PlayerCard => Boolean(card));
    if (filled.length === 0) {
      return null;
    }
    const total = filled.reduce((sum, card) => sum + normalizeCardLevel(card), 0);
    return total / filled.length;
  };
  const renderDeckCard = ({
    deck,
    deckIndex,
    activeIndex: currentIndex,
    label,
    description,
    chip,
    avgLevel,
    inlineStats,
    variant,
    ariaLabel,
    deckKey,
  }: {
    deck: DeckOption;
    deckIndex: number;
    activeIndex: number;
    label: string;
    description?: string;
    chip?: string;
    avgLevel?: number | null;
    inlineStats?: boolean;
    variant?: "war";
    ariaLabel: string;
    deckKey: string;
  }) => {
    const deckSlots = Array.from(
      { length: DECK_SLOT_COUNT },
      (_, slotIndex) => deck.deck[slotIndex] ?? null
    );

    return (
      <article
        key={deckKey}
        className={`builder__deck${
          deckIndex === currentIndex ? " is-active" : ""
        }${variant === "war" ? " builder__deck--war" : ""}`}
      >
        <header
          className={`builder__deck-header${
            inlineStats ? " builder__deck-header--inline" : ""
          }`}
        >
          <div className="builder__deck-title">
            <span className="builder__deck-label">{label}</span>
            {chip ? <span className="builder__deck-chip">{chip}</span> : null}
          </div>
          <div
            className={`builder__deck-meta${
              inlineStats ? " builder__deck-meta--inline" : ""
            }`}
          >
            {description ? (
              <p
                className={`builder__deck-description${
                  inlineStats ? " builder__deck-description--inline" : ""
                }`}
              >
                {description}
              </p>
            ) : null}
            <div
              className={`builder__deck-stats${
                inlineStats ? " builder__deck-stats--inline" : ""
              }`}
            >
              {avgLevel != null ? (
                <div
                  className={`builder__deck-stat${
                    inlineStats ? " builder__deck-stat--inline" : ""
                  }`}
                >
                  <span className="builder__deck-stat-label">Avg level</span>
                  <span className="builder__deck-stat-value">
                    {avgLevel.toFixed(1)}
                  </span>
                </div>
              ) : null}
              <div
                className={`builder__deck-stat${
                  inlineStats ? " builder__deck-stat--inline" : ""
                }`}
              >
                <span className="builder__deck-stat-label">Avg elixir</span>
                <span className="builder__deck-stat-value">
                  {deck.averageElixir ? deck.averageElixir.toFixed(1) : "—"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="builder__deck-grid" aria-label={ariaLabel}>
          {deckSlots.map((card, slotIndex) => {
            const isEvolutionSlot = evoSlots.has(slotIndex);
            const isHeroSlot = heroSlots.has(slotIndex);
            const hasEvolution =
              card?.evolutionLevel === 1 || card?.evolutionLevel === 3;
            const hasHero =
              card?.evolutionLevel === 2 || card?.evolutionLevel === 3;
            const iconUrl =
              card &&
                isEvolutionSlot &&
                hasEvolution &&
                card.iconUrls?.evolutionMedium
                ? card.iconUrls.evolutionMedium
                : card && isHeroSlot && hasHero
                  ? heroIconUrl(card)
                  : card
                    ? cardIconUrl(card)
                    : null;
            const cardName = card ? cardNameFallback(card) : "Empty";
            const cardLevel = card ? normalizeCardLevel(card) : null;
            return (
              <div
                key={`${deckKey}-${card?.id ?? "empty"}-${slotIndex}`}
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
                          draggable={false}
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
      </article>
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
              Let's help you build unstoppable decks.
            </p>
          </div>
          <div className="page__header-actions">
            <ActivePlayerBadge />
            <Link className="page__link page__link--primary" to="/">
              Back to home
            </Link>
          </div>
        </header>

        <section className="builder__swipe-shell">
          <div className="builder__swipe-header">
            <div>
              <h2>Best Decks</h2>
              <p className="builder__copy">
                Explore your personalized top decks by win condition
              </p>
            </div>
          </div>

          {deckCount > 0 ? (
            <>
              <div
                className={`builder__swipe${optimalSwipe.isDragging ? " builder__swipe--dragging" : ""}`}
                ref={optimalSwipe.swipeRef}
                onPointerDown={optimalSwipe.handlePointerDown}
                onPointerMove={optimalSwipe.handlePointerMove}
                onPointerUp={optimalSwipe.handlePointerEnd}
                onPointerCancel={optimalSwipe.handlePointerEnd}
                role="region"
                aria-roledescription="deck carousel"
                aria-label="Swipeable decks by win condition"
              >
                <div
                  className={`builder__swipe-track${optimalSwipe.isDragging ? " is-dragging" : ""}`}
                  style={{ transform: `translateX(${optimalSwipe.trackOffset}px)` }}
                >
                  {deckData.decks.map((deck, deckIndex) => {
                    const deckContent = WIN_CONDITION_CONTENT[deck.winConditionType];
                    const isOptimal = deckIndex === deckData.optimalIndex;
                    return renderDeckCard({
                      deck,
                      deckIndex,
                      activeIndex: optimalSwipe.activeIndex,
                      label: deckContent.title,
                      description: deckContent.description,
                      chip: isOptimal ? "Optimal" : undefined,
                      inlineStats: true,
                      ariaLabel: `${deckContent.title} deck slots`,
                      deckKey: `optimal-${deck.winConditionType}`,
                    });
                  })}
                </div>
              </div>

              {deckCount > 1 && (
                <div className="builder__swipe-dots" aria-hidden="true">
                  {deckData.decks.map((deck, deckIndex) => (
                    <span
                      key={`${deck.winConditionType}-${deckIndex}`}
                      className={`builder__swipe-dot${deckIndex === optimalSwipe.activeIndex ? " is-active" : ""
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

        {deckCount > 0 && (
          <section className="builder__swipe-shell">
            <div className="builder__swipe-header">
              <div>
                <h2>Clan War Decks</h2>
                <div className="builder__war-toggle">
                  <label className="builder__toggle">
                    <span className="builder__toggle-text">Distribute Levels</span>
                    <input
                      className="builder__toggle-input"
                      type="checkbox"
                      checked={spreadLove}
                      onChange={(event) => setSpreadLove(event.target.checked)}
                    />
                    <span className="builder__toggle-track" aria-hidden="true">
                      <span className="builder__toggle-thumb" />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {warDeckCount > 0 ? (
              <>
                <div
                  className={`builder__swipe${warSwipe.isDragging ? " builder__swipe--dragging" : ""}`}
                  ref={warSwipe.swipeRef}
                  onPointerDown={warSwipe.handlePointerDown}
                  onPointerMove={warSwipe.handlePointerMove}
                  onPointerUp={warSwipe.handlePointerEnd}
                  onPointerCancel={warSwipe.handlePointerEnd}
                  role="region"
                  aria-roledescription="deck carousel"
                  aria-label="Swipeable war decks"
                >
                  <div
                    className={`builder__swipe-track${warSwipe.isDragging ? " is-dragging" : ""}`}
                    style={{ transform: `translateX(${warSwipe.trackOffset}px)` }}
                  >
                    {warDecks.map((deck, deckIndex) => {
                      const deckContent = WIN_CONDITION_CONTENT[deck.winConditionType];
                      return renderDeckCard({
                        deck,
                        deckIndex,
                        activeIndex: warSwipe.activeIndex,
                        label: deckContent.title,
                        chip: `War Deck ${deckIndex + 1}`,
                        avgLevel: getAverageLevel(deck),
                        variant: "war",
                        ariaLabel: `War Deck ${deckIndex + 1} slots`,
                        deckKey: `war-${deck.winConditionType}-${deckIndex}`,
                      });
                    })}
                  </div>
                </div>

                {warDeckCount > 1 && (
                  <div className="builder__swipe-dots" aria-hidden="true">
                    {warDecks.map((deck, deckIndex) => (
                      <span
                        key={`war-${deck.winConditionType}-${deckIndex}`}
                        className={`builder__swipe-dot${
                          deckIndex === warSwipe.activeIndex ? " is-active" : ""
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
        )}
      </div>
    </div>
  );
}
