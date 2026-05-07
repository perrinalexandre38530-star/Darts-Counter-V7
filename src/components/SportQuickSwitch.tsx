import React from "react";
import { useSport, type SportId } from "../contexts/SportContext";

import logoDarts from "../assets/games/logo-darts.png";
import logoPetanque from "../assets/games/logo-petanque.png";
import logoPingPong from "../assets/games/logo-pingpong.png";
import logoBabyFoot from "../assets/games/logo-babyfoot.png";
import logoMolkky from "../assets/games/logo-molkky.png";
import logoDiceGame from "../assets/games/logo-dicegame.png";

type QuickSportId = Extract<SportId, "darts" | "petanque" | "babyfoot" | "pingpong" | "molkky" | "dicegame">;

const SPORTS: Array<{
  id: QuickSportId;
  label: string;
  logo: string;
  accent: string;
}> = [
  { id: "babyfoot", label: "Babyfoot", logo: logoBabyFoot, accent: "#ffcf5a" },
  { id: "dicegame", label: "Dice Game", logo: logoDiceGame, accent: "#b9a7ff" },
  { id: "darts", label: "Fléchettes", logo: logoDarts, accent: "#cfe48b" },
  { id: "molkky", label: "Mölkky", logo: logoMolkky, accent: "#f7b267" },
  { id: "petanque", label: "Pétanque", logo: logoPetanque, accent: "#8fd7ff" },
  { id: "pingpong", label: "Ping-Pong", logo: logoPingPong, accent: "#ff8fd7" },
];

const LS_KEY = "dc-start-game";

function normalizeSport(value: unknown): QuickSportId {
  const s = String(value || "").toLowerCase().trim();
  if (s === "babyfoot") return "babyfoot";
  if (s === "dicegame" || s === "dice" || s === "dice_game") return "dicegame";
  if (s === "molkky") return "molkky";
  if (s === "petanque") return "petanque";
  if (s === "pingpong") return "pingpong";
  return "darts";
}

function readStoredSport(): QuickSportId {
  try {
    return normalizeSport(window.localStorage.getItem(LS_KEY));
  } catch {
    return "darts";
  }
}

export default function SportQuickSwitch({ onAfterSwitch }: { onAfterSwitch?: () => void }) {
  const sportApi = useSport() as any;
  const currentSport = normalizeSport(sportApi?.sport ?? readStoredSport());
  const currentIndex = Math.max(0, SPORTS.findIndex((sport) => sport.id === currentSport));
  const current = SPORTS[currentIndex] || SPORTS[0];
  const next = SPORTS[(currentIndex + 1) % SPORTS.length] || SPORTS[0];

  const switchSport = React.useCallback(() => {
    const nextSport = next.id;

    try {
      sportApi?.setSport?.(nextSport);
    } catch {}

    try {
      window.localStorage.setItem(LS_KEY, nextSport);
    } catch {}

    try {
      window.dispatchEvent(
        new CustomEvent("dc:sport-change", {
          detail: { sport: nextSport, game: nextSport, source: "sport_quick_switch" },
        })
      );
    } catch {}

    try {
      (navigator as any)?.vibrate?.(10);
    } catch {}

    onAfterSwitch?.();
  }, [next.id, onAfterSwitch, sportApi]);

  return (
    <button
      type="button"
      onClick={switchSport}
      aria-label={`Sport actif : ${current.label}. Cliquer pour passer à ${next.label}.`}
      title={`Sport actif : ${current.label} → ${next.label}`}
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
        right: "calc(env(safe-area-inset-right, 0px) + 8px)",
        zIndex: 80,
        width: 54,
        height: 54,
        padding: 0,
        border: "none",
        borderRadius: 999,
        background: "transparent",
        boxShadow: "none",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        display: "grid",
        placeItems: "center",
        lineHeight: 1,
      }}
    >
      <img
        src={current.logo}
        alt=""
        aria-hidden="true"
        style={{
          width: 52,
          height: 52,
          objectFit: "contain",
          display: "block",
          filter: `drop-shadow(0 0 8px ${current.accent}AA) drop-shadow(0 0 14px rgba(0,0,0,0.75))`,
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </button>
  );
}
