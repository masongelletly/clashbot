import type { ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Builder from "./pages/Builder/Builder";
import Ethics from "./pages/Ethics/Ethics";
import Home from "./pages/Home/Home";
import {
  ActivePlayerProvider,
  useActivePlayer,
} from "./state/ActivePlayerContext";

function RequireActivePlayer({ children }: { children: ReactElement }) {
  const { player } = useActivePlayer();

  if (!player?.playerTag) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ActivePlayerProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/ethics"
            element={
              <RequireActivePlayer>
                <Ethics />
              </RequireActivePlayer>
            }
          />
          <Route
            path="/builder"
            element={
              <RequireActivePlayer>
                <Builder />
              </RequireActivePlayer>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ActivePlayerProvider>
  );
}
