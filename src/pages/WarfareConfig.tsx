// ============================================
// src/pages/WarfareConfig.tsx
// WARFARE — CONFIG
// UI calquée sur ShanghaiConfig (même rendu cartes / header / InfoDot)
// - Sélection 2 joueurs (humains + bots)
// - Options: zones valides, friendly fire, handicap asymétrique simple
// - CTA sticky "LANCER LA PARTIE"
// ============================================

import React from "react";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import InfoDot from "../components/InfoDot";

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

export type WarfareZoneRule = "ANY" | "SINGLE_DOUBLE" | "DOUBLE_ONLY";

export type WarfareConfig = {
  players: [PlayerLite, PlayerLite];
  /** Quel joueur joue l'armée TOP (sinon BOTTOM) */
  p1Army: "TOP" | "BOTTOM";
  zoneRule: WarfareZoneRule;
  friendlyFire: boolean;
  /** Handicap: si true, P1 doit jouer en DOUBLE_ONLY, P2 joue selon zoneRule */
  handicapP1Harder?: boolean;
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

function pillStyle(active: boolean, theme: any): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? theme.primary + "66" : theme.borderSoft}`,
    background: active ? theme.primary + "18" : theme.card,
    color: active ? theme.primary : theme.text,
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    boxShadow: active ? `0 0 18px ${theme.primary}22` : "none",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  };
}

export default function WarfareConfigPage({ store, go }: Props) {
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

  const [p1Army, setP1Army] = React.useState<"TOP" | "BOTTOM">("TOP");
  const [zoneRule, setZoneRule] = React.useState<WarfareZoneRule>("ANY");
  const [friendlyFire, setFriendlyFire] = React.useState(true);
  const [handicapP1Harder, setHandicapP1Harder] = React.useState(false);

  const [infoOpen, setInfoOpen] = React.useState(false);

  const selectedPlayers = React.useMemo(() => {
    const list = selectedIds
      .map((id) => allPlayers.find((p) => p.id === id))
      .filter(Boolean) as PlayerLite[];
    return list.slice(0, 2);
  }, [selectedIds, allPlayers]);

  const canStart = selectedPlayers.length === 2;

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      if (prev.length >= 2) {
        // remplace le plus ancien (comportement fluide)
        return [prev[1], id];
      }
      return [...prev, id];
    });
  }

  function start() {
    if (!canStart) return;
    const p1 = selectedPlayers[0];
    const p2 = selectedPlayers[1];
    const cfg: WarfareConfig = {
      players: [p1, p2],
      p1Army,
      zoneRule,
      friendlyFire,
      handicapP1Harder,
    };
    go("warfare_play", { config: cfg });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 110,
        background: PAGE_BG,
        color: theme.text,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => go("games")}
          style={{
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            color: theme.text,
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          ← {t("common.back", "Retour")}
        </button>

        <InfoDot onClick={() => setInfoOpen(true)} glow={theme.primary + "88"} />
      </div>

      <div style={{ marginTop: 10, textAlign: "center" }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: 1.2,
            color: theme.primary,
            textShadow: `0 0 14px ${theme.primary}66`,
            textTransform: "uppercase",
          }}
        >
          {t("warfare.title", "WARFARE")}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: theme.textSoft }}>
          {t("warfare.subtitle", "Élimine l’armée adverse — attention au friendly fire.")}
        </div>
      </div>

      {/* Sélection joueurs */}
      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: CARD_BG,
          boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900, letterSpacing: 0.7, textTransform: "uppercase", color: theme.primary }}>
            {t("warfare.players", "Joueurs")}
          </div>
          <div style={{ fontSize: 12, color: theme.textSoft }}>
            {selectedPlayers.length}/2
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 6,
          }}
        >
          {allPlayers.map((p) => {
            const active = selectedIds.includes(p.id);
            const dim = !active && selectedPlayers.length >= 2;
            return (
              <button
                key={p.id}
                onClick={() => togglePlayer(p.id)}
                style={{
                  minWidth: 92,
                  border: active ? `1px solid ${theme.primary}88` : `1px solid ${theme.borderSoft}`,
                  background: active ? theme.primary + "12" : theme.bg + "cc",
                  borderRadius: 18,
                  padding: 10,
                  cursor: "pointer",
                  opacity: dim ? 0.35 : 1,
                }}
                title={p.name}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    margin: "0 auto",
                    background: "rgba(255,255,255,.06)",
                    border: active ? `2px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
                    boxShadow: active ? `0 0 16px ${theme.primary}44` : "none",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: theme.text,
                    fontWeight: 900,
                  }}
                >
                  {p.avatarDataUrl ? (
                    <img
                      src={p.avatarDataUrl}
                      alt={p.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: 16 }}>{(p.name || "?").slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    fontWeight: 900,
                    color: active ? theme.primary : theme.text,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 72,
                  }}
                >
                  {p.name}
                </div>
              </button>
            );
          })}
        </div>

        {!canStart && (
          <div style={{ marginTop: 10, fontSize: 12, color: theme.textSoft }}>
            {t("warfare.players.help", "Sélectionne exactement 2 joueurs pour démarrer.")}
          </div>
        )}
      </div>

      {/* Options */}
      <div
        style={{
          marginTop: 12,
          padding: 14,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: CARD_BG,
          boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ fontWeight: 900, letterSpacing: 0.7, textTransform: "uppercase", color: theme.primary }}>
          {t("warfare.options", "Options")}
        </div>

        {/* Camp */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: theme.textSoft, marginBottom: 8 }}>
            {t("warfare.armyAssign", "Armée du Joueur 1")}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={pillStyle(p1Army === "TOP", theme)} onClick={() => setP1Army("TOP")}>TOP</button>
            <button
              style={pillStyle(p1Army === "BOTTOM", theme)}
              onClick={() => setP1Army("BOTTOM")}
            >
              BOTTOM
            </button>
          </div>
        </div>

        {/* Zones */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: theme.textSoft, marginBottom: 8 }}>
            {t("warfare.zoneRule", "Zones valides")}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={pillStyle(zoneRule === "ANY", theme)} onClick={() => setZoneRule("ANY")}>
              {t("warfare.zone.any", "S/D/T")}
            </button>
            <button
              style={pillStyle(zoneRule === "SINGLE_DOUBLE", theme)}
              onClick={() => setZoneRule("SINGLE_DOUBLE")}
            >
              {t("warfare.zone.sd", "S + D")}
            </button>
            <button
              style={pillStyle(zoneRule === "DOUBLE_ONLY", theme)}
              onClick={() => setZoneRule("DOUBLE_ONLY")}
            >
              {t("warfare.zone.d", "DOUBLE")}
            </button>
          </div>
        </div>

        {/* Friendly fire */}
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: theme.textSoft }}>{t("warfare.friendlyFire", "Friendly fire")}</div>
            <div style={{ fontSize: 11, color: theme.textSoft, opacity: 0.9 }}>
              {t("warfare.friendlyFire.desc", "Si tu touches ton propre soldat, il meurt.")}
            </div>
          </div>
          <button
            onClick={() => setFriendlyFire((v) => !v)}
            style={pillStyle(friendlyFire, theme)}
          >
            {friendlyFire ? t("common.on", "ON") : t("common.off", "OFF")}
          </button>
        </div>

        {/* Handicap */}
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: theme.textSoft }}>{t("warfare.handicap", "Handicap")}</div>
            <div style={{ fontSize: 11, color: theme.textSoft, opacity: 0.9 }}>
              {t("warfare.handicap.desc", "Joueur 1 doit jouer en DOUBLE (Joueur 2 normal).")}
            </div>
          </div>
          <button
            onClick={() => setHandicapP1Harder((v) => !v)}
            style={pillStyle(handicapP1Harder, theme)}
          >
            {handicapP1Harder ? t("common.on", "ON") : t("common.off", "OFF")}
          </button>
        </div>
      </div>

      {/* CTA sticky */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 14,
          background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.85))",
          zIndex: 20,
        }}
      >
        <button
          disabled={!canStart}
          onClick={start}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 18,
            border: "none",
            background: canStart
              ? `linear-gradient(180deg, ${theme.primary}, ${theme.primary}cc)`
              : "rgba(255,255,255,.08)",
            color: canStart ? "#000" : theme.textSoft,
            fontWeight: 900,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            cursor: canStart ? "pointer" : "default",
            boxShadow: canStart ? `0 16px 34px ${theme.primary}22` : "none",
          }}
        >
          {t("warfare.start", "LANCER LA PARTIE")}
        </button>
      </div>

      {/* Overlay règles */}
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
              maxWidth: 520,
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
                fontWeight: 900,
                marginBottom: 8,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 10px ${theme.primary}55`,
              }}
            >
              {t("warfare.rules.title", "Règles — Warfare")}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.4, color: theme.textSoft }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>{t("warfare.rules.1", "Chaque camp possède 10 nombres (soldats).")}</li>
                <li>{t("warfare.rules.2", "À ton tour, touche les nombres de l’armée adverse pour les éliminer.")}</li>
                <li>{t("warfare.rules.3", "Quand tous les soldats d’un camp sont éliminés, il perd.")}</li>
                <li>{t("warfare.rules.4", "Friendly fire: si tu touches ton propre soldat, il meurt aussi (option).")}</li>
              </ul>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
                {t(
                  "warfare.rules.tip",
                  "Astuce: active DOUBLE ONLY pour un mode entraînement très efficace."
                )}
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
                background: theme.primary,
                color: "#000",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t("common.close", "Fermer")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
