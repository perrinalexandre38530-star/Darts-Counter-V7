// =============================================================
// src/pages/pingpong/PingPongConfig.tsx
// Config Ping-Pong (LOCAL ONLY) — V2
// ✅ Rendu visuel identique aux configs Darts (ticker header + fond dark)
// ✅ Ticker dédié en haut selon le mode (1v1 / 2v2 / 2v1 / tournante / training)
// ✅ Carrousel de profils locaux + profil actif (comme les autres menus)
// ✅ Plus d'options: officiel / fun / custom + ordre du service + règles avancées
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileMedallionCarousel from "../../components/ProfileMedallionCarousel";

import type { Store, Profile } from "../../lib/types";
import {
  loadPingPongState,
  resetPingPong,
  setConfig,
  type PingPongMode,
  type PingPongRulesPreset,
  type PingPongServeStart,
} from "../../lib/pingpongStore";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  store?: Store | any;
};

// ✅ Tickers images (Vite)
const TICKERS = import.meta.glob("../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getTicker(id: string | null | undefined) {
  if (!id) return null;
  const norm = String(id).trim().toLowerCase();
  const candidates = Array.from(
    new Set([
      norm,
      norm.replace(/\s+/g, "_"),
      norm.replace(/\s+/g, "-"),
      norm.replace(/-/g, "_"),
      norm.replace(/_/g, "-"),
      norm.replace(/[^a-z0-9_\-]/g, ""),
    ])
  ).filter(Boolean);

  for (const c of candidates) {
    const suffixA = `/ticker_${c}.png`;
    const suffixB = `/ticker-${c}.png`;
    for (const k of Object.keys(TICKERS)) {
      if (k.endsWith(suffixA) || k.endsWith(suffixB)) return TICKERS[k];
    }
  }
  return null;
}

function getTickerFromCandidates(ids: Array<string | null | undefined>) {
  for (const id of ids) {
    const src = getTicker(id);
    if (src) return src;
  }
  return null;
}

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function splitNames(raw: string): string[] {
  const s = String(raw || "").trim();
  if (!s) return [];
  // tolérant : "A · B" / "A & B" / "A + B" / "A,B"
  const parts = s
    .split(/\s*(?:·|&|\+|,|\/|\|)\s*/g)
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  return parts.slice(0, 4);
}

function joinNames(names: string[]): string {
  const out = (names || []).map((s) => String(s || "").trim()).filter(Boolean);
  return out.length ? out.join(" · ") : "";
}

export default function PingPongConfig({ go, params, store }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  const [st, setSt] = React.useState(() => loadPingPongState());
  const [rulesOpen, setRulesOpen] = React.useState(false);

  // UI Mode (menu games)
  const uiMode: string = String((params as any)?.mode ?? (st as any)?.uiMode ?? "match_1v1");
  const isTournante = uiMode === "tournante";
  const isTraining = uiMode === "training";
  const is2v2 = uiMode === "match_2v2";
  const is2v1 = uiMode === "match_2v1";

  // Moteur interne
  const engineMode: PingPongMode = isTournante ? "tournante" : "sets";

  // Ticker haut
  const headerTicker = React.useMemo(() => {
    if (isTraining) return getTickerFromCandidates(["pingpong_training", "pingpong_games", "pingpong"]);
    if (isTournante) return getTickerFromCandidates(["pingpong_tournante", "pingpong_games", "pingpong"]);
    if (is2v2) return getTickerFromCandidates(["pingpong_2v2", "pingpong_games", "pingpong"]);
    if (is2v1) return getTickerFromCandidates(["pingpong_2v1", "pingpong_games", "pingpong"]);
    return getTickerFromCandidates(["pingpong_1v1", "pingpong_games", "pingpong"]);
  }, [isTraining, isTournante, is2v2, is2v1]);

  // Profils pour carrousel
  const profiles: Profile[] = ((store as any)?.profiles || []) as Profile[];
  const medallions = React.useMemo(
    () => profiles.map((p) => ({ id: p.id, name: p.name, profile: p })),
    [profiles]
  );

  // Capacités sélection
  const capA = is2v2 || is2v1 ? 2 : 1;
  const capB = is2v2 ? 2 : 1;

  // selections existantes (si déjà stockées) — sinon vide
  const [selA, setSelA] = React.useState<string[]>(Array.isArray((st as any).teamAProfileIds) ? (st as any).teamAProfileIds : []);
  const [selB, setSelB] = React.useState<string[]>(Array.isArray((st as any).teamBProfileIds) ? (st as any).teamBProfileIds : []);

  // Fallback noms manuels
  const parsedA = React.useMemo(() => splitNames(st.sideA), [st.sideA]);
  const parsedB = React.useMemo(() => splitNames(st.sideB), [st.sideB]);
  const [a1, setA1] = React.useState(parsedA[0] || "Joueur A");
  const [a2, setA2] = React.useState(parsedA[1] || "");
  const [b1, setB1] = React.useState(parsedB[0] || "Joueur B");
  const [b2, setB2] = React.useState(parsedB[1] || "");

  // Règles / format
  const [rulesPreset, setRulesPreset] = React.useState<PingPongRulesPreset>((st as any).rulesPreset ?? "official");
  const [pointsPerSet, setPointsPerSet] = React.useState<number>(Number(st.pointsPerSet || 11));
  const defaultSetsToWin = uiMode === "match_1v1" ? 1 : Number(st.setsToWin || 3);
  const [setsToWin, setSetsToWin] = React.useState<number>(defaultSetsToWin);
  const [winByTwo, setWinByTwo] = React.useState<boolean>(st.winByTwo !== false);
  const [serveStart, setServeStart] = React.useState<PingPongServeStart>((st as any).serveStart ?? "manual");
  const [serviceEvery, setServiceEvery] = React.useState<number>(clampInt((st as any).serviceEvery, 1, 20, 2));
  const [deuceServiceEvery, setDeuceServiceEvery] = React.useState<number>(clampInt((st as any).deuceServiceEvery, 1, 10, 1));
  const [switchEndsEachSet, setSwitchEndsEachSet] = React.useState<boolean>((st as any).switchEndsEachSet !== false);
  const [switchEndsAtFinal, setSwitchEndsAtFinal] = React.useState<boolean>((st as any).switchEndsAtFinal !== false);
  const [switchEndsAtFinalPoints, setSwitchEndsAtFinalPoints] = React.useState<number>(
    clampInt((st as any).switchEndsAtFinalPoints, 1, 50, pointsPerSet === 21 ? 10 : 5)
  );

  const [tournanteText, setTournanteText] = React.useState(() =>
    Array.isArray(st.tournantePlayers) && st.tournantePlayers.length
      ? st.tournantePlayers.join("\n")
      : "Joueur 1\nJoueur 2\nJoueur 3\nJoueur 4"
  );

  // Presets rapides
  React.useEffect(() => {
    if (rulesPreset === "official") {
      setPointsPerSet((prev) => (Number.isFinite(prev) ? prev : 11));
      setWinByTwo(true);
      setServiceEvery(2);
      setDeuceServiceEvery(1);
      setSwitchEndsEachSet(true);
      setSwitchEndsAtFinal(true);
      setSwitchEndsAtFinalPoints((p) => (pointsPerSet === 21 ? 10 : 5));
      return;
    }
    if (rulesPreset === "fun") {
      // fun = plus permissif (modifiable ensuite)
      setPointsPerSet((prev) => (prev === 11 || !Number.isFinite(prev) ? 21 : prev));
      setWinByTwo(false);
      setServiceEvery(5);
      setDeuceServiceEvery(2);
      setSwitchEndsEachSet(true);
      setSwitchEndsAtFinal(false);
      setSwitchEndsAtFinalPoints((p) => (pointsPerSet === 21 ? 10 : 5));
    }
  }, [rulesPreset]);

  // auto propose profil actif en A si rien sélectionné
  React.useEffect(() => {
    if (!profiles.length) return;
    const activeId = (store as any)?.activeProfileId || (store as any)?.activeProfile?.id;
    if (!activeId) return;
    setSelA((prev) => {
      if (prev && prev.length) return prev;
      return [String(activeId)];
    });
  }, [profiles, store]);

  const toggle = (team: "A" | "B", id: string) => {
    const cap = team === "A" ? capA : capB;
    const other = team === "A" ? selB : selA;
    // Interdit d'être dans les 2 équipes
    if (other.includes(id)) return;

    const set = team === "A" ? setSelA : setSelB;
    set((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      if (prev.length >= cap) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const canStart = React.useMemo(() => {
    if (isTraining) return true;
    if (isTournante) return tournanteText.trim().split("\n").filter(Boolean).length >= 2;
    // si profils dispo, on autorise soit sélection complète, soit fallback noms saisis
    const byProfiles = profiles.length ? selA.length === capA && selB.length === capB : true;
    const byNames = (a1 || "").trim().length > 0 && (b1 || "").trim().length > 0;
    return (byProfiles || byNames) && pointsPerSet >= 5 && setsToWin >= 1;
  }, [isTraining, isTournante, tournanteText, profiles.length, selA, selB, capA, capB, a1, b1, pointsPerSet, setsToWin]);

  const onStart = () => {
    if (isTraining) {
      go("pingpong_training");
      return;
    }

    const base = resetPingPong(st);
    const players = tournanteText
      .split("\n")
      .map((s) => String(s || "").trim())
      .filter(Boolean);

    // Compose sides selon le format.
    const nextSideA = is2v2 || is2v1 ? joinNames([a1, a2]) : (a1 || "Joueur A").trim();
    const nextSideB = is2v2
      ? joinNames([b1, b2])
      : is2v1
      ? (b1 || "Joueur B").trim()
      : (b1 || "Joueur B").trim();

    const next = setConfig(
      base,
      engineMode,
      nextSideA,
      nextSideB,
      pointsPerSet,
      setsToWin,
      winByTwo,
      isTournante ? players : undefined,
      {
        uiMode,
        rulesPreset,
        serveStart,
        serviceEvery,
        deuceServiceEvery,
        switchEndsEachSet,
        switchEndsAtFinal,
        switchEndsAtFinalPoints,
      }
    ) as any;

    // persiste les sélections profils (si dispo)
    (next as any).teamAProfileIds = profiles.length ? selA.slice(0, capA) : [];
    (next as any).teamBProfileIds = profiles.length ? selB.slice(0, capB) : [];

    setSt(next);
    go("pingpong_play", { matchId: (next as any).matchId });
  };

  const primary = theme?.primary ?? "rgba(110,180,255,1)";
  const textMain = theme?.colors?.text ?? "#e8ecff";
  const cardBg = "rgba(255,255,255,0.06)";

  const DOT_SIZE = 36;
  const DOT_GLOW = `${primary}88`;

  return (
    <div
      className="screen pingpong-config-screen"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "12px 12px 76px",
        background: "radial-gradient(circle at top, #15192c 0, #05060c 50%, #020308 100%)",
        color: textMain,
      }}
    >
      {/* HEADER ticker */}
      <header style={{ marginBottom: 10, marginLeft: -12, marginRight: -12 }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingTop: "max(6px, env(safe-area-inset-top))",
          }}
        >
          {headerTicker ? (
            <img
              src={headerTicker}
              alt="Ping-Pong"
              style={{ width: "100%", height: "auto", display: "block", userSelect: "none", pointerEvents: "none", WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, transparent 100%)", maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, transparent 100%)" }}
              draggable={false}
            />
          ) : (
            <div
              style={{
                height: 64,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                letterSpacing: 1,
              }}
            >
              PING-PONG — CONFIG
            </div>
          )}

          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
            <BackDot
              onClick={() => go("pingpong_menu")}
              title={t("common.back", "Retour")}
              size={DOT_SIZE}
              color={primary}
              glow={DOT_GLOW}
            />
          </div>

          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
            <InfoDot
              onClick={() => setRulesOpen(true)}
              title={t("common.rules", "Règles")}
              size={DOT_SIZE}
              color={primary}
              glow={DOT_GLOW}
            />
          </div>
        </div>
      </header>

      {/* Training: écran ultra simple */}
      {isTraining ? (
        <div
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: "16px 12px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800, color: primary }}>
            Training
          </div>
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85, lineHeight: 1.45 }}>
            Objectifs, séries, temps — tout est en local. (On complète le mode ensuite.)
          </div>
          <div style={{ height: 14 }} />
          <button style={cta(theme, canStart)} onClick={onStart} disabled={!canStart}>
            Lancer le training
          </button>
        </div>
      ) : (
        <>
          {/* JOUEURS */}
          <div
            style={{
              background: cardBg,
              borderRadius: 18,
              padding: "16px 12px",
              marginBottom: 12,
              boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800, color: primary }}>
              Joueurs
            </div>

            {profiles.length > 0 && !isTournante ? (
              <>
                <div style={{ marginTop: 10 }}>
                  <div style={sectionTitle(primary)}>{is2v2 || is2v1 ? "ÉQUIPE A" : "JOUEUR A"}</div>
                  <ProfileMedallionCarousel
                    items={medallions}
                    selectedIds={selA}
                    onToggle={(id) => toggle("A", id)}
                    theme={theme}
                    maxSelected={capA}
                  />
                  <div style={smallHint}>
                    Sélectionne {capA} profil(s). (Un profil ne peut pas être dans les 2 côtés.)
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={sectionTitle(primary)}>{is2v2 ? "ÉQUIPE B" : "JOUEUR B"}</div>
                  <ProfileMedallionCarousel
                    items={medallions}
                    selectedIds={selB}
                    onToggle={(id) => toggle("B", id)}
                    theme={theme}
                    maxSelected={capB}
                  />
                  <div style={smallHint}>Sélectionne {capB} profil(s).</div>
                </div>
              </>
            ) : isTournante ? (
              <>
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8, fontWeight: 800 }}>
                  1 joueur par ligne — rotation / élimination.
                </div>
                <textarea
                  value={tournanteText}
                  onChange={(e) => setTournanteText(e.target.value)}
                  style={{ ...input(theme), minHeight: 150, resize: "vertical", fontFamily: "inherit" }}
                />
              </>
            ) : (
              <>
                {/* fallback noms */}
                <div style={{ marginTop: 10 }}>
                  <div style={sectionTitle(primary)}>{is2v2 || is2v1 ? "ÉQUIPE A" : "JOUEUR A"}</div>
                  <input value={a1} onChange={(e) => setA1(e.target.value)} style={input(theme)} />
                  {(is2v2 || is2v1) && (
                    <>
                      <div style={{ height: 8 }} />
                      <input value={a2} onChange={(e) => setA2(e.target.value)} style={input(theme)} placeholder="Joueur A2" />
                    </>
                  )}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={sectionTitle(primary)}>{is2v2 ? "ÉQUIPE B" : "JOUEUR B"}</div>
                  <input value={b1} onChange={(e) => setB1(e.target.value)} style={input(theme)} />
                  {is2v2 && (
                    <>
                      <div style={{ height: 8 }} />
                      <input value={b2} onChange={(e) => setB2(e.target.value)} style={input(theme)} placeholder="Joueur B2" />
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* RÈGLES / OPTIONS */}
          <div
            style={{
              background: cardBg,
              borderRadius: 18,
              padding: "16px 12px",
              marginBottom: 12,
              boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800, color: primary }}>
              Règles & format
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div>
                <div style={label}>Preset</div>
                <select value={rulesPreset} onChange={(e) => setRulesPreset(e.target.value as any)} style={select(theme)}>
                  <option value="official">Officiel</option>
                  <option value="fun">Fun</option>
                  <option value="custom">Custom</option>
                </select>
                <div style={hint}>
                  Officiel = 11 points, écart 2, service tous les 2 points (1 à la fin). Fun = plus libre.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={label}>Points par set</div>
                  <input
                    value={String(pointsPerSet)}
                    onChange={(e) => setPointsPerSet(clampInt(e.target.value, 5, 99, 11))}
                    style={input(theme)}
                    inputMode="numeric"
                  />
                </div>

                {!isTournante && (
                  <div>
                    <div style={label}>Sets gagnants</div>
                    <input
                      value={String(setsToWin)}
                      onChange={(e) => setSetsToWin(clampInt(e.target.value, 1, 9, defaultSetsToWin))}
                      style={input(theme)}
                      inputMode="numeric"
                    />
                  </div>
                )}
              </div>

              <label style={checkRow}>
                <input type="checkbox" checked={winByTwo} onChange={(e) => setWinByTwo(!!e.target.checked)} />
                <span style={{ fontWeight: 900, opacity: 0.9 }}>Écart de 2 (règle standard)</span>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={label}>Service : tous les</div>
                  <select value={String(serviceEvery)} onChange={(e) => setServiceEvery(clampInt(e.target.value, 1, 20, 2))} style={select(theme)}>
                    <option value="1">1 point</option>
                    <option value="2">2 points</option>
                    <option value="5">5 points</option>
                  </select>
                </div>
                <div>
                  <div style={label}>Fin de set (deuce)</div>
                  <select
                    value={String(deuceServiceEvery)}
                    onChange={(e) => setDeuceServiceEvery(clampInt(e.target.value, 1, 10, 1))}
                    style={select(theme)}
                  >
                    <option value="1">Service alterné (1 point)</option>
                    <option value="2">Tous les 2 points</option>
                  </select>
                </div>
              </div>

              <div>
                <div style={label}>Départ / ordre du service</div>
                <select value={serveStart} onChange={(e) => setServeStart(e.target.value as any)} style={select(theme)}>
                  <option value="manual">Choix manuel au lancement</option>
                  <option value="A">A sert en premier</option>
                  <option value="B">B sert en premier</option>
                  <option value="toss_first_point">Lancer de balle : 1er point marque le serveur</option>
                </select>
                <div style={hint}>
                  Le mode « lancer de balle » est idéal si tu fais un toss IRL : le 1er point marque qui sert.
                </div>
              </div>

              <div>
                <div style={label}>Changements de côté</div>
                <label style={checkRow}>
                  <input type="checkbox" checked={switchEndsEachSet} onChange={(e) => setSwitchEndsEachSet(!!e.target.checked)} />
                  <span style={{ fontWeight: 900, opacity: 0.9 }}>Changer de côté à chaque set</span>
                </label>

                <label style={{ ...checkRow, marginTop: 8 }}>
                  <input type="checkbox" checked={switchEndsAtFinal} onChange={(e) => setSwitchEndsAtFinal(!!e.target.checked)} />
                  <span style={{ fontWeight: 900, opacity: 0.9 }}>Set décisif : switch à mi-parcours</span>
                </label>

                {switchEndsAtFinal && (
                  <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>À</div>
                    <input
                      value={String(switchEndsAtFinalPoints)}
                      onChange={(e) => setSwitchEndsAtFinalPoints(clampInt(e.target.value, 1, 50, pointsPerSet === 21 ? 10 : 5))}
                      style={{ ...input(theme), width: 90 }}
                      inputMode="numeric"
                    />
                    <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>points</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CTA */}
          <button style={cta(theme, canStart)} onClick={onStart} disabled={!canStart}>
            Lancer la partie
          </button>
        </>
      )}

      {/* RULES MODAL (simple) */}
      {rulesOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 12,
            zIndex: 50,
          }}
          onClick={() => setRulesOpen(false)}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              borderRadius: 18,
              background: "rgba(10,12,18,0.96)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.65)",
              padding: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 1000, letterSpacing: 0.6, marginBottom: 8, color: primary }}>Règles Ping-Pong</div>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.45 }}>
              <div style={{ marginBottom: 8 }}>
                <b>Officiel (référence)</b> : 11 points, écart de 2, service tous les 2 points, puis alterné à la fin (deuce).
              </div>
              <div style={{ marginBottom: 8 }}>
                <b>Départ</b> : choisis le serveur, ou utilise « lancer de balle » (1er point = serveur).
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Note : le moteur PingPongPlay sera enrichi ensuite pour appliquer tous les paramètres (service/ends) en match.
              </div>
            </div>

            <div style={{ height: 12 }} />
            <button style={cta(theme, true)} onClick={() => setRulesOpen(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const checkRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };

const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  opacity: 0.78,
  marginBottom: 6,
};

const hint: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  opacity: 0.7,
  fontWeight: 800,
  lineHeight: 1.35,
};

const smallHint: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  opacity: 0.7,
  fontWeight: 800,
};

const sectionTitle = (primary: string): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 1000,
  letterSpacing: 1,
  color: primary,
  marginBottom: 8,
});

const input = (theme: any): React.CSSProperties => ({
  width: "100%",
  height: 44,
  borderRadius: 14,
  padding: "0 12px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.06)",
  color: theme?.colors?.text ?? "#fff",
  outline: "none",
  fontWeight: 900,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
});

const select = (theme: any): React.CSSProperties => ({
  ...input(theme),
  padding: "0 10px",
});

const cta = (theme: any, enabled: boolean): React.CSSProperties => ({
  width: "100%",
  height: 48,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.10)",
  background: enabled ? "rgba(255,200,90,0.92)" : "rgba(255,255,255,0.08)",
  color: enabled ? "#111" : (theme?.colors?.text ?? "#fff"),
  fontWeight: 1000,
  letterSpacing: 1,
  cursor: enabled ? "pointer" : "not-allowed",
  boxShadow: enabled ? "0 16px 40px rgba(0,0,0,0.55)" : "none",
});
