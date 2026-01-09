import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import type * as CRTypes from "../../../shared/types/cr-api-types";

type ActivePlayer = CRTypes.scanClanForPlayerResponse;

type ActivePlayerContextValue = {
  player: ActivePlayer | null;
  setPlayer: (player: ActivePlayer | null) => void;
};

const ActivePlayerContext = createContext<ActivePlayerContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "cr.activePlayer";

export function ActivePlayerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [player, setPlayerState] = useState<ActivePlayer | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    try {
      return JSON.parse(stored) as ActivePlayer;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (player) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [player]);

  const value = useMemo(
    () => ({
      player,
      setPlayer: setPlayerState,
    }),
    [player]
  );

  return (
    <ActivePlayerContext.Provider value={value}>
      {children}
    </ActivePlayerContext.Provider>
  );
}

export function useActivePlayer() {
  const context = useContext(ActivePlayerContext);
  if (!context) {
    throw new Error("useActivePlayer must be used within ActivePlayerProvider");
  }
  return context;
}
