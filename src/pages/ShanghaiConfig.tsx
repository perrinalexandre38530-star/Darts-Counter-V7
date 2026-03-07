// ============================================
// src/pages/ShanghaiConfig.tsx
// SHANGHAI — CONFIG (UI calquée X01Multi / style CRICKET header)
// ✅ Header gros titre néon (comme Cricket) + sous-titre court
// ✅ Carrousel joueurs "médaillons" (sans blocs), non-sélectionnés grisés
// ✅ Paramètres pills
// ✅ Overlay InfoDot avec règles détaillées
// ✅ CTA sticky bas "LANCER LA PARTIE"
// ✅ NEW: Toggle BRUITAGES ON/OFF (comme X01Config) + persist store.settings.sfxEnabled
// ✅ NEW: Toggle VOIX IA ON/OFF + persist store.settings.voiceEnabled
// ✅ NEW: Ordre des cibles (Chronologique / Aléatoire) + targetOrder stable (anti reshuffle)
// ============================================

import React from "react";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import InfoDot from "../components/InfoDot";
import BackDot from "../components/BackDot";

// ✅ TICKER
import tickerShanghai from "../assets/tickers/ticker_shanghai.png";

// ✅ NEW
import { setSfxEnabled } from "../lib/sfx";
import { setVoiceEnabled } from "../lib/voice";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

type PlayerLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
};

export type ShanghaiConfig = {
  players: PlayerLite[];
  maxRounds: number;
  winRule: "shanghai_or_points" | "points_only";

  // ✅ NEW (compat: optionnel)
  sfxEnabled?: boolean;
  voiceEnabled?: boolean;

  // ✅ NEW: ordre des cibles
  targetOrderMode?: "chronological" | "random";
  // ✅ NEW: ordre calculé et fixé (évite reshuffle au reload)
  targetOrder?: number[];
};

const LS_BOTS_KEY = "dc_bots_v1";

function safeBots(): PlayerLite[] {
  try {
    const raw = localStorage.getItem(LS_BOTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((b: any) => b?.id)
      .map((b: any) => ({
        id: String(b.id),
        name: String(b?.name || "BOT"),
        avatarDataUrl: b?.avatarDataUrl || b?.avatar || null,
        isBot: true,
      }));
  } catch {
    return [];
  }
}

function dedupe(list: PlayerLite[]) {
  const m = new Map<string, PlayerLite>();
  for (const p of list) {
    const id = String(p?.id || "");
    if (!id) continue;
    if (!m.has(id)) m.set(id, { ...p, id });
  }
  return Array.from(m.values());
}

function clampRounds(n: any) {
  const v = Number(n || 20);
  if (!Number.isFinite(v)) return 20;
  return Math.max(1, Math.min(20, Math.round(v)));
}

// ✅ NEW: cible order helpers (stable)
function makeRange(n: number) {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) out.push(i);
  return out;
}
function shuffleArray<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}
function buildTargetOrder(
  maxRounds: number,
  mode: "chronological" | "random"
) {
  const base = makeRange(20); // Shanghai classique: 1..20
  const order = mode === "random" ? shuffleArray(base) : base;
  return order.slice(0, maxRounds);
}

export default function ShanghaiConfigPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  const locals: PlayerLite[] = React.useMemo(() => {
    return (store?.profiles ?? []).map((p: any) => ({
      id: String(p.id),
      name: p?.name || p?.displayName || "Joueur",
      avatarDataUrl: p?.avatarDataUrl || p?.avatar || null,
      isBot: false,
    }));
  }, [store?.profiles]);

  const bots: PlayerLite[] = React.useMemo(() => safeBots(), []);
  const allPlayers = React.useMemo(
    () => dedupe([...(locals || []), ...(bots || [])]),
    [locals, bots]
  );

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    const base = (locals || []).slice(0, 2).map((p) => p.id);
    if (base.length >= 2) return base;
    return (allPlayers || []).slice(0, 2).map((p) => p.id);
  });

  const [maxRounds, setMaxRounds] = React.useState<number>(20);
  const [winRule, setWinRule] =
    React.useState<ShanghaiConfig["winRule"]>("shanghai_or_points");

  // ✅ NEW: ordre des cibles
  const [targetOrderMode, setTargetOrderMode] = React.useState<
    "chronological" | "random"
  >("chronological");

  const [infoOpen, setInfoOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);

  // ✅ NEW: toggles (persist settings)
  const [sfxEnabled, setSfx] = React.useState<boolean>(() => {
    const v = (store as any)?.settings?.sfxEnabled;
    return v !== false; // default ON
  });
  const [voiceEnabled, setVoice] = React.useState<boolean>(() => {
    const v = (store as any)?.settings?.voiceEnabled;
    return v !== false; // default ON
  });

  // ✅ Applique au montage (au cas où settings existent déjà)
  React.useEffect(() => {
    setSfxEnabled(sfxEnabled);
  }, [sfxEnabled]);

  React.useEffect(() => {
    setVoiceEnabled(voiceEnabled);
  }, [voiceEnabled]);

  const canStart = selectedIds.length >= 2;

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }

  function start() {
    if (!canStart) return;

    // ✅ Apply toggles right before play
    setSfxEnabled(sfxEnabled);
    setVoiceEnabled(voiceEnabled);

    // ✅ Persist in store.settings (safe)
    (store as any).settings = {
      ...((store as any).settings || {}),
      sfxEnabled,
      voiceEnabled,
    };

    const players = allPlayers
      .filter((p) => selectedIds.includes(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatarDataUrl: p.avatarDataUrl ?? null,
        isBot: !!p.isBot,
      }));

    const finalRounds = clampRounds(maxRounds);

    // ✅ NEW: calcule un ordre stable (anti reshuffle au reload)
    const targetOrder = buildTargetOrder(finalRounds, targetOrderMode);

    const config: ShanghaiConfig = {
      players,
      maxRounds: finalRounds,
      winRule,
      sfxEnabled,
      voiceEnabled,
      targetOrderMode,
      targetOrder,
    };

    go("shanghai_play", { config });
  }

  const cardShell = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: CARD_BG,
    boxShadow: `0 10px 24px rgba(0,0,0,0.55)`,
  };

  const pill = (active: boolean) => ({
    padding: "8px 10px",
    borderRadius: 999,
    border: `1px solid ${active ? theme.primary + "99" : theme.borderSoft}`,
    background: active ? theme.primary + "22" : "rgba(0,0,0,0.22)",
    color: active ? theme.text : theme.textSoft,
    fontWeight: 900 as const,
    fontSize: 12.5,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  });

  // Médaillon type X01Multi (SANS carte)
  const medalWrap = (selected: boolean) => ({
    scrollSnapAlign: "center" as const,
    width: 118,
    minWidth: 118,
    padding: "6px 4px",
    cursor: "pointer",
    textAlign: "center" as const,
    opacity: selected ? 1 : 0.42, // ✅ grisé si non sélectionné
    filter: selected ? "none" : "grayscale(1)",
    transition: "opacity 120ms ease",
  });

  const avatarRing = (selected: boolean) => ({
    width: 76,
    height: 76,
    borderRadius: 999,
    overflow: "hidden",
    margin: "0 auto",
    border: `1px solid ${selected ? theme.primary + "99" : theme.borderSoft}`,
    background: "rgba(255,255,255,0.06)",
    boxShadow: selected ? `0 0 22px ${theme.primary}2e` : "none",
    display: "grid",
    placeItems: "center",
  });

  const okPill = {
    marginTop: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${theme.primary}88`,
    background: theme.primary + "22",
    color: theme.text,
    fontWeight: 950,
    fontSize: 12,
    letterSpacing: 0.2,
  };

  // ✅ petit aperçu des cibles si aléatoire
  const targetPreview =
    targetOrderMode === "random"
      ? buildTargetOrder(clampRounds(maxRounds), "random").slice(0, 6).join(" • ") +
        " • …"
      : "1 • 2 • 3 • 4 • 5 • 6 • …";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PAGE_BG,
        color: theme.text,
        paddingBottom: 110,
      }}
    >
      <div style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
        {/* HEADER TICKER full-width (remplace titre + annotation) */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 60,
            paddingTop: "env(safe-area-inset-top)",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              position: "relative",
              // full-bleed (annule le padding de ce wrapper)
              marginLeft: -16,
              marginRight: -16,
            }}
          >
            <img
              src={tickerShanghai as any}
              alt="Shanghai"
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
                  onClick={() => go("games")}
                  title={t("common.back", "Retour")}
                  size={42}
                  color={theme.primary}
                  glow={theme.primary + "cc"}
                />
              </div>

              <div style={{ pointerEvents: "auto" }}>
                <InfoDot
                  onClick={() => setInfoOpen(true)}
                  title={t("common.rules", "Règles")}
                  size={42}
                  color={theme.primary}
                  glow={theme.primary + "cc"}
                />
              </div>
            </div>
          </div>
        </div>

        {/* JOUEURS — carrousel X01Multi (sans cartes) */}
        <div style={{ ...cardShell, padding: 14 }}>
          <div
            style={{
              fontWeight: 950,
              fontSize: 12.5,
              letterSpacing: 0.6,
              color: theme.primary,
            }}
          >
            {t("x01.players.title", "JOUEURS")}
          </div>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 14,
              overflowX: "auto",
              paddingBottom: 8,
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {allPlayers.map((p) => {
              const sel = selectedIds.includes(p.id);
              return (
                <div key={p.id} onClick={() => toggle(p.id)} style={medalWrap(sel)}>
                  <div style={avatarRing(sel)}>
                    {p.avatarDataUrl ? (
                      <img
                        src={p.avatarDataUrl}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span style={{ opacity: 0.75, fontWeight: 900 }}>?</span>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      fontWeight: 950,
                      fontSize: 12.5,
                      color: theme.text,
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: theme.textSoft,
                      opacity: 0.9,
                    }}
                  />

                  {sel ? <div style={okPill}>OK</div> : <div style={{ height: 26 }} />}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: theme.textSoft,
              opacity: 0.9,
            }}
          >
            {t("x01.players.hint", "2 joueurs pour un duel, 3+ pour Multi ou équipes.")}{" "}
            {!canStart ? (
              <span style={{ color: theme.primary, fontWeight: 900 }}>
                {t("shanghai.players.need2", "Sélectionne au moins 2 joueurs.")}
              </span>
            ) : null}
          </div>
        </div>

        {/* PARAMÈTRES DE BASE */}
        <div style={{ marginTop: 12, ...cardShell, padding: 14 }}>
          <div
            style={{
              fontWeight: 950,
              fontSize: 12.5,
              letterSpacing: 0.6,
              color: theme.primary,
            }}
          >
            {t("x01.base.title", "PARAMÈTRES DE BASE")}
          </div>

          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 12.2,
                fontWeight: 900,
                color: theme.textSoft,
                marginBottom: 8,
              }}
            >
              {t("shanghai.settings.rounds", "Tours")}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[10, 15, 20].map((n) => (
                <div key={n} onClick={() => setMaxRounds(n)} style={pill(maxRounds === n)}>
                  {n}
                </div>
              ))}
            </div>
          </div>

          {/* ✅ NEW: ordre des cibles */}
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 12.2,
                fontWeight: 900,
                color: theme.textSoft,
                marginBottom: 8,
              }}
            >
              {t("shanghai.settings.order", "Ordre des cibles")}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div
                onClick={() => setTargetOrderMode("chronological")}
                style={pill(targetOrderMode === "chronological")}
              >
                {t("shanghai.settings.orderChrono", "Chronologique")}
              </div>
              <div
                onClick={() => setTargetOrderMode("random")}
                style={pill(targetOrderMode === "random")}
              >
                {t("shanghai.settings.orderRandom", "Aléatoire")}
              </div>
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: theme.textSoft,
                opacity: 0.88,
                lineHeight: 1.25,
              }}
            >
              {t("shanghai.settings.orderPreview", "Aperçu")} :{" "}
              <span style={{ color: theme.text }}>{targetPreview}</span>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 12.2,
                fontWeight: 900,
                color: theme.textSoft,
                marginBottom: 8,
              }}
            >
              {t("shanghai.settings.win", "Victoire")}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div
                onClick={() => setWinRule("shanghai_or_points")}
                style={pill(winRule === "shanghai_or_points")}
              >
                {t("shanghai.settings.win1", "Shanghai 💥 ou points")}
              </div>
              <div
                onClick={() => setWinRule("points_only")}
                style={pill(winRule === "points_only")}
              >
                {t("shanghai.settings.win2", "Points seulement")}
              </div>
            </div>
          </div>

          {/* ✅ NEW: Toggles SFX + VOICE (même style pills) */}
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 12.2,
                fontWeight: 900,
                color: theme.textSoft,
                marginBottom: 8,
              }}
            >
              {t("common.audio", "Audio")}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div
                onClick={() => {
                  const v = !sfxEnabled;
                  setSfx(v);
                  setSfxEnabled(v);
                  (store as any).settings = {
                    ...((store as any).settings || {}),
                    sfxEnabled: v,
                  };
                }}
                style={pill(sfxEnabled)}
              >
                {t("common.sfx", "BRUITAGES")} : {sfxEnabled ? "ON" : "OFF"}
              </div>

              <div
                onClick={() => {
                  const v = !voiceEnabled;
                  setVoice(v);
                  setVoiceEnabled(v);
                  (store as any).settings = {
                    ...((store as any).settings || {}),
                    voiceEnabled: v,
                  };
                }}
                style={pill(voiceEnabled)}
              >
                {t("common.voice", "VOIX IA")} : {voiceEnabled ? "ON" : "OFF"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA sticky bas */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 88,
          zIndex: 30,
          padding: "10px 14px",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.00), rgba(0,0,0,0.55))",
        }}
      >
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <button
            onClick={start}
            disabled={!canStart}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 18,
              border: "none",
              fontWeight: 950,
              letterSpacing: 0.6,
              cursor: canStart ? "pointer" : "not-allowed",
              color: "#1b1508",
              background: canStart
                ? "linear-gradient(180deg,#ffd25a,#ffaf00)"
                : "rgba(255,255,255,0.10)",
              opacity: canStart ? 1 : 0.6,
              boxShadow: canStart ? "0 18px 40px rgba(0,0,0,0.55)" : "none",
              textTransform: "uppercase",
            }}
          >
            {t("x01.start", "LANCER LA PARTIE")}
          </button>
        </div>
      </div>

      {/* ✅ Overlay règles détaillées */}
      {infoOpen && (
        <div
          onClick={() => setInfoOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 460,
              margin: 16,
              padding: 18,
              borderRadius: 18,
              background: theme.card,
              border: `1px solid ${theme.primary}55`,
              boxShadow: `0 18px 40px rgba(0,0,0,.7)`,
              color: theme.text,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 950,
                marginBottom: 10,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 10px ${theme.primary}55`,
              }}
            >
              Règles — Shanghai
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.45, color: theme.textSoft }}>
              <div style={{ marginBottom: 10 }}>
                <b style={{ color: theme.text }}>But :</b> marquer le plus de points sur{" "}
                {clampRounds(maxRounds)} tours.
              </div>

              <div style={{ marginBottom: 10 }}>
                <b style={{ color: theme.text }}>Cibles :</b>{" "}
                {targetOrderMode === "random"
                  ? "ordre aléatoire (fixé au lancement)."
                  : "ordre chronologique (1 → 20)."}
              </div>

              <div style={{ marginBottom: 10 }}>
                <b style={{ color: theme.text }}>Scoring :</b>
                <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                  <li>Simple sur la cible = <b>1×</b> le numéro</li>
                  <li>Double sur la cible = <b>2×</b> le numéro</li>
                  <li>Triple sur la cible = <b>3×</b> le numéro</li>
                  <li>Hors-cible = <b>0</b></li>
                </ul>
              </div>

              <div style={{ marginBottom: 10 }}>
                <b style={{ color: theme.text }}>Shanghai :</b> réussir <b>Simple + Double + Triple</b> de la
                cible <b>dans le même tour</b>.
              </div>

              <div style={{ marginBottom: 2 }}>
                <b style={{ color: theme.text }}>Victoire :</b>{" "}
                {winRule === "shanghai_or_points"
                  ? "Shanghai immédiat, sinon aux points en fin de partie."
                  : "Aux points uniquement (pas de victoire immédiate)."}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              style={{
                display: "block",
                marginLeft: "auto",
                marginTop: 14,
                padding: "6px 14px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(180deg,#ffd25a,#ffaf00)",
                color: "#1b1508",
                fontWeight: 950,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t("games.info.close", "Fermer")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
