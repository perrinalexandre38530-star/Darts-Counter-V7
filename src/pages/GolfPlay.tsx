import React, { useMemo, useRef, useState } from "react";
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
  store?: any; // profiles store (optionnel)
};

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

export default function GolfPlay(props: Props) {
  const { setTab, go, tabParams, store } = props;

  const cfg: GolfConfig = (tabParams?.config ?? {}) as GolfConfig;

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
  const activeName = activePlayer?.name ?? "—";
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
    // fallback : rien
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

  // -------------------------------
  // UI helpers (styles “comme X01”)
  // -------------------------------
  const cardBase: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.28))",
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  };

  const pill: React.CSSProperties = {
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.35)",
    boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
    fontSize: 12,
    color: "#ffd36a",
    fontWeight: 800,
    whiteSpace: "nowrap",
  };

  const avatarRing: React.CSSProperties = {
    width: 56,
    height: 56,
    borderRadius: 999,
    border: "2px solid rgba(120,255,220,0.85)",
    boxShadow: "0 0 0 4px rgba(0,0,0,0.35), 0 0 18px rgba(120,255,220,0.35)",
    background: "rgba(0,0,0,0.35)",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
  };

  const watermarkStyle: React.CSSProperties = activeAvatar
    ? {
        backgroundImage: `url(${activeAvatar})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "110% 35%",
        backgroundSize: "160px",
      }
    : {};

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
          {/* header */}
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

          {/* rows */}
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
                    color: isActive ? "rgba(160,255,235,0.95)" : "rgba(255,255,255,0.75)",
                  }}
                >
                  {pIdx + 1}
                </div>

                {slice.map((v, i) => {
                  const val = typeof v === "number" ? v : "—";
                  const isCurrentCell =
                    !isFinished && pIdx === playerIdx && holeIdx === (start - 1 + i);

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

                <div style={{ textAlign: "right", fontWeight: 900, color: "#ffd36a" }}>
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
        tickerSrc={tickerGolf}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles GOLF" content={INFO_TEXT} />}
      />

      <div style={{ padding: 12 }}>
        {/* ===============================
            HEADER PROFIL ACTIF (comme X01PlayV3)
            - Avatar + nom + mini stats à gauche
            - Score + mini classement à droite
            - Avatar watermark en fond du bloc score
           =============================== */}
        <div
          style={{
            ...cardBase,
            padding: 12,
            marginBottom: 12,
            display: "flex",
            gap: 12,
            alignItems: "stretch",
          }}
        >
          {/* LEFT : avatar + nom + mini stats */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0, flex: 1 }}>
            <div style={avatarRing}>
              {activeAvatar ? (
                <img
                  src={activeAvatar}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ color: "rgba(255,255,255,0.65)", fontWeight: 900 }}>
                  {playerIdx + 1}
                </div>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ opacity: 0.7, fontSize: 12, fontWeight: 900 }}>
                JOUEUR ACTIF
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 1000,
                  color: "rgba(255,255,255,0.95)",
                  lineHeight: 1.05,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "54vw",
                }}
              >
                {activeName}
              </div>

              {/* mini stats dessous */}
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <div style={pill}>Trou {holeIdx + 1}/{holes}</div>
                <div style={pill}>Cible {target}</div>
                <div style={pill}>Joueur {playerIdx + 1}/{playersCount}</div>
              </div>
            </div>
          </div>

          {/* RIGHT : score + mini classement (avec watermark) */}
          <div
            style={{
              width: 165,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background:
                "linear-gradient(180deg, rgba(255,215,120,0.08), rgba(0,0,0,0.30))",
              boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
              padding: 10,
              position: "relative",
              overflow: "hidden",
              ...watermarkStyle,
            }}
          >
            {/* watermark overlay */}
            {activeAvatar && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.15))",
                  pointerEvents: "none",
                }}
              />
            )}

            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7 }}>SCORE</div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 1000,
                  color: "#ffd36a",
                  lineHeight: 1,
                  marginTop: 2,
                }}
              >
                {activeTotal}
              </div>

              {/* mini classement */}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.65, marginBottom: 6 }}>
                  Classement
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  {ranking.slice(0, Math.min(3, ranking.length)).map((r, i) => {
                    const isMe = !isFinished && r.idx === playerIdx;
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          padding: "6px 8px",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: isMe
                            ? "rgba(120,255,220,0.12)"
                            : "rgba(0,0,0,0.22)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 999,
                              overflow: "hidden",
                              border: "1px solid rgba(255,255,255,0.18)",
                              background: "rgba(0,0,0,0.30)",
                              flex: "0 0 auto",
                            }}
                          >
                            {r.avatar ? (
                              <img
                                src={r.avatar}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : null}
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 900,
                              color: "rgba(255,255,255,0.88)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 80,
                            }}
                          >
                            {i + 1}. {r.name}
                          </div>
                        </div>

                        <div style={{ fontSize: 12, fontWeight: 1000, color: "#ffd36a" }}>
                          {r.total}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENU DE JEU (sans les 2 cartes joueurs inutiles) */}
        <div
          style={{
            ...cardBase,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 1000, color: "rgba(255,255,255,0.92)" }}>
              TROU {holeIdx + 1}/{holes}
            </div>
            <div style={{ opacity: 0.75, fontWeight: 900 }}>JOUEUR {playerIdx + 1}/{playersCount}</div>
          </div>

          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 1000 }}>
            Cible : <span style={{ color: "#b9ffe9" }}>{target}</span>
          </div>

          <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 800 }}>
            Résultat du trou — choisis sur quelle flèche tu touches la cible
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
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

        {/* FIN */}
        {isFinished && (
          <div style={{ ...cardBase, padding: 14, marginTop: 12 }}>
            <div style={{ fontWeight: 1000, fontSize: 16, color: "#ffd36a" }}>Partie terminée</div>
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
