// @ts-nocheck
// =============================================================
// src/pages/molkky/MolkkyPlay.tsx
// Play MÖLKKY (LOCAL ONLY) — Premium (sans bots)
// ✅ UI alignée sur X01PlayV3 (carte profil header + bandeau JOUEURS ticker + modal style RulesModal + keypad bas)
// - Header ticker PNG (classic/rapide/custom) avec BackDot + InfoDot (overlay)
// - Modal règles/variantes/conditions de victoire (RulesModal)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import RulesModal from "../../components/RulesModal";

import ProfileAvatar from "../../components/ProfileAvatar";
import { loadStore } from "../../lib/storage";

import molkkySetupImg from "../../assets/molkky/pic-01.jpg";

import {
  applyTurn,
  buildSummary,
  createMolkkyState,
  isFinished,
  undo,
  type MolkkyConfig,
  type MolkkyState,
} from "./engine/molkkyEngine";

// Auto-resolve tickers
const TICKERS = import.meta.glob("../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getTicker(id: string | null | undefined) {
  if (!id) return null;
  const norm = String(id).trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  const target = `/ticker_${norm}.png`;
  const k = Object.keys(TICKERS).find((x) => x.toLowerCase().endsWith(target));
  return k ? TICKERS[k] : null;
}


/** Normalize incoming player/profile object to the minimal shape expected by molkkyEngine.
 *  IMPORTANT: molkkyEngine only persists `avatarDataUrl`, so we must map common avatar fields into it.
 */
function toMolkkyEnginePlayer(p: any) {
  const id = String(
    p?.id ?? p?.uid ?? p?.userId ?? p?.profileId ?? p?.handle ?? Math.random().toString(36).slice(2)
  );
  const name = String(p?.name ?? p?.displayName ?? p?.nickname ?? p?.handle ?? "Joueur").trim() || "Joueur";

  // ProfileAvatar across the app typically resolves from avatarDataUrl/avatarUrl/photoUrl/avatar.
  // molkkyEngine only keeps avatarDataUrl -> we map best-effort here.
  const avatarDataUrl =
    p?.avatarDataUrl ||
    p?.avatarUrl ||
    p?.photoUrl ||
    p?.avatar ||
    p?.avatarSrc ||
    null;

  return { id, name, avatarDataUrl };
}

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  onFinish?: (m: any) => void;
};

const CONTENT_MAX = 520;

export default function MolkkyPlay({ go, params, onFinish }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  const primary = (theme as any)?.colors?.accent ?? (theme as any)?.primary ?? "#6dff7c";
  const textMain = (theme as any)?.colors?.text ?? "#fff";
  const textSoft = (theme as any)?.colors?.textSoft ?? "rgba(255,255,255,0.75)";
  const borderSoft = (theme as any)?.borderSoft ?? "rgba(255,255,255,0.10)";

  const preset = String(params?.preset ?? params?.configPreset ?? "classic");

  const headerTicker =
    (preset === "fast" ? getTicker("molkky_rapide") : null) ||
    (preset === "custom" ? getTicker("molkky_custom") : null) ||
    getTicker("molkky_classic") ||
    null;

  const joueursTicker = getTicker("molkky_joueurs") || getTicker("joueurs") || null;

  const playersParam = Array.isArray(params?.players)
    ? params.players
    : Array.isArray(params?.payload?.players)
    ? params.payload.players
    : Array.isArray(params?.match?.players)
    ? params.match.players
    : [];

  const configParam: MolkkyConfig = (params?.config ?? {
    targetScore: 50,
    bounceBackTo25: true,
    eliminationOnThreeMiss: true,
  }) as any;

  const [state, setState] = React.useState<MolkkyState>(() =>
    createMolkkyState({ players: (playersParam || []).map(toMolkkyEnginePlayer), config: configParam } as any)
  );
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const [playersOpen, setPlayersOpen] = React.useState(false);

  const active = state.players[state.currentIndex];
  const canUndo = state.turns.length > 0;
  const turnIndexView = (state.turns.length || 0) + 1;

  const commitTurn = (value: number) => {
    const next = applyTurn(state, value);
    setState(next);

    if (isFinished(next)) {
      const summary = buildSummary(next);
      try {
        onFinish?.(summary);
      } catch {}
      // fallback navigation
      try {
        go("molkky_finish", { summary });
      } catch {}
    }
  };

  const doUndo = () => {
    if (!canUndo) return;
    setState(undo(state));
  };

  const onBack = () => {
    try {
      go("molkky_games");
    } catch {
      try {
        go("molkky_home");
      } catch {}
    }
  };

  return (
    <div
      className={`molkky-play theme-${theme?.id ?? "default"}`}
      style={{ overflow: "hidden", minHeight: "100dvh" }}
    >
      {/* ===================== HEADER ticker (overlay dots like existing) ===================== */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: CONTENT_MAX,
          margin: "10px auto 0",
          padding: "0 10px",
        }}
      >
        <div style={{ position: "relative" }}>
          {headerTicker ? (
            <img
              src={headerTicker}
              alt="Mölkky"
              style={{
                width: "100%",
                height: 92,
                objectFit: "cover",
                borderRadius: 18,
                border: `1px solid ${borderSoft}`,
                boxShadow: "0 10px 28px rgba(0,0,0,0.55)",
              }}
            />
          ) : (
            <div
              className="card"
              style={{
                height: 92,
                borderRadius: 18,
                border: `1px solid ${borderSoft}`,
                background: "rgba(0,0,0,0.25)",
              }}
            />
          )}

          {/* overlay dots on ticker */}
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", zIndex: 3 }}>
            <BackDot onClick={onBack} size={36} />
          </div>
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", zIndex: 3 }}>
            <InfoDot onClick={() => setRulesOpen(true)} size={36} />
          </div>

          {/* NOTE: pas d'overlay ici (sinon on voit un "bloc" gris par-dessus le ticker) */}
        </div>
      </div>

      {/* ===================== CONTENT ===================== */}
      <div
        style={{
          width: "100%",
          maxWidth: CONTENT_MAX,
          margin: "10px auto 0",
          padding: "0 10px",
          display: "flex",
          flexDirection: "column",
          // NOTE: gap fixed here (no dynamic scaling at page level)
          // Scaling is handled inside the header blocks to prevent overflow.
          gap: 10,
          minHeight: 0,
        }}
      >
        {/* 1) CARTE PROFIL HEADER (copie esprit HeaderBlock X01PlayV3) */}
        <MolkkyHeaderBlock
          theme={theme}
          primary={primary}
          player={active}
          players={state.players}
          turns={state.turns}
          turnIndex={turnIndexView}
          target={state.config?.targetScore ?? 50}
          missMax={3}
        />

        {/* 2) BANDEAU JOUEURS (ticker background like X01 GameplayLayout) */}
        <PlayersRow
          theme={theme}
          primary={primary}
          bannerImage={joueursTicker}
          count={Array.isArray(state.players) ? state.players.length : 0}
          players={state.players}
          currentId={active?.id}
          onOpen={() => setPlayersOpen(true)}
        />

        {/* 3) Spacer fill (liste / historique futur) */}
        <div style={{ flex: 1, minHeight: 0 }} />

        {/* 4) DOCK BAS: KEYPAD */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            zIndex: 50,
            paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          }}
        >
          <div
            className="card"
            style={{
              borderRadius: 22,
              border: `1px solid ${borderSoft}`,
              background: "rgba(10,12,18,0.78)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
              padding: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontWeight: 950,
                letterSpacing: 1,
                color: "rgba(255,255,255,0.88)",
                marginBottom: 10,
              }}
            >
              {t?.("common.scoreInput", "SAISIE SCORE") ?? "SAISIE SCORE"}
            </div>

            <MolkkyKeypad onPick={commitTurn} onMiss={() => commitTurn(0)} onUndo={doUndo} canUndo={canUndo} />
          </div>
        </div>
      </div>

      {/* ===================== MODALS (RulesModal style like X01) ===================== */}
      <RulesModal
        open={playersOpen}
        onClose={() => setPlayersOpen(false)}
        hideClose
        topRight={
          <span style={{ fontWeight: 1000, letterSpacing: 0.2, color: primary, textShadow: `0 0 14px ${primary}66` }}>
            Tour : {turnIndexView}
          </span>
        }
        title={
          <span style={{ fontWeight: 1000, letterSpacing: 0.2, color: primary, textShadow: `0 0 14px ${primary}66` }}>
            Joueurs
          </span>
        }
      >
        <div style={{ padding: 6, position: "relative" }}>
          <PlayersList
            theme={theme}
            primary={primary}
            players={state.players}
            currentId={active?.id}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}>
          <button
            type="button"
            onClick={() => setPlayersOpen(false)}
            className="btn"
            style={{
              minWidth: 160,
              borderRadius: 999,
              padding: "10px 14px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(255,255,255,0.92)",
              fontWeight: 1000,
              boxShadow: "0 10px 28px rgba(0,0,0,.35)",
            }}
          >
            Fermer
          </button>
        </div>
      </RulesModal>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} title="Règles">
        <div style={{ padding: 8 }}>
          <RulesContent theme={theme} primary={primary} config={state.config} />
        </div>
      </RulesModal>
    </div>
  );
}

// ===================== Avatar resolver (EXACT same priority as ProfileAvatar) =====================
// We must resolve "lite" profiles (id/name only) the same way ProfileAvatar does, otherwise the
// watermark background can be empty while the circular avatar resolves fine.
function normalizeImport(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") {
    const s = v.trim();
    return s ? s : null;
  }
  if (typeof v === "object") {
    const d = (v as any).default;
    if (typeof d === "string") {
      const s = d.trim();
      return s ? s : null;
    }
  }
  return null;
}

function normalizeSrc(raw: any): string | null {
  const s = normalizeImport(raw);
  if (!s) return null;

  if (s.startsWith("data:") || s.startsWith("blob:")) return s;

  if (s.startsWith("http://") || s.startsWith("https://")) return s.replace(/ /g, "%20");

  if (s.startsWith("/assets/")) return s.replace(/ /g, "%20");

  if (s.startsWith("./") || s.startsWith("../")) return s.replace(/ /g, "%20");
  if (/\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(s)) return s.replace(/ /g, "%20");

  return null;
}

function withCacheBust(src: string, salt: string) {
  if (!src) return src;
  if (/^data:|^blob:/i.test(src)) return src;
  const hasQ = src.includes("?");
  return `${src}${hasQ ? "&" : "?"}v=${encodeURIComponent(salt)}`;
}

function isLiteProfileLikeProfileAvatar(p: any): boolean {
  if (!p?.id) return false;
  const hasAny =
    (normalizeImport(p?.avatarUrl) || "") ||
    (normalizeImport(p?.avatarPath) || "") ||
    (normalizeImport(p?.avatarDataUrl) || "") ||
    (normalizeImport(p?.avatar) || "") ||
    (normalizeImport(p?.photoDataUrl) || "") ||
    (normalizeImport(p?.photoUrl) || "");
  return !hasAny;
}

function pickAvatarRawLikeProfileAvatar(p: any): any {
  if (!p) return null;
  // Same order as ProfileAvatar.tsx (propDataUrl excluded here)
  const avatarUrl = normalizeImport(p?.avatarUrl) ?? "";
  const avatarPath = normalizeImport(p?.avatarPath) ?? "";
  const avatarDataUrl = normalizeImport(p?.avatarDataUrl) ?? "";
  const legacy =
    normalizeImport(p?.avatar) ||
    normalizeImport(p?.photoDataUrl) ||
    normalizeImport(p?.photoUrl) ||
    "";

  return avatarUrl || avatarPath || avatarDataUrl || legacy || null;
}

async function resolveFullProfileFromStore(profileId: string): Promise<any | null> {
  try {
    const store = await loadStore<any>();
    const arr: any[] = Array.isArray(store?.profiles) ? store.profiles : [];
    const found = arr.find((x: any) => String(x?.id || "") === String(profileId));
    return found || null;
  } catch {
    return null;
  }
}

function resolveWatermarkImgSrc(profile: any): string | null {
  const raw = pickAvatarRawLikeProfileAvatar(profile);
  const normalized = normalizeSrc(raw);
  if (!normalized) return null;

  const salt =
    (profile && typeof profile?.avatarUpdatedAt === "number" && String(profile.avatarUpdatedAt)) ||
    (typeof raw === "string" ? String(raw).slice(-24) : "") ||
    String(Date.now());

  return withCacheBust(normalized, salt);
}

/* ===================== UI blocks (aligned with X01PlayV3) ===================== */

function MolkkyHeaderBlock({ theme, primary, player, players, turns, turnIndex, target, missMax }: any) {
  const textMain = theme?.colors?.text ?? "#fff";
  const textSoft = theme?.colors?.textSoft ?? "rgba(255,255,255,0.74)";

  // ✅ MODIF: même police pour SCORE / valeur / nom du joueur
  const scoreFontFamily =
    theme?.fonts?.score ||
    theme?.fonts?.display ||
    theme?.fonts?.title ||
    theme?.fontScore ||
    theme?.fontTitle ||
    theme?.fontFamily ||
    "inherit";

  // ✅ Auto-scale interne (sans transform: scale) : on réduit proportionnellement toutes les tailles
  // pour que le header (dont le MiniClassement) ne puisse jamais déborder, même sur petits écrans.
  const boxRef = React.useRef<any>(null);
  const [k, setK] = React.useState(1);

  React.useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || typeof (window as any) === "undefined") return;

    const base = 380; // largeur "design" de référence pour ce header
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

    const compute = (w: number) => {
      const kk = clamp(w / base, 0.78, 1);
      setK(kk);
    };

    // 1er calcul
    try {
      const r = el.getBoundingClientRect();
      compute(r.width || base);
    } catch {}

    // ResizeObserver si dispo
    const RO = (window as any).ResizeObserver;
    if (typeof RO !== "function") return;

    const ro = new RO((entries: any[]) => {
      const w = entries?.[0]?.contentRect?.width;
      if (typeof w === "number" && w > 0) compute(w);
    });

    ro.observe(el);
    return () => {
      try { ro.disconnect(); } catch {}
    };
  }, []);

  const AV = Math.max(56, Math.round(78 * k));
  const MINI = Math.max(132, Math.round(176 * k));
  const GAP = Math.max(8, Math.round(12 * k));
  const scoreLabel = Math.max(10, Math.round(12 * k));
  const scoreValue = Math.max(30, Math.round(44 * k));
  const nameSize = Math.max(14, Math.round(18 * k));

  // ✅ EXACT behavior: if profile is "lite" (id/name only), ProfileAvatar auto-resolves it from store.
  // For the watermark, we must do the same resolution, otherwise bg stays empty.
  const [wmProfile, setWmProfile] = React.useState<any | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const run = async () => {
      const p = player || null;
      const id = p?.id ? String(p.id) : "";
      if (!id) {
        if (mounted) setWmProfile(null);
        return;
      }

      if (!isLiteProfileLikeProfileAvatar(p)) {
        if (mounted) setWmProfile(null);
        return;
      }

      const full = await resolveFullProfileFromStore(id);
      if (!mounted) return;

      if (full) {
        setWmProfile({
          ...full,
          ...p,
          avatarUrl: normalizeImport(p?.avatarUrl) ? p?.avatarUrl : full?.avatarUrl,
          avatarPath: normalizeImport(p?.avatarPath) ? p?.avatarPath : full?.avatarPath,
          avatarDataUrl: normalizeImport(p?.avatarDataUrl) ? p?.avatarDataUrl : full?.avatarDataUrl,
          name: p?.name ?? full?.name,
          stats: p?.stats ?? full?.stats ?? null,
        });
      } else {
        setWmProfile(null);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [player?.id, player?.avatarUrl, player?.avatarPath, player?.avatarDataUrl]);

  const effectiveProfile = wmProfile ?? player ?? null;
  const bgAvatarUrl = resolveWatermarkImgSrc(effectiveProfile);

  const score = Number(player?.score ?? 0);
  const pid = player?.id;
  const st = computeMolkkyStats({ turns, target }, pid);
  const miniCard = {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    padding: 10,
    boxShadow: "0 14px 30px rgba(0,0,0,.35)",
  } as React.CSSProperties;

  return (
    <div
      ref={boxRef}
      style={{
        background:
          "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.8))",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
        padding: 7,
        boxShadow: "0 8px 26px rgba(0,0,0,.35)",
        position: "relative",
        overflow: "hidden",
      }}
    >
{bgAvatarUrl ? (
        <img
          src={bgAvatarUrl}
          aria-hidden
          style={{
            position: "absolute",
            top: "44%",
            left: "72%",
            transform: "translate(-50%, -50%)",
            height: "200%",
            width: "auto",
            WebkitMaskImage:
              "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,1) 62%, rgba(0,0,0,1) 100%)",
            maskImage:
              "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 18%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,1) 62%, rgba(0,0,0,1) 100%)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
            opacity: 0.14,
            filter:
              "saturate(1.25) contrast(1.10) brightness(1.06) drop-shadow(-10px 0 26px rgba(0,0,0,.55))",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
          }}
        />
      ) : null}

      {/* Dégradé côté gauche (fondre le watermark comme X01PlayV3) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(10,10,12,.98) 0%, rgba(10,10,12,.92) 28%, rgba(10,10,12,.55) 54%, rgba(10,10,12,0) 78%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: GAP,
          alignItems: "start",
          position: "relative",
          zIndex: 2,
          maxWidth: "100%",
          minWidth: 0,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Left: avatar + mini stats (style GolfPlay) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div
            style={{
              width: AV,
              height: AV,
              borderRadius: "50%",
              overflow: "hidden",
              background: "linear-gradient(180deg,#1b1b1f,#111114)",
              boxShadow: "0 6px 22px rgba(0,0,0,.35)",
            }}
          >
            <ProfileAvatar size={AV} profile={player} />
          </div>

          {/* ✅ Mini stats Mölkky — blocs néon */}
          <div style={{ ...miniCard, width: MINI, maxWidth: MINI, boxSizing: "border-box", padding: 8 }}>
            {/* ✅ Plus compact: 3 par ligne (2 lignes) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              <NeonStat label="Lancers" value={st.throws} tone="cyan" k={k} />
              <NeonStat label="MISS" value={st.miss} tone="red" k={k} />
              <NeonStat label="Hits" value={st.hits} tone="green" k={k} />
              <NeonStat label="Moy." value={st.avg} tone="amber" k={k} />
              <NeonStat label="Best" value={st.best} tone="purple" k={k} />
              <NeonStat label="Reste" value={st.remaining} tone={st.remaining === 0 ? "green" : "blue"} k={k} />
            </div>
          </div>
        </div>

        {/* Right: score + name + classement */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            {/* SCORE centré au-dessus du classement */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: scoreFontFamily, fontWeight: 1000, fontSize: 12, letterSpacing: 1, color: "rgba(255,255,255,0.70)" }}>
                SCORE
              </div>
              <div
                style={{
                  fontFamily: scoreFontFamily,
                  fontWeight: 1100,
                  fontSize: scoreValue,
                  lineHeight: 0.95,
                  color: primary,
                  textShadow: `0 0 16px ${primary}88, 0 0 40px ${primary}33`,
                  marginTop: Math.round(4 * k),
                }}
              >
                {score}
              </div>
              <div
                style={{
                  fontFamily: scoreFontFamily,
                  marginTop: Math.round(6 * k),
                  fontWeight: 1100,
                  fontSize: nameSize,
                  lineHeight: 1.05,
                  color: primary,
                  textShadow: `0 0 14px ${primary}55`,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {player?.name ?? "—"}
              </div>
            </div>

            {/* Mini classement (largeur équivalente au mini stats) */}
            <div style={{ ...miniCard, width: MINI, maxWidth: MINI, boxSizing: "border-box", marginLeft: "auto" }}>
              <MiniClassement primary={primary} players={players} currentId={pid} k={k} />
            </div>

            {/* ✅ Meta supprimée (Tour/Cible/Lancers/Miss) — affiché uniquement dans la modal Joueurs */}
          </div>

          {player?.eliminated ? (
            <div
              style={{
                marginTop: 8,
                padding: "6px 10px",
                borderRadius: rowRadius,
                background: "rgba(255,70,70,0.10)",
                border: "1px solid rgba(255,70,70,0.25)",
                color: "rgba(255,200,200,0.95)",
                fontWeight: 900,
                fontSize: 12,
                letterSpacing: 0.4,
              }}
            >
              Éliminé
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function NeonStat({ label, value, tone, k = 1 }: any) {
  const map: Record<string, any> = {
    cyan: { b: "rgba(120,255,220,0.35)", bg: "rgba(40,120,90,0.22)", c: "#b9ffe9", sh: "rgba(120,255,220,0.16)" },
    green: { b: "rgba(70,255,120,0.35)", bg: "rgba(40,120,50,0.22)", c: "#b6ffc8", sh: "rgba(70,255,120,0.14)" },
    red: { b: "rgba(255,120,120,0.35)", bg: "rgba(120,40,40,0.22)", c: "#ffb2b2", sh: "rgba(255,120,120,0.14)" },
    amber: { b: "rgba(255,195,26,0.35)", bg: "rgba(255,195,26,0.16)", c: "#ffcf57", sh: "rgba(255,195,26,0.14)" },
    blue: { b: "rgba(70,160,255,0.45)", bg: "rgba(20,85,185,0.22)", c: "#bfeaff", sh: "rgba(70,160,255,0.16)" },
    purple: { b: "rgba(170,120,255,0.35)", bg: "rgba(120,70,185,0.18)", c: "#e1ccff", sh: "rgba(170,120,255,0.14)" },
  };
  const t = map[tone] || map.blue;
  const padY = Math.max(4, Math.round(5 * k));
  const labelSize = Math.max(9, Math.round(10 * k));
  const valueSize = Math.max(11, Math.round(13 * k));

  return (
    <div
      style={{
        borderRadius: 10,
        padding: `${padY}px 0`,
        textAlign: "center",
        border: `1px solid ${t.b}`,
        background: t.bg,
        boxShadow: `0 0 18px ${t.sh}`,
        fontWeight: 1000,
      }}
    >
      <div style={{ fontSize: labelSize, opacity: 0.92, color: t.c, lineHeight: 1.05 }}>{label}</div>
      <div style={{ fontSize: valueSize, color: t.c, lineHeight: 1.05 }}>{String(value ?? "—")}</div>
    </div>
  );
}

function MiniClassement({ primary, players, currentId, k = 1 }: any) {
  const list = Array.isArray(players) ? players.slice() : [];
  list.sort((a: any, b: any) => Number(b?.score ?? 0) - Number(a?.score ?? 0));
  const top = list.slice(0, 3);
  const rowPadY = Math.max(4, Math.round(6 * k));
  const rowPadX = Math.max(6, Math.round(8 * k));
  const rowRadius = Math.max(10, Math.round(12 * k));
  const nameFont = Math.max(11, Math.round(13 * k));
  const scoreFont = Math.max(11, Math.round(13 * k));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {top.map((p: any, i: number) => {
        const isMe = p?.id === currentId;
        return (
          <div
            key={p?.id ?? i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: `${rowPadY}px ${rowPadX}px`,
              borderRadius: 12,
              border: isMe ? `1px solid ${primary}66` : "1px solid rgba(255,255,255,0.08)",
              background: isMe ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.12)",
              boxShadow: isMe ? `0 0 16px ${primary}22` : "none",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontWeight: 1000,
                fontSize: nameFont,
                color: isMe ? primary : "rgba(255,255,255,0.92)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              {`${i + 1}. ${p?.name ?? "—"}`}
            </div>
            <div style={{ fontWeight: 1100, fontSize: scoreFont, color: primary, textShadow: `0 0 14px ${primary}55` }}>
              {Number(p?.score ?? 0)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function computeMolkkyStats({ turns, target }: any, playerId: string) {
  const t = Array.isArray(turns) ? turns : [];
  const mine = playerId ? t.filter((x: any) => x?.playerId === playerId) : [];
  const values = mine.map((x: any) => Number(x?.value ?? 0));
  const throws = values.length;
  const miss = values.filter((v: number) => v === 0).length;
  const hits = throws - miss;
  const sum = values.reduce((a: number, b: number) => a + (Number.isFinite(b) ? b : 0), 0);
  const avg = throws > 0 ? (sum / throws).toFixed(1) : "0.0";
  const best = values.length ? Math.max(...values) : 0;
  // remaining is based on current score, but if we don't have it we estimate from last afterScore
  const last = mine[mine.length - 1];
  const currentScore = Number.isFinite(Number(last?.afterScore)) ? Number(last?.afterScore) : sum;
  const remaining = Math.max(0, Number(target ?? 50) - currentScore);
  return { throws, miss, hits, avg, best, remaining };
}

function PlayersRow({ theme, primary, bannerImage, count, players, currentId, onOpen }: any) {
  // ✅ Rendu EXACT "carte JOUEURS" comme KillerPlay (cover + header gradient + preview blur)
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        marginTop: 10,
        width: "100%",
        borderRadius: 18,
        border: `1px solid ${theme?.borderSoft ?? "rgba(255,255,255,.10)"}`,
        padding: 0,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left",
        backgroundImage: bannerImage ? `url(${bannerImage})` : undefined,
        backgroundBlendMode: "screen",
        backgroundColor: "rgba(0,0,0,.18)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: "0 14px 34px rgba(0,0,0,.45)",
        position: "relative",
      }}
      title="Liste des joueurs"
    >
      {/* ✅ Effet "cinéma" (vignette haut/bas) comme certains modes */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 36%, rgba(0,0,0,0) 64%, rgba(0,0,0,.60) 100%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          background:
            "linear-gradient(90deg, rgba(0,0,0,.45), rgba(0,0,0,.14) 55%, rgba(0,0,0,.35))",
          borderBottom: "1px solid rgba(255,255,255,.10)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontWeight: 1000,
            letterSpacing: 1.2,
            color: primary,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            textShadow: `0 0 14px ${primary}55`,
          }}
        >
          JOUEURS
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: `2px solid ${primary}bb`,
              color: primary,
              background: "rgba(0,0,0,0.25)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 1000,
              boxShadow: `0 0 14px ${primary}55`,
            }}
          >
            {count}
          </span>
          <span style={{ opacity: 0.75, fontWeight: 900, fontSize: 16, transform: "translateY(-1px)" }}>▾</span>
        </div>
      </div>

      {/* mini preview compact: avatars only, in play order (comme KillerPlay) */}
      <div
        style={{
          padding: 10,
          background: "rgba(0,0,0,.32)",
          backdropFilter: "blur(2px)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 2,
          }}
        >
          {(Array.isArray(players) ? players : []).map((p: any) => {
            const isMe = p?.id === currentId;
            return (
              <div key={p?.id} style={{ flex: "0 0 auto", opacity: p?.eliminated ? 0.45 : 1 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    overflow: "hidden",
                    border: isMe ? `2px solid ${primary}` : "1px solid rgba(255,255,255,0.20)",
                    boxShadow: isMe ? `0 0 16px ${primary}33` : "0 10px 20px rgba(0,0,0,.25)",
                    background: "rgba(0,0,0,.25)",
                  }}
                >
                  <ProfileAvatar size={48} profile={p} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </button>
  );
}

function PlayersList({ theme, primary, players, currentId }: any) {
  const textSoft = theme?.colors?.textSoft ?? "rgba(255,255,255,0.72)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {players.map((p: any, idx: number) => {
        const isActive = p?.id === currentId;
        const border = isActive ? `2px solid ${primary}` : "1px solid rgba(255,255,255,0.10)";
        return (
          <div
            key={p?.id ?? idx}
            style={{
              borderRadius: 16,
              border,
              background: "rgba(0,0,0,0.22)",
              padding: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              boxShadow: isActive ? `0 0 18px ${primary}33` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: 999, overflow: "hidden", flexShrink: 0 }}>
                <ProfileAvatar size={44} profile={p} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 1000,
                    color: "#fff",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 220,
                  }}
                >
                  {p?.name ?? "—"}
                </div>
                <div style={{ fontWeight: 800, fontSize: 12, color: textSoft, marginTop: 2 }}>
                  {`Lancers: ${p?.throws ?? 0} • MISS: ${p?.consecutiveMisses ?? 0}`}
                </div>
              </div>
            </div>

            <div style={{ fontWeight: 1100, color: primary, textShadow: `0 0 14px ${primary}66` }}>
              {Number(p?.score ?? 0)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MolkkyKeypad({ onPick, onMiss, onUndo, canUndo }: any) {
  const nums = [1,2,3,4,5,6,7,8,9,10,11,12];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {nums.map((n) => (
          <button
            key={n}
            className="btn"
            onClick={() => onPick(n)}
            style={{
              height: 54,
              borderRadius: 14,
              fontWeight: 1000,
              fontSize: 16,
              background: "rgba(0,0,0,0.24)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button
          className="btn"
          onClick={onMiss}
          style={{
            height: 54,
            borderRadius: 14,
            fontWeight: 1000,
            letterSpacing: 0.6,
            background: "rgba(160,35,45,0.30)",
            border: "1px solid rgba(255,100,100,0.18)",
          }}
        >
          MISS
        </button>

        <button
          className="btn"
          onClick={onUndo}
          disabled={!canUndo}
          style={{
            height: 54,
            borderRadius: 14,
            fontWeight: 1000,
            letterSpacing: 0.6,
            opacity: canUndo ? 1 : 0.5,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          UNDO
        </button>
      </div>
    </div>
  );
}

function RulesContent({ theme, primary, config }: any) {
  const textSoft = theme?.colors?.textSoft ?? "rgba(255,255,255,0.78)";
  const itemStyle: React.CSSProperties = {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    padding: "10px 12px",
    marginBottom: 10,
  };

  const target = config?.targetScore ?? 50;
  const bounce = config?.bounceBackTo25 ?? true;
  const elim3 = config?.eliminationOnThreeMiss ?? true;

  return (
    <div>
      <div style={itemStyle}>
        <div style={{ fontWeight: 1000, color: "#fff" }}>Objectif</div>
        <div style={{ marginTop: 6, color: textSoft, fontWeight: 800 }}>
          Être le premier à atteindre <span style={{ color: primary, fontWeight: 1000 }}>{target}</span> points{" "}
          <span style={{ opacity: 0.9 }}>(exactement)</span>.
        </div>
      </div>

      <div style={itemStyle}>
        <div style={{ fontWeight: 1000, color: "#fff" }}>Mise en place</div>
        <div style={{ marginTop: 6, color: textSoft, fontWeight: 800, lineHeight: 1.35 }}>
          Place les 12 quilles en paquet (numéros face aux joueurs) à environ <b>3,5 m</b> de la ligne de lancer.
          Après chaque lancer, <b>les quilles tombées</b> sont replacées <b>là où elles se sont arrêtées</b>.
        </div>

        <div style={{ marginTop: 10, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" }}>
          <img
            src={molkkySetupImg}
            alt="Schéma de placement initial des quilles"
            style={{ display: "block", width: "100%", height: "auto", opacity: 0.92 }}
          />
        </div>
      </div>

      <div style={itemStyle}>
        <div style={{ fontWeight: 1000, color: "#fff" }}>Comptage des points</div>
        <div style={{ marginTop: 6, color: textSoft, fontWeight: 800, lineHeight: 1.35 }}>
          <div>• <b>1 seule quille</b> tombe → tu marques <b>la valeur</b> indiquée sur cette quille.</div>
          <div style={{ marginTop: 6 }}>• <b>Plusieurs quilles</b> tombent → tu marques <b>1 point par quille</b> (donc le nombre de quilles tombées).</div>
          <div style={{ marginTop: 6, opacity: 0.9 }}>Seules les quilles <b>totalement renversées</b> comptent.</div>
        </div>
      </div>

      <div style={itemStyle}>
        <div style={{ fontWeight: 1000, color: "#fff" }}>Dépassement</div>
        <div style={{ marginTop: 6, color: textSoft, fontWeight: 800, lineHeight: 1.35 }}>
          {bounce ? (
            <>
              Si tu dépasses <b>{target}</b>, ton score retombe à <b>25</b> et tu continues à jouer.
            </>
          ) : (
            <>Variante : si tu dépasses la cible, tu restes au score obtenu.</>
          )}
        </div>
      </div>

      <div style={itemStyle}>
        <div style={{ fontWeight: 1000, color: "#fff" }}>MISS</div>
        <div style={{ marginTop: 6, color: textSoft, fontWeight: 800, lineHeight: 1.35 }}>
          {elim3 ? (
            <>3 tours d’affilée sans marquer (aucune quille renversée) = <b>élimination</b>.</>
          ) : (
            <>Variante : les MISS n’éliminent pas.</>
          )}
        </div>
      </div>
    </div>
  );
}

