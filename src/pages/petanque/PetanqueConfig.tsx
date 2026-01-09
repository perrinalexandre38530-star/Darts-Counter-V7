// =============================================================
// src/pages/petanque/PetanqueConfig.tsx
// Config Pétanque — UI calquée sur X01ConfigV3 (cards + carrousel + pills)
// ✅ Sans BOTS IA
// ✅ Équipes auto A/B selon le mode (1v1, 2v2, 3v3)
// ✅ Params : score cible + mesurage autorisé
// ✅ NEW : InfoDot "i" alignés à droite (score officiel / début officiel)
// ✅ NEW : options départ (pile ou face / départ défini / boule la + proche amical)
// ✅ NEW : ordre des joueurs (libre / défini)
// ✅ NEW : rôles (Tireur / Pointeur 1 / Pointeur 2 / Polyvalent) indicatifs
// ✅ CTA sticky "Démarrer la partie"
// =============================================================

import React from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import InfoDot from "../../components/InfoDot";

type PetanqueModeId = "singles" | "doublette" | "triplette" | "training";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any; // { mode }
};

type TeamId = "A" | "B";

// ✅ NEW: règles de départ / ordre
type StartRule = "toss" | "fixedA" | "fixedB" | "closest_boule";
type ThrowOrderRule = "free" | "fixed";

// ✅ NEW: rôles indicatifs (ne force pas la logique de lancer)
type PlayerRole = "tireur" | "pointeur1" | "pointeur2" | "polyvalent";

type PetanqueConfigPayload = {
  id: string;
  mode: PetanqueModeId;
  createdAt: number;

  targetScore: number; // ex: 13
  measurementAllowed: boolean;

  // ✅ NEW
  startRule: StartRule;
  throwOrderRule: ThrowOrderRule;
  roles: Record<string, PlayerRole>;

  teams: Array<{
    id: TeamId;
    name: string;
    color: string;
    playerIds: string[];
  }>;

  players: Array<{
    id: string;
    name: string;
    avatarDataUrl?: string | null;
  }>;
};

// Tu laisses comme c'est (mais on explique via InfoDot)
const TARGET_SCORES = [11, 13, 15, 21];

const TEAM_LABELS: Record<TeamId, string> = { A: "Équipe A", B: "Équipe B" };
const TEAM_COLORS: Record<TeamId, string> = {
  A: "#f7c85c",
  B: "#ff4fa2",
};

function requiredPlayers(mode: PetanqueModeId) {
  if (mode === "singles") return 2;
  if (mode === "doublette") return 4;
  if (mode === "triplette") return 6;
  return 1;
}

export default function PetanqueConfig({ store, go, params }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  const mode: PetanqueModeId = (params?.mode as PetanqueModeId) || "singles";
  const need = requiredPlayers(mode);

  // ✅ Profils humains uniquement
  const profiles: Profile[] = (store?.profiles || []).filter((p: any) => !(p as any).isBot);

  // état
  const [targetScore, setTargetScore] = React.useState<number>(13);
  const [measurementAllowed, setMeasurementAllowed] = React.useState<boolean>(true);

  // ✅ NEW: infos overlay (score / start) via InfoDot
  const [infoKey, setInfoKey] = React.useState<null | "score" | "start">(null);

  // ✅ NEW: règles de départ / ordre
  const [startRule, setStartRule] = React.useState<StartRule>("toss");
  const [throwOrderRule, setThrowOrderRule] = React.useState<ThrowOrderRule>("free");

  // ✅ NEW: rôles indicatifs
  const [roles, setRoles] = React.useState<Record<string, PlayerRole>>({});

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => profiles.slice(0, need).map((p) => p.id));

  React.useEffect(() => {
    setSelectedIds((prev) => {
      const uniq = Array.from(new Set(prev));
      const take = uniq.slice(0, need);
      if (take.length === need) return take;
      const missing = need - take.length;
      const pool = profiles.map((p) => p.id).filter((id) => !take.includes(id));
      return [...take, ...pool.slice(0, Math.max(0, missing))];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, need]);

  React.useEffect(() => {
    setRoles((prev) => {
      const keep = new Set(selectedIds.slice(0, need));
      const next: Record<string, PlayerRole> = {};
      Object.keys(prev).forEach((k) => {
        if (keep.has(k)) next[k] = prev[k];
      });
      return next;
    });
  }, [selectedIds, need]);

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);

      if (mode === "training") {
        if (exists) return [];
        return [id];
      }

      if (exists) return prev.filter((x) => x !== id);

      if (prev.length >= need) {
        const next = prev.slice(0, need - 1);
        return [...next, id];
      }
      return [...prev, id];
    });
  }

  const canStart = React.useMemo(() => {
    if (mode === "training") return selectedIds.length === 1;
    return selectedIds.length === need;
  }, [selectedIds.length, need, mode]);

  const teams = React.useMemo(() => {
    const aCount = Math.floor(need / 2);
    const a = selectedIds.slice(0, aCount);
    const b = selectedIds.slice(aCount, need);

    return [
      { id: "A" as TeamId, name: TEAM_LABELS.A, color: TEAM_COLORS.A, playerIds: a },
      { id: "B" as TeamId, name: TEAM_LABELS.B, color: TEAM_COLORS.B, playerIds: b },
    ];
  }, [selectedIds, need]);

  function handleStart() {
    if (!canStart) {
      alert(
        mode === "training"
          ? t("petanque.config.needOne", "Sélectionne 1 joueur pour l'entraînement.")
          : t("petanque.config.needPlayers", `Sélectionne ${need} joueurs.`)
      );
      return;
    }
  
    const players = selectedIds
      .slice(0, need)
      .map((id) => profiles.find((p) => p.id === id))
      .filter(Boolean)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        avatarDataUrl: p.avatarDataUrl ?? null,
      }));
  
    const cfg: PetanqueConfigPayload = {
      id: `petanque-${Date.now()}`,
      mode,
      createdAt: Date.now(),
      targetScore: Math.max(1, Math.min(99, Math.floor(Number(targetScore) || 13))),
      measurementAllowed: !!measurementAllowed,
      startRule,
      throwOrderRule,
      roles,
      teams,
      players,
    };
  
    // ✅ SAFE: on force une route legacy (stable) + un token fresh
    // - "petanque.play" est déjà dans ton switch App.tsx
    // - fresh permet de forcer un re-mount côté Play si nécessaire
    go("petanque.play" as any, { mode, cfg, fresh: Date.now() });
  }

  const primary = theme?.primary ?? "#f7c85c";
  const primarySoft = theme?.primarySoft ?? "rgba(247,200,92,0.16)";
  const textMain = theme?.text ?? "#f5f5ff";
  const cardBg = "rgba(10, 12, 24, 0.96)";

  // ✅ helper: ligne de label avec InfoDot aligné à droite
  function LabelRow({
    label,
    info,
    onInfo,
  }: {
    label: React.ReactNode;
    info?: boolean;
    onInfo?: (ev?: any) => void;
  }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ fontSize: 12, color: "#c8cbe4" }}>{label}</div>
        <div style={{ marginLeft: "auto" }}>
          {info ? (
            <InfoDot
              onClick={(ev: any) => {
                ev?.stopPropagation?.();
                onInfo?.(ev);
              }}
              glow={(theme?.primary ?? primary) + "88"}
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="screen petanque-config-screen"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "12px 12px 76px",
        background: "radial-gradient(circle at top, #15192c 0, #05060c 50%, #020308 100%)",
        color: textMain,
      }}
    >
      {/* HEADER */}
      <header style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <button
            type="button"
            onClick={() => go("petanque_menu" as any)}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(10,12,24,0.9)",
              color: "#f5f5f5",
              padding: "5px 10px",
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 16 }}>←</span>
            <span>{t("common.back", "Retour")}</span>
          </button>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2, color: primary, textTransform: "uppercase" }}>
            {t("petanque.config.title", "Configuration")}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, color: "#d9d9e4", marginTop: 2 }}>
            {t("petanque.config.subtitle", "Prépare ta partie avant de commencer.")}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#b8bdd8" }}>
            {t("petanque.config.mode", "Mode")} : <b style={{ color: "#fff" }}>{mode}</b>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 12 }}>
        {/* JOUEURS */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: "20px 12px 16px",
            marginBottom: 16,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary, marginBottom: 10 }}>
            {t("petanque.config.players", "Joueurs")}
          </div>

          {profiles.length === 0 ? (
            <p style={{ fontSize: 13, color: "#b3b8d0", marginBottom: 8 }}>
              {t("petanque.config.noProfiles", "Aucun profil local. Crée des joueurs dans Profils.")}
            </p>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 18,
                  overflowX: "auto",
                  paddingBottom: 12,
                  marginBottom: 6,
                  paddingLeft: 24,
                  paddingRight: 8,
                  justifyContent: "flex-start",
                }}
                className="dc-scroll-thin"
              >
                {profiles.map((p) => {
                  const active = selectedIds.includes(p.id);

                  let halo = primary;
                  if (mode !== "training") {
                    const idx = selectedIds.indexOf(p.id);
                    if (idx >= 0) {
                      const aCount = Math.floor(need / 2);
                      halo = idx < aCount ? TEAM_COLORS.A : TEAM_COLORS.B;
                    }
                  }

                  return (
                    <div
                      key={p.id}
                      role="button"
                      onClick={() => togglePlayer(p.id)}
                      style={{
                        minWidth: 120,
                        maxWidth: 120,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 78,
                          height: 78,
                          borderRadius: "50%",
                          overflow: "hidden",
                          boxShadow: active ? `0 0 28px ${halo}aa` : "0 0 14px rgba(0,0,0,0.65)",
                          background: active ? `radial-gradient(circle at 30% 20%, #fff8d0, ${halo})` : "#111320",
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
                            transition: "filter 0.2s ease, opacity 0.2s ease",
                          }}
                        >
                          <ProfileAvatar profile={p} size={78} />
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          textAlign: "center",
                          color: active ? "#f6f2e9" : "#7e8299",
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </div>

                      {mode !== "training" && active && (
                        <div style={{ marginTop: 2, display: "flex", justifyContent: "center" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 9,
                              fontWeight: 900,
                              letterSpacing: 0.7,
                              textTransform: "uppercase",
                              background:
                                selectedIds.indexOf(p.id) < Math.floor(need / 2)
                                  ? `radial-gradient(circle at 30% 0, ${TEAM_COLORS.A}, #ffe9a3)`
                                  : `radial-gradient(circle at 30% 0, ${TEAM_COLORS.B}, #ffd1e6)`,
                              color: "#020611",
                              boxShadow: "0 0 10px rgba(0,0,0,0.55)",
                              border: "1px solid rgba(255,255,255,0.35)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {selectedIds.indexOf(p.id) < Math.floor(need / 2) ? "A" : "B"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 0 }}>
                {mode === "training"
                  ? t("petanque.config.hintTraining", "Sélectionne 1 joueur.")
                  : t("petanque.config.hint", `Sélectionne exactement ${need} joueurs.`)}
              </p>
            </>
          )}
        </section>

        {/* PARAMÈTRES */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 12,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: `1px solid rgba(255,255,255,0.04)`,
          }}
        >
          <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary, marginBottom: 10 }}>
            {t("petanque.config.params", "Paramètres")}
          </h3>

          {/* Score cible + InfoDot à droite */}
          <div style={{ marginBottom: 12 }}>
            <LabelRow label={t("petanque.config.targetScore", "Score cible")} info onInfo={() => setInfoKey("score")} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TARGET_SCORES.map((s) => (
                <PillButton
                  key={s}
                  label={String(s)}
                  active={targetScore === s}
                  onClick={() => setTargetScore(s)}
                  primary={primary}
                  primarySoft={primarySoft}
                />
              ))}
              <PillButton
                label={t("petanque.config.custom13", "13 (def)")}
                active={targetScore === 13}
                onClick={() => setTargetScore(13)}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>
          </div>

          {/* Début de partie + InfoDot à droite */}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <LabelRow label={t("petanque.config.startRule", "Début de partie")} info onInfo={() => setInfoKey("start")} />

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("petanque.config.start.toss", "Pile ou face (officiel)")}
                active={startRule === "toss"}
                onClick={() => setStartRule("toss")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("petanque.config.start.fixedA", "Départ Équipe A")}
                active={startRule === "fixedA"}
                onClick={() => setStartRule("fixedA")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("petanque.config.start.fixedB", "Départ Équipe B")}
                active={startRule === "fixedB"}
                onClick={() => setStartRule("fixedB")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("petanque.config.start.closest", "Boule la + proche (amical)")}
                active={startRule === "closest_boule"}
                onClick={() => setStartRule("closest_boule")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>
          </div>

          {/* Ordre des joueurs */}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <LabelRow label={t("petanque.config.throwOrder", "Ordre des joueurs")} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("petanque.config.throwOrder.free", "Libre (compétition)")}
                active={throwOrderRule === "free"}
                onClick={() => setThrowOrderRule("free")}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label={t("petanque.config.throwOrder.fixed", "Défini")}
                active={throwOrderRule === "fixed"}
                onClick={() => setThrowOrderRule("fixed")}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>
            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
              {t(
                "petanque.config.throwOrderHint",
                "En compétition l’ordre est généralement libre (l’équipe s’organise). “Défini” sert surtout en amical."
              )}
            </div>
          </div>

          {/* Mesurage */}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <LabelRow label={t("petanque.config.measure", "Mesurage")} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label={t("common.on", "ON")}
                active={measurementAllowed === true}
                onClick={() => setMeasurementAllowed(true)}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
              <PillButton
                label={t("common.off", "OFF")}
                active={measurementAllowed === false}
                onClick={() => setMeasurementAllowed(false)}
                primary={primary}
                primarySoft={primarySoft}
                compact
              />
            </div>
            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
              {t("petanque.config.measureHint", "Autorise l'ajout de mesures (manuel / photo / live) pendant la partie.")}
            </div>
          </div>
        </section>

        {/* RÔLES (indicatif) */}
        {canStart && (
          <section
            style={{
              background: cardBg,
              borderRadius: 18,
              padding: 12,
              marginBottom: 12,
              boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
              border: `1px solid rgba(255,255,255,0.04)`,
            }}
          >
            <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary, marginBottom: 10 }}>
              {t("petanque.config.roles", "Rôles (indicatif)")}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedIds.slice(0, need).map((pid) => {
                const p = profiles.find((x) => x.id === pid);
                if (!p) return null;
                const v: PlayerRole = roles[pid] ?? "polyvalent";

                return (
                  <div key={pid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ProfileAvatar profile={p} size={26} />
                      <span style={{ fontSize: 12, fontWeight: 800 }}>{p.name}</span>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {(["tireur", "pointeur1", "pointeur2", "polyvalent"] as const).map((r) => (
                        <PillButton
                          key={r}
                          label={
                            r === "tireur"
                              ? t("petanque.role.shooter", "Tireur")
                              : r === "pointeur1"
                              ? t("petanque.role.pointer1", "Pointeur 1")
                              : r === "pointeur2"
                              ? t("petanque.role.pointer2", "Pointeur 2")
                              : t("petanque.role.flex", "Polyvalent")
                          }
                          active={v === r}
                          onClick={() => setRoles((prev) => ({ ...prev, [pid]: r }))}
                          primary={primary}
                          primarySoft={primarySoft}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 8 }}>
              {t("petanque.config.rolesHint", "Ces rôles sont indicatifs et servent de repère (pas une règle de lancer).")}
            </div>
          </section>
        )}

        {/* RÉCAP ÉQUIPES */}
        {mode !== "training" && (
          <section
            style={{
              background: cardBg,
              borderRadius: 18,
              padding: 12,
              marginBottom: 80,
              boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
              border: `1px solid rgba(255,255,255,0.04)`,
            }}
          >
            <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, color: primary, marginBottom: 10 }}>
              {t("petanque.config.teams", "Équipes")}
            </h3>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {teams.map((tm) => (
                <div
                  key={tm.id}
                  style={{
                    flex: "1 1 160px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    padding: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontWeight: 900, color: tm.color, letterSpacing: 0.8, textTransform: "uppercase", fontSize: 12 }}>
                      {tm.name}
                    </div>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: `1px solid ${tm.color}88`,
                        background: "rgba(0,0,0,0.25)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 11,
                      }}
                    >
                      {tm.playerIds.length} / {Math.floor(need / 2)}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {tm.playerIds.map((pid) => {
                      const p = profiles.find((x) => x.id === pid);
                      if (!p) return null;
                      const role = roles[pid] ?? "polyvalent";
                      const roleLabel = role === "tireur" ? "T" : role === "pointeur1" ? "P1" : role === "pointeur2" ? "P2" : "↔";

                      return (
                        <div key={pid} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <ProfileAvatar profile={p} size={26} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#e9ecff" }}>{p.name}</span>
                          <span
                            style={{
                              marginLeft: 2,
                              padding: "2px 6px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 900,
                              border: "1px solid rgba(255,255,255,0.16)",
                              background: "rgba(0,0,0,0.25)",
                              color: "#fff",
                            }}
                            title="Rôle indicatif"
                          >
                            {roleLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* CTA sticky */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 88, padding: "6px 12px 8px", pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 999,
              border: "none",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: 1,
              textTransform: "uppercase",
              background: canStart ? `linear-gradient(90deg, ${primary}, #ffe9a3)` : "rgba(120,120,120,0.5)",
              color: canStart ? "#151515" : "#2b2b52",
              boxShadow: canStart ? "0 0 18px rgba(255, 207, 120, 0.65)" : "none",
              opacity: canStart ? 1 : 0.6,
              cursor: canStart ? "pointer" : "default",
            }}
          >
            {t("petanque.config.start", "Démarrer la partie")}
          </button>
        </div>
      </div>

      {/* Overlay infos (InfoDot) */}
      {infoKey && (
        <div
          onClick={() => setInfoKey(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 80,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 440,
              margin: 16,
              padding: 16,
              borderRadius: 18,
              background: theme?.card ?? cardBg,
              border: `1px solid ${theme?.primary ? theme.primary + "55" : "rgba(247,200,92,0.35)"}`,
              color: theme?.text ?? "#fff",
              boxShadow: "0 18px 40px rgba(0,0,0,0.7)",
            }}
          >
            {infoKey === "score" && (
              <>
                <div style={{ fontWeight: 900, color: theme?.primary ?? primary, marginBottom: 8, textTransform: "uppercase" }}>
                  Score officiel
                </div>
                <div style={{ fontSize: 13, color: theme?.textSoft ?? "#cfd2e8", lineHeight: 1.35 }}>
                  En compétition, une partie se joue en général en <b>13 points</b>. Certains formats (poules / cadrages)
                  peuvent être joués en <b>11 points</b> selon l’organisation. Les autres valeurs relèvent surtout d’usages
                  amicaux / locaux.
                </div>
              </>
            )}

            {infoKey === "start" && (
              <>
                <div style={{ fontWeight: 900, color: theme?.primary ?? primary, marginBottom: 8, textTransform: "uppercase" }}>
                  Début de partie
                </div>
                <div style={{ fontSize: 13, color: theme?.textSoft ?? "#cfd2e8", lineHeight: 1.35 }}>
                  En compétition, le début se fait par <b>tirage au sort (pile ou face)</b> pour déterminer l’équipe qui commence
                  (et lance le but en premier).
                </div>
              </>
            )}

            <button
              onClick={() => setInfoKey(null)}
              style={{
                marginTop: 12,
                borderRadius: 999,
                border: "none",
                background: theme?.primary ?? primary,
                color: "#000",
                padding: "6px 12px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------ UI helpers ------------------ */

type PillProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  primary: string;
  primarySoft: string;
  compact?: boolean;
  disabled?: boolean;
};

function PillButton({ label, active, onClick, primary, primarySoft, compact, disabled }: PillProps) {
  const isDisabled = !!disabled;

  const bg = isDisabled ? "rgba(40,42,60,0.7)" : active ? primarySoft : "rgba(9,11,20,0.9)";
  const border = isDisabled ? "1px solid rgba(255,255,255,0.04)" : active ? `1px solid ${primary}` : "1px solid rgba(255,255,255,0.07)";
  const color = isDisabled ? "#777b92" : active ? "#fdf9ee" : "#d0d3ea";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      style={{
        borderRadius: 999,
        padding: compact ? "4px 9px" : "6px 12px",
        border,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: active && !isDisabled ? 700 : 600,
        boxShadow: active && !isDisabled ? "0 0 12px rgba(0,0,0,0.7)" : "none",
        whiteSpace: "nowrap",
        opacity: isDisabled ? 0.7 : 1,
        cursor: isDisabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}
