// ============================================
// src/pages/BattleRoyaleConfig.tsx
// BATTLE ROYALE — CONFIG (UI raccord Games/Shanghai)
// ✅ Accessible depuis Games (mode fléchettes)
// ✅ Style néon + cards + CTA sticky (comme Shanghai)
// ✅ Prépare les réglages (players + règles) sans démarrer le gameplay (à venir)
// ============================================

import React from "react";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import InfoDot from "../components/InfoDot";

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

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export default function BattleRoyaleConfigPage({ store, go }: Props) {
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

  // ✅ Pré-sélection: 2 premiers locaux si possible
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    const base = (locals || []).slice(0, 2).map((p) => p.id);
    if (base.length >= 2) return base;
    return (allPlayers || []).slice(0, 2).map((p) => p.id);
  });

  // Règles (placeholder, mais déjà câblées UI)
  const [lives, setLives] = React.useState<number>(3);
  const [dartsPerTurn, setDartsPerTurn] = React.useState<number>(3);
  const [eliminationRule, setEliminationRule] = React.useState<
    "zero_points" | "miss_x" | "life_system"
  >("life_system");

  // ✅ toggles (persist settings)
  const [sfxEnabled, setSfx] = React.useState<boolean>(() => {
    const v = (store as any)?.settings?.sfxEnabled;
    return v !== false; // default ON
  });
  const [voiceEnabled, setVoice] = React.useState<boolean>(() => {
    const v = (store as any)?.settings?.voiceEnabled;
    return v !== false; // default ON
  });

  React.useEffect(() => {
    setSfxEnabled(sfxEnabled);
  }, [sfxEnabled]);
  React.useEffect(() => {
    setVoiceEnabled(voiceEnabled);
  }, [voiceEnabled]);

  const [infoOpen, setInfoOpen] = React.useState(false);

  const canEnter = selectedIds.length >= 2;

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }

  // ✅ Start autorisé si au moins 2 participants.
  const canStart = canEnter;

  const selectedPlayers: PlayerLite[] = React.useMemo(() => {
    const map = new Map(allPlayers.map((p) => [p.id, p] as const));
    return selectedIds.map((id) => map.get(id)).filter(Boolean) as PlayerLite[];
  }, [allPlayers, selectedIds]);

  const cardShell: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: CARD_BG,
    boxShadow: `0 10px 24px rgba(0,0,0,0.55)`,
  };

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "8px 10px",
    borderRadius: 999,
    border: `1px solid ${active ? theme.primary + "99" : theme.borderSoft}`,
    background: active ? theme.primary + "22" : "rgba(0,0,0,0.22)",
    color: active ? theme.text : theme.textSoft,
    fontWeight: 900,
    fontSize: 12.5,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 14,
        paddingBottom: 96,
        background: PAGE_BG,
        color: theme.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: PAGE_BG,
          paddingTop: 4,
          paddingBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => go("games")}
            style={{
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.25)",
              color: theme.text,
              padding: "8px 12px",
              borderRadius: 999,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {t("common.back", "← Retour")}
          </button>

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 1000,
                letterSpacing: 1,
                color: theme.primary,
                textShadow: `0 0 12px ${theme.primary}66`,
                textTransform: "uppercase",
              }}
            >
              {t("battle.config.title", "BATTLE ROYALE")}
            </div>
            <div style={{ fontSize: 12.5, color: theme.textSoft, marginTop: 2 }}>
              {t(
                "battle.config.subtitle",
                "Sélectionne les joueurs et prépare les règles."
              )}
            </div>
          </div>

          <InfoDot
            onClick={() => setInfoOpen(true)}
            glow={theme.primary + "88"}
          />
        </div>
      </div>

      {/* Players */}
      <div style={{ ...cardShell, padding: 12, marginBottom: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 1000, letterSpacing: 0.6 }}>
            {t("battle.config.players", "Participants")}
          </div>
          <div style={{ fontSize: 12, color: theme.textSoft }}>
            {t("battle.config.playersHint", "Min. 2")}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 6,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {allPlayers.map((p) => {
            const sel = selectedIds.includes(p.id);
            const size = 56;
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                style={{
                  border: `1px solid ${sel ? theme.primary + "88" : theme.borderSoft}`,
                  background: sel ? theme.primary + "18" : "rgba(0,0,0,0.18)",
                  borderRadius: 16,
                  padding: 10,
                  minWidth: 92,
                  cursor: "pointer",
                  opacity: sel ? 1 : 0.75,
                }}
              >
                <div
                  style={{
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    overflow: "hidden",
                    margin: "0 auto",
                    border: `2px solid ${sel ? theme.primary : theme.borderSoft}`,
                    boxShadow: sel ? `0 0 16px ${theme.primary}55` : "none",
                    background: "rgba(0,0,0,0.35)",
                  }}
                >
                  {p.avatarDataUrl ? (
                    <img
                      src={p.avatarDataUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 1000,
                        color: theme.textSoft,
                      }}
                    >
                      {(p.name || "J").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11.5,
                    fontWeight: 900,
                    color: sel ? theme.text : theme.textSoft,
                    maxWidth: 88,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  {p.name}
                </div>
              </button>
            );
          })}
        </div>

        {!canEnter && (
          <div style={{ marginTop: 8, fontSize: 12, color: theme.primary }}>
            {t("battle.config.needTwo", "Sélectionne au moins 2 joueurs.")}
          </div>
        )}
      </div>

      {/* Rules */}
      <div style={{ ...cardShell, padding: 12, marginBottom: 10 }}>
        <div style={{ fontWeight: 1000, letterSpacing: 0.6, marginBottom: 10 }}>
          {t("battle.config.rules", "Règles")}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => setEliminationRule("zero_points")}
            style={pill(eliminationRule === "zero_points")}
          >
            {t("battle.config.rule.zero", "0 point = éliminé")}
          </button>
          <button
            type="button"
            onClick={() => setEliminationRule("miss_x")}
            style={pill(eliminationRule === "miss_x")}
          >
            {t("battle.config.rule.miss", "X ratés = éliminé")}
          </button>
          <button
            type="button"
            onClick={() => setEliminationRule("life_system")}
            style={pill(eliminationRule === "life_system")}
          >
            {t("battle.config.rule.lives", "Système de vies")}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 160px" }}>
            <div style={{ fontSize: 12, color: theme.textSoft, marginBottom: 6 }}>
              {t("battle.config.lives", "Vies")}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setLives((v) => clampInt(v - 1, 1, 9, 3))}
                style={pill(false)}
              >
                −
              </button>
              <div style={{ fontWeight: 1000, minWidth: 30, textAlign: "center" }}>
                {lives}
              </div>
              <button
                onClick={() => setLives((v) => clampInt(v + 1, 1, 9, 3))}
                style={pill(false)}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ flex: "1 1 160px" }}>
            <div style={{ fontSize: 12, color: theme.textSoft, marginBottom: 6 }}>
              {t("battle.config.darts", "Fléchettes / tour")}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDartsPerTurn(n)}
                  style={pill(dartsPerTurn === n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Audio */}
      <div style={{ ...cardShell, padding: 12, marginBottom: 10 }}>
        <div style={{ fontWeight: 1000, letterSpacing: 0.6, marginBottom: 10 }}>
          {t("battle.config.audio", "Audio")}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setSfx((v) => !v)}
            style={pill(!!sfxEnabled)}
          >
            {t("common.sfx", "Bruitages")}: {sfxEnabled ? t("common.on", "ON") : t("common.off", "OFF")}
          </button>
          <button
            type="button"
            onClick={() => setVoice((v) => !v)}
            style={pill(!!voiceEnabled)}
          >
            {t("common.voice", "Voix IA")}: {voiceEnabled ? t("common.on", "ON") : t("common.off", "OFF")}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: theme.textSoft }}>
          {t(
            "battle.config.audioNote",
            "Les sons/voix sont persistés."
          )}
        </div>
      </div>

      {/* CTA sticky */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 12,
          background: `linear-gradient(180deg, transparent, ${PAGE_BG} 35%, ${PAGE_BG})`,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <button
            type="button"
            disabled={!canEnter || !canStart}
            onClick={() => {
              if (!canEnter || !canStart) return;

              const byId = new Map(allPlayers.map((p) => [p.id, p] as const));
              const players = selectedIds
                .map((id) => byId.get(id))
                .filter(Boolean) as PlayerLite[];

              const cfg = {
                players,
                dartsPerTurn: clampInt(dartsPerTurn, 1, 3, 3),
                lives: clampInt(lives, 1, 9, 3),
                eliminationRule: eliminationRule || "life_system",
                missLimit: 6,
                sfxEnabled,
                voiceEnabled,
              };

              go("battle_royale_play", { config: cfg, matchId: globalThis.crypto?.randomUUID?.() ?? String(Date.now()) });
            }}
            style={{
              flex: 1,
              borderRadius: 999,
              padding: "12px 14px",
              border: "none",
              fontWeight: 1000,
              fontSize: 14,
              background: !canEnter || !canStart ? "rgba(255,255,255,0.12)" : theme.primary,
              color: !canEnter || !canStart ? theme.textSoft : "#000",
              boxShadow: !canEnter || !canStart ? "none" : `0 0 24px ${theme.primary}55`,
              cursor: !canEnter || !canStart ? "not-allowed" : "pointer",
            }}
          >
            {t("battle.config.start", "LANCER LA PARTIE")}
          </button>

          <div style={{ fontSize: 12, color: theme.textSoft, minWidth: 140, textAlign: "right" }}>
            {t("battle.config.status", "Prêt")}
          </div>
        </div>
      </div>

      {/* Info overlay */}
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
              maxWidth: 420,
              margin: 16,
              padding: 18,
              borderRadius: 18,
              background: theme.card,
              border: `1px solid ${theme.primary}55`,
              boxShadow: `0 18px 40px rgba(0,0,0,.7)`,
              color: theme.text,
              maxHeight: "84vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 1000,
                marginBottom: 8,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 10px ${theme.primary}55`,
              }}
            >
              {t("battle.info.title", "Battle Royale — Règles")}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: theme.textSoft }}>
              {/* Règles + déroulé (raccord UI) */}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 1000, color: theme.text, marginBottom: 6 }}>
                  {t("battle.info.goalTitle", "Objectif")}
                </div>
                <div>
                  {t(
                    "battle.info.goalBody",
                    "Survivre. Le dernier joueur encore en jeu remporte la partie."
                  )}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 1000, color: theme.text, marginBottom: 6 }}>
                  {t("battle.info.rulesTitle", "Règles")}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>
                    {t(
                      "battle.info.rules.players",
                      "Chaque joueur joue à tour de rôle." 
                    )}
                  </li>
                  <li>
                    {t(
                      "battle.info.rules.darts",
                      "À son tour, le joueur lance 1 à 3 fléchettes (selon le réglage)."
                    )}
                  </li>
                  <li>
                    {t(
                      "battle.info.rules.elim",
                      "Si le joueur échoue la condition imposée par le round, il perd des vies ou est éliminé (selon la règle choisie)."
                    )}
                  </li>
                  <li>
                    {t(
                      "battle.info.rules.win",
                      "Le jeu continue jusqu’à ce qu’il ne reste qu’un joueur vivant."
                    )}
                  </li>
                </ul>

                <div style={{ marginTop: 10, fontSize: 12.5, color: theme.textSoft }}>
                  <span style={{ fontWeight: 1000, color: theme.text }}>
                    {t("battle.info.elimModes", "Modes d'élimination")}
                  </span>
                  {": "}
                  {t(
                    "battle.info.elimModesBody",
                    "(1) 0 point = éliminé, (2) X ratés = éliminé (à venir), (3) Système de vies (X vies, perte sur échec)."
                  )}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 1000, color: theme.text, marginBottom: 6 }}>
                  {t("battle.info.flowTitle", "Déroulé d’une partie")}
                </div>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  <li>
                    {t(
                      "battle.info.flow.1",
                      "Début: tous les joueurs sont ‘vivants’ (et ont X vies si le système de vies est activé)."
                    )}
                  </li>
                  <li>
                    {t(
                      "battle.info.flow.2",
                      "Round: une cible/consigne est affichée (ex: ‘Double’, ‘Bull’, ‘20’, etc.)."
                    )}
                  </li>
                  <li>
                    {t(
                      "battle.info.flow.3",
                      "Tour du joueur: il lance ses fléchettes. Le jeu valide si la consigne est remplie."
                    )}
                  </li>
                  <li>
                    {t(
                      "battle.info.flow.4",
                      "Résultat: réussite = le joueur reste en jeu. Échec = perte de vie(s) ou élimination (règle)."
                    )}
                  </li>
                  <li>
                    {t(
                      "battle.info.flow.5",
                      "On passe au joueur suivant. Les rounds s’enchaînent jusqu’au dernier survivant."
                    )}
                  </li>
                </ol>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 1000, color: theme.text, marginBottom: 6 }}>
                  {t("battle.info.exampleTitle", "Exemple rapide")}
                </div>
                <div style={{ fontSize: 12.8, lineHeight: 1.45 }}>
                  {t(
                    "battle.info.exampleBody",
                    "Round = ‘Bull’. Chaque joueur a 3 fléchettes. Si tu touches Bull (ou selon la variante), tu restes en jeu. Sinon: perte de vie (mode Vies) ou élimination (mode 0 point)."
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 14,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.22)",
                }}
              >
                <div style={{ fontWeight: 1000, color: theme.text, marginBottom: 6 }}>
                  {t("battle.info.noteTitle", "Notes")}
                </div>
                <div style={{ marginBottom: 10 }}>
                  {t(
                    "battle.info.noteBody",
                    "Cette page sert à préparer la partie. Le gameplay complet (cibles par round, scoring, élimination live, sons/voix) est l’étape suivante."
                  )}
                </div>

                <div style={{ fontWeight: 1000, color: theme.text, marginBottom: 6 }}>
                  {t("battle.info.thisPageTitle", "Ce que tu règles ici")}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: theme.textSoft }}>
                  <li>{t("battle.info.thisPage.players", "Participants (min. 2)")}</li>
                  <li>{t("battle.info.thisPage.elim", "Mode d'élimination (0 point / X ratés / vies)")}</li>
                  <li>{t("battle.info.thisPage.lives", "Nombre de vies (si activé)")}</li>
                  <li>{t("battle.info.thisPage.darts", "Fléchettes par tour (1 à 3)")}</li>
                  <li>{t("battle.info.thisPage.audio", "Bruitages + Voix IA")}</li>
                </ul>
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
                fontWeight: 900,
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
