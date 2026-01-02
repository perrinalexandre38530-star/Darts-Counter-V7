// ============================================
// src/components/SettingsThemeSection.tsx
// Section "Thème" pour la page Réglages
// - Utilise THEMES (themePresets.ts)
// - Cercle transparent + halo néon animé
// - Carte qui se soulève au hover
// - Texte du thème dans sa couleur quand actif
// ============================================

import React from "react";
import { THEMES, type ThemeId, type AppTheme } from "../theme/themePresets";

type Props = {
  currentThemeId: ThemeId;
  onChangeTheme?: (id: ThemeId) => void;
};

// Descriptions visibles sous le nom du thème
const THEME_DESCRIPTIONS: Record<ThemeId, string> = {
  gold: "Thème premium doré",
  pink: "Ambiance arcade rose",
  petrol: "Bleu profond néon",
  green: "Style practice lumineux",
  magenta: "Violet / magenta intense",
  red: "Rouge arcade agressif",
  orange: "Orange chaud énergique",
  white: "Fond clair moderne",
};

// --------------------------------------------------
// Injection des keyframes pour l'animation du halo
// --------------------------------------------------
function injectThemeAnimationsOnce() {
  if (typeof document === "undefined") return;

  const STYLE_ID = "dc-theme-selector-animations";
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.innerHTML = `
    @keyframes dcThemeGlowPulse {
      0%   { box-shadow: 0 0 0px rgba(255,255,255,0.0); }
      40%  { box-shadow: 0 0 14px currentColor, 0 0 28px currentColor; }
      100% { box-shadow: 0 0 0px rgba(255,255,255,0.0); }
    }
  `;
  document.head.appendChild(style);
}

// --------------------------------------------------
// Composant principal : section "Thème"
// --------------------------------------------------
export default function SettingsThemeSection({
  currentThemeId,
  onChangeTheme,
}: Props) {
  React.useEffect(() => {
    injectThemeAnimationsOnce();
  }, []);

  function handleChangeTheme(id: ThemeId) {
    if (!onChangeTheme) return;
    onChangeTheme(id);
  }

  return (
    <section
      style={{
        marginBottom: 32,
      }}
    >
      {/* Titre de section "Thème" */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#F6C256",
          marginBottom: 12,
        }}
      >
        Thème
      </div>

      {/* Grille 2 colonnes de cartes de thème */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {THEMES.map((theme) => (
          <ThemeItem
            key={theme.id}
            theme={theme}
            active={theme.id === currentThemeId}
            description={THEME_DESCRIPTIONS[theme.id]}
            onPress={() => handleChangeTheme(theme.id)}
          />
        ))}
      </div>
    </section>
  );
}

// --------------------------------------------------
// Item individuel de thème
// --------------------------------------------------
type ItemProps = {
  theme: AppTheme;
  active: boolean;
  description: string;
  onPress: () => void;
};

function ThemeItem({ theme, active, description, onPress }: ItemProps) {
  const [hovered, setHovered] = React.useState(false);

  const neonColor = theme.primary;
  const baseBg = active
    ? "rgba(255,255,255,0.06)"
    : "rgba(255,255,255,0.02)";
  const borderColor = active ? neonColor : "rgba(255,255,255,0.10)";
  const textColorTitle = active ? neonColor : "#FFFFFF";
  const textColorDesc = active ? neonColor : "rgba(255,255,255,0.6)";
  const boxShadow =
    active || hovered ? `0 0 16px ${neonColor}66` : "0 0 0 rgba(0,0,0,0)";
  const scale = hovered ? 1.02 : 1.0;

  return (
    <div
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 18,
        padding: "14px 14px",
        background: baseBg,
        border: `1px solid ${borderColor}`,
        boxShadow,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        transform: `scale(${scale})`,
        transition:
          "transform 0.18s ease-out, box-shadow 0.18s ease-out, border-color 0.18s ease-out, background 0.18s ease-out",
      }}
    >
      {/* Cercle transparent + halo néon */}
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: `2px solid ${neonColor}`,
          background: "transparent",
          color: neonColor, // pour currentColor dans l'animation
          boxShadow: active
            ? `0 0 10px ${neonColor}, 0 0 20px ${neonColor}`
            : hovered
            ? `0 0 6px ${neonColor}`
            : "none",
          animation: active ? "dcThemeGlowPulse 2.2s ease-in-out infinite" : "",
          flexShrink: 0,
        }}
      />

      {/* Textes */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: textColorTitle,
          }}
        >
          {theme.name}
        </span>
        <span
          style={{
            fontSize: 13,
            marginTop: 2,
            color: textColorDesc,
          }}
        >
          {description}
        </span>
      </div>
    </div>
  );
}
