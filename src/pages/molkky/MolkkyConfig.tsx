// @ts-nocheck
// =============================================================
// src/pages/molkky/MolkkyConfig.tsx
// Config MÖLKKY — UI calquée sur X01ConfigV3 (Darts)
// - Header ticker plein écran (dots overlay) + modal règles
// - Sections en "cards" + chips/toggles style X01
// - 2 à 6 profils locaux (pas de bots)
// - Lance MolkkyPlay via go("molkky_play", { players, config })
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileMedallionCarousel from "../../components/ProfileMedallionCarousel";

import type { Store, Profile } from "../../lib/types";
import type { MolkkyConfig as MolkkyEngineConfig } from "./engine/molkkyEngine";

// Auto-resolve tickers
const TICKERS = import.meta.glob("../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getTicker(id: string | null | undefined) {
  if (!id) return null;
  const norm = String(id)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  const target = `/ticker_${norm}.png`;
  const k = Object.keys(TICKERS).find((x) => x.toLowerCase().endsWith(target));
  return k ? TICKERS[k] : null;
}

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  store?: Store | any;
};

export default function MolkkyConfig({ go, store, params }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  const primary = theme?.colors?.accent ?? theme?.primary ?? "#6dff7c";
  const textMain = theme?.colors?.text ?? "#fff";
  const textSoft = theme?.colors?.textSoft ?? "rgba(255,255,255,0.75)";

  const preset = String(params?.preset ?? "classic");

  const headerTicker =
    (preset === "fast" ? getTicker("molkky_rapide") : null) ||
    (preset === "custom" ? getTicker("molkky_custom") : null) ||
    getTicker("molkky_classic") ||
    getTicker("molkky_games") ||
    null;

  const profiles: Profile[] = Array.isArray(store?.profiles) ? (store.profiles as any) : [];

    const medallions = React.useMemo(
    () =>
      (profiles || [])
        .filter((p: any) => !(p as any)?.isBot) // pas de bots sur Mölkkky
        .map((p: any) => ({
          id: p.id,
          name: p.nickname || p.displayName || p.name || "Profil",
          profile: p, // REQUIRED by <ProfileAvatar />
        })),
    [profiles]
  );

  const defaultTarget =
    preset === "fast" ? 30 : 50;

  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    Array.isArray(params?.selectedIds) && params.selectedIds.length ? params.selectedIds : []
  );

  const [targetScore, setTargetScore] = React.useState<number>(
    Number(params?.config?.targetScore ?? defaultTarget) || defaultTarget
  );
  const [bounceBackTo25, setBounceBackTo25] = React.useState<boolean>(
    Boolean(params?.config?.bounceBackTo25 ?? true)
  );
  const [eliminationOnThreeMiss, setEliminationOnThreeMiss] = React.useState<boolean>(
    Boolean(params?.config?.eliminationOnThreeMiss ?? true)
  );

  const [rulesOpen, setRulesOpen] = React.useState(false);

  // Presets (appliquent valeurs par défaut sans toucher aux joueurs)
  React.useEffect(() => {
    if (preset === "fast") {
      setTargetScore((v) => (v ? v : 30));
    }
    if (preset === "classic") {
      setTargetScore((v) => (v ? v : 50));
    }
  }, [preset]);

  const players = React.useMemo(() => {
    const set = new Set(selectedIds);
    return medallions.filter((m) => set.has(m.id));
  }, [selectedIds, medallions]);

  const canStart = players.length >= 2 && players.length <= 6;

  const cfg: MolkkyEngineConfig = React.useMemo(
    () => ({
      targetScore: Number(targetScore || 50),
      bounceBackTo25: !!bounceBackTo25,
      eliminationOnThreeMiss: !!eliminationOnThreeMiss,
    }),
    [targetScore, bounceBackTo25, eliminationOnThreeMiss]
  );

  const start = () => {
    if (!canStart) return;
    go("molkky_play", {
      preset,
      players: players.map((p) => ({ id: p.id, name: p.name, avatarDataUrl: p.avatarDataUrl ?? null })),
      config: cfg,
    });
  };

  return (
    <div
      className="screen molkky-config-screen"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "12px 12px 92px",
        background: "radial-gradient(circle at top, #15192c 0, #05060c 50%, #020308 100%)",
        color: textMain,
      }}
    >
      {/* HEADER (calque X01) */}
      <header style={{ marginBottom: 10, marginLeft: -12, marginRight: -12 }}>
        {(() => {
          const DOT_SIZE = 36;
          const DOT_GLOW = `${primary}88`;
          return (
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
                  alt="Mölkky"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                  draggable={false}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 92,
                    background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.35))",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
              )}

              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                <BackDot
                  onClick={() => go("molkky_menu")}
                  title={t?.("common.back", "Retour") ?? "Retour"}
                  size={DOT_SIZE}
                  color={primary}
                  glow={DOT_GLOW}
                />
              </div>

              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
                <InfoDot
                  onClick={() => setRulesOpen(true)}
                  title={t?.("common.rules", "Règles") ?? "Règles"}
                  size={DOT_SIZE}
                  color={primary}
                  glow={DOT_GLOW}
                />
              </div>
            </div>
          );
        })()}
      </header>

      {/* SECTION: Joueurs */}
      <div style={card(theme)}>
        <div style={cardTitleRow}>
          <div style={cardTitle(primary)}>{t?.("common.players", "Joueurs") ?? "JOUEURS"}</div>
          <div style={{ color: textSoft, fontWeight: 800, fontSize: 12 }}>
            {players.length}/6
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <ProfileMedallionCarousel
            items={medallions as any}
            selectedIds={selectedIds}
            onToggle={(id: string) => {
              setSelectedIds((prev) => {
                const set = new Set(prev);
                if (set.has(id)) set.delete(id);
                else {
                  if (set.size >= 6) return prev; // hard cap
                  set.add(id);
                }
                return Array.from(set);
              });
            }}          />
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: textSoft, fontWeight: 750 }}>
          {t?.("molkky.config.playersHint", "Sélectionne 2 à 6 joueurs (pas de bots).") ??
            "Sélectionne 2 à 6 joueurs (pas de bots)."}
        </div>
      </div>

      {/* SECTION: Objectif */}
      <div style={card(theme)}>
        <div style={cardTitleRow}>
          <div style={cardTitle(primary)}>{t?.("molkky.config.goal", "Objectif") ?? "OBJECTIF"}</div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {[30, 40, 50, 60, 70].map((v) => (
            <ChipButton
              key={v}
              label={`${v}`}
              active={targetScore === v}
              onClick={() => setTargetScore(v)}
              color={primary}
            />
          ))}
          <div style={{ flex: "1 1 120px", minWidth: 120 }} />
          <input
            type="number"
            value={targetScore}
            onChange={(e) => setTargetScore(Number(e.target.value || 0))}
            style={numInput(theme)}
            min={10}
            max={200}
          />
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: textSoft, fontWeight: 750 }}>
          {t?.(
            "molkky.config.goalHint",
            "Le score doit être atteint EXACTEMENT. Si tu dépasses, option retour à 25."
          ) ??
            "Le score doit être atteint EXACTEMENT. Si tu dépasses, option retour à 25."}
        </div>
      </div>

      {/* SECTION: Options */}
      <div style={card(theme)}>
        <div style={cardTitleRow}>
          <div style={cardTitle(primary)}>{t?.("common.options", "Options") ?? "OPTIONS"}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          <ToggleRow
            label={t?.("molkky.config.bounceBack", "Dépassement → retour à 25") ?? "Dépassement → retour à 25"}
            value={bounceBackTo25}
            onChange={setBounceBackTo25}
            color={primary}
          />
          <ToggleRow
            label={t?.("molkky.config.elim3miss", "Élimination après 3 MISS") ?? "Élimination après 3 MISS"}
            value={eliminationOnThreeMiss}
            onChange={setEliminationOnThreeMiss}
            color={primary}
          />
        </div>
      </div>

      {/* CTA sticky bottom (calque X01) */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 62, // au-dessus de la bottom bar
          padding: "10px 12px",
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(8,10,16,0.72)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
            padding: 10,
          }}
        >
          <button
            type="button"
            onClick={start}
            disabled={!canStart}
            style={cta(primary, canStart)}
          >
            {t?.("common.start", "Lancer la partie") ?? "LANCER LA PARTIE"}
          </button>
        </div>
      </div>

      {/* MODAL RÈGLES (style X01: overlay) */}
      {rulesOpen && (
        <div
          onClick={() => setRulesOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(14,16,26,0.92)",
              boxShadow: "0 22px 70px rgba(0,0,0,0.7)",
              padding: 16,
              color: textMain,
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 18, letterSpacing: 1, marginBottom: 10 }}>
              MÖLKKY — RÈGLES
            </div>

            <div style={{ whiteSpace: "pre-wrap", color: textSoft, fontWeight: 750, lineHeight: 1.35, fontSize: 13 }}>
              {[
                "• 1 quille tombée : points = numéro de la quille",
                "• Plusieurs quilles : points = nombre de quilles",
                "• Objectif : atteindre la cible EXACTEMENT",
                "• Si dépassement : retour à 25 (option)",
                "• 3 MISS consécutifs : élimination (option)",
              ].join("\n")}
            </div>

            <div style={{ height: 12 }} />

            <button
              type="button"
              onClick={() => setRulesOpen(false)}
              style={{
                width: "100%",
                borderRadius: 14,
                padding: "12px 12px",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: textMain,
                fontWeight: 950,
                letterSpacing: 1,
                cursor: "pointer",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- UI helpers (style X01) ---------- */

function ChipButton({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  color: string;
}) {
  const border = active ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.12)";
  const bg = active ? `${color}22` : "rgba(40,42,60,0.55)";
  const text = active ? color : "rgba(255,255,255,0.85)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "8px 12px",
        border,
        background: bg,
        color: text,
        fontSize: 12,
        fontWeight: active ? 900 : 800,
        letterSpacing: 0.5,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 10px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 13, color: "rgba(255,255,255,0.88)" }}>{label}</div>

      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          borderRadius: 999,
          padding: "8px 12px",
          minWidth: 78,
          border: value ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.12)",
          background: value ? `${color}22` : "rgba(40,42,60,0.55)",
          color: value ? color : "rgba(255,255,255,0.78)",
          fontWeight: 950,
          letterSpacing: 0.5,
          cursor: "pointer",
        }}
      >
        {value ? "ON" : "OFF"}
      </button>
    </div>
  );
}

const card = (theme: any) => ({
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(10,12,18,0.72)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
  padding: 12,
  marginBottom: 12,
});

const cardTitleRow: any = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const cardTitle = (primary: string) => ({
  fontWeight: 1100,
  letterSpacing: 1.2,
  fontSize: 13,
  color: primary,
  textTransform: "uppercase",
});

const numInput = (theme: any) => ({
  height: 38,
  padding: "0 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.28)",
  color: theme?.colors?.text ?? "#fff",
  outline: "none",
  fontWeight: 900,
  width: 92,
});

const cta = (primary: string, enabled: boolean) => ({
  width: "100%",
  borderRadius: 16,
  padding: "14px 12px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: enabled ? primary : "rgba(255,255,255,0.08)",
  color: enabled ? "#06100a" : "rgba(255,255,255,0.85)",
  fontWeight: 1100,
  letterSpacing: 1,
  cursor: enabled ? "pointer" : "not-allowed",
  boxShadow: enabled ? `0 0 18px ${primary}33, 0 18px 50px rgba(0,0,0,0.45)` : "none",
});
