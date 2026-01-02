// =============================================================
// src/components/DartSetSelector.tsx
// Sélecteur de jeu de fléchettes pour un joueur
// - Liste les sets du profil
// - Permet de choisir un set (ou "auto : préféré")
// - Compact, pour X01ConfigV3 & autres écrans de config
// - Affiche une vignette si le set possède une image (preset / photo)
// =============================================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import {
  getDartSetsForProfile,
  getFavoriteDartSetForProfile,
  type DartSet,
} from "../lib/dartSetsStore";

type Props = {
  profileId: string;
  value: string | null | undefined; // dartSetId sélectionné
  onChange: (dartSetId: string | null) => void;
};

// Mini composant fléchette (même logique que dans DartSetsPanel)
const DartImage: React.FC<{
  url: string;
  size?: number;
  angleDeg?: number;
}> = ({ url, size = 26, angleDeg = 55 }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${url})`,
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        transform: `rotate(${angleDeg}deg)`,
        transformOrigin: "center center",
      }}
    />
  );
};

const DartSetSelector: React.FC<Props> = ({ profileId, value, onChange }) => {
  const { palette } = useTheme();
  const { lang } = useLang();
  const primary = palette?.primary || "#f5c35b";

  const [sets, setSets] = React.useState<DartSet[]>([]);
  const [favorite, setFavorite] = React.useState<DartSet | null>(null);

  React.useEffect(() => {
    if (!profileId) {
      setSets([]);
      setFavorite(null);
      return;
    }
    const all = getDartSetsForProfile(profileId);
    setSets(all);
    const fav = getFavoriteDartSetForProfile(profileId) || null;
    setFavorite(fav);
  }, [profileId]);

  if (!profileId) return null;

  const hasSets = sets.length > 0;

  const label =
    lang === "fr"
      ? "Jeu de fléchettes"
      : lang === "es"
      ? "Juego de dardos"
      : lang === "de"
      ? "Dart-Set"
      : "Dart set";

  if (!hasSets) {
    return (
      <div
        style={{
          marginTop: 8,
          padding: "6px 8px",
          borderRadius: 10,
          background: "rgba(0,0,0,.4)",
          border: "1px dashed rgba(255,255,255,.14)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            color: "rgba(255,255,255,.6)",
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,.5)",
          }}
        >
          {lang === "fr"
            ? "Aucun jeu enregistré pour ce profil."
            : lang === "es"
            ? "Ningún juego registrado para este perfil."
            : lang === "de"
            ? "Kein Dart-Set für dieses Profil gespeichert."
            : "No dart set saved for this profile."}
        </div>
      </div>
    );
  }

  const currentIsAuto = !value && favorite;
  const current =
    value && sets.find((s) => s.id === value)
      ? sets.find((s) => s.id === value)
      : currentIsAuto
      ? favorite
      : null;

  const autoLabel =
    lang === "fr"
      ? "Auto : préféré"
      : lang === "es"
      ? "Auto: favorito"
      : lang === "de"
      ? "Auto: Favorit"
      : "Auto: favorite";

  return (
    <div
      style={{
        marginTop: 8,
        padding: "6px 8px",
        borderRadius: 12,
        background:
          "linear-gradient(135deg, rgba(6,6,14,.96), rgba(10,10,24,.96))",
        border: "1px solid rgba(255,255,255,.08)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1.5,
            color: "rgba(255,255,255,.7)",
          }}
        >
          {label}
        </div>

        {current && (
          <div
            style={{
              fontSize: 10,
              color: "rgba(180,255,210,.9)",
              textTransform: "uppercase",
              letterSpacing: 1.2,
            }}
          >
            {lang === "fr"
              ? "Sélectionné"
              : lang === "es"
              ? "Seleccionado"
              : lang === "de"
              ? "Ausgewählt"
              : "Selected"}
          </div>
        )}
      </div>

      {/* Liste horizontale */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        {/* Bouton AUTO (utilise le set préféré du profil) */}
        {favorite && (
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{
              flexShrink: 0,
              padding: "4px 8px",
              borderRadius: 999,
              border: currentIsAuto
                ? `1px solid ${primary}`
                : "1px solid rgba(255,255,255,.18)",
              background: currentIsAuto
                ? "radial-gradient(circle at 0% 0%, rgba(245,195,91,.35), rgba(16,16,32,.95))"
                : "rgba(0,0,0,.3)",
              color: currentIsAuto ? "#fff" : "rgba(255,255,255,.85)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>🎯</span>
            <span>{autoLabel}</span>
          </button>
        )}

        {/* Boutons pour chaque set */}
        {sets.map((set) => {
          const isSelected = value === set.id;

          // Compat avec la nouvelle archi : vignette (preset ou photo)
          const thumb =
            (set as any).thumbImageUrl ||
            (set as any).mainImageUrl ||
            undefined;
          const kind: string | undefined = (set as any).kind; // "preset" | "photo" | ...

          let kindLabel: string | null = null;
          if (kind === "preset") {
            kindLabel =
              lang === "fr"
                ? "Preset"
                : lang === "es"
                ? "Preset"
                : lang === "de"
                ? "Preset"
                : "Preset";
          } else if (kind === "photo") {
            kindLabel =
              lang === "fr"
                ? "Photo perso"
                : lang === "es"
                ? "Foto propia"
                : lang === "de"
                ? "Eigenes Foto"
                : "Custom photo";
          }

          return (
            <button
              key={set.id}
              type="button"
              onClick={() => onChange(set.id)}
              style={{
                flexShrink: 0,
                padding: "4px 8px",
                borderRadius: 999,
                border: isSelected
                  ? `1px solid ${primary}`
                  : "1px solid rgba(255,255,255,.18)",
                background: isSelected
                  ? "radial-gradient(circle at 0% 0%, rgba(127,226,169,.38), rgba(8,30,18,.96))"
                  : "rgba(4,4,10,.8)",
                color: isSelected ? "#fff" : "rgba(255,255,255,.85)",
                fontSize: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 120,
                maxWidth: 190,
              }}
            >
              {/* Vignette ronde avec fléchette orientée */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                  background:
                    "radial-gradient(circle at 30% 20%, #ffffff, #bbbbbb 40%, #333333 70%, #000000 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {thumb ? (
                  <DartImage url={thumb} size={26} angleDeg={55} />
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(0,0,0,.55)",
                    }}
                  >
                    🎯
                  </span>
                )}
              </div>

              {/* Texte */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 1,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    maxWidth: 130,
                  }}
                >
                  {set.name}
                </span>

                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                    fontSize: 9,
                    opacity: 0.8,
                  }}
                >
                  {set.weightGrams && <span>{`${set.weightGrams} g`}</span>}
                  {!set.weightGrams && set.brand && <span>{set.brand}</span>}
                  {kindLabel && (
                    <span
                      style={{
                        padding: "1px 4px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,.25)",
                        fontSize: 8,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      {kindLabel}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DartSetSelector;
