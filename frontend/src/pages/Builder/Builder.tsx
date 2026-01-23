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
import { getAllCardsWithElo } from "../../api/cards";
import ActivePlayerBadge from "../../components/ActivePlayerBadge/ActivePlayerBadge";
import { useActivePlayer } from "../../state/ActivePlayerContext";
import { getHeroIconOverride } from "../../utils/cardIconOverrides";
import {
  buildCuratedDecks,
  buildWinConditionDecks,
  buildWarDecks,
  normalizeCardLevel,
  type CuratedDeckCard,
  type DeckOption,
  type WarDeckStrategy,
  type PreferredWinCondition,
} from "../../utils/deckBuilder";
import {
  cardUpgradeCounts,
  type CardUpgradeRarity,
} from "../../config/cardUpgradeCounts";
import { trueMetaDecks as trueMetaDefinitions } from "../../config/trueMetaDecks";
import "./Builder.css";

import type * as CRTypes from "../../../../shared/types/cr-api-types";

type PlayerMatch = CRTypes.scanClanForPlayerResponse;
type PlayerCard = CRTypes.PlayerProfileResponse["cards"][number];

type BuilderLocationState = {
  player?: PlayerMatch;
};

const TRUE_META_EVO_SLOTS = new Set([0, 1]);
const TRUE_META_HERO_SLOTS = new Set([2, 3]);
const TRUE_META_DEFINITION_BY_TITLE = new Map(
  trueMetaDefinitions.map((definition) => [definition.title, definition])
);

const NORMALIZED_MAX_LEVEL = cardUpgradeCounts.levels.length
  ? Math.max(...cardUpgradeCounts.levels)
  : 16;

const RARITY_BY_OFFSET: Record<number, CardUpgradeRarity> = {
  0: "common",
  2: "rare",
  5: "epic",
  8: "legendary",
  10: "champion",
};

const getUpgradeRarity = (card: PlayerCard): CardUpgradeRarity | null => {
  const rarity = card.rarity?.toLowerCase();
  if (rarity && rarity in cardUpgradeCounts.rarities) {
    return rarity as CardUpgradeRarity;
  }
  if (typeof card.maxLevel === "number") {
    const offset = NORMALIZED_MAX_LEVEL - card.maxLevel;
    return RARITY_BY_OFFSET[offset] ?? null;
  }
  return null;
};

const getMaxUpgradeLevel = (card: PlayerCard): number => {
  const normalizedLevel = normalizeCardLevel(card);
  const rarity = getUpgradeRarity(card);
  if (!rarity) {
    return normalizedLevel;
  }
  const rarityCounts = cardUpgradeCounts.rarities[rarity];
  let remainingCount = Math.max(0, Math.floor(card.count ?? 0));
  let level = Math.min(normalizedLevel, NORMALIZED_MAX_LEVEL);
  for (
    let nextLevel = level + 1;
    nextLevel <= NORMALIZED_MAX_LEVEL;
    nextLevel += 1
  ) {
    const cost = rarityCounts[String(nextLevel)];
    if (typeof cost !== "number") {
      break;
    }
    if (!Number.isFinite(cost)) {
      break;
    }
    if (remainingCount < cost) {
      break;
    }
    remainingCount -= cost;
    level = nextLevel;
  }
  return level;
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

type DisplayDeck = {
  deck: Array<PlayerCard | null>;
  averageElixir: number;
  cardRefs?: CuratedDeckCard[];
};

const getAverageLevel = (deck: DisplayDeck): number | null => {
  const filled = deck.deck.filter((card): card is PlayerCard => Boolean(card));
  if (filled.length === 0) {
    return null;
  }
  const total = filled.reduce((sum, card) => sum + normalizeCardLevel(card), 0);
  return total / filled.length;
};

const getAverageMaxLevel = (deck: DisplayDeck): number | null => {
  const filled = deck.deck.filter((card): card is PlayerCard => Boolean(card));
  if (filled.length === 0) {
    return null;
  }
  const total = filled.reduce((sum, card) => sum + getMaxUpgradeLevel(card), 0);
  return total / filled.length;
};

const normalizeLookupName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\s*\((evo|hero|evolution)\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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
  const dragStartY = useRef(0);
  const activePointerId = useRef<number | null>(null);
  const dragIntent = useRef<"pending" | "horizontal" | "vertical" | null>(null);
  const swipeRef = useRef<HTMLDivElement | null>(null);
  const [slideWidth, setSlideWidth] = useState(0);

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
      setSlideWidth(0);
      return;
    }
    const updateWidth = () => {
      const track = node.querySelector<HTMLElement>(".builder__swipe-track");
      const decks = track?.querySelectorAll<HTMLElement>(".builder__deck");
      if (!track || !decks || decks.length === 0) {
        setSlideWidth(node.getBoundingClientRect().width);
        return;
      }
      const deckRect = decks[0].getBoundingClientRect();
      let gap = 0;
      if (decks.length > 1) {
        const nextRect = decks[1].getBoundingClientRect();
        gap = nextRect.left - deckRect.right;
      } else {
        const gapToken = window.getComputedStyle(track).columnGap || "0";
        const gapValue = parseFloat(gapToken);
        gap = Number.isFinite(gapValue) ? gapValue : 0;
      }
      setSlideWidth(deckRect.width + gap);
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
  const swipeThreshold = Math.max(80, slideWidth * 0.2);
  const trackOffset =
    slideWidth === 0
      ? 0
      : -activeIndex * slideWidth + (isDragging ? dragOffset : 0);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canSwipe) {
      return;
    }
    activePointerId.current = event.pointerId;
    dragStartX.current = event.clientX;
    dragStartY.current = event.clientY;
    dragIntent.current = "pending";
    setIsDragging(false);
    setDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - dragStartX.current;
    const deltaY = event.clientY - dragStartY.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (dragIntent.current !== "horizontal") {
      if (dragIntent.current !== "pending") {
        return;
      }
      const intentThreshold = 12;
      if (absX < intentThreshold && absY < intentThreshold) {
        return;
      }
      if (absX >= absY * 1.2) {
        dragIntent.current = "horizontal";
      } else if (absY >= absX * 1.2) {
        dragIntent.current = "vertical";
        return;
      } else {
        return;
      }
    }

    if (!isDragging) {
      setIsDragging(true);
    }
    const atStart = activeIndex === 0 && deltaX > 0;
    const atEnd = activeIndex === deckCount - 1 && deltaX < 0;
    const resisted = atStart || atEnd ? deltaX * 0.35 : deltaX;
    setDragOffset(resisted);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (isDragging) {
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
    }
    setIsDragging(false);
    setDragOffset(0);
    dragIntent.current = null;
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
  const [showMaxLevels, setShowMaxLevels] = useState(false);
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

  const [cardCatalog, setCardCatalog] = useState<{
    byName: Map<string, CRTypes.CardWithElo>;
    byId: Map<number, CRTypes.CardWithElo>;
  }>({
    byName: new Map(),
    byId: new Map(),
  });

  useEffect(() => {
    if (!playerProfile) {
      return;
    }
    let isActive = true;
    const loadCards = async () => {
      try {
        const response = await getAllCardsWithElo();
        if (!isActive) {
          return;
        }
        const byName = new Map<string, CRTypes.CardWithElo>();
        const byId = new Map<number, CRTypes.CardWithElo>();
        response.items.forEach((card) => {
          const isVariant = /\((evo|hero)\)/i.test(card.name);
          if (isVariant) {
            return;
          }
          const normalized = normalizeLookupName(card.name);
          if (normalized && !byName.has(normalized)) {
            byName.set(normalized, card);
          }
          if (!byId.has(card.id)) {
            byId.set(card.id, card);
          }
        });
        setCardCatalog({ byName, byId });
      } catch {
        if (isActive) {
          setCardCatalog({ byName: new Map(), byId: new Map() });
        }
      }
    };
    void loadCards();
    return () => {
      isActive = false;
    };
  }, [playerProfile]);

  const trueMetaDecks = useMemo(() => {
    if (!playerProfile || trueMetaDefinitions.length === 0) {
      return [];
    }
    const decks = buildCuratedDecks(playerProfile.cards, trueMetaDefinitions).map(
      (deck) => ({
        ...deck,
        cardRefs: TRUE_META_DEFINITION_BY_TITLE.get(deck.title)?.cards ?? [],
      })
    );
    const averageForSort = (deck: DisplayDeck) => getAverageLevel(deck) ?? -Infinity;
    return [...decks].sort(
      (left, right) => averageForSort(right) - averageForSort(left)
    );
  }, [playerProfile, trueMetaDefinitions]);

  const trueMetaDeckCount = trueMetaDecks.length;
  const warDeckCount = warDecks.length;
  const optimalSwipe = useDeckSwipe(deckCount, deckData.optimalIndex);
  const trueMetaSwipe = useDeckSwipe(trueMetaDeckCount, 0);
  const warSwipe = useDeckSwipe(warDeckCount, 0);

  const cardNameFallback = (card: PlayerCard) => {
    if (typeof card.name === "string") {
      return card.name;
    }
    const nameObj = card.name as unknown as { name?: string; en?: string };
    return nameObj?.name ?? nameObj?.en ?? `Card ${card.id}`;
  };
  const resolveCatalogCard = (reference?: CuratedDeckCard) => {
    if (reference == null) {
      return null;
    }
    if (typeof reference === "number") {
      return cardCatalog.byId.get(reference) ?? null;
    }
    const normalized = normalizeLookupName(reference);
    return cardCatalog.byName.get(normalized) ?? null;
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
    const heroOverride = getHeroIconOverride(cardName);
    if (heroOverride) {
      return heroOverride;
    }
    return card.iconUrls?.heroMedium ?? cardIconUrl(card);
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
    inlineHeader = inlineStats,
    showUpgradePotential,
    showAvgElixir = true,
    slotLayout,
    variant,
    ariaLabel,
    deckKey,
  }: {
    deck: DisplayDeck;
    deckIndex: number;
    activeIndex: number;
    label: string;
    description?: string;
    chip?: string;
    avgLevel?: number | null;
    inlineStats?: boolean;
    inlineHeader?: boolean;
    showUpgradePotential?: boolean;
    showAvgElixir?: boolean;
    slotLayout?: "true-meta";
    variant?: "war";
    ariaLabel: string;
    deckKey: string;
  }) => {
    const deckSlots = Array.from(
      { length: DECK_SLOT_COUNT },
      (_, slotIndex) => deck.deck[slotIndex] ?? null
    );
    const showAvgLevelStat = avgLevel != null;
    const showAvgElixirStat = showAvgElixir;
    const showUpgradeStats = showUpgradePotential !== undefined;
    const maxAvgLevel = showUpgradeStats ? getAverageMaxLevel(deck) : null;
    const showMaxAvgLevelStat = maxAvgLevel != null;
    const upgradeHidden = showUpgradePotential === false;
    const showMeta =
      Boolean(description) ||
      showAvgLevelStat ||
      showAvgElixirStat ||
      showMaxAvgLevelStat;
    const isTrueMetaLayout = slotLayout === "true-meta";

    return (
      <article
        key={deckKey}
        className={`builder__deck${
          deckIndex === currentIndex ? " is-active" : ""
        }${variant === "war" ? " builder__deck--war" : ""}${
          isTrueMetaLayout ? " builder__deck--true-meta" : ""
        }`}
      >
        <header
          className={`builder__deck-header${
            inlineHeader ? " builder__deck-header--inline" : ""
          }${isTrueMetaLayout ? " builder__deck-header--true-meta" : ""}`}
        >
          <div className="builder__deck-title">
            <span className="builder__deck-label">{label}</span>
            {chip ? <span className="builder__deck-chip">{chip}</span> : null}
          </div>
          {showMeta ? (
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
                {showAvgLevelStat ? (
                  <div
                    className={`builder__deck-stat${
                      inlineStats ? " builder__deck-stat--inline" : ""
                    }`}
                  >
                    <span className="builder__deck-stat-label">Avg level</span>
                    <span className="builder__deck-stat-value">
                      {avgLevel?.toFixed(1)}
                    </span>
                  </div>
                ) : null}
                {showMaxAvgLevelStat ? (
                  <div
                    className={`builder__deck-stat builder__deck-stat--upgrade${
                      inlineStats ? " builder__deck-stat--inline" : ""
                    }${upgradeHidden ? " is-hidden" : ""}`}
                  >
                    <span className="builder__deck-stat-label">Max avg level</span>
                    <span className="builder__deck-stat-value">
                      {maxAvgLevel?.toFixed(1)}
                    </span>
                  </div>
                ) : null}
                {showAvgElixirStat ? (
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
                ) : null}
              </div>
            </div>
          ) : null}
        </header>

        <div className="builder__deck-grid" aria-label={ariaLabel}>
          {deckSlots.map((card, slotIndex) => {
            const cardRef = deck.cardRefs?.[slotIndex];
            const evoSlotSet = isTrueMetaLayout
              ? TRUE_META_EVO_SLOTS
              : evoSlots;
            const heroSlotSet = isTrueMetaLayout
              ? TRUE_META_HERO_SLOTS
              : heroSlots;
            const isEvolutionSlot = evoSlotSet.has(slotIndex);
            const isHeroSlot = heroSlotSet.has(slotIndex);
            const hasEvolution =
              card?.evolutionLevel === 1 || card?.evolutionLevel === 3;
            const hasHero =
              card?.evolutionLevel === 2 || card?.evolutionLevel === 3;
            const isMissingCard = !card && isTrueMetaLayout && cardRef != null;
            const missingCard = isMissingCard ? resolveCatalogCard(cardRef) : null;
            const shouldUseEvolution = isEvolutionSlot && hasEvolution;
            const shouldUseHero = isHeroSlot && hasHero;
            const iconUrl = card
              ? shouldUseEvolution && card.iconUrls?.evolutionMedium
                ? card.iconUrls.evolutionMedium
                : shouldUseHero
                  ? heroIconUrl(card)
                  : cardIconUrl(card)
              : missingCard?.iconUrls?.medium ?? null;
            const cardName = card
              ? cardNameFallback(card)
              : missingCard?.name ??
                (typeof cardRef === "string" ? cardRef : "Unknown Card");
            const cardLevel = card ? normalizeCardLevel(card) : isMissingCard ? 0 : null;
            const showUpgradeBadge = showUpgradeStats;
            const upgradeLevel =
              card && showUpgradeBadge ? getMaxUpgradeLevel(card) : null;
            const isFilled = Boolean(card) || isMissingCard;
            return (
              <div
                key={`${deckKey}-${card?.id ?? cardRef ?? "empty"}-${slotIndex}`}
                className={`builder__slot${isFilled ? " builder__slot--filled" : ""}`}
              >
                {isFilled ? (
                  <>
                    <div
                      className={`builder__card-figure${
                        isMissingCard ? " builder__card-figure--missing" : ""
                      }`}
                    >
                      {iconUrl ? (
                        <img
                          className={`builder__card-img${
                            isMissingCard ? " builder__card-img--missing" : ""
                          }`}
                          src={iconUrl}
                          alt={cardName}
                          loading="lazy"
                          draggable={false}
                        />
                      ) : (
                        <span className="builder__card-name">{cardName}</span>
                      )}
                    </div>
                    <div className="builder__card-level">Lvl {cardLevel ?? 0}</div>
                    {showUpgradeBadge && upgradeLevel != null ? (
                      <div
                        className={`builder__card-level builder__card-level--upgrade${
                          upgradeHidden ? " is-hidden" : ""
                        }`}
                        title={`Up to Lvl ${upgradeLevel}`}
                        aria-hidden={upgradeHidden || undefined}
                      >
                        Max {upgradeLevel}
                      </div>
                    ) : null}
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

        {trueMetaDeckCount > 0 && (
          <section className="builder__swipe-shell">
            <div className="builder__swipe-header">
              <div>
                <h2>True Meta</h2>
                <p className="builder__copy">
                  Very strong decks in the current meta. Potential max level shows what
                  level you <strong><em>could</em></strong> upgrade the card to,
                  ignoring gold and magic items
                </p>
              </div>
              <button
                type="button"
                className={`builder__max-toggle${
                  showMaxLevels ? " is-active" : ""
                }`}
                onClick={() => setShowMaxLevels((prev) => !prev)}
                aria-pressed={showMaxLevels}
              >
                potential max level
              </button>
            </div>

            <div
              className={`builder__swipe${trueMetaSwipe.isDragging ? " builder__swipe--dragging" : ""}`}
              ref={trueMetaSwipe.swipeRef}
              onPointerDown={trueMetaSwipe.handlePointerDown}
              onPointerMove={trueMetaSwipe.handlePointerMove}
              onPointerUp={trueMetaSwipe.handlePointerEnd}
              onPointerCancel={trueMetaSwipe.handlePointerEnd}
              role="region"
              aria-roledescription="deck carousel"
              aria-label="Swipeable true meta decks"
            >
              <div
                className={`builder__swipe-track${trueMetaSwipe.isDragging ? " is-dragging" : ""}`}
                style={{ transform: `translateX(${trueMetaSwipe.trackOffset}px)` }}
              >
                {trueMetaDecks.map((deck, deckIndex) =>
                  renderDeckCard({
                    deck,
                    deckIndex,
                    activeIndex: trueMetaSwipe.activeIndex,
                    label: deck.title,
                    avgLevel: getAverageLevel(deck),
                    inlineStats: true,
                    inlineHeader: false,
                    showUpgradePotential: showMaxLevels,
                    showAvgElixir: false,
                    slotLayout: "true-meta",
                    ariaLabel: `${deck.title} deck slots`,
                    deckKey: `true-meta-${deckIndex}`,
                  })
                )}
              </div>
            </div>

            {trueMetaDeckCount > 1 && (
              <div className="builder__swipe-dots" aria-hidden="true">
                {trueMetaDecks.map((deck, deckIndex) => (
                  <span
                    key={`true-meta-${deck.title}-${deckIndex}`}
                    className={`builder__swipe-dot${
                      deckIndex === trueMetaSwipe.activeIndex ? " is-active" : ""
                    }`}
                  />
                ))}
              </div>
            )}
          </section>
        )}

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

        <section className="builder__swipe-shell">
          <div className="builder__swipe-header">
            <div>
              <h2>Your Win Conditions</h2>
              <p className="builder__copy">
                Find a different way to play your game
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
      </div>
    </div>
  );
}
