import React, { useEffect, useMemo, useRef, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerGolf from "../assets/tickers/ticker_golf.png";

/**
 * GOLF (darts) — Play
 * ✅ Règles OFFICIELLES (Golf darts)
 * - 9 ou 18 trous, ordre Chronologique ou Aléatoire (stable sur la partie)
 * - Jusqu'à 3 fléchettes par joueur et par trou
 * - Le joueur peut s'arrêter à tout moment
 * - La DERNIÈRE fléchette lancée du tour fait le score du trou
 *   • Double = 1   • Triple = 3   • Simple = 4   • Miss (section cible ratée) = 5
 * - Score total le plus bas gagne
 *
 * UX / UI (demandes)
 * - Header profil actif "comme X01PlayV3" (avatar + watermark + mini classement)
 * - Mini-stats sous l'avatar: Darts / Miss / D / T / S
 * - Sous le score: nom du joueur en MAJUSCULES (pas dans un bouton)
 * - Bandeau TROU/CIBLE: uniquement "TROU x/y" à gauche et "CIBLE : n" à droite + ticker parcours au centre
 * - Ticker parcours: aléatoire parmi 32 images, SANS répétition sur une même partie, change à chaque trou
 * - Keypad bas: supprimer titres "SAISIE" + rappel trou/cible (infos déjà au-dessus)
 * - Grille trous pleine largeur : 1–9, et 10–18 en dessous si 18 trous
 */

type AnyFn = (...args: any[]) => any;

type Props = {
  setTab?: AnyFn; // setTab("golf_config", {config}) etc.
  go?: AnyFn; // go("golf_config", {config}) etc.
  tabParams?: any; // { config }
  params?: any; // { config } (selon App.tsx)
  store?: any; // profiles store (optionnel)
};

// ---------------- Tickers "parcours" (32) ----------------
// Place tes images dans: src/assets/tickers/golf_parcours/*.png
// Ex: Parcours 1.png ... Parcours 32.png
const PARCOURS_TICKERS = Object.values(
  import.meta.glob("../assets/tickers/golf_parcours/*.png", {
    eager: true,
    import: "default",
  })
) as string[];

// Alias attendu par certaines parties du code (random/no-repeat).
// Fallback sécurité : si aucun ticker "parcours" n'existe, on utilise le ticker du mode.
const GOLF_TICKERS: string[] = PARCOURS_TICKERS.length ? PARCOURS_TICKERS : [tickerGolf];

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
  "- Chaque trou vise une section (souvent le numéro du trou).\n" +
  "- Jusqu’à 3 flèches par joueur. Tu peux t’arrêter avant.\n" +
  "- La DERNIÈRE flèche lancée du tour fait le score :\n" +
  "  Double=1 • Triple=3 • Simple=4 • Miss=5\n" +
  "- Le score total le plus bas gagne.";

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
  order?: "chronological" | "random"; // ordre des cibles (stable)
  selectedIds?: string[]; // ids profils
  showGrid?: boolean;
};

type PlayerStat = {
  darts: number;
  miss: number;
  d: number;
  t: number;
  s: number;
  turns: number; // nb de tours démarrés
  hit1: number; // réussite à la 1ère flèche (D/T/S)
  hit2: number; // réussite à la 2e flèche
  hit3: number; // réussite à la 3e flèche
};

type HistoryEntry = {
  holeIdx: number;
  playerIdx: number;
  isFinished: boolean;
  prevScores: (number | null)[][];
  prevTurnThrows: ThrowKind[];
  prevStats: PlayerStat[];
};

type ThrowKind = "D" | "T" | "S" | "M"; // Double / Triple / Simple / Miss

function kindToScore(k: ThrowKind): number {
  if (k === "D") return 1;
  if (k === "T") return 3;
  if (k === "S") return 4;
  return 5;
}


// ---------------- Carousel joueurs (CLONE style KILLER header carousel) ----------------

function GolfAvatarChip({
  src,
  name,
  total,
  isActive,
  theme,
}: {
  src?: string | null;
  name?: string;
  total: number;
  isActive: boolean;
  theme: string;
}) {
  const initials = String(name || "J")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  const neon = isActive
    ? `0 0 0 1px rgba(120,255,220,.22), 0 0 18px rgba(120,255,220,.16), 0 0 42px rgba(120,255,220,.10)`
    : "none";

  return (
    <div
      style={{
        flex: "0 0 auto",
        height: 42,
        borderRadius: 999,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "52px 1fr",
        alignItems: "stretch",
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(0,0,0,0.22)",
        boxShadow: neon,
      }}
      title={name}
    >
      <div style={{ position: "relative", width: 52, height: 42, overflow: "hidden" }}>
        {src ? (
          <img
            src={src}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scale(1.35) translateY(2px)",
              transformOrigin: "center",
              filter: "contrast(1.05) saturate(1.05)",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,.06)",
              borderRight: "1px solid rgba(255,255,255,.08)",
              fontWeight: 1000,
              color: "rgba(255,255,255,.8)",
            }}
          >
            {initials}
          </div>
        )}
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "0 12px",
          minWidth: 120,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 1000,
              color: isActive ? theme : "rgba(255,255,255,.92)",
              letterSpacing: 0.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 108,
            }}
          >
            {name || "Joueur"}
          </div>
          <div style={{ fontSize: 10.5, opacity: 0.7, fontWeight: 900 }}>Total</div>
        </div>

        <div
          style={{
            fontSize: 16,
            fontWeight: 1000,
            color: theme,
            letterSpacing: 0.6,
            textShadow: isActive ? `0 0 12px rgba(120,255,220,.16)` : "none",
          }}
        >
          {total}
        </div>
      </div>
    </div>
  );
}

function GolfPlayersCarousel({
  players,
  activeId,
  theme,
}: {
  players: { id: string; name: string; avatar: string | null; total: number }[];
  activeId?: string | null;
  theme: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    if (!activeId) return;
    const wrap = wrapRef.current;
    const el = itemRefs.current[activeId];
    if (!wrap || !el) return;

    const wrapRect = wrap.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const wrapCenter = wrapRect.left + wrapRect.width / 2;
    const elCenter = elRect.left + elRect.width / 2;

    const delta = elCenter - wrapCenter;
    wrap.scrollBy({ left: delta, behavior: "smooth" });
  }, [activeId, players.length]);

  return (
    <div style={{ padding: "2px 2px 0px", marginTop: 2, marginBottom: 10 }}>
      <div
        ref={wrapRef}
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          paddingBottom: 4,
          paddingTop: 2,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {players.map((p) => {
          const isActive = p.id === activeId;
          return (
            <div key={p.id} ref={(node) => (itemRefs.current[p.id] = node)}>
              <GolfAvatarChip src={p.avatar} name={p.name} total={p.total} isActive={isActive} theme={theme} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Header "Joueur actif" (CLONE feel X01PlayV3) ----------------

const miniCard: React.CSSProperties = {
  width: "clamp(150px, 22vw, 190px)",
  padding: 7,
  borderRadius: 12,
  overflow: "hidden",
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

function GolfHeaderBlock(props: {
  currentPlayer: { id: string; name: string; avatar: string | null } | null;
  currentAvatar: string | null;
  currentTotal: number;
  currentStats: PlayerStat;
  liveRanking: { id: string; name: string; score: number; avatar: string | null }[];
  isFinished: boolean;
}) {
  const { currentPlayer, currentAvatar, currentTotal, currentStats, liveRanking, isFinished } = props;

  const bgAvatarUrl = currentAvatar || null;
  const playerName = (currentPlayer?.name ?? "—").toUpperCase();

  const turns = Math.max(1, currentStats.turns || 0);
  const pct = (n: number, d: number) => {
    if (d <= 0) return 0;
    return Math.round((n / d) * 100);
  };
  const p1 = pct(currentStats.hit1 || 0, turns);
  const p2 = pct(currentStats.hit2 || 0, turns);
  const p3 = pct(currentStats.hit3 || 0, turns);
  const pMiss = pct(currentStats.miss || 0, currentStats.darts || 0);

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
      {/* Watermark avatar (plein bloc header) */}
      {!!bgAvatarUrl && (
        <img src={bgAvatarUrl} aria-hidden style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "70% 40%", opacity: 0.22, filter: "saturate(1.35) contrast(1.18) brightness(1.05)", WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 28%, rgba(0,0,0,0.88) 50%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0) 86%)", maskImage: "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 28%, rgba(0,0,0,0.88) 50%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0) 86%)", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", pointerEvents: "none", userSelect: "none", zIndex: 0}} />
      )}

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
          gap: 10,
          alignItems: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* AVATAR + MINI STATS (demandées) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={avatarMedallion}>
            {currentAvatar ? (
              <img src={currentAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", color: "#999", fontWeight: 800 }}>
                ?
              </div>
            )}
          </div>

          {/* Mini card stats joueur actif: Darts / Miss / D / T / S */}
          <div style={{ ...miniCard, width: 176, maxWidth: 176, boxSizing: "border-box" }}>
            <div style={{ ...miniText, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ opacity: 0.9 }}>Darts</span>
                <span style={{ minWidth: 34, textAlign: "center", padding: "2px 8px", borderRadius: 10, border: "1px solid rgba(120,255,220,.35)", background: "rgba(120,255,220,.14)", color: "#b9ffe9", fontWeight: 1000, fontSize: 12, boxShadow: "0 10px 18px rgba(0,0,0,.25)" }}>{currentStats.darts}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                <div style={{ borderRadius: 10, padding: "6px 0", textAlign: "center", border: "1px solid rgba(70,160,255,0.45)", background: "rgba(20,85,185,0.22)", boxShadow: "0 0 18px rgba(70,160,255,0.16)", fontWeight: 1000 }}>
                  <div style={{ fontSize: 11, opacity: 0.92, color: "#bfeaff" }}>S</div>
                  <div style={{ fontSize: 14, color: "#bfeaff" }}>{currentStats.s}</div>
                </div>
                <div style={{ borderRadius: 10, padding: "6px 0", textAlign: "center", border: "1px solid rgba(255,195,26,0.35)", background: "rgba(255,195,26,0.16)", fontWeight: 1000 }}>
                  <div style={{ fontSize: 11, opacity: 0.9, color: "#ffcf57" }}>D</div>
                  <div style={{ fontSize: 14, color: "#ffcf57" }}>{currentStats.d}</div>
                </div>
                <div style={{ borderRadius: 10, padding: "6px 0", textAlign: "center", border: "1px solid rgba(120,255,220,0.35)", background: "rgba(40,120,90,0.22)", fontWeight: 1000 }}>
                  <div style={{ fontSize: 11, opacity: 0.9, color: "#b9ffe9" }}>T</div>
                  <div style={{ fontSize: 14, color: "#b9ffe9" }}>{currentStats.t}</div>
                </div>
                <div style={{ borderRadius: 10, padding: "6px 0", textAlign: "center", border: "1px solid rgba(255,120,120,0.35)", background: "rgba(120,40,40,0.22)", fontWeight: 1000 }}>
                  <div style={{ fontSize: 11, opacity: 0.9, color: "#ffb2b2" }}>M</div>
                  <div style={{ fontSize: 14, color: "#ffb2b2" }}>{currentStats.miss}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, opacity: 0.98 }}>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
    <span style={{ fontSize: 8, lineHeight: 1, letterSpacing: 0.4, color: "rgba(255,255,255,0.72)", fontWeight: 900, textTransform: "lowercase", whiteSpace: "nowrap" }}>%1st</span>
    <span style={{ minWidth: 46, textAlign: "center", padding: "3px 8px", borderRadius: 10, border: "1px solid rgba(255,195,26,.35)", background: "rgba(255,195,26,.14)", color: "#ffcf57", fontWeight: 1000, fontSize: 12, boxShadow: "0 10px 18px rgba(0,0,0,.25)" }}>{p1}</span>
  </div>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
    <span style={{ fontSize: 8, lineHeight: 1, letterSpacing: 0.4, color: "rgba(255,255,255,0.72)", fontWeight: 900, textTransform: "lowercase", whiteSpace: "nowrap" }}>%2nd</span>
    <span style={{ minWidth: 46, textAlign: "center", padding: "3px 8px", borderRadius: 10, border: "1px solid rgba(120,255,220,.35)", background: "rgba(120,255,220,.12)", color: "#b9ffe9", fontWeight: 1000, fontSize: 12, boxShadow: "0 10px 18px rgba(0,0,0,.25)" }}>{p2}</span>
  </div>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
    <span style={{ fontSize: 8, lineHeight: 1, letterSpacing: 0.4, color: "rgba(255,255,255,0.72)", fontWeight: 900, textTransform: "lowercase", whiteSpace: "nowrap" }}>%3rd</span>
    <span style={{ minWidth: 46, textAlign: "center", padding: "3px 8px", borderRadius: 10, border: "1px solid rgba(120,255,220,.30)", background: "rgba(120,255,220,.09)", color: "rgba(185,255,233,0.92)", fontWeight: 1000, fontSize: 12, boxShadow: "0 10px 18px rgba(0,0,0,.25)" }}>{p3}</span>
  </div>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
    <span style={{ fontSize: 8, lineHeight: 1, letterSpacing: 0.4, color: "rgba(255,255,255,0.72)", fontWeight: 900, textTransform: "lowercase", whiteSpace: "nowrap" }}>%miss</span>
    <span style={{ minWidth: 46, textAlign: "center", padding: "3px 8px", borderRadius: 10, border: "1px solid rgba(255,120,120,.35)", background: "rgba(255,120,120,.10)", color: "#ffb2b2", fontWeight: 1000, fontSize: 12, boxShadow: "0 10px 18px rgba(0,0,0,.25)" }}>{pMiss}</span>
  </div>
</div>
            </div>
          </div>
        </div>

        {/* SCORE + NOM + RANKING */}
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            position: "relative",
            overflow: "hidden",
            borderRadius: 14,
            padding: 6,
          }}
        >

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

          {/* Nom en MAJUSCULES (pas un bouton) */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              fontWeight: 950,
              letterSpacing: 1.2,
              fontSize: 14,
              color: "#ffcf57",
              opacity: 0.95,
              textTransform: "uppercase",
            }}
            title={currentPlayer?.name ?? ""}
          >
            {playerName}
          </div>

          {/* Mini ranking (top 3) */}
          <div style={{ ...miniCard, margin: "0 auto", height: "auto", width: 176 }}>
            <div style={{ fontSize: 11, color: "#d9dbe3", marginBottom: 4, textAlign: "left", paddingLeft: 2, opacity: 0.9 }}>
              Classement
            </div>

            <div style={{ padding: "0 2px 2px 2px", maxHeight: 96, overflowY: "auto", overscrollBehavior: "contain" }}>
              {liveRanking.map((r, i) => (
                <div key={r.id} style={miniRankRow}>
                  <span style={{ display: "inline-flex", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
                    <span style={tinyAvatar}>
                      {r.avatar ? (
                        <img src={r.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : null}
                    </span>
                    <span style={{ ...miniRankName, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                      {i + 1}. {r.name}
                    </span>
                  </span>
                  <span style={isFinished ? miniRankScoreFini : miniRankScore}>{r.score}</span>
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

  
  const roundsMode = ((cfg as any).display === "rounds" || (cfg as any).scoreMode === "rounds" || (cfg as any).format === "rounds" || (cfg as any).rounds === true);
const holes = clamp(Number(cfg.holes ?? 9), 1, 18);
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
          avatar: p?.avatarDataUrl ?? p?.avatarUrl ?? p?.avatar ?? p?.photoUrl ?? null,
        };
      });
    }
    return [
      { id: "p1", name: "Joueur 1", avatar: null },
      { id: "p2", name: "Joueur 2", avatar: null },
    ];
  }, [cfg.selectedIds, profilesById]);

  const playersCount = roster.length || 2;

  // Ordre des cibles (stable) : chronologique ou random
  const holeTargets = useMemo(() => {
    const base = Array.from({ length: holes }, (_, i) => i + 1);
    if (cfg.order === "random") return shuffle(base);
    return base;
  }, [cfg.order, holes]);

  // scores[playerIdx][holeIdx] = score final du trou (1/3/4/5) ou null
  const [scores, setScores] = useState<(number | null)[][]>(() => {
    const s: (number | null)[][] = [];
    for (let p = 0; p < playersCount; p++) s.push(Array.from({ length: holes }, () => null));
    return s;
  });

  const [statsByPlayer, setStatsByPlayer] = useState<PlayerStat[]>(() =>
    Array.from({ length: playersCount }, () => ({ darts: 0, miss: 0, d: 0, t: 0, s: 0, turns: 0, hit1: 0, hit2: 0, hit3: 0 }))
  );

  const [holeIdx, setHoleIdx] = useState(0);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // "Tableau des scores" : carte compacte + popup (tables 1–9 et 10–18 empilées)
  const [showScoresModal, setShowScoresModal] = useState(false);
  const scoreTickerPoolRef = useRef<string[]>([]);
  const [scoreCardTickerSrc, setScoreCardTickerSrc] = useState<string>(() => {
    scoreTickerPoolRef.current = shuffle(GOLF_TICKERS);
    return scoreTickerPoolRef.current[0] ?? tickerGolf;
  });

  // Throws du tour (jusqu'à 3) : on garde uniquement le TYPE, le score final est celui de la DERNIÈRE
  const [turnThrows, setTurnThrows] = useState<ThrowKind[]>([]);

  // Ticker "parcours" : aléatoire sans répétition sur une même partie, change à chaque trou
  const tickerList = (PARCOURS_TICKERS.length ? PARCOURS_TICKERS : [tickerGolf]).slice();
  const tickerPoolRef = useRef<string[]>([]);
  const [holeTickerSrc, setHoleTickerSrc] = useState<string>(() => {
    tickerPoolRef.current = shuffle(tickerList);
    return tickerPoolRef.current[0] ?? tickerGolf;
  });

  useEffect(() => {
    // à chaque trou: prend l'index correspondant dans le pool (sans répétition)
    const pool = tickerPoolRef.current;
    const next = pool[holeIdx] ?? pool[pool.length - 1] ?? tickerGolf;
    setHoleTickerSrc(next);
  }, [holeIdx]);

  // Ticker de la carte "TABLEAU DES SCORES" : défilement auto (sans répétition immédiate)
  useEffect(() => {
    if (!showGrid) return;
    const id = window.setInterval(() => {
      const pool = scoreTickerPoolRef.current;
      let nextPool = pool.slice(1);
      if (nextPool.length === 0) {
        nextPool = shuffle(GOLF_TICKERS);
        // évite de reprendre immédiatement la même image
        if (nextPool[0] === scoreCardTickerSrc && nextPool.length > 1) {
          const tmp = nextPool[0];
          nextPool[0] = nextPool[1];
          nextPool[1] = tmp;
        }
      }
      scoreTickerPoolRef.current = nextPool;
      setScoreCardTickerSrc(nextPool[0] ?? tickerGolf);
    }, 2600);
    return () => window.clearInterval(id);
  }, [showGrid, scoreCardTickerSrc]);

  const historyRef = useRef<HistoryEntry[]>([]);

  const totals = useMemo(() => scores.map((row) => sum(row.map((v) => (typeof v === "number" ? v : 0)))), [scores]);

  const ranking = useMemo(() => {
    const arr = roster.map((p, idx) => ({ idx, id: p.id, name: p.name, avatar: p.avatar, total: totals[idx] ?? 0 }));
    arr.sort((a, b) => a.total - b.total);
    return arr;
  }, [roster, totals]);

  const activePlayer = !isFinished ? roster[playerIdx] : null;
  const activeAvatar = activePlayer?.avatar ?? null;
  const activeTotal = !isFinished ? totals[playerIdx] ?? 0 : 0;
  const activeStats = !isFinished ? statsByPlayer[playerIdx] ?? { darts: 0, miss: 0, d: 0, t: 0, s: 0 } : { darts: 0, miss: 0, d: 0, t: 0, s: 0 };

  const target = holeTargets[holeIdx] ?? (holeIdx + 1);

  function goBack() {
    const payload = { config: cfg };
    if (typeof setTab === "function") return setTab("golf_config", payload);
    if (typeof go === "function") return go("golf_config", payload);
  }

  function pushHistory(prevScores: (number | null)[][], prevTurn: ThrowKind[], prevStats: PlayerStat[]) {
    historyRef.current.push({
      holeIdx,
      playerIdx,
      isFinished,
      prevScores: prevScores.map((r) => r.slice()),
      prevTurnThrows: prevTurn.slice(),
      prevStats: prevStats.map((s) => ({ ...s })),
    });
    if (historyRef.current.length > 200) historyRef.current.shift();
  }

  function advanceAfterFinalize() {
    // next player / next hole
    const nextPlayer = playerIdx + 1;
    if (nextPlayer < playersCount) {
      setPlayerIdx(nextPlayer);
      setTurnThrows([]);
      return;
    }
    const nextHole = holeIdx + 1;
    if (nextHole < holes) {
      setHoleIdx(nextHole);
      setPlayerIdx(0);
      setTurnThrows([]);
    } else {
      setIsFinished(true);
      setTurnThrows([]);
    }
  }

  function finalizeTurn(prevScores: (number | null)[][], nextScores: (number | null)[][], prevTurn: ThrowKind[]) {
    // le score du trou est la DERNIÈRE flèche lancée
    const last = prevTurn[prevTurn.length - 1];
    const holeScore = last ? kindToScore(last) : null;
    if (holeScore == null) return;

    nextScores[playerIdx][holeIdx] = holeScore;
    return;
  }

  function recordThrow(kind: ThrowKind) {
    if (isFinished) return;
    setScores((prevScores) => {
      const prevTurn = turnThrows.slice();
      const prevStats = statsByPlayer.map((s) => ({ ...s }));
      pushHistory(prevScores, prevTurn, prevStats);

      // update stats
      const nextStats = prevStats.map((s) => ({ ...s }));
      const st = nextStats[playerIdx] ?? { darts: 0, miss: 0, d: 0, t: 0, s: 0, turns: 0, hit1: 0, hit2: 0, hit3: 0 };
      const dartIdx = prevTurn.length; // 0..2
      if (dartIdx === 0) st.turns += 1;
      st.darts += 1;
      if (kind === "M") st.miss += 1;
      if (kind === "D") st.d += 1;
      if (kind === "T") st.t += 1;
      if (kind === "S") st.s += 1;
      // réussite sur la flèche (pas un miss)
      if (kind !== "M") {
        if (dartIdx === 0) st.hit1 += 1;
        if (dartIdx === 1) st.hit2 += 1;
        if (dartIdx === 2) st.hit3 += 1;
      }
      nextStats[playerIdx] = st;
      setStatsByPlayer(nextStats);

      // update turnThrows
      const nextTurn = prevTurn.concat(kind).slice(0, 3);
      setTurnThrows(nextTurn);

      // update scores if this throw ends the turn (3 darts)
      const nextScores = prevScores.map((r) => r.slice());
      if (nextTurn.length >= 3) {
        finalizeTurn(prevScores, nextScores, nextTurn);
        // advance
        setTimeout(() => advanceAfterFinalize(), 0);
      }

      return nextScores;
    });
  }

  function stopTurn() {
    if (isFinished) return;
    if (turnThrows.length <= 0) return;

    setScores((prevScores) => {
      const prevTurn = turnThrows.slice();
      const prevStats = statsByPlayer.map((s) => ({ ...s }));
      pushHistory(prevScores, prevTurn, prevStats);

      const nextScores = prevScores.map((r) => r.slice());
      finalizeTurn(prevScores, nextScores, prevTurn);
      setTimeout(() => advanceAfterFinalize(), 0);
      return nextScores;
    });
  }

  function undo() {
    const h = historyRef.current.pop();
    if (!h) return;
    setScores(h.prevScores.map((r) => r.slice()));
    setHoleIdx(h.holeIdx);
    setPlayerIdx(h.playerIdx);
    setIsFinished(h.isFinished);
    setTurnThrows(h.prevTurnThrows.slice());
    setStatsByPlayer(h.prevStats.map((s) => ({ ...s })));
  }

  // ---------------- UI helpers ----------------
  const cardBase: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.28))",
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
  };

  function HolesTableBlock(props: { start: number; end: number; title: string }) {
    const { start, end, title } = props;
    const cols = end - start + 1;

    const headerCells = Array.from({ length: cols }, (_, i) => start + i);
    const headerTargets = headerCells.map((h) => holeTargets[h - 1] ?? h);

    const cellPill = (v: number) => {
      // 1 = Double (hole in one), 3 = Triple, 4 = Simple, 5 = Miss
      if (v === 1) return { border: "1px solid rgba(255,195,26,.45)", background: "rgba(255,195,26,.16)", color: "#ffcf57" };
      if (v === 3) return { border: "1px solid rgba(120,255,220,.45)", background: "rgba(120,255,220,.14)", color: "#b9ffe9" };
      if (v === 4) return { border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.92)" };
      return { border: "1px solid rgba(255,95,95,.45)", background: "rgba(255,95,95,.14)", color: "#ffb2b2" };
    };

    return (
      <div
        style={{
          ...cardBase,
          padding: 12,
          marginTop: 12,
          background:
            "radial-gradient(120% 160% at 0% 0%, rgba(120,255,220,0.10), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.30))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div style={{ color: "#b9ffe9", fontWeight: 1000, textShadow: "0 0 16px rgba(120,255,220,.18)" }}>{title}</div>
          <div style={{ opacity: 0.72, fontSize: 12, fontWeight: 900 }}>Score bas gagne</div>
        </div>

        <div style={{ overflowX: "hidden" }}>
          {/* header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `46px repeat(${cols}, minmax(0, 1fr)) 64px`,
              gap: 6,
              padding: "8px 8px",
              borderRadius: 14,
              background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.18))",
              border: "1px solid rgba(255,255,255,0.10)",
              fontSize: 12,
              fontWeight: 1000,
              color: "rgba(255,255,255,0.75)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <div>#</div>
            {headerTargets.map((n, idx) => (
              <div key={idx} style={{ textAlign: "center", letterSpacing: 0.4 }}>
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
                  borderRadius: 14,
                  marginTop: 10,
                  border: isActive ? "1px solid rgba(120,255,220,0.22)" : "1px solid rgba(255,255,255,0.08)",
                  background: isActive
                    ? "linear-gradient(180deg, rgba(120,255,220,0.10), rgba(0,0,0,0.22))"
                    : "linear-gradient(180deg, rgba(0,0,0,0.22), rgba(0,0,0,0.12))",
                  boxShadow: isActive ? "0 14px 30px rgba(0,0,0,0.35)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: isActive
                        ? "1px solid rgba(120,255,220,.55)"
                        : "1px solid rgba(255,255,255,.14)",
                      boxShadow: isActive
                        ? "0 0 0 3px rgba(0,0,0,.28), 0 0 16px rgba(120,255,220,.25)"
                        : "0 0 0 3px rgba(0,0,0,.28)",
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
                      <span
                        style={{
                          fontWeight: 1000,
                          fontSize: 13,
                          color: isActive ? "#b9ffe9" : "rgba(255,255,255,0.78)",
                        }}
                      >
                        {pIdx + 1}
                      </span>
                    )}
                  </div>
                </div>

                {slice.map((v, i) => {
                  const isCurrentCell = !isFinished && pIdx === playerIdx && holeIdx === start - 1 + i;

                  if (typeof v !== "number") {
                    return (
                      <div
                        key={i}
                        style={{
                          textAlign: "center",
                          fontWeight: 1000,
                          color: isCurrentCell ? "rgba(185,255,233,0.85)" : "rgba(255,255,255,0.28)",
                        }}
                      >
                        —
                      </div>
                    );
                  }

                  const st = cellPill(v);

                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "center" }}>
                      <div
                        style={{
                          minWidth: 30,
                          height: 26,
                          padding: "0 10px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 12,
                          border: st.border,
                          background: st.background,
                          color: st.color,
                          fontWeight: 1000,
                          boxShadow: isCurrentCell ? "0 0 18px rgba(120,255,220,0.18)" : "none",
                        }}
                      >
                        {v}
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      minWidth: 44,
                      height: 26,
                      padding: "0 10px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      border: "1px solid rgba(255,195,26,.35)",
                      background: "rgba(255,195,26,.10)",
                      color: "#ffcf57",
                      fontWeight: 1000,
                      letterSpacing: 0.2,
                    }}
                  >
                    {rowTotal}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

// Chips d'état du tour (3 flèches)
  const throwChips = [0, 1, 2].map((i) => {
    const k = turnThrows[i];
    if (!k) return "—";
    if (k === "D") return "D";
    if (k === "T") return "T";
    if (k === "S") return "S";
    return "M";
  });

  function chipStyle(label: string): React.CSSProperties {
    if (label === "D") return { border: "1px solid rgba(255,195,26,.35)", background: "rgba(255,195,26,.16)", color: "#ffcf57" };
    if (label === "T") return { border: "1px solid rgba(120,255,220,.35)", background: "rgba(120,255,220,.14)", color: "#b9ffe9" };
    if (label === "S") return { border: "1px solid rgba(70,160,255,.45)", background: "rgba(20,85,185,.22)", color: "#bfeaff", boxShadow: "0 0 18px rgba(70,160,255,.16)" };
    if (label === "M") return { border: "1px solid rgba(255,95,95,.35)", background: "rgba(255,95,95,.14)", color: "#ffb2b2" };
    return { border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#d9dbe3" };
  }

  return (
    <div className="page">
      <PageHeader title="GOLF" tickerSrc={tickerGolf} left={<BackDot onClick={goBack} />} right={<InfoDot title="Règles GOLF" content={INFO_TEXT} />} />

      <div style={{ padding: 12 }}>
        
        {/* Carousel joueurs (clone KILLER) */}
        <GolfPlayersCarousel
          players={roster.map((p, idx) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar ?? null,
            total: totals[idx] ?? 0,
          }))}
          activeId={!isFinished ? roster[playerIdx]?.id : null}
          theme={"#b9ffe9"}
        />

<GolfHeaderBlock
          currentPlayer={activePlayer}
          currentAvatar={activeAvatar}
          currentTotal={activeTotal}
          currentStats={activeStats}
          liveRanking={ranking.map((r) => ({ id: r.id, name: r.name, score: r.total, avatar: r.avatar ?? null }))}
          isFinished={isFinished}
        />

        {/* Bandeau TROU / ticker parcours / CIBLE (ticker plein, texte sur l’image) */}
        <div
          style={{
            ...cardBase,
            padding: 0,
            marginBottom: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "relative",
              height: 62,
              width: "100%",
              backgroundImage: `url(${holeTickerSrc})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              borderRadius: 18,
            }}
          >
            {/* voile pour la lisibilité */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(0,0,0,.80) 0%, rgba(0,0,0,.35) 45%, rgba(0,0,0,.80) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 14px",
              }}
            >
              <div
                style={{
                  fontWeight: 1000,
                  color: "#b9ffe9",
                  textShadow: "0 3px 14px rgba(120,255,220,.25)",
                  letterSpacing: 0.6,
                }}
              >
                TROU {holeIdx + 1}/{holes}
              </div>

              <div
                style={{
                  fontWeight: 1000,
                  color: "#b9ffe9",
                  textShadow: "0 3px 14px rgba(120,255,220,.25)",
                  letterSpacing: 0.6,
                }}
              >
                CIBLE : {target}
              </div>
            </div>
          </div>
        </div>

        {/* TABLEAU DES SCORES : carte compacte (ouvre un bloc flottant avec 1–9 / 10–18 empilés) */}
        {showGrid && (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setShowScoresModal(true)}
              style={{
                ...cardBase,
                padding: 0,
                width: "100%",
                borderRadius: 18,
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {/* background ticker */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${scoreCardTickerSrc})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.55,
                  filter: "saturate(1.15) contrast(1.08)",
                }}
              />
              {/* overlay */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,.76) 0%, rgba(0,0,0,.48) 45%, rgba(0,0,0,.76) 100%), radial-gradient(120% 140% at 0% 0%, rgba(120,255,220,.18), transparent 55%)",
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  height: 76,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 1000,
                  letterSpacing: 1,
                  color: "rgba(255,255,255,.92)",
                  textShadow: "0 8px 22px rgba(0,0,0,.55)",
                  textTransform: "uppercase",
                }}
              >
                TABLEAU DES SCORES
              </div>
            </button>

            {showScoresModal && (
              <div
                role="dialog"
                aria-modal="true"
                onClick={() => setShowScoresModal(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,.64)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 12,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    ...cardBase,
                    width: "min(680px, 100%)",
                    maxHeight: "82vh",
                    overflow: "hidden",
                    borderRadius: 20,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <div style={{ fontWeight: 1000, color: "rgba(255,255,255,.92)" }}>
                      TABLEAU DES SCORES
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowScoresModal(false)}
                      style={{
                        height: 34,
                        padding: "0 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(0,0,0,0.30)",
                        color: "rgba(255,255,255,0.85)",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      FERMER
                    </button>
                  </div>

                  <div style={{ padding: 12, overflowY: "auto", maxHeight: "calc(82vh - 56px)" }}>
                    {roundsMode && (
                      <div style={{ ...cardBase, padding: 10, marginBottom: 12, borderRadius: 16 }}>
                        <div style={{ fontWeight: 1000, marginBottom: 8, color: "rgba(255,255,255,.92)" }}>
                          ROUNDS
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {players.map((p, idx) => (
                            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                              <div style={{ display: "inline-flex", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
                                <span style={{ ...tinyAvatar, width: 20, height: 20 }}>
                                  {p.avatar ? <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                                </span>
                                <span style={{ fontWeight: 900, opacity: 0.92, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {p.name}
                                </span>
                              </div>
                              <span style={{ minWidth: 46, textAlign: "center", padding: "4px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.28)", fontWeight: 1000 }}>
                                {statsByPlayer[idx]?.turns ?? 0}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {holes <= 9 ? (
                      <HolesTableBlock start={1} end={holes} title={`Trous 1–${holes}`} />
                    ) : (
                      <>
                        <HolesTableBlock start={1} end={9} title="Trous 1–9" />
                        <HolesTableBlock start={10} end={holes} title={`Trous 10–${holes}`} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SAISIE (en bas) — sans titres "SAISIE" / trou-cible */}
        {!isFinished && (
          <div style={{ ...cardBase, padding: 12, marginTop: 12 }}>
            {/* chips de tour */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10 }}>
              {throwChips.map((lab, i) => {
                const st = chipStyle(lab);
                return (
                  <span
                    key={i}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 42,
                      height: 30,
                      padding: "0 12px",
                      borderRadius: 12,
                      border: st.border as any,
                      background: st.background as any,
                      color: st.color as any,
                      fontWeight: 900,
                      fontSize: 13,
                    }}
                  >
                    {lab}
                  </span>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={() => recordThrow("D")}
                disabled={turnThrows.length >= 3}
                style={{
                  padding: "14px 12px",
                  minHeight: 48,
                  borderRadius: 14,
                  border: "1px solid rgba(255,195,26,0.35)",
                  background: "rgba(255,195,26,0.16)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 16,
                  opacity: turnThrows.length >= 3 ? 0.55 : 1,
                }}
              >
                DOUBLE (1)
              </button>

              <button
                onClick={() => recordThrow("T")}
                disabled={turnThrows.length >= 3}
                style={{
                  padding: "14px 12px",
                  minHeight: 48,
                  borderRadius: 14,
                  border: "1px solid rgba(120,255,220,0.35)",
                  background: "rgba(40,120,90,0.22)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 16,
                  opacity: turnThrows.length >= 3 ? 0.55 : 1,
                }}
              >
                TRIPLE (3)
              </button>

              <button
                onClick={() => recordThrow("S")}
                disabled={turnThrows.length >= 3}
                style={{
                  padding: "14px 12px",
                  minHeight: 48,
                  borderRadius: 14,
                  border: "1px solid rgba(70,160,255,0.45)",
                  background: "rgba(20,85,185,0.22)",
                  boxShadow: "0 14px 34px rgba(0,0,0,0.45), 0 0 18px rgba(70,160,255,0.16)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 16,
                  opacity: turnThrows.length >= 3 ? 0.55 : 1,
                }}
              >
                SIMPLE (4)
              </button>

              <button
                onClick={() => recordThrow("M")}
                disabled={turnThrows.length >= 3}
                style={{
                  padding: "14px 12px",
                  minHeight: 48,
                  borderRadius: 14,
                  border: "1px solid rgba(255,120,120,0.35)",
                  background: "rgba(120,40,40,0.22)",
                  color: "white",
                  fontWeight: 1000,
                  fontSize: 16,
                  opacity: turnThrows.length >= 3 ? 0.55 : 1,
                }}
              >
                MISS (5)
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
              <button
                onClick={stopTurn}
                disabled={turnThrows.length === 0}
                style={{
                  flex: 1,
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,105,180,0.45)",
                  background: "linear-gradient(180deg, rgba(255,215,236,0.95), rgba(255,186,221,0.90))",
                  color: "#b01863",
                  boxShadow:
                    "0 14px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.28), 0 0 18px rgba(255,105,180,0.18)",
                  fontWeight: 1000,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  opacity: turnThrows.length === 0 ? 0.45 : 1,
                }}
              >
                JOUEUR SUIVANT
              </button>

              <button
                onClick={undo}
                disabled={historyRef.current.length === 0}
                style={{
                  width: 140,
                  padding: "12px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,180,0,.30)",
                  background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
                  color: "#1a1a1a",
                  boxShadow: "0 10px 22px rgba(255,170,0,.28), 0 14px 32px rgba(0,0,0,0.35)",
                  fontWeight: 1000,
                  letterSpacing: 0.6,
                  opacity: historyRef.current.length === 0 ? 0.45 : 1,
                }}
              >
                ANNULER
              </button>
            </div>
          </div>
        )}

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