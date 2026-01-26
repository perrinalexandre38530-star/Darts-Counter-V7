import React from "react";

import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ScoreInputHub from "../components/ScoreInputHub";
import RulesModal from "../components/RulesModal";

import tickerTerritoriesFR from "../assets/tickers/ticker_territories_fr.png";
import tickerTerritoriesEN from "../assets/tickers/ticker_territories_en.png";
import tickerTerritoriesDE from "../assets/tickers/ticker_territories_de.png";
import tickerTerritoriesIT from "../assets/tickers/ticker_territories_it.png";
import tickerTerritoriesES from "../assets/tickers/ticker_territories_es.png";
import tickerTerritoriesUS from "../assets/tickers/ticker_territories_us.png";
import tickerTerritoriesCN from "../assets/tickers/ticker_territories_cn.png";
import tickerTerritoriesAU from "../assets/tickers/ticker_territories_au.png";
import tickerTerritoriesJP from "../assets/tickers/ticker_territories_jp.png";
import tickerTerritoriesRU from "../assets/tickers/ticker_territories_ru.png";
import tickerTerritoriesWORLD from "../assets/tickers/ticker_territories_world.png";

import franceMapSvgRaw from "../assets/maps/france_departements.svg?raw";

import type { Dart as UIDart } from "../lib/types";
import { getTerritoriesForMap, type TerritoryDef } from "../lib/territories/maps";

// =====================================================================================
// src/pages/DepartementsPlay.tsx
// TERRITORIES (Départements) — PLAY (Keypad darts)
//
// Objectif (MVP):
// - Choisir un département (cible = son numéro)
// - Jouer 3 fléchettes via le Keypad (ScoreInputHub)
// - Si total volée == numéro du département => capture du territoire par l'équipe active
// - Alternance équipes + rotation joueurs si multi-joueurs
//
// UI:
// - ✅ Recadrage: carte en "flex:1" + SVG forcé en 100%/100% (contain)
// - ✅ Ticker: TERRITORIES dynamique selon mapId/pays (dans PageHeader)
// - ✅ Keypad: vrai keypad darts (ScoreInputHub)
// - ✅ Règles: modal locale (n'altère pas InfoDot global)
// - ✅ Header joueur actif compact
// =====================================================================================

type TeamKey = 0 | 1;

type PlayConfig = {
  mapId?: string; // "france" | "england" ...
  rounds?: number;
  objectiveTerritories?: number;
  teamMode?: "solo" | "2v2" | "3v3";
  teams?: {
    team1: { ids: string[]; names?: string[] };
    team2: { ids: string[]; names?: string[] };
  };
};

type TerritoryState = {
  owner: TeamKey | null;
  lastVisit?: { total: number; darts: UIDart[] };
};

const TEAM_LABEL: Record<TeamKey, string> = { 0: "TEAM Gold", 1: "TEAM Pink" };

function getTeamPlayers(cfg: PlayConfig, team: TeamKey): string[] {
  const t = team === 0 ? cfg.teams?.team1 : cfg.teams?.team2;
  const names = (t?.names && t.names.length ? t.names : null) as string[] | null;
  const ids = (t?.ids && t.ids.length ? t.ids : null) as string[] | null;
  if (names) return names;
  if (ids) return ids;
  return team === 0 ? ["Player A"] : ["Player B"];
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeMapToTickerKey(mapId?: string): string {
  const m = (mapId || "france").toLowerCase();
  if (m.includes("fr") || m.includes("france")) return "fr";
  if (m.includes("en") || m.includes("england") || m.includes("uk") || m.includes("gb")) return "en";
  if (m.includes("de") || m.includes("germany")) return "de";
  if (m.includes("it") || m.includes("italy")) return "it";
  if (m.includes("es") || m.includes("spain")) return "es";
  if (m.includes("us") || m.includes("usa")) return "us";
  if (m.includes("cn") || m.includes("china")) return "cn";
  if (m.includes("au") || m.includes("australia")) return "au";
  if (m.includes("jp") || m.includes("japan")) return "jp";
  if (m.includes("ru") || m.includes("russia")) return "ru";
  return "world";
}

function tickerForMap(mapId?: string): string {
  switch (normalizeMapToTickerKey(mapId)) {
    case "fr":
      return tickerTerritoriesFR;
    case "en":
      return tickerTerritoriesEN;
    case "de":
      return tickerTerritoriesDE;
    case "it":
      return tickerTerritoriesIT;
    case "es":
      return tickerTerritoriesES;
    case "us":
      return tickerTerritoriesUS;
    case "cn":
      return tickerTerritoriesCN;
    case "au":
      return tickerTerritoriesAU;
    case "jp":
      return tickerTerritoriesJP;
    case "ru":
      return tickerTerritoriesRU;
    default:
      return tickerTerritoriesWORLD;
  }
}

function dartScore(d: UIDart) {
  if (!d) return 0;
  if (d.v === 0) return 0; // MISS
  if (d.v === 25) return d.mult === 2 ? 50 : 25; // BULL / DBULL
  return d.v * (d.mult || 1);
}
function throwTotal(darts: UIDart[]) {
  return (darts || []).reduce((acc, d) => acc + dartScore(d), 0);
}

/** Ex: "FR-75" => 75, "75" => 75, "2A" => 2 (MVP), "FR-2B" => 2 */
function parseDeptTarget(id: string): number | null {
  if (!id) return null;
  const up = id.toUpperCase();
  if (up.includes("2A") || up.includes("2B")) return 2; // MVP Corse (à affiner)
  const nums = up.match(/\d+/g);
  if (!nums || !nums.length) return null;
  const n = Number(nums[nums.length - 1]);
  if (!Number.isFinite(n)) return null;
  return n;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function countOwned(territories: TerritoryDef[], stateById: Record<string, TerritoryState>) {
  let a = 0;
  let b = 0;
  for (const t of territories) {
    const st = stateById[t.id];
    if (!st) continue;
    if (st.owner === 0) a++;
    if (st.owner === 1) b++;
  }
  return { 0: a, 1: b } as Record<TeamKey, number>;
}

export default function DepartementsPlay(props: any) {
  const cfg: PlayConfig =
    props?.params?.config ||
    props?.config ||
    safeParse<PlayConfig>(localStorage.getItem("dc_departements_cfg")) ||
    safeParse<PlayConfig>(localStorage.getItem("dc_territories_cfg")) ||
    {};

  const mapId = cfg.mapId || "france";
  const roundsTotal = Math.max(1, Number(cfg.rounds || 12));
  const objectiveTerritories = Math.max(1, Number(cfg.objectiveTerritories || 10));

  const territories: TerritoryDef[] = React.useMemo(() => getTerritoriesForMap(mapId), [mapId]);

  const [round, setRound] = React.useState(1);
  const [activeTeam, setActiveTeam] = React.useState<TeamKey>(0);

  // Modal règles (LOCAL) — ne touche pas InfoDot global
  const [showRules, setShowRules] = React.useState(false);

  // Rotation joueurs par équipe
  const teamPlayers = React.useMemo(
    () => ({ 0: getTeamPlayers(cfg, 0), 1: getTeamPlayers(cfg, 1) }) as Record<TeamKey, string[]>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cfg]
  );
  const [playerIdxByTeam, setPlayerIdxByTeam] = React.useState<Record<TeamKey, number>>({ 0: 0, 1: 0 });

  const activePlayerName = React.useMemo(() => {
    const list = teamPlayers[activeTeam] || [];
    if (!list.length) return TEAM_LABEL[activeTeam];
    const idx = playerIdxByTeam[activeTeam] ?? 0;
    return list[idx % list.length];
  }, [activeTeam, playerIdxByTeam, teamPlayers]);

  const [selectedId, setSelectedId] = React.useState<string>(() => territories[0]?.id || "");

  // Keypad darts
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);

  const [stateById, setStateById] = React.useState<Record<string, TerritoryState>>(() => {
    const init: Record<string, TerritoryState> = {};
    for (const t of territories) init[t.id] = { owner: null };
    return init;
  });

  // Re-init si la liste des territoires change (map switch)
  React.useEffect(() => {
    if (!territories.length) return;
    setSelectedId((prev) => (territories.some((t) => t.id === prev) ? prev : territories[0].id));
    setStateById(() => {
      const init: Record<string, TerritoryState> = {};
      for (const t of territories) init[t.id] = { owner: null };
      return init;
    });
    setCurrentThrow([]);
    setMultiplier(1);
    setRound(1);
    setActiveTeam(0);
    setPlayerIdxByTeam({ 0: 0, 1: 0 });
  }, [mapId, territories]);

  const mapHostRef = React.useRef<HTMLDivElement | null>(null);

  // Recadrage + colorisation SVG
  React.useEffect(() => {
    const host = mapHostRef.current;
    if (!host) return;

    const svg = host.querySelector("svg");
    if (!svg) return;

    // Forcer "contain"
    (svg as any).style.width = "100%";
    (svg as any).style.height = "100%";
    (svg as any).style.maxWidth = "100%";
    (svg as any).style.maxHeight = "100%";

    try {
      if (!svg.getAttribute("preserveAspectRatio")) svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      const vb = svg.getAttribute("viewBox");
      if (!vb) {
        const w = Number(String(svg.getAttribute("width") || "0").replace(/[^0-9.]/g, "")) || 1000;
        const h = Number(String(svg.getAttribute("height") || "0").replace(/[^0-9.]/g, "")) || 1000;
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      }
    } catch {}

    // reset style
    const all = svg.querySelectorAll<SVGPathElement>("path[data-numerodepartement]");
    all.forEach((p) => {
      p.style.fill = "rgba(255,255,255,0.05)";
      p.style.stroke = "rgba(255,255,255,0.15)";
      p.style.strokeWidth = "0.8";
    });

    // Apply owners
    for (const [id, st] of Object.entries(stateById)) {
      if (st.owner === null) continue;

      const target = parseDeptTarget(id);
      if (!target) continue;

      const deptCode = pad2(target);
      const el = svg.querySelector<SVGPathElement>(`path[data-numerodepartement="${deptCode}"]`);
      if (!el) continue;

      el.style.fill = st.owner === 0 ? "rgba(255, 210, 90, 0.35)" : "rgba(255, 90, 190, 0.35)";
      el.style.stroke = st.owner === 0 ? "rgba(255, 210, 90, 0.75)" : "rgba(255, 90, 190, 0.75)";
      el.style.strokeWidth = "1.2";
    }
  }, [stateById]);

  const ownedCount = React.useMemo(() => countOwned(territories, stateById), [stateById, territories]);

  function goBack() {
    if (props?.go) return props.go("departements_config", { config: cfg });
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function nextTurn() {
    setCurrentThrow([]);
    setMultiplier(1);

    // incrémente le joueur de l'équipe qui vient de jouer
    setPlayerIdxByTeam((prev) => {
      const list = teamPlayers[activeTeam] || [];
      const mod = Math.max(1, list.length);
      const next = { ...prev };
      next[activeTeam] = ((prev[activeTeam] ?? 0) + 1) % mod;
      return next;
    });

    setActiveTeam((t) => (t === 0 ? 1 : 0));
    if (activeTeam === 1) setRound((r) => Math.min(roundsTotal, r + 1));
  }

  // === ScoreInputHub handlers (compat Keypad)
  function handleSimple() {
    setMultiplier(1);
  }
  function handleDouble() {
    setMultiplier(2);
  }
  function handleTriple() {
    setMultiplier(3);
  }
  function handleNumber(n: number) {
    if (currentThrow.length >= 3) return;
    const d: UIDart = { v: n, mult: multiplier };
    setCurrentThrow((prev) => [...prev, d]);
    setMultiplier(1);
  }
  function handleBull() {
    if (currentThrow.length >= 3) return;
    const d: UIDart = { v: 25, mult: multiplier === 2 ? 2 : 1 };
    setCurrentThrow((prev) => [...prev, d]);
    setMultiplier(1);
  }
  function handleBackspace() {
    if (!currentThrow.length) return;
    setCurrentThrow((prev) => prev.slice(0, -1));
  }
  function handleCancel() {
    setCurrentThrow([]);
    setMultiplier(1);
  }

  function validateThrow() {
    if (!selectedId) return;

    // Normaliser à 3 flèches
    const darts: UIDart[] = [...currentThrow];
    while (darts.length < 3) darts.push({ v: 0, mult: 1 });

    const total = throwTotal(darts);
    const target = parseDeptTarget(selectedId);
    const isHit = target !== null && total === target;

    setStateById((prev) => {
      const cur = prev[selectedId] || { owner: null };
      const next: Record<string, TerritoryState> = { ...prev };
      next[selectedId] = {
        owner: isHit ? activeTeam : cur.owner,
        lastVisit: { total, darts },
      };

      const owned = countOwned(territories, next);
      if (owned[0] >= objectiveTerritories || owned[1] >= objectiveTerritories) {
        // eslint-disable-next-line no-alert
        alert(`${owned[0] >= objectiveTerritories ? TEAM_LABEL[0] : TEAM_LABEL[1]} gagne !`);
      } else {
        nextTurn();
      }
      return next;
    });
  }

  const selectedTarget = parseDeptTarget(selectedId);
  const tickerSrc = tickerForMap(mapId);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050607",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PageHeader
        tickerSrc={tickerSrc}
        tickerAlt="TERRITORIES"
        tickerHeight={92}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles" onClick={() => setShowRules(true)} />}
      />

      {/* Corps */}
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
        {/* Bandeau compact (joueur actif + round + objectif) */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 10px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ fontSize: 12, opacity: 0.75, whiteSpace: "nowrap" }}>À jouer :</div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 1000,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 190,
              }}
            >
              {activePlayerName}
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                padding: "4px 8px",
                borderRadius: 999,
                border: activeTeam === 0 ? "1px solid rgba(255,210,90,0.55)" : "1px solid rgba(255,90,190,0.55)",
                background: activeTeam === 0 ? "rgba(255,210,90,0.12)" : "rgba(255,90,190,0.12)",
                flex: "0 0 auto",
              }}
            >
              {TEAM_LABEL[activeTeam]}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
            <div style={{ opacity: 0.85, fontSize: 12 }}>
              {normalizeMapToTickerKey(mapId).toUpperCase()} — ROUND {round}/{roundsTotal}
            </div>
            <div style={{ opacity: 0.85, fontSize: 12 }}>Objectif : {objectiveTerritories}</div>
          </div>
        </div>

        {/* Scores */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div
            style={{
              borderRadius: 12,
              padding: 10,
              border: "1px solid rgba(255,210,90,0.35)",
              background: "rgba(255,210,90,0.08)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.85 }}>{TEAM_LABEL[0]}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {ownedCount[0]}/{objectiveTerritories}
            </div>
          </div>

          <div
            style={{
              borderRadius: 12,
              padding: 10,
              border: "1px solid rgba(255,90,190,0.35)",
              background: "rgba(255,90,190,0.08)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.85 }}>{TEAM_LABEL[1]}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {ownedCount[1]}/{objectiveTerritories}
            </div>
          </div>
        </div>

        {/* Bloc carte */}
        <div
          style={{
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            flex: 1,
            minHeight: 0,
          }}
        >
          <div style={{ opacity: 0.9, fontSize: 12 }}>
            Territoire : <b>{selectedId || "-"}</b>
            {selectedTarget !== null ? (
              <>
                {" "}
                — Cible : <b>{selectedTarget}</b>
              </>
            ) : null}{" "}
            — Volée : <b>{throwTotal(currentThrow)}</b> ({currentThrow.length}/3)
          </div>

          <div
            ref={mapHostRef}
            style={{
              borderRadius: 14,
              overflow: "hidden",
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.10)",
              flex: 1,
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            dangerouslySetInnerHTML={{ __html: franceMapSvgRaw }}
          />
        </div>

        {/* Liste (scroll) — ne doit jamais pousser la carte */}
        <div
          style={{
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.03)",
            padding: 10,
            overflow: "auto",
            maxHeight: "18vh",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {territories.map((t, idx) => {
              const st = stateById[t.id];
              const isSel = t.id === selectedId;
              const owner = st?.owner;

              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    textAlign: "left",
                    borderRadius: 14,
                    padding: 12,
                    border: isSel ? "1px solid rgba(255,255,255,0.28)" : "1px solid rgba(255,255,255,0.12)",
                    background:
                      owner === 0
                        ? "rgba(255,210,90,0.08)"
                        : owner === 1
                        ? "rgba(255,90,190,0.08)"
                        : "rgba(255,255,255,0.04)",
                    color: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{t.name || `Territory #${idx + 1}`}</div>
                    <div style={{ opacity: 0.6, fontSize: 12 }}>{t.id}</div>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                    {owner === null ? "Libre" : `Capturé par ${TEAM_LABEL[owner]}`}
                    {st?.lastVisit ? ` — Dernière volée: ${st.lastVisit.total}` : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Keypad darts */}
        <div
          style={{
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
            padding: 10,
          }}
        >
          <ScoreInputHub
            currentThrow={currentThrow}
            multiplier={multiplier}
            onSimple={handleSimple}
            onDouble={handleDouble}
            onTriple={handleTriple}
            onBackspace={handleBackspace}
            onCancel={handleCancel}
            onNumber={handleNumber}
            onBull={handleBull}
            onValidate={validateThrow}
            hidePreview={false}
            showPlaceholders={false}
            switcherMode="hidden"
          />
        </div>
      </div>

      <RulesModal open={showRules} onClose={() => setShowRules(false)} title="Règles — TERRITORIES">
        <div style={{ whiteSpace: "pre-line" }}>
{`But : capturer des départements.

Tour de jeu :
- Alternance des équipes (Gold / Pink)
- Si multi-joueurs : rotation automatique des joueurs dans chaque équipe

À ton tour :
1) Sélectionne un département (liste)
2) Joue 3 fléchettes via le keypad
3) VALIDER : si total de la volée = numéro du département, il est capturé

Victoire :
- Première équipe à ${objectiveTerritories} territoires capturés

Notes (MVP) :
- Corse 2A/2B : temporairement traité comme "2" (à améliorer)
- Variante à venir : fermeture de régions (bonus)`}
        </div>
      </RulesModal>
    </div>
  );
}
