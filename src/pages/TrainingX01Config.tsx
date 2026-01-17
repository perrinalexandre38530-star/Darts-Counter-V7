// ============================================
// src/pages/TrainingX01Config.tsx
// Menu config avant Training X01 (comme X01ConfigV3, version light)
// - Sélection start score (301/501/701/901)
// - Sélection out mode (simple/double/master)
// - Affiche le profil courant + avatar
// - Lancer => go("training_x01_play", { startScore, outMode })
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useCurrentProfile } from "../hooks/useCurrentProfile";
import type { Profile } from "../lib/types";

const START_CHOICES = [301, 501, 701, 901] as const;
const OUT_CHOICES = ["simple", "double", "master"] as const;

export default function TrainingX01Config({
  go,
  params,
}: {
  go?: (tab: any, params?: any) => void;
  params?: any;
}) {
  const { theme } = useTheme();
  const { t } = useLang();
  const currentProfile = (useCurrentProfile() as Profile | null) ?? null;

  const [startScore, setStartScore] = React.useState<301 | 501 | 701 | 901>(() => {
    const v = Number(params?.startScore ?? 501);
    return (START_CHOICES.includes(v as any) ? v : 501) as any;
  });

  const [outMode, setOutMode] = React.useState<"simple" | "double" | "master">(() => {
    const v = params?.outMode;
    return (v === "simple" || v === "double" || v === "master") ? v : "double";
  });

  const avatarSrc = React.useMemo(() => {
    const p: any = currentProfile;
    if (!p) return null;
    if (typeof p.avatarDataUrl === "string") return p.avatarDataUrl;
    if (typeof p.avatarUrl === "string") return p.avatarUrl;
    if (typeof p.avatar === "string") return p.avatar;
    if (p.avatar && typeof p.avatar === "object") {
      if (typeof p.avatar.dataUrl === "string") return p.avatar.dataUrl;
      if (typeof p.avatar.url === "string") return p.avatar.url;
    }
    return null;
  }, [currentProfile]);

  const pageBg = theme.bg;
  const cardBg = theme.card;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: pageBg,
        color: theme.text,
        padding: 14,
        paddingBottom: 90,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 1,
            color: theme.primary,
            textShadow: `0 0 16px ${theme.primary}66`,
          }}
        >
          {t("training.x01.config.title", "TRAINING X01")}
        </div>
        <div style={{ fontSize: 12, color: theme.textSoft, marginTop: 4 }}>
          {t("training.x01.config.subtitle", "Configure ta session avant de lancer.")}
        </div>
      </div>

      {/* Profil */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: cardBg,
          padding: 12,
          boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 999,
            overflow: "hidden",
            border: `2px solid ${theme.primary}`,
            boxShadow: `0 0 14px ${theme.primary}66`,
            background: "rgba(0,0,0,0.35)",
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            color: theme.textSoft,
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            "?"
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: theme.textSoft }}>
            {t("training.x01.config.profile", "Joueur")}
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentProfile?.name ?? t("training.x01.config.profileFallback", "Profil")}
          </div>
        </div>
      </div>

      {/* Start score */}
      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: cardBg,
          padding: 12,
          boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 12, color: theme.textSoft, marginBottom: 8 }}>
          {t("training.x01.config.start", "Score de départ")}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {START_CHOICES.map((sc) => {
            const active = startScore === sc;
            return (
              <button
                key={sc}
                onClick={() => setStartScore(sc)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                  border: active
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.borderSoft}`,
                  background: active
                    ? `linear-gradient(180deg, ${theme.primary}, rgba(0,0,0,0.35))`
                    : "rgba(0,0,0,0.25)",
                  color: active ? "#0b0b0f" : theme.text,
                  cursor: "pointer",
                }}
              >
                {sc}
              </button>
            );
          })}
        </div>
      </div>

      {/* Out mode */}
      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: cardBg,
          padding: 12,
          boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 12, color: theme.textSoft, marginBottom: 8 }}>
          {t("training.x01.config.out", "Règle de sortie")}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {OUT_CHOICES.map((om) => {
            const active = outMode === om;
            const label =
              om === "simple" ? "Simple" : om === "double" ? "Double" : "Master";
            return (
              <button
                key={om}
                onClick={() => setOutMode(om)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                  border: active
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.borderSoft}`,
                  background: active
                    ? `linear-gradient(180deg, ${theme.primary}, rgba(0,0,0,0.35))`
                    : "rgba(0,0,0,0.25)",
                  color: active ? "#0b0b0f" : theme.text,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => {
          if (!go) return;
          go("training_x01_play", { startScore, outMode });
        }}
        style={{
          width: "100%",
          height: 48,
          borderRadius: 16,
          border: `1px solid ${theme.primary}`,
          background: `linear-gradient(180deg, ${theme.primary}, rgba(0,0,0,0.25))`,
          color: "#0b0b0f",
          fontWeight: 1000,
          letterSpacing: 1,
          boxShadow: `0 0 18px ${theme.primary}66`,
          cursor: "pointer",
        }}
      >
        {t("training.x01.config.launch", "LANCER")}
      </button>
    </div>
  );
}
