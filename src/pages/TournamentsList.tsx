// ============================================
// src/pages/TournamentsHome.tsx
// TOURNOIS — HOME (LOCAL) UI clean (v1) + ✅ SCOPE via params.forceMode
// ✅ Darts par défaut (inchangé)
// ✅ Pétanque : si params.forceMode === "petanque" => filtre + libellés + create pré-rempli
// ✅ Baby-Foot : si params.forceMode === "babyfoot" => filtre + libellés + create pré-rempli
// ============================================

import React from "react";
import BackDot from "../components/BackDot";
import type { Store } from "../lib/types";

// ✅ NEW: source de vérité local (IDB cache + event refresh)
import {
  listTournamentsLocal,
  listTournamentsLocalAsync,
  listMatchesForTournamentLocal,
  upsertTournamentLocal,
  upsertMatchesForTournamentLocal,
  deleteTournamentLocal,
  TOURNAMENTS_UPDATED_EVENT,
} from "../lib/tournaments/storeLocal";
import { listOnlineCompetitions } from "../lib/tournaments/onlineStore";

type Props = {
  store: Store;
  update: (mut: (s: Store) => Store) => void;
  go: (tab: any, params?: any) => void;
  source?: "local" | "online";
  params?: any; // ✅ NEW : reçoit routeParams (dont forceMode)
};

type FilterKey = "all" | "active" | "draft" | "running" | "done";
type DateFilterKey = "all" | "day" | "week" | "month" | "year";

/** ✅ Pills style */
function pillStyle(active: boolean, tint: string, disabled = false) {
  const fgOn = "#121014";
  const fgOff = "rgba(255,255,255,.90)";

  return {
    padding: "7px 12px",
    borderRadius: 999,
    border: active ? `1px solid ${tint}88` : "1px solid rgba(255,255,255,.12)",
    background: active
      ? `linear-gradient(180deg, ${tint} 0%, ${tint}55 55%, rgba(0,0,0,.20) 100%)`
      : "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))",
    color: active ? fgOn : fgOff,
    fontWeight: 950,
    fontSize: 12,
    letterSpacing: 0.4,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    userSelect: "none" as const,
    whiteSpace: "nowrap" as const,
    boxShadow: active
      ? `0 0 0 1px rgba(0,0,0,.25),
         0 10px 20px rgba(0,0,0,.55),
         0 0 18px ${tint}55,
         0 0 38px ${tint}22`
      : "0 10px 18px rgba(0,0,0,.35)",
    transform: active ? "translateY(-0.5px)" : "translateY(0px)",
    transition:
      "transform 120ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease, opacity 160ms ease",
  } as React.CSSProperties;
}

function Card({
  children,
  tone = "dark",
}: {
  children: React.ReactNode;
  tone?: "dark" | "gold" | "blue" | "pink" | "green";
}) {
  const bg =
    tone === "gold"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.14), transparent 55%), linear-gradient(180deg, rgba(22,22,26,.96), rgba(10,10,12,.98))"
      : tone === "blue"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(79,180,255,.12), transparent 55%), linear-gradient(180deg, rgba(18,18,26,.96), rgba(10,10,12,.98))"
      : tone === "pink"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(255,79,216,.12), transparent 55%), linear-gradient(180deg, rgba(18,18,26,.96), rgba(10,10,12,.98))"
      : tone === "green"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(127,226,169,.12), transparent 55%), linear-gradient(180deg, rgba(18,18,26,.96), rgba(10,10,12,.98))"
      : "linear-gradient(180deg, rgba(24,24,30,.96), rgba(10,10,12,.98))";

  const border =
    tone === "gold"
      ? "1px solid rgba(255,195,26,.22)"
      : "1px solid rgba(255,255,255,.10)";

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        background: bg,
        border,
        boxShadow: "0 18px 45px rgba(0,0,0,.60)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function fmtDate(ts?: number) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString().slice(0, 5);
  } catch {
    return "";
  }
}


const DARTS_TOURNAMENT_MODES = new Set(["darts", "x01", "cricket", "killer", "shanghai", "golf", "clock", "scram", "warfare", "battle_royale", "territories", "capital", "batard", "five_lives"]);

function normalizeCompetitionSport(value: any): string {
  const raw = String(value?.sport || value?.game?.sport || value?.competitionSport || value?.sportId || value?.game?.mode || value?.mode || value?.gameMode || "").toLowerCase().trim();
  if (!raw) return "darts";
  if (DARTS_TOURNAMENT_MODES.has(raw)) return "darts";
  if (raw === "baby-foot" || raw === "baby_foot" || raw === "foosball") return "babyfoot";
  if (raw === "ping-pong" || raw === "tabletennis" || raw === "table_tennis") return "pingpong";
  if (raw === "dice" || raw === "dice_game") return "dicegame";
  return raw;
}

function competitionSportLabel(sport: string): string {
  const s = normalizeCompetitionSport({ sport });
  if (s === "darts") return "FLÉCHETTES";
  if (s === "babyfoot") return "BABY-FOOT";
  if (s === "petanque") return "PÉTANQUE";
  if (s === "pingpong") return "PING-PONG";
  if (s === "molkky") return "MÖLKKY";
  if (s === "dicegame") return "DÉS";
  return s.toUpperCase();
}

function normalizeCompetitionKindValue(value: any): "all" | "league" | "tournament" {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw) return "all";
  if (raw === "league" || raw === "championship" || raw === "championnat" || raw === "ligue") return "league";
  if (raw === "tournament" || raw === "tournoi" || raw === "cup" || raw === "bracket") return "tournament";
  return "all";
}

function normalizeTournamentKind(t: any): "league" | "tournament" {
  const raw = String(
    t?.competitionKind ||
      t?.kind ||
      t?.type ||
      t?.meta?.competitionKind ||
      t?.meta?.kind ||
      t?.meta?.type ||
      ""
  ).toLowerCase().trim();

  if (raw === "league" || raw === "championship" || raw === "championnat" || raw === "ligue") return "league";
  return "tournament";
}

function competitionKindLabel(kind: "all" | "league" | "tournament") {
  if (kind === "league") return "LIGUES / CHAMPIONNATS";
  if (kind === "tournament") return "TOURNOIS";
  return "LIGUES / CHAMPIONNATS / TOURNOIS";
}

function normalizeStatusFilter(value: any): FilterKey {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "active" || raw === "resume" || raw === "reprendre" || raw === "non_done" || raw === "unfinished") return "active";
  if (raw === "draft" || raw === "brouillon") return "draft";
  if (raw === "running" || raw === "en_cours" || raw === "progress" || raw === "ongoing") return "running";
  if (raw === "done" || raw === "finished" || raw === "termine" || raw === "terminé" || raw === "history" || raw === "historique") return "done";
  return "all";
}

function isPlayableReal(m: any) {
  const st = String(m?.status || "");
  if (st !== "pending") return false;
  const a = String(m?.aPlayerId || "");
  const b = String(m?.bPlayerId || "");
  if (!a || !b) return false;
  if (a === "__BYE__" || b === "__BYE__") return false;
  if (a === "__TBD__" || b === "__TBD__") return false;
  if (a === "__BYE__" && b === "__BYE__") return false;
  return true;
}

function computeCountsForTournament(tid: string) {
  const ms = listMatchesForTournamentLocal(tid) || [];
  const visible = (Array.isArray(ms) ? ms : []).filter(
    (m: any) => !(String(m?.aPlayerId) === "__BYE__" && String(m?.bPlayerId) === "__BYE__")
  );

  const pending = visible.filter((m: any) => String(m?.status || "") === "pending").length;
  const running = visible.filter((m: any) => {
    const s = String(m?.status || "");
    return s === "running" || s === "playing";
  }).length;
  const done = visible.filter((m: any) => String(m?.status || "") === "done").length;
  const playable = visible.filter((m: any) => isPlayableReal(m)).length;

  return { pending, running, done, playable, total: visible.length };
}

function TickerCard({
  tag,
  title,
  sub,
  tone,
  cta,
  kpi,
  onClick,
  disabled,
}: {
  tag: string;
  title: string;
  sub?: string;
  tone: "gold" | "pink" | "green" | "blue" | "dark" | "violet" | "white";
  cta: string;
  kpi?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const accent =
    tone === "gold"
      ? "#ffd56a"
      : tone === "pink"
      ? "#ff7fe2"
      : tone === "green"
      ? "#7fe2a9"
      : tone === "blue"
      ? "#4fb4ff"
      : tone === "violet"
      ? "#9b7bff"
      : tone === "white"
      ? "#ffffff"
      : "rgba(255,255,255,0.92)";

  const bg =
    tone === "gold"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.20), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.92), rgba(10,10,12,.98))"
      : tone === "pink"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(255,79,216,.18), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.92), rgba(10,10,12,.98))"
      : tone === "green"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(127,226,169,.16), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.92), rgba(10,10,12,.98))"
      : tone === "blue"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(79,180,255,.16), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.92), rgba(10,10,12,.98))"
      : tone === "violet"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(155,123,255,.16), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.92), rgba(10,10,12,.98))"
      : "linear-gradient(180deg, rgba(22,22,26,.92), rgba(10,10,12,.98))";

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        minWidth: 240,
        maxWidth: 280,
        borderRadius: 16,
        padding: 12,
        border: "1px solid rgba(255,255,255,.10)",
        background: bg,
        boxShadow: "0 14px 30px rgba(0,0,0,.55)",
        cursor: disabled ? "default" : "pointer",
        userSelect: "none",
        opacity: disabled ? 0.55 : 1,
      }}
      title={cta}
      role="button"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <span
          style={{
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 10.5,
            fontWeight: 950,
            border: `1px solid ${accent}55`,
            color: accent,
            background: "rgba(0,0,0,.35)",
            letterSpacing: 0.4,
            whiteSpace: "nowrap",
          }}
        >
          {tag}
        </span>

        {kpi ? (
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 950,
              border: `1px solid ${accent}44`,
              color: "rgba(255,255,255,.92)",
              background: `linear-gradient(180deg, ${accent}22, rgba(0,0,0,.30))`,
              whiteSpace: "nowrap",
            }}
          >
            {kpi}
          </span>
        ) : null}
      </div>

      <div style={{ fontWeight: 950, fontSize: 13 }}>{title}</div>
      {sub ? <div style={{ opacity: 0.82, fontSize: 11.5, marginTop: 2 }}>{sub}</div> : null}

      <div style={{ marginTop: 10 }}>
        <span
          style={{
            display: "inline-block",
            padding: "6px 10px",
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 950,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(0,0,0,.30)",
            color: "rgba(255,255,255,.92)",
          }}
        >
          {cta} →
        </span>
      </div>
    </div>
  );
}

function TickerRow({
  go,
  setFilter,
  sport,
}: {
  go: (tab: any, params?: any) => void;
  setFilter: (k: FilterKey) => void;
  sport: string;
}) {
  const scopedSport = normalizeCompetitionSport({ sport: sport || "darts" });
  const rawTours = listTournamentsLocal() || [];
  const tours = (Array.isArray(rawTours) ? rawTours : []).filter((t: any) => normalizeCompetitionSport(t) === scopedSport);

  const draft = tours.filter((t: any) => String(t?.status || "").toLowerCase().includes("draft"));

  const running = tours.filter((t: any) => {
    const s = String(t?.status || "").toLowerCase();
    return (
      s.includes("running") ||
      s.includes("playing") ||
      s.includes("in_progress") ||
      s.includes("en_cours") ||
      s.includes("active")
    );
  });

  const resumeTour: any = (running[0] || tours[0] || null);
  const resumeTid = resumeTour?.id ? String(resumeTour.id) : "";
  const resumeCounts = resumeTid ? computeCountsForTournament(resumeTid) : null;

  const canAuto = !!resumeCounts && (resumeCounts.playable ?? 0) > 0;

  const baseCreateParams = { forceMode: scopedSport };

  const items = [
    {
      tag: "REPRENDRE",
      title: resumeTour ? (resumeTour?.name || "Tournoi") : "Aucun tournoi",
      sub: resumeTour
        ? `${String(resumeTour?.game?.mode || "mode").toUpperCase()} • ${fmtDate(resumeTour?.updatedAt || resumeTour?.createdAt)}`
        : "Crée un tournoi pour démarrer.",
      tone: "blue" as const,
      cta: "Ouvrir",
      kpi: resumeTour ? `${resumeCounts?.playable ?? 0} à jouer` : "—",
      onClick: resumeTour?.id
        ? () => go("tournament_view", { id: String(resumeTour.id), ...baseCreateParams })
        : undefined,
      disabled: !resumeTour?.id,
    },
    {
      tag: "AUTO",
      title: "Prochain match",
      sub: resumeTour
        ? canAuto
          ? "Ouvre le tournoi, puis ‘LANCER LE PROCHAIN MATCH’ (Résumé)."
          : "Aucun match jouable (attente vainqueur / BYE)."
        : "Crée un tournoi pour utiliser l’AUTO.",
      tone: "green" as const,
      cta: "Ouvrir",
      kpi: canAuto ? "Prêt" : "—",
      onClick: resumeTour?.id
        ? () => go("tournament_view", { id: String(resumeTour.id), ...baseCreateParams })
        : undefined,
      disabled: !resumeTour?.id,
    },
    {
      tag: "BROUILLONS",
      title: "Tournois en brouillon",
      sub: "Filtrer la liste sur les brouillons.",
      tone: "gold" as const,
      cta: "Afficher",
      kpi: `${draft.length}`,
      onClick: () => setFilter("draft"),
      disabled: false,
    },
    {
      tag: "BRACKET",
      title: "Bracket KO + poules",
      sub: "Vue claire + progression guidée.",
      tone: "pink" as const,
      cta: "Créer BRACKET",
      kpi: "KO+Poules",
      onClick: () => go("tournament_create", { preset: "bracket", mode: "bracket_ko_pools", ...baseCreateParams }),
      disabled: false,
    },
    {
      tag: "CRÉER",
      title: "Tournoi avancé",
      sub: "Repêchage, têtes de série, bots auto.",
      tone: "violet" as const,
      cta: "Configurer",
      kpi: "NEW",
      onClick: () => go("tournament_create", { preset: "advanced", mode: "advanced", ...baseCreateParams }),
      disabled: false,
    },
    {
      tag: "ROADMAP",
      title: "Bye intelligent, Swiss…",
      sub: "Export / partage, double élimination, stats.",
      tone: "white" as const,
      cta: "Voir",
      kpi: "À venir",
      onClick: () => go("tournament_roadmap", baseCreateParams),
      disabled: false,
    },
  ];

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(255,255,255,.03)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: 10,
          width: "max-content",
          animation: "dcTicker 22s linear infinite",
        }}
      >
        {items.concat(items).map((it, idx) => (
          <TickerCard
            key={idx}
            tag={it.tag}
            title={it.title}
            sub={it.sub}
            tone={it.tone as any}
            cta={it.cta}
            kpi={it.kpi}
            onClick={it.onClick}
            disabled={it.disabled || !it.onClick}
          />
        ))}
      </div>

      <style>
        {`
          @keyframes dcTicker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @media (prefers-reduced-motion: reduce) {
            div[style*="animation: dcTicker"] { animation: none !important; }
          }
        `}
      </style>
    </div>
  );
}


function TinyIcon({ kind, size = 18 }: { kind: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true } as any;
  if (kind === "play") return <svg {...common}><path d="M8 5v14l11-7z" /></svg>;
  if (kind === "trash") return <svg {...common}><path d="M9 3h6l1 2h5v2H3V5h5l1-2Zm-3 6h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9Z" /></svg>;
  if (kind === "cup") return <svg {...common}><path d="M6 2h12v2h3a1 1 0 0 1 1 1v1a5 5 0 0 1-5 5h-1.1A6 6 0 0 1 13 13.9V16h3v2H8v-2h3v-2.1A6 6 0 0 1 8.1 11H7A5 5 0 0 1 2 6V5a1 1 0 0 1 1-1h3V2Zm12 4v2.8A3 3 0 0 0 20 6h-2ZM4 6a3 3 0 0 0 2 2.8V6H4Z" /></svg>;
  if (kind === "calendar") return <svg {...common}><path d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3V2Zm13 8H4v10h16V10Z" /></svg>;
  if (kind === "users") return <svg {...common}><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8.5 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM8 13c-4 0-7 2-7 4.7V20h14v-2.3C15 15 12 13 8 13Zm8.5.5c-.9 0-1.8.1-2.5.4 1.8 1 3 2.4 3 4.1V20h6v-1.8c0-2.7-2.8-4.7-6.5-4.7Z" /></svg>;
  return <svg {...common}><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3 6.6 3.7L12 11.7 5.4 8 12 4.3ZM5 9.7l6 3.4v6.1l-6-3.4V9.7Zm14 0v6.1l-6 3.4v-6.1l6-3.4Z" /></svg>;
}

function avatarForCompetition(t: any): string | null {
  return (
    t?.logoUrl || t?.logoURL || t?.logoDataUrl || t?.logoDataURL || t?.logo ||
    t?.coverUrl || t?.coverDataUrl || t?.imageUrl || t?.avatarUrl ||
    t?.meta?.logoUrl || t?.meta?.logoDataUrl || t?.settings?.logoUrl || null
  );
}

function teamLogo(team: any): string | null {
  return team?.logoUrl || team?.logoDataUrl || team?.avatarUrl || team?.avatar || team?.imageUrl || null;
}

function competitionTeams(t: any): any[] {
  const lists = [t?.teams, t?.participants, t?.players, t?.entries, t?.config?.teams, t?.config?.participants];
  for (const value of lists) if (Array.isArray(value) && value.length) return value;
  return [];
}

function statusLabelFromTournament(t: any): { label: string; tone: string; key: FilterKey } {
  const raw = String(t?.status || "draft").toLowerCase();
  if (raw.includes("done") || raw.includes("finish") || raw.includes("term") || raw.includes("end")) return { label: "TERMINÉ", tone: "#7fe2a9", key: "done" };
  if (raw.includes("run") || raw.includes("progress") || raw.includes("en_cours") || raw.includes("ongoing") || raw.includes("active") || raw.includes("playing")) return { label: "EN COURS", tone: "#ff7fe2", key: "running" };
  return { label: "À REPRENDRE", tone: "#4fb4ff", key: "draft" };
}

function historyTileStyle(accent: string): React.CSSProperties {
  return {
    minWidth: 0,
    borderRadius: 18,
    padding: "12px 10px",
    border: `1px solid ${accent}44`,
    background: `radial-gradient(120% 140% at 0% 0%, ${accent}22, transparent 58%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(8,8,12,.98))`,
    boxShadow: `0 14px 32px rgba(0,0,0,.52), 0 0 24px ${accent}18`,
  };
}

function roundIconButton(accent: string, active = false): React.CSSProperties {
  return {
    width: 42,
    height: 42,
    borderRadius: 999,
    border: `1px solid ${active ? accent : "rgba(255,255,255,.14)"}`,
    background: active
      ? `radial-gradient(circle at 50% 20%, ${accent}66, ${accent}24 48%, rgba(255,255,255,.04))`
      : "linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.025))",
    color: active ? accent : "rgba(255,255,255,.88)",
    display: "grid",
    placeItems: "center",
    boxShadow: active ? `0 0 0 1px rgba(0,0,0,.5), 0 0 18px ${accent}66` : "0 10px 20px rgba(0,0,0,.38)",
    cursor: "pointer",
    flex: "0 0 auto",
  };
}

function competitionCardActionStyle(accent: string, primary = false): React.CSSProperties {
  return {
    border: `1px solid ${primary ? accent : "rgba(255,255,255,.12)"}`,
    background: primary
      ? `linear-gradient(180deg, ${accent}, ${accent}aa)`
      : "linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03))",
    color: primary ? "#111" : "#fff",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 950,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 36,
    whiteSpace: "nowrap",
    boxShadow: primary ? `0 0 18px ${accent}44` : "0 10px 20px rgba(0,0,0,.35)",
  };
}

function IconFilterButton({
  active,
  tint,
  label,
  count,
  onClick,
  icon,
}: {
  active: boolean;
  tint: string;
  label: string;
  count: number;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} (${count})`}
      aria-label={`${label} (${count})`}
      style={{
        width: 48,
        height: 42,
        borderRadius: 999,
        border: active ? `1px solid ${tint}` : "1px solid rgba(255,255,255,.13)",
        background: active
          ? `radial-gradient(circle at 50% 18%, ${tint}66, ${tint}24 50%, rgba(255,255,255,.04))`
          : "linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.025))",
        color: active ? tint : "rgba(255,255,255,.88)",
        display: "grid",
        placeItems: "center",
        position: "relative",
        cursor: "pointer",
        boxShadow: active ? `0 0 20px ${tint}66` : "0 10px 18px rgba(0,0,0,.34)",
        flex: "0 0 auto",
      }}
    >
      {icon}
      <span
        style={{
          position: "absolute",
          right: -3,
          top: -5,
          minWidth: 18,
          height: 18,
          padding: "0 5px",
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          border: `1px solid ${tint}66`,
          background: "rgba(5,5,8,.94)",
          color: tint,
          fontSize: 10,
          fontWeight: 1000,
          lineHeight: 1,
          boxShadow: `0 0 12px ${tint}33`,
        }}
      >
        {count}
      </span>
    </button>
  );
}


function startOfDayTs(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeekTs(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.getTime();
}

function dateFilterLabel(filter: DateFilterKey) {
  if (filter === "day") return "Aujourd’hui";
  if (filter === "week") return "Cette semaine";
  if (filter === "month") return "Ce mois";
  if (filter === "year") return "Cette année";
  return "Toutes dates";
}

function statusFilterLabel(filter: FilterKey) {
  if (filter === "active") return "À reprendre";
  if (filter === "draft") return "Brouillons";
  if (filter === "running") return "En cours";
  if (filter === "done") return "Terminées";
  return "Toutes";
}

function dateFilterMatch(t: any, filter: DateFilterKey) {
  if (filter === "all") return true;
  const ts = Number(t?.updatedAt || t?.createdAt || t?.date || t?.startedAt || 0);
  if (!Number.isFinite(ts) || ts <= 0) return true;
  const now = Date.now();
  if (filter === "day") return ts >= startOfDayTs(now);
  if (filter === "week") return ts >= startOfWeekTs(now);
  if (filter === "month") {
    const d = new Date(now);
    d.setDate(1); d.setHours(0, 0, 0, 0);
    return ts >= d.getTime();
  }
  if (filter === "year") {
    const d = new Date(now);
    d.setMonth(0, 1); d.setHours(0, 0, 0, 0);
    return ts >= d.getTime();
  }
  return true;
}

function StatMini({ label, value, accent }: { label: string; value: React.ReactNode; accent: string }) {
  return (
    <div style={{ borderRadius: 14, padding: "8px 9px", background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)", minWidth: 0 }}>
      <div style={{ fontSize: 9.5, opacity: 0.66, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.45 }}>{label}</div>
      <div style={{ marginTop: 3, color: accent, fontWeight: 1000, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

export default function TournamentsHome({ store, go, source = "local", params }: Props) {
  const routeStatusFilter = normalizeStatusFilter((params as any)?.statusFilter || (params as any)?.filter || (params as any)?.view);
  const [filter, setFilter] = React.useState<FilterKey>(routeStatusFilter);
  const [dateFilter, setDateFilter] = React.useState<DateFilterKey>("all");
  const [showDateFilters, setShowDateFilters] = React.useState(false);

  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  // ✅ SCOPE strict via GameSelect / SportContext : une compétition ne propose que le sport actif.
  const forceMode = normalizeCompetitionSport({ sport: (params as any)?.forceMode || (params as any)?.sport || "darts" });
  const isPetanque = forceMode === "petanque";
  const isOnline = String(source || "local").toLowerCase() === "online";
  const sportLabel = competitionSportLabel(forceMode);
  const kindFilter = normalizeCompetitionKindValue((params as any)?.filterKind || (params as any)?.competitionKind || (params as any)?.kind);
  const kindHeaderLabel = competitionKindLabel(kindFilter);
  const listContext = String((params as any)?.view || "").toLowerCase();
  const showCreateShortcuts = listContext !== "resume" && listContext !== "history";
  const handleBack = React.useCallback(() => {
    try {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch {}
    go("tournaments_home", { forceMode, sport: forceMode });
  }, [forceMode, go]);

  React.useEffect(() => {
    setFilter(routeStatusFilter);
  }, [routeStatusFilter, kindFilter, forceMode]);

  const reload = React.useCallback(() => {
    setLoading(true);
    const applyScope = (arr: any[]) => {
      const list = Array.isArray(arr) ? arr : [];
      return list.filter((t: any) => normalizeCompetitionSport(t) === forceMode);
    };

    if (isOnline) {
      void listOnlineCompetitions({ sport: forceMode || undefined, limit: 200 })
        .then((onlineItems) => setItems(applyScope(onlineItems || [])))
        .catch((e) => {
          console.error("[TournamentsHome] online load failed:", e);
          setItems([]);
        })
        .finally(() => setLoading(false));
      return;
    }

    try {
      // ✅ fiable au premier affichage : attend l’hydratation IndexedDB/migration localStorage.
      // Avant, listTournamentsLocal() pouvait renvoyer [] pendant le load async,
      // donc les compétitions créées semblaient disparaître de “À reprendre / En cours”.
      void listTournamentsLocalAsync()
        .then((list) => setItems(applyScope(Array.isArray(list) ? list : [])))
        .catch((e) => {
          console.error("[TournamentsHome] local async load failed:", e);
          const fallback = listTournamentsLocal() || [];
          setItems(applyScope(Array.isArray(fallback) ? fallback : []));
        })
        .finally(() => setLoading(false));
    } catch {
      setItems([]);
      setLoading(false);
    }
  }, [forceMode, isOnline]);

  React.useEffect(() => {
    reload();

    const onUpdated = () => reload();
    const onFocus = () => reload();
    const onVis = () => {
      if (document.visibilityState === "visible") reload();
    };

    window.addEventListener(TOURNAMENTS_UPDATED_EVENT, onUpdated as any);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener(TOURNAMENTS_UPDATED_EVENT, onUpdated as any);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reload]);

  const tournaments = React.useMemo(() => items || [], [items]);

  const statusKeyOf = React.useCallback((t: any): FilterKey => {
    // Même normalisation partout : compteurs, filtres et cartes.
    return statusLabelFromTournament(t).key;
  }, []);

  const visibleByKind = React.useMemo(() => {
    const base = Array.isArray(tournaments) ? tournaments : [];
    // Sécurité anti-écran vide : les anciennes créations n'avaient pas toujours
    // competitionKind au bon niveau. Si le filtre Ligue/Tournoi ne matche rien,
    // on affiche quand même les compétitions du sport au lieu de les cacher.
    const strictKindList = kindFilter === "all" ? base : base.filter((t: any) => normalizeTournamentKind(t) === kindFilter);
    return strictKindList.length || kindFilter === "all" ? strictKindList : base;
  }, [tournaments, kindFilter]);

  const filtered = React.useMemo(() => {
    const list = (Array.isArray(visibleByKind) ? visibleByKind : []).filter((t) => dateFilterMatch(t, dateFilter));
    if (filter === "all") return list;
    if (filter === "active") return list.filter((t) => statusKeyOf(t) !== "done");
    return list.filter((t) => statusKeyOf(t) === filter);
  }, [visibleByKind, filter, dateFilter, statusKeyOf]);

  const hasAny = (filtered?.length || 0) > 0;

  const counts = React.useMemo(() => {
    // IMPORTANT : les compteurs utilisent EXACTEMENT la même base que la liste.
    // Avant, la liste basculait en fallback si les anciennes compétitions étaient
    // mal typées, mais les compteurs restaient sur le filtre strict => 0 partout.
    const list = (Array.isArray(visibleByKind) ? visibleByKind : []).filter((t: any) => dateFilterMatch(t, dateFilter));
    const statusOf = (t: any) => statusKeyOf(t);
    return {
      total: list.length,
      active: list.filter((t: any) => statusOf(t) !== "done").length,
      draft: list.filter((t: any) => statusOf(t) === "draft").length,
      running: list.filter((t: any) => statusOf(t) === "running").length,
      done: list.filter((t: any) => statusOf(t) === "done").length,
    };
  }, [visibleByKind, dateFilter, statusKeyOf]);

  const activeFilterCaption = React.useMemo(() => {
    const statusLabel = statusFilterLabel(filter);
    if (dateFilter === "all") return statusLabel;
    return `${statusLabel} · ${dateFilterLabel(dateFilter)}`;
  }, [filter, dateFilter]);

  const toggleDateFilterPanel = React.useCallback(() => {
    if (showDateFilters || dateFilter !== "all") {
      setShowDateFilters(false);
      setDateFilter("all");
      return;
    }
    setShowDateFilters(true);
  }, [showDateFilters, dateFilter]);

  const openTournament = React.useCallback((t: any) => {
    const id = String(t?.id || t?.tournamentId || t?.tid || t?.code || "");
    if (!id) return;
    if (isOnline) {
      try {
        const payload = (t as any)?.__onlineRow?.payload || {};
        const remoteTournament = payload?.tournament || t;
        const remoteMatches = Array.isArray(payload?.matches) ? payload.matches : [];
        upsertTournamentLocal({ ...(remoteTournament || t), id, source: "online", onlineCompetitionId: id });
        upsertMatchesForTournamentLocal(id, remoteMatches);
      } catch (e) {
        console.error("[TournamentsHome] online hydrate failed:", e);
      }
    }
    go("tournament_view", { id, forceMode: forceMode || undefined, source: isOnline ? "online" : "local" });
  }, [forceMode, go, isOnline]);

  const removeTournament = React.useCallback((t: any) => {
    const id = String(t?.id || t?.tournamentId || t?.tid || t?.code || "");
    if (!id || isOnline) return;
    const name = String(t?.name || t?.title || "cette compétition");
    if (!window.confirm(`Supprimer ${name} ?`)) return;
    deleteTournamentLocal(id);
    setItems((old) => (Array.isArray(old) ? old.filter((x: any) => String(x?.id || x?.tournamentId || x?.tid || x?.code || "") !== id) : []));
  }, [isOnline]);

  return (
    <div
      className="container"
      style={{
        padding: 16,
        paddingBottom: 104,
        maxWidth: 560,
        margin: "0 auto",
        color: "#f5f5f7",
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 0%, rgba(255,213,106,.11), transparent 36%), linear-gradient(180deg, rgba(4,5,10,.98), rgba(0,0,0,1))",
      }}
    >
      <div
        style={{
          borderRadius: 24,
          padding: 14,
          border: "1px solid rgba(255,213,106,.25)",
          background: "radial-gradient(110% 140% at 0% 0%, rgba(255,213,106,.18), transparent 55%), linear-gradient(180deg, rgba(24,24,30,.96), rgba(8,8,12,.99))",
          boxShadow: "0 22px 55px rgba(0,0,0,.68), 0 0 42px rgba(255,213,106,.10)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 44px", alignItems: "center", gap: 10 }}>
          <BackDot onClick={handleBack} size={42} color="#ffd56a" title="Retour page précédente" />
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <div
              style={{
                fontWeight: 1000,
                fontSize: 20,
                lineHeight: 1.05,
                letterSpacing: 0.7,
                textTransform: "uppercase",
                color: "#ffd56a",
                textShadow: "0 0 12px rgba(255,213,106,.72), 0 0 34px rgba(255,213,106,.42)",
              }}
            >
              {listContext === "history" ? "Historique compétitions" : "Reprise compétitions"}
            </div>
            <div style={{ marginTop: 5, fontSize: 10.5, opacity: 0.68, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {kindHeaderLabel} · {sportLabel} · {isOnline ? "ONLINE NAS" : "LOCAL + BACKUP NAS"}
            </div>
          </div>
          <button
            type="button"
            onClick={reload}
            style={roundIconButton("#4fb4ff", loading)}
            title="Rafraîchir la liste"
            aria-label="Rafraîchir la liste"
          >
            ↻
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 9, marginTop: 14 }}>
          <div style={historyTileStyle("#ffd56a")}>
            <div style={{ fontSize: 10, opacity: 0.62, fontWeight: 900 }}>TOTAL</div>
            <div style={{ marginTop: 3, fontWeight: 1000, fontSize: 24, color: "#ffd56a" }}>{loading ? "…" : counts.total}</div>
          </div>
          <div style={historyTileStyle("#4fb4ff")}>
            <div style={{ fontSize: 10, opacity: 0.62, fontWeight: 900 }}>À REPRENDRE</div>
            <div style={{ marginTop: 3, fontWeight: 1000, fontSize: 24, color: "#4fb4ff" }}>{loading ? "…" : counts.active}</div>
          </div>
          <div style={historyTileStyle("#7fe2a9")}>
            <div style={{ fontSize: 10, opacity: 0.62, fontWeight: 900 }}>TERMINÉES</div>
            <div style={{ marginTop: 3, fontWeight: 1000, fontSize: 24, color: "#7fe2a9" }}>{loading ? "…" : counts.done}</div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          borderRadius: 22,
          padding: 12,
          border: "1px solid rgba(255,255,255,.10)",
          background: "linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025))",
          boxShadow: "0 18px 44px rgba(0,0,0,.56)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.86, textTransform: "uppercase" }}>Filtres</div>
          <div style={{ fontSize: 11, opacity: 0.62 }}>{loading ? "Chargement…" : "Tri activité récente"}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 9, flexWrap: "wrap" }}>
          <IconFilterButton active={filter === "all"} tint="#ffd56a" label="Tous" count={counts.total} onClick={() => setFilter("all")} icon={<TinyIcon kind="cup" size={17} />} />
          <IconFilterButton active={filter === "active"} tint="#4fb4ff" label="À reprendre" count={counts.active} onClick={() => setFilter("active")} icon={<TinyIcon kind="play" size={17} />} />
          <IconFilterButton active={filter === "draft"} tint="#b0b0b0" label="Brouillons" count={counts.draft} onClick={() => setFilter("draft")} icon={<TinyIcon kind="box" size={17} />} />
          <IconFilterButton active={filter === "running"} tint="#ff7fe2" label="En cours" count={counts.running} onClick={() => setFilter("running")} icon={<TinyIcon kind="users" size={17} />} />
          <IconFilterButton active={filter === "done"} tint="#7fe2a9" label="Terminées" count={counts.done} onClick={() => setFilter("done")} icon={<TinyIcon kind="calendar" size={17} />} />
          <IconFilterButton active={showDateFilters || dateFilter !== "all"} tint="#ffffff" label="Calendrier" count={dateFilter === "all" ? 0 : 1} onClick={toggleDateFilterPanel} icon={<TinyIcon kind="calendar" size={17} />} />
        </div>
        {showDateFilters ? (
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {([
              ["day", "J"],
              ["week", "S"],
              ["month", "M"],
              ["year", "A"],
              ["all", "ARV"],
            ] as Array<[DateFilterKey, string]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDateFilter(key)}
                style={pillStyle(dateFilter === key, key === "all" ? "#ffd56a" : "#4fb4ff")}
                title={dateFilterLabel(key)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        <div style={{ marginTop: 11, textAlign: "center", fontSize: 12, fontWeight: 950, color: "#ffd56a", textShadow: "0 0 14px rgba(255,213,106,.42)" }}>
          {activeFilterCaption}
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {!hasAny ? (
          <div
            style={{
              borderRadius: 22,
              padding: 16,
              border: "1px solid rgba(79,180,255,.22)",
              background: "radial-gradient(120% 140% at 0% 0%, rgba(79,180,255,.13), transparent 55%), linear-gradient(180deg, rgba(18,18,26,.96), rgba(8,8,12,.99))",
              boxShadow: "0 18px 42px rgba(0,0,0,.58)",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ ...roundIconButton("#4fb4ff", true), cursor: "default" }}><TinyIcon kind="cup" /></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 1000, fontSize: 16, color: "#4fb4ff" }}>Aucune compétition {sportLabel}</div>
                <div style={{ opacity: 0.78, fontSize: 12.5, marginTop: 5, lineHeight: 1.35 }}>
                  {listContext === "history"
                    ? "Aucune ligue ou tournoi terminé pour ce sport."
                    : "Aucune ligue ou tournoi visible avec ce filtre. Les anciennes créations mal typées ne sont plus masquées : appuie sur rafraîchir après restauration NAS."}
                </div>
              </div>
            </div>
          </div>
        ) : (
          filtered
            .slice()
            .sort((a: any, b: any) => Number(b?.updatedAt || b?.createdAt || 0) - Number(a?.updatedAt || a?.createdAt || 0))
            .map((t: any) => {
              const id = String(t?.id || t?.tournamentId || t?.tid || t?.code || "");
              const name = String(t?.name || t?.title || (normalizeTournamentKind(t) === "league" ? "Ligue" : "Tournoi"));
              const mode = String(t?.game?.mode || t?.mode || t?.gameMode || forceMode || "x01").toUpperCase();
              const kind = normalizeTournamentKind(t);
              const statusInfo = statusLabelFromTournament(t);
              const updatedAt = Number(t?.updatedAt || t?.createdAt || Date.now());
              const teams = competitionTeams(t);
              const logo = avatarForCompetition(t);
              const countsForMatches = id ? computeCountsForTournament(id) : { pending: 0, running: 0, done: 0, playable: 0, total: 0 };
              const accent = kind === "league" ? "#ffd56a" : "#ff7fe2";

              return (
                <div
                  key={id || name + String(updatedAt)}
                  onClick={() => openTournament(t)}
                  style={{
                    borderRadius: 24,
                    padding: 13,
                    border: `1px solid ${accent}33`,
                    background: `radial-gradient(120% 150% at 0% 0%, ${accent}18, transparent 56%), linear-gradient(180deg, rgba(22,22,29,.97), rgba(7,7,12,.995))`,
                    boxShadow: `0 18px 46px rgba(0,0,0,.62), 0 0 26px ${accent}11`,
                    cursor: id ? "pointer" : "default",
                    opacity: id ? 1 : 0.62,
                    overflow: "hidden",
                  }}
                  title={id ? "Ouvrir la compétition" : "ID manquant"}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "62px 1fr", gap: 12, alignItems: "center" }}>
                    <div
                      style={{
                        width: 62,
                        height: 62,
                        borderRadius: 18,
                        border: `1px solid ${accent}66`,
                        background: logo ? `center / cover no-repeat url(${logo})` : `radial-gradient(circle at 50% 20%, ${accent}55, rgba(0,0,0,.35) 60%)`,
                        display: "grid",
                        placeItems: "center",
                        color: accent,
                        fontWeight: 1000,
                        boxShadow: `0 0 22px ${accent}28`,
                        overflow: "hidden",
                      }}
                    >
                      {!logo ? (kind === "league" ? "L" : "T") : null}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <div style={{ fontSize: 15.5, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                        <span style={{ flex: "0 0 auto", borderRadius: 999, padding: "4px 8px", border: `1px solid ${statusInfo.tone}55`, color: statusInfo.tone, background: `${statusInfo.tone}16`, fontSize: 10, fontWeight: 1000 }}>{statusInfo.label}</span>
                      </div>

                      <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <span style={{ color: accent, fontSize: 11, fontWeight: 1000 }}>{kind === "league" ? "LIGUE" : "TOURNOI"}</span>
                        <span style={{ opacity: 0.45 }}>•</span>
                        <span style={{ fontSize: 11.5, opacity: 0.78 }}>{mode}</span>
                        <span style={{ opacity: 0.45 }}>•</span>
                        <span style={{ fontSize: 11.5, opacity: 0.78 }}>{fmtDate(updatedAt)}</span>
                      </div>

                      {teams.length ? (
                        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4, overflow: "hidden" }}>
                          {teams.slice(0, 7).map((team: any, idx: number) => {
                            const src = teamLogo(team);
                            const label = String(team?.name || team?.label || `Équipe ${idx + 1}`);
                            return (
                              <div key={`${label}-${idx}`} title={label} style={{ width: 24, height: 24, borderRadius: 999, border: `1px solid ${accent}66`, background: src ? `center / cover no-repeat url(${src})` : "rgba(255,255,255,.06)", display: "grid", placeItems: "center", color: accent, fontSize: 9, fontWeight: 1000, flex: "0 0 auto" }}>
                                {!src ? label.slice(0, 2).toUpperCase() : null}
                              </div>
                            );
                          })}
                          {teams.length > 7 ? <span style={{ marginLeft: 3, fontSize: 11, fontWeight: 1000, opacity: 0.72 }}>+{teams.length - 7}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
                    <StatMini label="Matchs" value={countsForMatches.total || "—"} accent={accent} />
                    <StatMini label="À jouer" value={countsForMatches.playable || countsForMatches.pending || "—"} accent="#4fb4ff" />
                    <StatMini label="Joués" value={countsForMatches.done || "—"} accent="#7fe2a9" />
                    <StatMini label="Équipes" value={teams.length || "—"} accent="#ffd56a" />
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", gap: 9, flexWrap: "wrap", marginTop: 12 }}>
                    <button type="button" onClick={(ev) => { ev.stopPropagation(); openTournament(t); }} style={competitionCardActionStyle(accent, true)}>
                      <TinyIcon kind="play" size={15} /> Reprendre
                    </button>
                    {!isOnline ? (
                      <button type="button" onClick={(ev) => { ev.stopPropagation(); removeTournament(t); }} style={competitionCardActionStyle("#ff4f8b", false)}>
                        <TinyIcon kind="trash" size={15} /> Suppr.
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
        )}
      </div>

      {source === "online" ? (
        <div style={{ marginTop: 12, opacity: 0.7, fontSize: 11.5, textAlign: "center" }}>
          ONLINE actif : les compétitions NAS sont réhydratées en local à l’ouverture pour conserver la vue/bracket.
        </div>
      ) : null}
    </div>
  );


}
