// ============================================
// src/components/DuelHeaderCompact.tsx
// Header duel compact : avatars réduits + score set/legs
// Ultra-compact : ronds qui se chevauchent légèrement
// ============================================

import React from "react";

type Props = {
  leftAvatarUrl: string;
  rightAvatarUrl: string;
  leftSets: number;
  rightSets: number;
  leftLegs: number;
  rightLegs: number;
};

export const DuelHeaderCompact: React.FC<Props> = ({
  leftAvatarUrl,
  rightAvatarUrl,
  leftSets,
  rightSets,
  leftLegs,
  rightLegs,
}) => {
  // Style “triple” pour les petits ronds de sets
  const setPillStyle: React.CSSProperties = {
    minWidth: 16,
    height: 16,
    padding: "0 3px",
    borderRadius: 999,
    border: "1px solid rgba(255, 105, 180, 0.9)", // contour rose
    background: "rgba(255, 105, 180, 0.18)", // fond léger rose
    color: "#ff79c6", // texte rose
    fontSize: 9,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    boxSizing: "border-box",
  };

  const legPillStyle: React.CSSProperties = {
    minWidth: 20,
    height: 18,
    padding: "0 5px",
    borderRadius: 999,
    background: "rgba(246,194,86,0.25)",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4, // resserré
        padding: "1px 6px",
        borderRadius: 999,
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(0,0,0,0.45))",
        boxShadow: "0 0 10px rgba(0,0,0,0.55)",
      }}
    >
      {/* Avatar gauche */}
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "999px",
          overflow: "hidden",
          boxShadow: "0 0 0 2px rgba(246,194,86,0.55)",
          flexShrink: 0,
        }}
      >
        <img
          src={leftAvatarUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* SCORE CENTRAL */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6, // petit espace entre les deux blocs
          fontWeight: 700,
          position: "relative",
        }}
      >
        {/* fond doré subtil derrière le score */}
        <div
          style={{
            position: "absolute",
            width: "80%",
            height: "65%",
            borderRadius: 999,
            background:
              "radial-gradient(circle, rgba(246,194,86,0.22), transparent 70%)",
            filter: "blur(3px)",
            zIndex: 0,
          }}
        />

        {/* Bloc gauche : set (rose) qui chevauche leg (doré) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            zIndex: 1,
          }}
        >
          <span
            style={{
              ...setPillStyle,
              marginRight: -6, // chevauchement sur le leg
            }}
          >
            {leftSets}
          </span>
          <span style={legPillStyle}>{leftLegs}</span>
        </div>

        {/* Bloc droite : leg (doré) puis set (rose) qui chevauche */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            zIndex: 1,
          }}
        >
          <span style={legPillStyle}>{rightLegs}</span>
          <span
            style={{
              ...setPillStyle,
              marginLeft: -6, // chevauchement sur le leg
            }}
          >
            {rightSets}
          </span>
        </div>
      </div>

      {/* Avatar droite */}
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "999px",
          overflow: "hidden",
          boxShadow: "0 0 0 2px rgba(246,194,86,0.55)",
          flexShrink: 0,
        }}
      >
        <img
          src={rightAvatarUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </div>
  );
};
