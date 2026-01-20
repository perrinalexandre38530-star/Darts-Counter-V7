// ============================================
// src/pages/TrainingX01Config.tsx
// Training X01 — Mini menu de configuration (comme X01ConfigV3)
// - Configure startScore + outMode AVANT le play
// - Lance le play avec config verrouillée (pas de chips en haut)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useCurrentProfile } from "../hooks/useCurrentProfile";

import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";

import tickerX01 from "../assets/tickers/ticker_x01.png";

type Tab = "training" | "training_x01_play";

type Props = {
  store?: any;
  go?: (tab: any, params?: any) => void;
};

const START_CHOICES = [301, 501, 701, 901] as const;
const OUT_CHOICES = ["simple", "double", "master"] as const;

function resolveAvatarSrc(profile: any): string | null {
  if (!profile) return null;
  const p = profile as any;
  // clés usuelles dans le projet
  const direct =
    (typeof p.avatarDataUrl === "string" && p.avatarDataUrl) ||
    (typeof p.avatarUrl === "string" && p.avatarUrl) ||
    (typeof p.avatar === "string" && p.avatar) ||
    (typeof p.avatar_data_url === "string" && p.avatar_data_url) ||
    (typeof p.avatar_url === "string" && p.avatar_url) ||
    null;
  if (direct) return direct;

  if (p.avatar && typeof p.avatar === "object") {
    const o = p.avatar as any;
    if (typeof o.dataUrl === "string") return o.dataUrl;
    if (typeof o.url === "string") return o.url;
  }

  for (const v of Object.values(p)) {
    if (typeof v !== "string") continue;
    if (/^data:image\//.test(v)) return v;
    if (/\.(png|jpe?g|webp|gif)$/i.test(v)) return v;
  }
  return null;
}

export default function TrainingX01Config({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const profile = useCurrentProfile() as any;

  const [startScore, setStartScore] =
    React.useState<(typeof START_CHOICES)[number]>(501);
  const [outMode, setOutMode] =
    React.useState<(typeof OUT_CHOICES)[number]>("double");
  const [voiceScoreEnabled, setVoiceScoreEnabled] =
    React.useState<boolean>(false);

  // panneau règles
  const [infoOpen, setInfoOpen] = React.useState(false);

  // Toujours afficher la page tout en haut au démarrage
  React.useLayoutEffect(() => {
    try {
      window.scrollTo(0, 0);
      document.documentElement?.scrollTo?.(0, 0);
      (document.body as any)?.scrollTo?.(0, 0);
    } catch {}
  }, []);

  const avatarSrc = resolveAvatarSrc(profile);
  const playerName = (profile?.name ||
    profile?.nickname ||
    profile?.username ||
    "Joueur") as string;

  function launch() {
    if (!go) return;
    go("training_x01_play" as Tab, {
      config: {
        startScore,
        outMode,
        voiceScoreInputEnabled: voiceScoreEnabled,
        // ✅ flag explicite pour masquer la sélection dans le play
        locked: true,
      },
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        // IMPORTANT: padding top à 0 pour que le ticker colle en haut.
        padding: "0 16px 110px",
      }}
    >
      {/* HEADER TICKER full-width (remplace titre + annotation) */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          paddingTop: "env(safe-area-inset-top)",
          marginBottom: 12,
          // full-bleed : annule le padding horizontal du wrapper
          marginLeft: -16,
          marginRight: -16,
        }}
      >
        <div style={{ position: "relative" }}>
          <img
            src={tickerX01 as any}
            alt="Training X01"
            draggable={false}
            style={{
              width: "100%",
              height: 92,
              objectFit: "cover",
              display: "block",
            }}
          />

          {/* Overlay boutons */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              pointerEvents: "none",
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              <BackDot
                onClick={() => go?.("training" as Tab)}
                title={t("common.back", "Retour")}
                color={theme.primary}
                glow={`${theme.primary}88`}
                size={46}
              />
            </div>

            <div style={{ pointerEvents: "auto" }}>
              <InfoDot
                onClick={() => setInfoOpen(true)}
                title={t("common.rules", "Règles")}
                color={theme.primary}
                glow={`${theme.primary}88`}
                size={46}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MODAL INFOS */}
      {infoOpen && (
        <div
          onClick={() => setInfoOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 92vw)",
              background: theme.card,
              border: `1px solid ${theme.borderSoft}`,
              borderRadius: 18,
              padding: 14,
              boxShadow: "0 18px 40px rgba(0,0,0,0.65)",
            }}
          >
            <div style={{ fontWeight: 1000, marginBottom: 8 }}>
              {t("training.x01.rules.title", "Training X01 — Règles")}
            </div>
            <div style={{ fontSize: 12, color: theme.textSoft, lineHeight: 1.45 }}>
              {t(
                "training.x01.rules.body",
                "Configure le score de départ et la règle de sortie, puis lance la session. La configuration est verrouillée pendant la partie."
              )}
            </div>

            <button
              onClick={() => setInfoOpen(false)}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(10,10,12,0.92)",
                color: theme.text,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {t("common.close", "Fermer")}
            </button>
          </div>
        </div>
      )}

      {/* Voice scoring */}
      <div
        style={{
          marginTop: 12,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          borderRadius: 16,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 8 }}>
          {t("training.x01.config.voiceScore", "Commande vocale (saisie scores)")}
        </div>
        <div style={{ fontSize: 12, color: theme.textSoft, marginBottom: 10 }}>
          {t(
            "training.x01.config.voiceScoreHint",
            "Dicte tes 3 fléchettes. La voix récapitule et demande confirmation."
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            {voiceScoreEnabled ? "ON" : "OFF"}
          </div>
          <button
            onClick={() => setVoiceScoreEnabled((v) => !v)}
            style={{
              borderRadius: 999,
              padding: "10px 12px",
              fontWeight: 900,
              border: voiceScoreEnabled
                ? `1px solid ${theme.primary}`
                : `1px solid ${theme.borderSoft}`,
              background: voiceScoreEnabled
                ? `linear-gradient(180deg, ${theme.primary} , rgba(0,0,0,0.4))`
                : "rgba(10,10,12,0.9)",
              color: voiceScoreEnabled ? "#111" : theme.text,
              boxShadow: voiceScoreEnabled ? `0 0 14px ${theme.primary}55` : "none",
            }}
          >
            {voiceScoreEnabled
              ? t("common.disable", "Désactiver")
              : t("common.enable", "Activer")}
          </button>
        </div>
      </div>

      {/* Profil */}
      <div
        style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          borderRadius: 16,
          padding: 12,
          boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            border: `2px solid ${theme.primary}`,
            boxShadow: `0 0 14px ${theme.primary}55`,
            overflow: "hidden",
            background: "rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontWeight: 900, opacity: 0.9 }}>?</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>{playerName}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: theme.textSoft }}>
            {t("training.x01.config.profileHint", "Profil actif")}
          </div>
        </div>
      </div>

      {/* Start score */}
      <div
        style={{
          marginTop: 14,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          borderRadius: 16,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          {t("training.x01.config.start", "Score de départ")}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {START_CHOICES.map((sc) => (
            <button
              key={sc}
              onClick={() => setStartScore(sc)}
              style={{
                padding: "10px 12px",
                borderRadius: 999,
                fontWeight: 900,
                border:
                  startScore === sc
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.borderSoft}`,
                background:
                  startScore === sc
                    ? `linear-gradient(180deg, ${theme.primary} , rgba(0,0,0,0.4))`
                    : "rgba(10,10,12,0.9)",
                color: startScore === sc ? "#111" : theme.text,
                boxShadow: startScore === sc ? `0 0 14px ${theme.primary}55` : "none",
              }}
            >
              {sc}
            </button>
          ))}
        </div>
      </div>

      {/* Out mode */}
      <div
        style={{
          marginTop: 12,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          borderRadius: 16,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          {t("training.x01.config.out", "Règle de sortie")}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {OUT_CHOICES.map((om) => (
            <button
              key={om}
              onClick={() => setOutMode(om)}
              style={{
                padding: "10px 12px",
                borderRadius: 999,
                fontWeight: 900,
                textTransform: "capitalize",
                border:
                  outMode === om
                    ? `1px solid ${theme.primary}`
                    : `1px solid ${theme.borderSoft}`,
                background:
                  outMode === om
                    ? `linear-gradient(180deg, ${theme.primary} , rgba(0,0,0,0.4))`
                    : "rgba(10,10,12,0.9)",
                color: outMode === om ? "#111" : theme.text,
                boxShadow: outMode === om ? `0 0 14px ${theme.primary}55` : "none",
              }}
            >
              {om}
            </button>
          ))}
        </div>
      </div>

      {/* Commande vocale (saisie scores) */}
      <div
        style={{
          marginTop: 12,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          borderRadius: 16,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 6 }}>
          {t("training.x01.config.voiceScore", "Commande vocale (saisie scores)")}
        </div>
        <div style={{ fontSize: 12, color: theme.textSoft, marginBottom: 10 }}>
          {t(
            "training.x01.config.voiceScoreHint",
            "Dicte tes 3 fléchettes. Récap + confirmation oui/non avant validation."
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setVoiceScoreEnabled(false)}
            style={{
              padding: "10px 12px",
              borderRadius: 999,
              fontWeight: 900,
              border: voiceScoreEnabled
                ? `1px solid ${theme.borderSoft}`
                : `1px solid ${theme.primary}`,
              background: voiceScoreEnabled
                ? "rgba(10,10,12,0.9)"
                : `linear-gradient(180deg, ${theme.primary} , rgba(0,0,0,0.4))`,
              color: voiceScoreEnabled ? theme.text : "#111",
              boxShadow: voiceScoreEnabled ? "none" : `0 0 14px ${theme.primary}55`,
            }}
          >
            {t("common.off", "OFF")}
          </button>

          <button
            onClick={() => setVoiceScoreEnabled(true)}
            style={{
              padding: "10px 12px",
              borderRadius: 999,
              fontWeight: 900,
              border: voiceScoreEnabled
                ? `1px solid ${theme.primary}`
                : `1px solid ${theme.borderSoft}`,
              background: voiceScoreEnabled
                ? `linear-gradient(180deg, ${theme.primary} , rgba(0,0,0,0.4))`
                : "rgba(10,10,12,0.9)",
              color: voiceScoreEnabled ? "#111" : theme.text,
              boxShadow: voiceScoreEnabled ? `0 0 14px ${theme.primary}55` : "none",
            }}
          >
            {t("common.on", "ON")}
          </button>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={launch}
        style={{
          marginTop: 16,
          width: "100%",
          padding: "14px 16px",
          borderRadius: 18,
          border: `1px solid ${theme.primary}`,
          background: `linear-gradient(180deg, ${theme.primary}, rgba(0,0,0,0.45))`,
          color: "#111",
          fontWeight: 1000,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          boxShadow: `0 14px 30px rgba(0,0,0,0.6), 0 0 18px ${theme.primary}55`,
        }}
      >
        {t("training.x01.config.startBtn", "Lancer la session")}
      </button>
    </div>
  );
}
