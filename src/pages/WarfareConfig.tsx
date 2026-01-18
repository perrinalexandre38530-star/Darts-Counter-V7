// ============================================
// src/pages/WarfareConfig.tsx
// WARFARE — CONFIG (DUEL + ÉQUIPES)
// UI calquée sur les autres configs Darts Counter (cartes néon + InfoDot)
// - 2 ARMÉES (jusqu'à 6 joueurs par armée)
// - Variantes Bull/DBull (OFF par défaut)
// - Disposition des camps : Haut/Bas ou Gauche/Droite
// - CTA sticky visible AU-DESSUS du BottomNav
// ============================================

import React from "react";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import InfoDot from "../components/InfoDot";
import BackDot from "../components/BackDot";
import ProfileAvatar from "../components/ProfileAvatar";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

export type PlayerLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
};

export type WarfareZoneRule = "ANY" | "SINGLE_DOUBLE" | "DOUBLE_ONLY";
export type WarfareLayout = "TOP_BOTTOM" | "LEFT_RIGHT";

// Variantes BULL / DBULL
export type WarfareBullRule = "NONE" | "BOMB" | "HEAL" | "CHOICE";

export type WarfareTeams = {
  TOP: PlayerLite[]; // armée "A"
  BOTTOM: PlayerLite[]; // armée "B"
};

export type WarfareConfig = {
  teams: WarfareTeams;
  zoneRule: WarfareZoneRule;
  friendlyFire: boolean;

  // Handicap: si true, l'armée TOP joue en DOUBLE_ONLY, l'armée BOTTOM joue selon zoneRule
  handicapTopHarder?: boolean;

  layout: WarfareLayout;
  bullRule: WarfareBullRule;
};

const LS_BOTS_KEY = "dc_bots_v1";
const MAX_PER_TEAM = 6;

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

// NOTE: avatars rendus via ProfileAvatar (médaillon), comme dans les autres configs.

export default function WarfareConfigPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const locals: PlayerLite[] = React.useMemo(() => {
    return (store?.profiles ?? []).map((p: any) => ({
      id: String(p.id),
      name: p?.name || p?.displayName || "Joueur",
      avatarDataUrl: p?.avatarDataUrl || p?.avatar || null,
      isBot: false,
    }));
  }, [store?.profiles]);

  const bots: PlayerLite[] = React.useMemo(() => safeBots(), []);
  const allPlayers = React.useMemo(() => dedupe([...(locals || []), ...(bots || [])]), [locals, bots]);

  // Selection (par armée)
  const [teams, setTeams] = React.useState<WarfareTeams>(() => {
    const base = (locals || []).slice(0, 2);
    const p1 = base[0] || allPlayers[0];
    const p2 = base[1] || allPlayers[1];
    return {
      TOP: p1 ? [p1] : [],
      BOTTOM: p2 ? [p2] : [],
    };
  });

  const [layout, setLayout] = React.useState<WarfareLayout>("TOP_BOTTOM");
  const [zoneRule, setZoneRule] = React.useState<WarfareZoneRule>("ANY");
  const [friendlyFire, setFriendlyFire] = React.useState(true);
  const [handicapTopHarder, setHandicapTopHarder] = React.useState(false);

  // Variantes BULL/DBULL
  const [bullBomb, setBullBomb] = React.useState(false);
  const [bullHeal, setBullHeal] = React.useState(false);

  const bullRule: WarfareBullRule = React.useMemo(() => {
    if (bullBomb && bullHeal) return "CHOICE";
    if (bullBomb) return "BOMB";
    if (bullHeal) return "HEAL";
    return "NONE";
  }, [bullBomb, bullHeal]);

  const [infoOpen, setInfoOpen] = React.useState(false);

  const countTop = teams.TOP.length;
  const countBottom = teams.BOTTOM.length;
  const total = countTop + countBottom;

  const canStart = countTop >= 1 && countBottom >= 1 && countTop <= MAX_PER_TEAM && countBottom <= MAX_PER_TEAM;

  function addTo(teamKey: keyof WarfareTeams, p: PlayerLite) {
    setTeams((prev) => {
      const alreadyInTop = prev.TOP.some((x) => x.id === p.id);
      const alreadyInBottom = prev.BOTTOM.some((x) => x.id === p.id);
      if (alreadyInTop || alreadyInBottom) return prev; // un joueur ne peut appartenir qu'à une armée

      const next = { ...prev, [teamKey]: [...prev[teamKey]] } as WarfareTeams;
      if (next[teamKey].length >= MAX_PER_TEAM) return prev;
      next[teamKey].push(p);
      return next;
    });
  }

  function removeFrom(teamKey: keyof WarfareTeams, id: string) {
    setTeams((prev) => ({ ...prev, [teamKey]: prev[teamKey].filter((x) => x.id !== id) }));
  }

  function start() {
    if (!canStart) return;
    const cfg: WarfareConfig = {
      teams,
      zoneRule,
      friendlyFire,
      handicapTopHarder,
      layout,
      bullRule,
    };
    go("warfare_play", { config: cfg });
  }

  const labels = React.useMemo(() => {
    if (layout === "LEFT_RIGHT") {
      return { TOP: t("warfare.army.left", "Armée GAUCHE"), BOTTOM: t("warfare.army.right", "Armée DROITE") };
    }
    return { TOP: t("warfare.army.top", "Armée SUPÉRIEURE"), BOTTOM: t("warfare.army.bottom", "Armée INFÉRIEURE") };
  }, [layout, t]);

  const CARD_BG = theme.card;
  const PAGE_BG = theme.bg;

  function TeamBlock({ teamKey }: { teamKey: keyof WarfareTeams }) {
    const current = teams[teamKey];
    const otherKey: keyof WarfareTeams = teamKey === "TOP" ? "BOTTOM" : "TOP";
    const otherIds = new Set(teams[otherKey].map((p) => p.id));
    const currentIds = new Set(current.map((p) => p.id));
    // Dans le carrousel de sélection, on masque :
    // - les joueurs déjà pris par l'autre armée
    // - ET ceux déjà sélectionnés dans CETTE armée (sinon doublon visuel)
    const candidates = allPlayers.filter((p) => !otherIds.has(p.id) && !currentIds.has(p.id));

    const Medallion = ({ p, active }: { p: PlayerLite; active: boolean }) => (
      <div
        style={{
          width: 78,
          height: 78,
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: active ? `0 0 28px ${theme.primary}aa` : "0 0 14px rgba(0,0,0,0.65)",
          background: active
            ? `radial-gradient(circle at 30% 20%, #fff8d0, ${theme.primary})`
            : "#111320",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            overflow: "hidden",
            filter: active ? "none" : "grayscale(100%) brightness(0.55)",
            opacity: active ? 1 : 0.6,
            transition: "filter .2s ease, opacity .2s ease",
          }}
        >
          <ProfileAvatar profile={p as any} size={78} />
        </div>
      </div>
    );

    return (
      <div
        style={{
          padding: 14,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: CARD_BG,
          boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900, letterSpacing: 0.7, textTransform: "uppercase", color: theme.primary }}>
            {labels[teamKey]}
          </div>
          <div style={{ fontSize: 12, color: theme.textSoft }}>{current.length}/{MAX_PER_TEAM}</div>
        </div>

        {/* Sélection actuelle (médaillons) */}
        <div
          className="dc-scroll-thin"
          style={{
            marginTop: 12,
            display: "flex",
            gap: 18,
            overflowX: "auto",
            paddingBottom: 10,
            paddingLeft: 6,
            paddingRight: 6,
          }}
        >
          {current.length === 0 ? (
            <div style={{ color: theme.textSoft, fontSize: 13, paddingBottom: 2 }}>
              {t("warfare.team.empty", "Ajoute au moins 1 joueur")}
            </div>
          ) : (
            current.map((p) => (
              <div
                key={p.id}
                role="button"
                onClick={() => removeFrom(teamKey, p.id)}
                title={t("common.remove", "Retirer")}
                style={{
                  minWidth: 122,
                  maxWidth: 122,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 7,
                  flexShrink: 0,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <Medallion p={p} active={true} />
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textAlign: "center",
                    color: "#f6f2e9",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={p.name}
                >
                  {p.name}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Carrousel de sélection */}
        <div style={{ marginTop: 6, fontSize: 12, color: theme.textSoft }}>
          {t("warfare.team.pick", "Sélectionner des joueurs")}
        </div>

        <div
          className="dc-scroll-thin"
          style={{
            marginTop: 10,
            display: "flex",
            gap: 18,
            overflowX: "auto",
            paddingBottom: 10,
            paddingLeft: 6,
            paddingRight: 6,
          }}
        >
          {candidates.map((p) => {
            const inThis = current.some((x) => x.id === p.id);
            const full = !inThis && current.length >= MAX_PER_TEAM;
            const disabled = full;

            return (
              <div
                key={p.id}
                role="button"
                onClick={() => {
                  if (disabled) return;
                  if (inThis) removeFrom(teamKey, p.id);
                  else addTo(teamKey, p);
                }}
                title={disabled ? t("warfare.team.full", "Armée complète") : p.name}
                style={{
                  minWidth: 122,
                  maxWidth: 122,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 7,
                  flexShrink: 0,
                  cursor: disabled ? "default" : "pointer",
                  userSelect: "none",
                  opacity: disabled ? 0.45 : 1,
                }}
              >
                <Medallion p={p} active={inThis} />
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textAlign: "center",
                    color: inThis ? theme.primary : theme.text,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={p.name}
                >
                  {p.name}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 6, fontSize: 12, color: theme.textSoft }}>
          {t("warfare.team.hint", "Un joueur choisi dans une armée disparaît de l’autre carrousel.")}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        // IMPORTANT: plus grand paddingBottom pour ne rien cacher sous CTA + BottomNav
        paddingBottom: 190,
        background: PAGE_BG,
        color: theme.text,
      }}
    >
      {/* Header (1 ligne) : BackDot / Titre centré / InfoDot */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <BackDot onClick={() => go("games")} glow={theme.primary + "88"} title={t("common.back", "Retour")} />

        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 24,
            fontWeight: 1000,
            letterSpacing: 1.6,
            color: theme.primary,
            textShadow: `0 0 14px ${theme.primary}66`,
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          {t("warfare.title", "WARFARE")}
        </div>

        <InfoDot onClick={() => setInfoOpen(true)} glow={theme.primary + "88"} />
      </div>

      <div style={{ marginTop: 8, textAlign: "center", fontSize: 13, color: theme.textSoft }}>
        {t("warfare.subtitle", "Élimine l’armée adverse — attention au friendly fire.")}
      </div>

      {/* Teams */}
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <TeamBlock teamKey="TOP" />
        <TeamBlock teamKey="BOTTOM" />
      </div>

      {/* Options */}
      <div
        style={{
          marginTop: 14,
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

        {/* Disposition */}
        <div style={{ marginTop: 12, fontSize: 12, color: theme.textSoft }}>
          {t("warfare.layout", "Disposition des camps")}
        </div>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button onClick={() => setLayout("TOP_BOTTOM")} style={pillStyle(layout === "TOP_BOTTOM", theme)}>
            {t("warfare.layout.topBottom", "Haut / Bas")}
          </button>
          <button onClick={() => setLayout("LEFT_RIGHT")} style={pillStyle(layout === "LEFT_RIGHT", theme)}>
            {t("warfare.layout.leftRight", "Gauche / Droite")}
          </button>
        </div>

        {/* Zones valides */}
        <div style={{ marginTop: 14, fontSize: 12, color: theme.textSoft }}>
          {t("warfare.zones", "Zones valides")}
        </div>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button onClick={() => setZoneRule("ANY")} style={pillStyle(zoneRule === "ANY", theme)}>
            {t("warfare.zone.any", "S/D/T")}
          </button>
          <button onClick={() => setZoneRule("SINGLE_DOUBLE")} style={pillStyle(zoneRule === "SINGLE_DOUBLE", theme)}>
            {t("warfare.zone.sd", "S + D")}
          </button>
          <button onClick={() => setZoneRule("DOUBLE_ONLY")} style={pillStyle(zoneRule === "DOUBLE_ONLY", theme)}>
            {t("warfare.zone.d", "Double")}
          </button>
        </div>

        {/* Friendly fire + handicap */}
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={friendlyFire} onChange={(e) => setFriendlyFire(e.target.checked)} />
            <div>
              <div style={{ fontWeight: 900 }}>{t("warfare.friendlyFire", "Friendly fire")}</div>
              <div style={{ fontSize: 12, color: theme.textSoft }}>
                {t("warfare.friendlyFire.help", "Toucher un soldat de son armée l’élimine aussi.")}
              </div>
            </div>
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={handicapTopHarder} onChange={(e) => setHandicapTopHarder(e.target.checked)} />
            <div>
              <div style={{ fontWeight: 900 }}>{t("warfare.handicap", "Handicap")}</div>
              <div style={{ fontSize: 12, color: theme.textSoft }}>
                {t("warfare.handicap.help", "Armée A (TOP/GAUCHE) en Double uniquement.")}
              </div>
            </div>
          </label>
        </div>

        {/* Variantes Bull/DBull */}
        <div style={{ marginTop: 14, fontSize: 12, color: theme.textSoft }}>
          {t("warfare.bullVariants", "Variantes Bull / DBull")}
        </div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={bullBomb} onChange={(e) => setBullBomb(e.target.checked)} />
            <div>
              <div style={{ fontWeight: 900 }}>{t("warfare.bull.bomb", "DBULL = Bombardement")}</div>
              <div style={{ fontSize: 12, color: theme.textSoft }}>
                {t("warfare.bull.bomb.help", "DBULL permet de tuer 1 soldat adverse au choix.")}
              </div>
            </div>
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={bullHeal} onChange={(e) => setBullHeal(e.target.checked)} />
            <div>
              <div style={{ fontWeight: 900 }}>{t("warfare.bull.heal", "DBULL = Soin")}</div>
              <div style={{ fontSize: 12, color: theme.textSoft }}>
                {t("warfare.bull.heal.help", "DBULL permet de ressusciter 1 soldat de son armée au choix.")}
              </div>
            </div>
          </label>

          <div style={{ fontSize: 12, color: theme.textSoft }}>
            {t("warfare.bull.note", "Par défaut, le Bull n’a aucun effet.")}
          </div>
        </div>

        {/* Validation */}
        <div style={{ marginTop: 14, fontSize: 12, color: canStart ? theme.textSoft : "#ff8a8a" }}>
          {canStart
            ? t("warfare.valid", `OK — ${countTop} vs ${countBottom} (total ${total}/12)`)
            : t("warfare.invalid", "Sélection invalide : 1 à 6 joueurs par armée.")}
        </div>
      </div>

      {/* Info overlay (simple) */}
      {infoOpen && (
        <div
          onClick={() => setInfoOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.72)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              padding: 14,
              boxShadow: "0 18px 40px rgba(0,0,0,.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900, color: theme.primary, textTransform: "uppercase" }}>
                {t("warfare.info.title", "Règles")}
              </div>
              <button
                onClick={() => setInfoOpen(false)}
                style={{
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(255,255,255,.06)",
                  color: theme.text,
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {t("common.close", "Fermer")}
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: theme.textSoft, lineHeight: 1.4 }}>
              <div style={{ fontWeight: 900, color: theme.text, marginBottom: 6 }}>
                {t("warfare.rules.objective.title", "Objectif")}
              </div>
              <div>
                {t(
                  "warfare.rules.objective.body",
                  "Éliminer tous les soldats (nombres) de l’armée adverse. Une armée perd dès que ses 10 soldats sont éliminés."
                )}
              </div>

              <div style={{ marginTop: 12, fontWeight: 900, color: theme.text, marginBottom: 6 }}>
                {t("warfare.rules.setup.title", "Mise en place")}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>
                  {t(
                    "warfare.rules.setup.teams",
                    "Deux armées : jusqu’à 6 joueurs par armée (max 12 au total). Les variantes impaires (4v3, 6v5, etc.) sont autorisées."
                  )}
                </li>
                <li>
                  {t(
                    "warfare.rules.setup.layout",
                    "Disposition : Haut/Bas (armées supérieure/inférieure) ou Gauche/Droite (cible coupée verticalement)."
                  )}
                </li>
              </ul>

              <div style={{ marginTop: 12, fontWeight: 900, color: theme.text, marginBottom: 6 }}>
                {t("warfare.rules.flow.title", "Déroulement de la partie")}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>
                  {t(
                    "warfare.rules.flow.turns",
                    "Les joueurs tirent à tour de rôle, en alternant les armées. Au sein d’une armée, on fait tourner les joueurs dans l’ordre affiché."
                  )}
                </li>
                <li>
                  {t(
                    "warfare.rules.flow.kill",
                    "Un soldat est éliminé si une fléchette touche son nombre, selon les zones valides choisies (S/D/T, S+D, Double uniquement)."
                  )}
                </li>
                <li>
                  {t(
                    "warfare.rules.flow.neutral",
                    "Par défaut, Bull (25) et DBull (50) n’ont aucun effet, sauf si une variante DBULL est activée."
                  )}
                </li>
              </ul>

              <div style={{ marginTop: 12, fontWeight: 900, color: theme.text, marginBottom: 6 }}>
                {t("warfare.rules.options.title", "Options et variantes")}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>
                  {t(
                    "warfare.rules.options.ff",
                    "Friendly fire : si activé, toucher un soldat de sa propre armée l’élimine aussi."
                  )}
                </li>
                <li>
                  {t(
                    "warfare.rules.options.handicap",
                    "Handicap : l’armée TOP/GAUCHE doit jouer en Double uniquement, l’autre armée suit la règle de zones sélectionnée."
                  )}
                </li>
                <li>
                  {t(
                    "warfare.rules.options.dbull",
                    "Variantes DBULL : Bombardement (tuer 1 soldat adverse au choix) et/ou Soin (ressusciter 1 soldat allié au choix). Si les deux sont activées, DBULL propose un choix."
                  )}
                </li>
              </ul>

              <div style={{ marginTop: 12, fontWeight: 900, color: theme.text, marginBottom: 6 }}>
                {t("warfare.rules.win.title", "Victoire")}
              </div>
              <div>
                {t(
                  "warfare.rules.win.body",
                  "Tu gagnes dès que les 10 soldats de l’armée adverse sont éliminés."
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTA sticky (au-dessus du BottomNav) */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 78, // hauteur BottomNav ~ 64 + marge
          padding: 14,
          background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.85))",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <button
          disabled={!canStart}
          onClick={start}
          style={{
            pointerEvents: "auto",
            width: "100%",
            padding: "14px 16px",
            borderRadius: 18,
            border: "none",
            background: canStart ? `linear-gradient(180deg, ${theme.primary}, ${theme.primary}cc)` : "rgba(255,255,255,.08)",
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
    </div>
  );
}
