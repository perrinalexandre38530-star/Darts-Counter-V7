// =============================================================

// ✅ Tickers (comme Config)
const TICKERS = import.meta.glob("../../assets/tickers/*.png", { eager: true, import: "default" }) as Record<string, string>;

function getTickerFromCandidates(candidates: string[]) {
  const uniq = Array.from(new Set((candidates || []).filter(Boolean)));
  for (const id of uniq) {
    const norm = String(id).trim().toLowerCase();
    const cand = Array.from(new Set([
      norm,
      norm.replace(/\s+/g, "_"),
      norm.replace(/\s+/g, "-"),
      norm.replace(/-/g, "_"),
      norm.replace(/_/g, "-"),
      norm.replace(/[^a-z0-9_\-]/g, ""),
    ])).filter(Boolean);
    for (const c of cand) {
      const suffixA = `/ticker_${c}.png`;
      const suffixB = `/ticker-${c}.png`;
      for (const k of Object.keys(TICKERS)) {
        if (k.endsWith(suffixA) || k.endsWith(suffixB)) return TICKERS[k];
      }
    }
  }
  return null;
}

function splitNames(s: string): string[] {
  return String(s || "").split(/\s*(?:·|&|\+|,|\/|\|)\s*/g).map(x => String(x||"").trim()).filter(Boolean).slice(0, 4);
}

// ✅ Profils cache (pour récupérer les avatars, comme la page Profils)
const PROFILES_CACHE_KEY = "dc-profiles-cache-v1";

function readProfilesCache(): any[] {
  try {
    const raw = localStorage.getItem(PROFILES_CACHE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function normName(s: any) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function resolveProfileByName(name: string): any | null {
  const n = normName(name);
  if (!n) return null;
  const list = readProfilesCache();
  // match nickname/name/displayName/email local part
  for (const p of list) {
    const cands = [
      p?.nickname,
      p?.displayName,
      p?.name,
      p?.username,
      p?.email ? String(p.email).split("@")[0] : null,
    ].filter(Boolean);
    if (cands.some((c: any) => normName(c) === n)) return p;
  }
  // fallback: includes match
  for (const p of list) {
    const cands = [
      p?.nickname,
      p?.displayName,
      p?.name,
      p?.username,
      p?.email ? String(p.email).split("@")[0] : null,
    ].filter(Boolean);
    if (cands.some((c: any) => normName(c).includes(n) || n.includes(normName(c)))) return p;
  }
  return null;
}
// src/pages/pingpong/PingPongPlay.tsx
// Ping-Pong — Play (LOCAL ONLY)
// - Sets + points A/B + undo
// - Auto appelle onFinish() quand sets gagnants atteints
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import {
  addPoint,
  loadPingPongState,
  savePingPongState,
  undo as undoPoint,
} from "../../lib/pingpongStore";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

export default function PingPongPlay({ go, onFinish }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState(() => loadPingPongState());

  // ✅ Résolution avatars depuis le cache profils
  const profileA = React.useMemo(() => resolveProfileByName(st.sideA), [st.sideA]);
  const profileB = React.useMemo(() => resolveProfileByName(st.sideB), [st.sideB]);

  React.useEffect(() => {
    savePingPongState(st);
  }, [st]);

  const finish = React.useCallback(() => {
    if (!onFinish) return;
    const now = Date.now();
    if (st.mode === "tournante") {
      const w = st.tournanteWinner || (Array.isArray(st.tournantePlayers) && st.tournantePlayers.length === 1 ? st.tournantePlayers[0] : null);
      onFinish({
        id: st.matchId,
        kind: "pingpong",
        sport: "pingpong",
        createdAt: st.createdAt || now,
        updatedAt: now,
        mode: "tournante",
        players: { active: [st.tournanteActiveA, st.tournanteActiveB, ...(st.tournanteQueue || [])].filter(Boolean), eliminated: st.tournanteEliminated || [] },
        winnerName: w,
        summary: {
          title: w ? `Tournante — Vainqueur : ${w}` : "Tournante — terminée",
        },
      });
      return;
    }

    const winnerSideId = st.winner;
    const title =
      st.mode === "simple"
        ? `${st.sideA} ${st.pointsA}–${st.pointsB} ${st.sideB}`
        : `${st.sideA} ${st.setsA}–${st.setsB} ${st.sideB}`;

    onFinish({
      id: st.matchId,
      kind: "pingpong",
      sport: "pingpong",
      createdAt: st.createdAt || now,
      updatedAt: now,
      mode: st.mode,
      uiMode: (st as any).uiMode ?? null,
      sides: {
        A: { id: "A", name: st.sideA },
        B: { id: "B", name: st.sideB },
      },
      config: { pointsPerSet: st.pointsPerSet, setsToWin: st.setsToWin, winByTwo: st.winByTwo },
      state: {
        setIndex: st.setIndex,
        points: { A: st.pointsA, B: st.pointsB },
        sets: { A: st.setsA, B: st.setsB },
      },
      winnerSideId,
      summary: {
        title,
        detail:
          st.mode === "simple"
            ? `Points: ${st.pointsA}–${st.pointsB}`
            : `Points set ${st.setIndex}: ${st.pointsA}–${st.pointsB}`,
      },
    });
  }, [onFinish, st]);

  React.useEffect(() => {
    if (st.finished) finish();
  }, [st.finished, finish]);  // UI mode (menu games): match_1v1 / match_2v2 / match_2v1 / tournante / training
  const uiMode: string = String((st as any)?.uiMode ?? (st.mode === "tournante" ? "tournante" : "match_1v1"));
  const is2v2 = uiMode === "match_2v2";
  const is2v1 = uiMode === "match_2v1";
  const isTraining = uiMode === "training";
  const isTournante = uiMode === "tournante" || st.mode === "tournante";

  const headerTicker = React.useMemo(() => {
    if (isTraining) return getTickerFromCandidates(["pingpong_training", "pingpong_games", "pingpong"]);
    if (isTournante) return getTickerFromCandidates(["pingpong_tournante", "pingpong_games", "pingpong"]);
    if (is2v2) return getTickerFromCandidates(["pingpong_2v2", "pingpong_games", "pingpong"]);
    if (is2v1) return getTickerFromCandidates(["pingpong_2v1", "pingpong_games", "pingpong"]);
    return getTickerFromCandidates(["pingpong_1v1", "pingpong_games", "pingpong"]);
  }, [isTraining, isTournante, is2v2, is2v1]);

  // Service config (vient du Config via setConfig)
  const serveStart = ((st as any).serveStart ?? "A") as string; // "A" | "B" | "manual" | "toss_first_point"
  const serviceEvery = Number((st as any).serviceEvery ?? 2);
  const deuceServiceEvery = Number((st as any).deuceServiceEvery ?? 1);

  // État local (pour "manual" et "toss_first_point")
  const [manualStart, setManualStart] = React.useState<"A" | "B" | null>(null);
  const [firstPointSide, setFirstPointSide] = React.useState<"A" | "B" | null>(null);

  // Reset au changement de set
  React.useEffect(() => {
    setManualStart(null);
    setFirstPointSide(null);
  }, [st.setIndex]);

  const totalPts = (st.pointsA || 0) + (st.pointsB || 0);
  const inDeuce = (st.pointsA || 0) >= (st.pointsPerSet || 11) - 1 && (st.pointsB || 0) >= (st.pointsPerSet || 11) - 1;
  const interval = inDeuce ? Math.max(1, deuceServiceEvery) : Math.max(1, serviceEvery);

  // Détermine le côté qui sert "au tour"
  const startSide: "A" | "B" | null =
    serveStart === "A" ? "A" :
    serveStart === "B" ? "B" :
    serveStart === "manual" ? manualStart :
    serveStart === "toss_first_point" ? firstPointSide :
    "A";

  // Séquence de service (officiel) :
  // - 1v1 : A, B, A, B...
  // - 2v2 : A1, B1, A2, B2 (puis repeat)
  // - 2v1 : A1, B1, A2, B1 (repeat) — logique “équilibrée”
  const sideAPlayers = React.useMemo(() => splitNames(st.sideA), [st.sideA]);
  const sideBPlayers = React.useMemo(() => splitNames(st.sideB), [st.sideB]);

  type ServeSlot = { side: "A" | "B"; idx: 0 | 1 };

  const serveSequence: ServeSlot[] = React.useMemo(() => {
    if (is2v2) return [{ side: "A", idx: 0 }, { side: "B", idx: 0 }, { side: "A", idx: 1 }, { side: "B", idx: 1 }];
    if (is2v1) return [{ side: "A", idx: 0 }, { side: "B", idx: 0 }, { side: "A", idx: 1 }, { side: "B", idx: 0 }];
    return [{ side: "A", idx: 0 }, { side: "B", idx: 0 }];
  }, [is2v2, is2v1]);

  // Calcule le slot courant
  const currentServe: ServeSlot | null = React.useMemo(() => {
    if (!startSide) return null;
    const seq = serveSequence;
    if (!seq.length) return null;

    // Décale la séquence si on commence par B
    let rotated = seq.slice();
    if (startSide === "B") {
      // cherche le premier slot côté B dans la séquence
      const firstB = rotated.findIndex(s => s.side === "B");
      if (firstB > 0) rotated = rotated.slice(firstB).concat(rotated.slice(0, firstB));
    }

    const turn = Math.floor(totalPts / interval) % rotated.length;
    return rotated[turn] ?? null;
  }, [startSide, serveSequence, totalPts, interval]);

  const handleAddPoint = React.useCallback((side: "A" | "B", delta: number) => {
    if (delta > 0 && serveStart === "toss_first_point" && !firstPointSide && totalPts === 0) {
      setFirstPointSide(side);
    }
    setSt(prev => addPoint(prev, side, delta));
  }, [serveStart, firstPointSide, totalPts]);

  const handleUndo = React.useCallback(() => {
    setSt(prev => undoPoint(prev));
    // best effort: si on revient à 0–0, on reset le toss
    if (serveStart === "toss_first_point" && totalPts <= 1) setFirstPointSide(null);
  }, [serveStart, totalPts]);

  return (
    <div style={wrap(theme)}>
      {/* HEADER (ticker plein écran comme PétanquePlay) */}
      <div style={{ marginLeft: -14, marginRight: -14, marginTop: -14 }}>
        <div style={{ position: "relative" }}>
          {headerTicker ? (
            <img src={headerTicker} alt="Ping-Pong" style={tickerImg} draggable={false} />
          ) : (
            <div style={{ height: 70 }} />
          )}
          <button style={backOverlay(theme)} onClick={() => go("pingpong_menu")}>✕</button>
          <button style={ghostOverlay(theme)} onClick={() => setSt(loadPingPongState())}>↻</button>
        </div>
      </div>

      {/* SCORE CARD — mise en page calquée sur PétanquePlay */}
      <div style={card(theme)}>
        <div style={topRow}>
          <div style={playerCol}>
            <div style={avatar(theme)}>{profileA ? <ProfileAvatar profile={profileA} size={46} /> : initials(st.sideA)}</div>
            <div style={playerName}>{st.sideA || "Joueur A"}</div>
            <div style={miniLabel}>Sets</div>
            <div style={miniValue}>{st.setsA ?? 0}</div>
          </div>

          <div style={scoreMid}>
            <div style={scoreTag}>SCORE</div>
            <div style={scoreValue(theme)}>{(st.pointsA ?? 0)} – {(st.pointsB ?? 0)}</div>
            <div style={setPill}>
              <span style={{ opacity: 0.8 }}>SET</span>&nbsp;
              <b>{st.setIndex ?? 1}</b>
            </div>

            {/* Infos règles (comme la pastille Pétanque) */}
            <div style={rulesPill}>
              {(st.setsToWin ?? 1)} sets gagnants • {(st.pointsPerSet ?? 11)} pts • {st.winByTwo ? "écart 2" : "no écart"}
            </div>
          </div>

          <div style={playerCol}>
            <div style={avatar(theme)}>{profileB ? <ProfileAvatar profile={profileB} size={46} /> : initials(st.sideB)}</div>
            <div style={playerName}>{st.sideB || "Joueur B"}</div>
            <div style={miniLabel}>Sets</div>
            <div style={miniValue}>{st.setsB ?? 0}</div>
          </div>
        </div>

        {/* Actions principales (comme PétanquePlay : 2 gros boutons) */}
        <div style={primaryActions}>
          <button style={primaryBtn(theme)} onClick={() => {
            // "DÉMARRER" = valide choix serveur si manual, sinon no-op
            if (serveStart === "manual" && !manualStart) return;
          }}>
            DÉMARRER
          </button>
          <button
            style={secondaryBtn(theme)}
            onClick={() => {
              // Toggle service mode (fun) : auto <-> manualStart
              if (serveStart === "manual") return;
              // simple indicateur : on force un overlay manuel au set suivant via manualStart
              setManualStart(null);
            }}
          >
            SERVICE
          </button>
        </div>
      </div>

      {/* STATS CARD — même placement que PétanquePlay */}
      <div style={card(theme)}>
        <div style={cardTitleRow}>
          <div style={cardTitle}>Statistiques</div>
          <div style={cardHint}>Ping-Pong</div>
        </div>

        <div style={statsGrid}>
          <div style={statRow}><span>Sets</span><b>{(st.setsA ?? 0)} – {(st.setsB ?? 0)}</b></div>
          <div style={statRow}><span>Points</span><b>{(st.pointsA ?? 0)} – {(st.pointsB ?? 0)}</b></div>
          <div style={statRow}><span>Points joués</span><b>{totalPts}</b></div>
          <div style={statRow}><span>Écart</span><b>{Math.abs((st.pointsA ?? 0) - (st.pointsB ?? 0))}</b></div>
          <div style={statRow}><span>Deuce</span><b>{inDeuce ? "OUI" : "NON"}</b></div>
          <div style={statRow}><span>Serveur</span><b>{currentServe ? (currentServe.side === "A" ? (st.sideA || "A") : (st.sideB || "B")) : "—"}</b></div>
        </div>
      </div>

      {/* INPUT CARD — “Mène” de PétanquePlay => “Point” Ping-Pong */}
      <div style={card(theme)}>
        <div style={cardTitleRow}>
          <div style={cardTitle}>Point</div>
          <div style={cardHint}>+1 / -1</div>
        </div>

        <div style={pointActions}>
          <button style={pointBtn(theme, currentServe?.side === "A")} onClick={() => !st.finished && handleAddPoint("A", +1)}>
            +1 A
          </button>
          <button style={pointBtn(theme, false)} onClick={() => !st.finished && handleAddPoint("A", -1)}>
            -1 A
          </button>
          <button style={pointBtn(theme, currentServe?.side === "B")} onClick={() => !st.finished && handleAddPoint("B", +1)}>
            +1 B
          </button>
          <button style={pointBtn(theme, false)} onClick={() => !st.finished && handleAddPoint("B", -1)}>
            -1 B
          </button>
        </div>
      </div>

      {/* ACTIONS CARD — comme PétanquePlay */}
      <div style={card(theme)}>
        <div style={cardTitleRow}>
          <div style={cardTitle}>Actions</div>
          <div style={cardHint}>Match</div>
        </div>

        <div style={actionsRow}>
          <button style={btn(theme)} onClick={() => handleUndo()}>Annuler dernier point</button>
          <button style={btnDanger(theme)} onClick={() => setSt(loadPingPongState())}>Nouvelle partie</button>
        </div>
      </div>

      {/* Options avancées — placeholder visuel identique (on branche au fur et à mesure) */}
      <div style={card(theme)}>
        <div style={advHeader}>
          <div style={cardTitle}>Options avancées</div>
          <div style={cardHint}>Officiel / Fun / Custom</div>
        </div>
        <div style={advBody}>
          <div style={advLine}><span>Service</span><b>{serveStart === "toss_first_point" ? "Lancer de balle" : serveStart === "manual" ? "Manuel" : serveStart === "A" ? "A commence" : "B commence"}</b></div>
          <div style={advLine}><span>Rotation</span><b>{serviceEvery} pts (deuce: {deuceServiceEvery})</b></div>
          <div style={advLine}><span>Mode</span><b>{uiMode}</b></div>
        </div>
      </div>

      {/* Modal départ (même logique, mais alignée visuellement) */}
      {serveStart === "manual" && !manualStart && !st.finished && !isTournante && (
        <div style={sheetWrap}>
          <div style={sheetCard(theme)}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Ordre de départ</div>
            <div style={{ opacity: 0.9, marginBottom: 10 }}>Choisis qui sert en premier pour ce set.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button style={btn(theme)} onClick={() => setManualStart("A")}>{st.sideA || "Joueur A"} sert</button>
              <button style={btn(theme)} onClick={() => setManualStart("B")}>{st.sideB || "Joueur B"} sert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isDark(theme: any) {
  return theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
}

function wrap(theme: any): React.CSSProperties {
  const dark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  return {
    minHeight: "100vh",
    width: "100%",
    maxWidth: 560,
    margin: "0 auto",
    padding: 14,
    paddingBottom: 110, // ✅ évite que le bas soit masqué par la BottomNav

    color: theme?.colors?.text ?? "#fff",
    background: isDark(theme)
      ? "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.08), rgba(0,0,0,0.92))"
      : "radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.06), rgba(255,255,255,0.92))",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
}

const head: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const title: React.CSSProperties = { fontWeight: 1000 as any, letterSpacing: 1, flex: 1, textAlign: "center" };

function back(theme: any): React.CSSProperties {
  return {
    borderRadius: 12,
    width: 40,
    height: 40,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 1000,
    cursor: "pointer",
  };
}

function ghost(theme: any): React.CSSProperties {
  return {
    borderRadius: 12,
    width: 40,
    height: 40,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 1000,
    cursor: "pointer",
    opacity: 0.9,
  };
}

function kpi(theme: any): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: 12,
    alignItems: "stretch",
  };
}

function sideBlock(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
  };
}

const sideName: React.CSSProperties = {
  fontWeight: 950,
  letterSpacing: 0.3,
  whiteSpace: "nowrap",
    textOverflow: "ellipsis",
};

const setsLine: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  opacity: 0.9,
};

const setsLabel: React.CSSProperties = { fontWeight: 900, fontSize: 12, letterSpacing: 0.3, opacity: 0.85 };
const setsVal: React.CSSProperties = { fontWeight: 1000 as any, fontSize: 20, letterSpacing: 0.5 };

const pointsVal: React.CSSProperties = { fontWeight: 1000 as any, fontSize: 42, letterSpacing: 1, textAlign: "center" };
const btnRow: React.CSSProperties = { display: "flex", gap: 10 };

function btn(theme: any): React.CSSProperties {
  return {
    flex: 1,
    borderRadius: 14,
    padding: "12px 12px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 950,
    cursor: "pointer",
  };
}

function btnDanger(theme: any): React.CSSProperties {
  return {
    ...btn(theme),
    border: "1px solid rgba(255,80,80,0.35)",
    background: "rgba(255,80,80,0.14)",
  };
}

function card(theme: any): React.CSSProperties {
  return {
    position: "relative",
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(12,14,22,0.55)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
  };
}

function mid(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 140,
  };
}

const vs: React.CSSProperties = { fontWeight: 1000 as any, letterSpacing: 1, opacity: 0.9 };

function meta(theme: any): React.CSSProperties {
  return {
    marginTop: 8,
    fontWeight: 900,
    opacity: 0.85,
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    textAlign: "center",
    fontSize: 12,
  };
}

function done(theme: any): React.CSSProperties {
  return {
    marginTop: 4,
    textAlign: "center",
    fontWeight: 950,
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,255,180,0.10)",
  };
}

function hint(theme: any): React.CSSProperties {
  return {
    marginTop: 4,
    textAlign: "center",
    opacity: 0.75,
    fontWeight: 800,
    fontSize: 12,
    lineHeight: 1.35,
  };
}

const tickerImg: React.CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  userSelect: "none",
  pointerEvents: "none",
  // ✅ fondu gauche + droite (fusion dans la carte)
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, transparent 100%)",
  maskImage:
    "linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, transparent 100%)",
};

function backOverlay(theme: any): React.CSSProperties {
  return {
    position: "absolute",
    left: 12,
    top: "max(10px, env(safe-area-inset-top))",
    ...back(theme),
  };
}

function ghostOverlay(theme: any): React.CSSProperties {
  return {
    position: "absolute",
    right: 12,
    top: "max(10px, env(safe-area-inset-top))",
    ...ghost(theme),
  };
}

function serveBadge(theme: any): React.CSSProperties {
  return {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0.6,
    padding: "3px 7px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(110,180,255,0.14)",
    color: theme?.colors?.text ?? "#fff",
  };
}

const modalWrap: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  background: "rgba(0,0,0,0.55)",
  zIndex: 50,
};

function modalCard(theme: any): React.CSSProperties {
  return {
    width: "min(520px, 100%)",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(10,12,20,0.95)",
    padding: 14,
    boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
    color: theme?.colors?.text ?? "#fff",
  };
}

function initials(name: string) {
  const s = String(name || "").trim();
  if (!s) return "PP";
  const parts = s.split(/\s+/g).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase()).join("") || "PP";
}

const topRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  gap: 10,
  alignItems: "center",
};

const playerCol: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
};

function avatar(theme: any): React.CSSProperties {
  return {
    width: 54,
    height: 54,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 1000,
    letterSpacing: 0.4,
  };
}

const playerName: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  opacity: 0.95,
  textAlign: "center",
  maxWidth: 140,
    textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const miniLabel: React.CSSProperties = { fontSize: 11, opacity: 0.7, marginTop: 2 };
const miniValue: React.CSSProperties = { fontSize: 22, fontWeight: 1100 as any, lineHeight: 1 };

const scoreMid: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

const scoreTag: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 1100 as any,
  letterSpacing: 1.2,
  opacity: 0.85,
};

function scoreValue(theme: any): React.CSSProperties {
  return {
    fontSize: 34,
    fontWeight: 1200 as any,
    lineHeight: 1,
    textShadow: "0 10px 28px rgba(0,0,0,0.35)",
    color: theme?.colors?.text ?? "#fff",
  };
}

const setPill: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
};

const rulesPill: React.CSSProperties = {
  fontSize: 11,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.18)",
  opacity: 0.92,
  textAlign: "center",
};

const primaryActions: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginTop: 4,
};

function primaryBtn(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "12px 10px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.07)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 1100,
    letterSpacing: 0.4,
    cursor: "pointer",
  };
}

function secondaryBtn(theme: any): React.CSSProperties {
  return {
    ...primaryBtn(theme),
    background: "rgba(255,255,255,0.04)",
    opacity: 0.92,
  };
}

const cardTitleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 10,
};

const cardTitle: React.CSSProperties = { fontWeight: 1100 as any, fontSize: 14 };
const cardHint: React.CSSProperties = { fontSize: 12, opacity: 0.7 };

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const statRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 10px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
  fontSize: 12,
};

const pointActions: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

function pointBtn(theme: any, isServe: boolean): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "12px 10px",
    border: `1px solid ${isServe ? "rgba(110,180,255,0.55)" : "rgba(255,255,255,0.16)"}`,
    background: isServe ? "rgba(110,180,255,0.12)" : "rgba(255,255,255,0.06)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 1000,
    cursor: "pointer",
  };
}

const actionsRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
};

const advHeader: React.CSSProperties = { display: "flex", alignItems: "baseline", justifyContent: "space-between" };
const advBody: React.CSSProperties = { display: "grid", gap: 8, marginTop: 6 };
const advLine: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
  fontSize: 12,
};

const sheetWrap: React.CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  padding: 12,
  paddingBottom: "max(12px, env(safe-area-inset-bottom))",
  background: "rgba(0,0,0,0.45)",
  zIndex: 60,
};

function sheetCard(theme: any): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: 560,
    margin: "0 auto",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(15,18,28,0.92)",
    padding: 12,
    color: theme?.colors?.text ?? "#fff",
    boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
    backdropFilter: "blur(10px)",
  };
}
