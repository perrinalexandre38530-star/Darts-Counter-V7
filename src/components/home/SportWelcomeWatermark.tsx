import React from "react";
import logoDarts from "../../assets/games/logo-darts.webp";
import logoPetanque from "../../assets/games/logo-petanque.webp";
import logoPingPong from "../../assets/games/logo-pingpong.webp";
import logoBabyFoot from "../../assets/games/logo-babyfoot.webp";
import logoMolkky from "../../assets/games/logo-molkky.png";
import logoDiceGame from "../../assets/games/logo-dicegame.webp";
import logoFoot from "../../assets/games/logo-foot.png";
import logoRunning from "../../assets/games/logo-running-performance.webp";
import logoFit from "../../assets/games/logo-fit-performance.webp";

const LOGOS: Record<string, string> = {
  darts: logoDarts,
  petanque: logoPetanque,
  pingpong: logoPingPong,
  babyfoot: logoBabyFoot,
  molkky: logoMolkky,
  dicegame: logoDiceGame,
  dice: logoDiceGame,
  foot: logoFoot,
  running: logoRunning,
  fit: logoFit,
};

export default function SportWelcomeWatermark({
  sport,
  opacity = 0.12,
  side = "left",
  size = 190,
}: {
  sport: string;
  opacity?: number;
  side?: "left" | "right";
  size?: number;
}) {
  const src = LOGOS[String(sport || "").toLowerCase()];
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        position: "absolute",
        zIndex: 0,
        top: "50%",
        [side]: Math.round(size * -0.26),
        width: size,
        height: size,
        transform: "translateY(-50%) scale(1.16)",
        objectFit: "contain",
        opacity,
        filter: "grayscale(1) saturate(0) brightness(.82) contrast(1.18)",
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );
}
