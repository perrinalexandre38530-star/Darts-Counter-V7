import React, { useEffect, useMemo, useRef, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerGolf from "../assets/tickers/ticker_golf.png";

/**
 * GOLF (darts) — Play
 * - Header profil actif "comme X01PlayV3" (avatar + nom + mini stats / score + mini classement + watermark avatar)
 * - Supprime les 2 cartes joueurs en dessous (inutile)
 * - Affichage trous pleine largeur : 1–9, et 10–18 en dessous si 18 trous
 * - Saisie : Hit 1/2/3 / Miss(pénalité) + Undo
 */

type AnyFn = (...args: any[]) => any;

type Props = {
  setTab?: AnyFn; // setTab("golf_config", {config}) etc.
  go?: AnyFn; // go("golf_config", {config}) etc.
  tabParams?: any; // { config }
  params?: any; // { config } (selon App.tsx)
  store?: any; // profiles store (optionnel)
};

// Ticker : supporte plusieurs images "parcours" si elles existent.
// Fallback : tickerGolf.
const GOLF_TICKERS: string[] = [tickerGolf];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const INFO_TEXT =
  "GOLF (fléchettes) :\n" +
  "- Trou N = cible N.\n" +
  "- 3 flèches par joueur.\n" +
  "- Hit sur 1ère flèche = 1, sur 2e = 2, sur 3e = 3.\n" +
  "- Si aucune flèche ne touche : pénalité (configurable).\n" +
  "- Score total le plus bas gagne.";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function safeStr(v: any, fallback = "") {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  return String(v);
}

function sum(nums: number[]) {
  let s = 0;
  for (const n of nums) s += n;
  return s;
}

function getProfilesMap(store: any): Record<string, any> {
  // ultra défensif : selon tes stores
  const profiles =
    store?.profiles ??
    store?.profilesStore?.profiles ??
    store?.profileStore?.profiles ??
    store?.profiles_v7 ??
    [];
  const out: Record<string, any> = {};
  if (Array.isArray(profiles)) {
    for (const p of profiles) {
      if (!p?.id) continue;
      out[p.id] = p;
    }
  }
  return out;
}

type GolfConfig = {
  holes?: number; // 9 ou 18
  order?: "chronological" | "random";
  scoringMode?: "strokes"; // (on garde)
  missStrokes?: number; // pénalité si aucun hit
  showGrid?: boolean;
  selectedIds?: string[]; // ids profils
  botsOn?: boolean;
  teamsMode?: boolean;
};

type HistoryEntry = {
  holeIdx: number;
  playerIdx: number;
  prev: (number | null)[][];
};

// ---------------- Header "Joueur actif" (CLONE X01PlayV3) ----------------

const miniCard: React.CSSProperties = {
  width: "clamp(150px, 22vw, 190px)",
  height: 86,
  padding: 6,
  borderRadius: 12,
  background:
    "linear-gradient(180deg,rgba(22,22,26,.96),rgba(14,14,16,.98))",
  border: "1px solid rgba(255,255,255,.10)",
  boxShadow: "0 10px 22px rgba(0,0,0,.35)",
};

const miniText: React.CSSProperties = {
  fontSize: 12,
  color: "#d9dbe3",
  lineHeight: 1.25,
};

const miniRankRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "3px 6px",
  borderRadius: 6,
  background: "rgba(255,255,255,.04)",
  marginBottom: 3,
  fontSize: 11,
  lineHeight: 1.15,
};

const miniRankName: React.CSSProperties = {
  fontWeight: 800,
  color: "#ffcf57",
};

const miniRankScore: React.CSSProperties = {
  fontWeight: 900,
  color: "#ffcf57",
};

const miniRankScoreFini: React.CSSProperties = {
  fontWeight: 900,
  color: "#7fe2a9",
};

const avatarMedallion: React.CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: "50%",
  overflow: "hidden",
  background: "linear-gradient(180deg,#1b1b1f,#111114)",
  boxShadow: "0 10px 28px rgba(0,0,0,.42)",
  border: "2px solid rgba(120,255,220,.70)",
  outline: "4px solid rgba(0,0,0,.35)",
};

const tinyAvatar: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: "50%",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,.16)",
  background: "rgba(0,0,0,.35)",
  flex: "0 0 auto",
  marginRight: 6,
};

function chipStyleGolf(label: string) {
  // Copie "feel" X01 chips : gold/neutral/red
  if (label === "HIT") {
    return {
      border: "1px solid rgba(255,195,26,.35)",
      background: "rgba(255,195,26,.16)",
      color: "#ffcf57",
    };
  }
  if (label === "MISS") {
    return {
      border: "1px solid rgba(255,95,95,.35)",
      background: "rgba(255,95,95,.14)",
      color: "#ffb2b2",
    };
  }
  return {
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.06)",
    color: "#d9dbe3",
  };
}

function GolfHeaderBlock(props: {
  currentPlayer: { id: string; name: string; avatar: string | null } | null;
  currentAvatar: string | null;
  currentTotal: number;
  holes: number;
  holeIdx: number;
  target: number;
  playerIdx: number;
  playersCount: number;
  holeValue: number | null; // strokes sur ce trou pour ce joueur
  liveRanking: { id: string; name: string; score: number; avatar: string | null }[];
  isFinished: boolean;
}) {
  const {
    currentPlayer,
    currentAvatar,
    currentTotal,
    holes,
    holeIdx,
    target,
    playerIdx,
    playersCount,
    holeValue,
    liveRanking,
    isFinished,
  } = props;

  // Chips façon X01 (3 pastilles). On matérialise sur quelle flèche la cible a été touchée.
  let chips: string[] = ["—", "—", "—"];
  if (typeof holeValue === "number") {
    if (holeValue === 1) chips = ["HIT", "—", "—"];
    else if (holeValue === 2) chips = ["—", "HIT", "—"];
    else if (holeValue === 3) chips = ["—", "—", "HIT"];
    else chips = ["MISS", "MISS", "MISS"];
  }

  const bgAvatarUrl = currentAvatar || null;

  return (
    <div
      style={{
        background:
          "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.8))",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
        padding: 7,
        boxShadow: "0 8px 26px rgba(0,0,0,.35)",
        position: "relative",
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {/* Dégradé gauche -> droite pour fondre le watermark dans le fond */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(10,10,12,.98) 0%, rgba(10,10,12,.92) 28%, rgba(10,10,12,.62) 52%, rgba(10,10,12,.22) 68%, rgba(10,10,12,0) 82%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 8,
          alignItems: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* AVATAR + STATS — en GOLF on retire le nom sous l'avatar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
          }}
        >
          <div style={avatarMedallion}>
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#999",
                  fontWeight: 800,
                }}
              >
                ?
              </div>
            )}
          </div>

          {/* (nom + joueur 1/2 supprimés, affichés ailleurs) */}

          {/* Mini card stats joueur actif (clone X01 mini card) */}
          <div style={{ ...miniCard, width: 176, height: "auto", padding: 7 }}>
            <div style={miniText}>
              <div>
                Total : <b>{currentTotal}</b>
              </div>
              <div>
                Trou : <b>{holeIdx + 1}/{holes}</b>
              </div>
              <div>
                Cible : <b>{target}</b>
              </div>
              <div>
                Résultat trou : <b>{typeof holeValue === "number" ? holeValue : "—"}</b>
              </div>
            </div>
          </div>
        </div>

        {/* SCORE + PASTILLES + RANKING */}
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 5,
            position: "relative",
            overflow: "hidden",
            borderRadius: 14,
            padding: 6,
          }}
        >
          {/* BG avatar ancré AU SCORE (watermark type X01) */}
          {!!bgAvatarUrl && (
            <img
              src={bgAvatarUrl}
              aria-hidden
              style={{
                position: "absolute",
                top: "48%",
                left: "66%",
                transform: "translate(-50%, -50%)",
                height: "270%",
                width: "auto",
                WebkitMaskImage:
                  "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 22%, rgba(0,0,0,0.82) 52%, rgba(0,0,0,1) 72%, rgba(0,0,0,1) 100%)",
                maskImage:
                  "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 22%, rgba(0,0,0,0.82) 52%, rgba(0,0,0,1) 72%, rgba(0,0,0,1) 100%)",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",
                opacity: 0.22,
                filter:
                  "saturate(1.35) contrast(1.18) brightness(1.08) drop-shadow(-10px 0 26px rgba(0,0,0,.55))",
                pointerEvents: "none",
                userSelect: "none",
                zIndex: 0,
              }}
            />
          )}

          {/* SCORE CENTRAL (TOTAL strokes) */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              position: "relative",
              zIndex: 2,
              color: "#ffcf57",
              textShadow: "0 4px 18px rgba(255,195,26,.25)",
              lineHeight: 1.02,
            }}
          >
            {currentTotal}
          </div>

          {/* À la place des pastilles X01 (inutile en GOLF) : nom du joueur actif */}
          <div style={{ position: "relative", zIndex: 2, marginTop: 2 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                maxWidth: 176,
                padding: "6px 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(0,0,0,.28)",
                color: "#ffcf57",
                fontWeight: 900,
                fontSize: 14,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={currentPlayer?.name ?? ""}
            >
              {currentPlayer?.name ?? "—"}
            </div>
          </div>

          {/* Mini ranking (top 3) — clone X01 */}
          <div style={{ ...miniCard, margin: "0 auto", height: "auto", width: 176 }}>
            <div
              style={{
                fontSize: 11,
                color: "#d9dbe3",
                marginBottom: 4,
                textAlign: "left",
                paddingLeft: 2,
                opacity: 0.9,
              }}
            >
              Classement
            </div>

            <div style={{ padding: "0 2px 2px 2px" }}>
              {liveRanking.slice(0, 3).map((r, i) => (
                <div key={r.id} style={miniRankRow}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minWidth: 0,
                      overflow: "hidden",
                    }}
                  >
                    <span style={tinyAvatar}>
                      {r.avatar ? (
                        <img
                          src={r.avatar}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : null}
                    </span>
                    <span
                      style={{
                        ...miniRankName,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 120,
                      }}
                    >
                      {i + 1}. {r.name}
                    </span>
                  </span>
                  <span style={isFinished ? miniRankScoreFini : miniRankScore}>
                    {r.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GolfPlay(props: Props) {
  const { setTab, go, tabParams, params, store } = props;

  // Compat routing : certains écrans passent via params, d'autres via tabParams
  const routeParams = (params ?? tabParams ?? {}) as any;
  const cfg: GolfConfig = (routeParams?.config ?? {}) as GolfConfig;

  const holes = clamp(Number(cfg.holes ?? 9), 1, 18);
  const missStrokes = clamp(Number(cfg.missStrokes ?? 4), 1, 12);
  const showGrid = cfg.showGrid !== false;

  const profilesById = useMemo(() => getProfilesMap(store), [store]);

  // roster : si config a selectedIds, on construit un roster avec noms/avatars
  const roster = useMemo(() => {
    const ids: string[] = Array.isArray(cfg.selectedIds) ? cfg.selectedIds : [];
    if (ids.length) {
      return ids.map((id, i) => {
        const p = profilesById[id];
        return {
          id,
          name: safeStr(p?.name, `Joueur ${i + 1}`),
          avatar:
            p?.avatarDataUrl ??
            p?.avatarUrl ??
            p?.avatar ??
            p?.photoUrl ??
            null,
        };
      });
    }
    // fallback si pas de config
    return [
      { id: "p1", name: "Joueur 1", avatar: null },
      { id: "p2", name: "Joueur 2", avatar: null },
    ];
  }, [cfg.selectedIds, profilesById]);

  const playersCount = roster.length || 2;

  // scores[playerIdx][holeIdx] = strokes (1/2/3/miss) ou null
  const [scores, setScores] = useState<(number | null)[][]>(() => {
    const s: (number | null)[][] = [];
    for (let p = 0; p < playersCount; p++) {
      s.push(Array.from({ length: holes }, () => null));
    }
    return s;
  });

  const [holeIdx, setHoleIdx] = useState(0); // 0..holes-1
  const [playerIdx, setPlayerIdx] = useState(0); // 0..players-1
  const [isFinished, setIsFinished] = useState(false);

  // Ticker "parcours" : tirage aléatoire sans répétition sur une même partie.
  const tickerPoolRef = useRef<string[]>([]);
  const [tickerSrc, setTickerSrc] = useState<string>(() => {
    tickerPoolRef.current = shuffle(GOLF_TICKERS);
    return tickerPoolRef.current[0] ?? tickerGolf;
  });

  useEffect(() => {
    // On change au début de chaque trou (sauf 1er rendu)
    if (holeIdx <= 0) return;
    const pool = tickerPoolRef.current;
    // si pool vide -> reshuffle, mais on évite de reprendre immédiatement le même
    let nextPool = pool.slice(1);
    if (nextPool.length === 0) {
      nextPool = shuffle(GOLF_TICKERS);
      if (nextPool[0] === tickerSrc && nextPool.length > 1) {
        const tmp = nextPool[0];
        nextPool[0] = nextPool[1];
        nextPool[1] = tmp;
      }
    }
    tickerPoolRef.current = nextPool;
    setTickerSrc(nextPool[0] ?? tickerGolf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeIdx]);
  const historyRef = useRef<HistoryEntry[]>([]);

  const totals = useMemo(() => {
    return scores.map((row) => sum(row.map((v) => (typeof v === "number" ? v : 0))));
  }, [scores]);

  const ranking = useMemo(() => {
    const arr = roster.map((p, idx) => ({
      idx,
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      total: totals[idx] ?? 0,
    }));
    arr.sort((a, b) => a.total - b.total);
    return arr;
  }, [roster, totals]);

  const activePlayer = !isFinished ? roster[playerIdx] : null;
  const activeAvatar = activePlayer?.avatar ?? null;
  const activeTotal = !isFinished ? (totals[playerIdx] ?? 0) : 0;

  const target = holeIdx + 1; // cible = numéro du trou (chronologique)

  function goBack() {
    const payload = { config: cfg };
    if (typeof setTab === "function") {
      setTab("golf_config", payload);
      return;
    }
    if (typeof go === "function") {
      go("golf_config", payload);
      return;
    }
  }

  function pushHistory(prevScores: (number | null)[][]) {
    historyRef.current.push({
      holeIdx,
      playerIdx,
      prev: prevScores.map((r) => r.slice()),
    });
    if (historyRef.current.length > 100) historyRef.current.shift();
  }

  function commitScore(strokes: number) {
    if (isFinished) return;

    setScores((prev) => {
      pushHistory(prev);

      const next = prev.map((r) => r.slice());
      next[playerIdx][holeIdx] = strokes;

      // next turn
      const nextPlayer = playerIdx + 1;
      if (nextPlayer < playersCount) {
        setPlayerIdx(nextPlayer);
      } else {
        // next hole
        const nextHole = holeIdx + 1;
        if (nextHole < holes) {
          setHoleIdx(nextHole);
          setPlayerIdx(0);
        } else {
          setIsFinished(true);
        }
      }

      return next;
    });
  }

  function undo() {
    const h = historyRef.current.pop();
    if (!h) return;
    setScores(h.prev);
    setHoleIdx(h.holeIdx);
    setPlayerIdx(h.playerIdx);
    setIsFinished(false);
  }

  const cardBase: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.28))",
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  };

  function HolesTableBlock(props: {
    start: number; // 1-based
    end: number; // 1-based
    title: string;
  }) {
    const { start, end, title } = props;
    const cols = end - start + 1;
    const headerCells = Array.from({ length: cols }, (_, i) => start + i);

    return (
      <div style={{ ...cardBase, padding: 12, marginTop: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.9)", fontWeight: 900 }}>
            {title}
          </div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Score bas gagne</div>
        </div>

        <div style={{ overflowX: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `46px repeat(${cols}, minmax(0, 1fr)) 64px`,
              gap: 6,
              padding: "8px 8px",
              borderRadius: 12,
              background: "rgba(0,0,0,0.30)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 12,
              fontWeight: 900,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            <div>#</div>
            {headerCells.map((n) => (
              <div key={n} style={{ textAlign: "center" }}>
                {n}
              </div>
            ))}
            <div style={{ textAlign: "right" }}>Total</div>
          </div>

          {roster.map((p, pIdx) => {
            const row = scores[pIdx] || [];
            const slice = row.slice(start - 1, end);
            const rowTotal = totals[pIdx] ?? 0;
            const isActive = !isFinished && pIdx === playerIdx;

            return (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: `46px repeat(${cols}, minmax(0, 1fr)) 64px`,
                  gap: 6,
                  padding: "10px 8px",
                  borderRadius: 12,
                  marginTop: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: isActive
                    ? "linear-gradient(180deg, rgba(120,255,220,0.10), rgba(0,0,0,0.22))"
                    : "rgba(0,0,0,0.18)",
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    color: isActive
                      ? "rgba(160,255,235,0.95)"
                      : "rgba(255,255,255,0.75)",
                  }}
                >
                  {pIdx + 1}
                </div>

                {slice.map((v, i) => {
                  const val = typeof v === "number" ? v : "—";
                  const isCurrentCell =
                    !isFinished &&
                    pIdx === playerIdx &&
                    holeIdx === start - 1 + i;

                  return (
                    <div
                      key={i}
                      style={{
                        textAlign: "center",
                        fontWeight: 900,
                        color: isCurrentCell
                          ? "#b9ffe9"
                          : typeof v === "number"
                          ? "rgba(255,255,255,0.92)"
                          : "rgba(255,255,255,0.35)",
                      }}
                    >
                      {val}
                    </div>
                  );
                })}

                <div
                  style={{
                    textAlign: "right",
                    fontWeight: 900,
                    color: "#ffd36a",
                  }}
                >
                  {rowTotal}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="GOLF"
        tickerSrc={tickerSrc}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles GOLF" content={INFO_TEXT} />}
      />

      <div style={{ padding: 12 }}>
        {/* HEADER PROFIL ACTIF — CLONE X01PlayV3 */}
        <GolfHeaderBlock
          currentPlayer={activePlayer}
          currentAvatar={activeAvatar}
          currentTotal={activeTotal}
          holes={holes}
          holeIdx={holeIdx}
          target={target}
          playerIdx={playerIdx}
          playersCount={playersCount}
          holeValue={(scores[playerIdx] && scores[playerIdx][holeIdx]) ?? null}
          liveRanking={ranking.map((r) => ({
            id: r.id,
            name: r.name,
            score: r.total,
            avatar: r.avatar ?? null,
          }))}
          isFinished={isFinished}
        />

        {/* Liste des joueurs (UX comme X01PlayV3) */}
        <div
          style={{
            ...cardBase,
            padding: 10,
            marginBottom: 12,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              minWidth: "max-content",
            }}
          >
            {roster.map((p, idx) => {
              const isA = !isFinished && idx === playerIdx;
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 14,
                    border: isA
                      ? "1px solid rgba(120,255,220,0.40)"
                      : "1px solid rgba(255,255,255,0.10)",
                    background: isA
                      ? "linear-gradient(180deg, rgba(120,255,220,0.10), rgba(0,0,0,0.22))"
                      : "rgba(0,0,0,0.20)",
                    boxShadow: isA ? "0 10px 24px rgba(0,0,0,0.35)" : undefined,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,.18)",
                      background: "rgba(0,0,0,.35)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {p.avatar ? (
                      <img
                        src={p.avatar}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 900 }}>
                        {idx + 1}
                      </span>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 13,
                        color: isA ? "#b9ffe9" : "rgba(255,255,255,0.90)",
                        maxWidth: 120,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                      {totals[idx] ?? 0}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CONTENU DE JEU */}
        <div
          style={{
            ...cardBase,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <div
              style={{
                fontWeight: 1000,
                color: "rgba(255,255,255,0.92)",
              }}
            >
              TROU {holeIdx + 1}/{holes}
            </div>
            <div style={{ opacity: 0.75, fontWeight: 900 }}>
              JOUEUR {playerIdx + 1}/{playersCount}
            </div>
          </div>

          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 1000 }}>
            Cible : <span style={{ color: "#b9ffe9" }}>{target}</span>
          </div>

          <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 800 }}>
            Résultat du trou — choisis sur quelle flèche tu touches la cible
          </div>

          <div style={{ marginTop: 10, opacity: 0.7, fontWeight: 800, fontSize: 12 }}>
            Saisie en bas (HIT 1/2/3 / MISS) → pour garder l'écran "grille" propre.
          </div>
        </div>

        {/* GRILLE TROUS (pleine largeur, 1–9 puis 10–18) */}
        {showGrid && (
          <>
            {holes <= 9 ? (
              <HolesTableBlock start={1} end={holes} title={`Trous 1–${holes}`} />
            ) : (
              <>
                <HolesTableBlock start={1} end={9} title="Trous 1–9" />
                <HolesTableBlock start={10} end={holes} title={`Trous 10–${holes}`} />
              </>
            )}
          </>
        )}

        {/* SAISIE (déplacée en bas) */}
        {!isFinished && (
          <div style={{ ...cardBase, padding: 12, marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <div style={{ fontWeight: 1000, color: "rgba(255,255,255,0.92)" }}>
                SAISIE
              </div>
              <div style={{ opacity: 0.75, fontWeight: 900 }}>
                Trou {holeIdx + 1}/{holes} · Cible {target}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginTop: 10,
              }}
            >
              <button
                onClick={() => commitScore(1)}
                style={{
                  padding: "14px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(120,255,220,0.35)",
                  background: "rgba(40,120,90,0.22)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 16,
                }}
              >
                Hit 1
              </button>
              <button
                onClick={() => commitScore(2)}
                style={{
                  padding: "14px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(120,255,220,0.35)",
                  background: "rgba(40,120,90,0.22)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 16,
                }}
              >
                Hit 2
              </button>
              <button
                onClick={() => commitScore(3)}
                style={{
                  padding: "14px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(120,255,220,0.35)",
                  background: "rgba(40,120,90,0.22)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 16,
                }}
              >
                Hit 3
              </button>
              <button
                onClick={() => commitScore(missStrokes)}
                style={{
                  padding: "14px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,120,120,0.35)",
                  background: "rgba(120,40,40,0.22)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 16,
                }}
              >
                Miss ({missStrokes})
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                onClick={undo}
                disabled={historyRef.current.length === 0}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.25)",
                  color: "rgba(255,255,255,0.8)",
                  fontWeight: 900,
                  opacity: historyRef.current.length === 0 ? 0.45 : 1,
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {isFinished && (
          <div style={{ ...cardBase, padding: 14, marginTop: 12 }}>
            <div style={{ fontWeight: 1000, fontSize: 16, color: "#ffd36a" }}>
              Partie terminée
            </div>
            <div style={{ marginTop: 8 }}>
              {ranking[0] ? (
                <div style={{ fontWeight: 1000, color: "rgba(255,255,255,0.92)" }}>
                  Vainqueur : {ranking[0].name} — {ranking[0].total}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
