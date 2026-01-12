// @ts-nocheck
// =============================================================
// src/pages/petanque/PetanqueTeams.tsx
// Hub TEAMS Pétanque (liste + création + accès edit)
// ✅ Card ARCADE épurée (glass + glow)
// ✅ Drapeaux fiables via PNG locaux (pays + régions FR)
// ✅ Drapeaux affichés à la suite du nom (petit, même hauteur que le texte)
// ✅ Bouton "Joueurs" au-dessus de la poubelle (rouge) — rail à droite
// ✅ Avatars joueurs en "stack" sous le nom (+N)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { useStore } from "../../contexts/StoreContext";
import {
  loadPetanqueTeams,
  createPetanqueTeam,
  upsertPetanqueTeam,
  deletePetanqueTeam,
  type PetanqueTeam,
} from "../../lib/petanqueTeamsStore";
import { getCountryFlagSrc, getFRRegionLogoSrc } from "../../lib/geoAssets";

type Props = { go: (tab: any, params?: any) => void; params?: any };

function resolveAvatar(p: any): string | null {
  return p?.avatarDataUrl || p?.avatarUrl || p?.avatar || null;
}

function safeUpper2(code?: string) {
  return String(code || "").toUpperCase().slice(0, 2);
}

export default function PetanqueTeams({ go }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;
  const { store } = useStore() as any;

  const [teams, setTeams] = React.useState<PetanqueTeam[]>(() => loadPetanqueTeams());

  React.useEffect(() => {
    // si une autre page modifie les teams (edit), on refresh au focus
    const onVis = () => {
      if (document.visibilityState === "visible") setTeams(loadPetanqueTeams());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function refresh() {
    setTeams(loadPetanqueTeams());
  }

  function handleCreate() {
    const team = createPetanqueTeam();
    upsertPetanqueTeam(team);
    go("petanque_team_edit" as any, { teamId: team.id });
  }

  function handleDelete(teamId: string) {
    if (!confirm(t("teams.delete.confirm", "Supprimer cette équipe ?"))) return;
    deletePetanqueTeam(teamId);
    refresh();
  }

  const profiles = React.useMemo(() => (Array.isArray(store?.profiles) ? store.profiles : []), [store?.profiles]);
  const profilesById = React.useMemo(() => {
    const map: Record<string, any> = {};
    for (const p of profiles) map[String(p?.id)] = p;
    return map;
  }, [profiles]);

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => go("petanque_menu" as any)} style={btnBack(theme)}>
          ← {t("common.back", "Retour")}
        </button>

        <button onClick={handleCreate} style={btnCreate(theme)}>
          + {t("teams.create", "Créer")}
        </button>
      </div>

      <h1 style={{ margin: 0, textAlign: "center", color: theme.primary, textTransform: "uppercase", letterSpacing: 2 }}>
        {t("teams.title", "Teams")}
      </h1>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {teams.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 13 }}>{t("teams.empty", "Aucune équipe. Clique sur “Créer”.")}</div>
        ) : null}

        {teams.map((tm) => {
          const country = safeUpper2(tm.countryCode || "FR");
          const isFR = country === "FR";
          const flagSrc = getCountryFlagSrc(country);
          const regionSrc = isFR ? getFRRegionLogoSrc(tm.regionCode) : null;

          const ids = Array.isArray(tm.playerIds) ? tm.playerIds : [];
          const picked = ids
            .map((id: string) => profilesById[String(id)])
            .filter(Boolean)
            .slice(0, 6);
          const moreCount = Math.max(0, ids.length - picked.length);

          return (
            <div key={tm.id} style={cardWrap(theme)}>
              {/* Accent glow */}
              <div style={cardGlow(theme)} />

              <div style={{ display: "flex", gap: 12, alignItems: "center", position: "relative" }}>
                {/* Logo */}
                <div style={{ position: "relative", width: 56, height: 56, flex: "0 0 auto" }}>
                  <div style={logoRing(theme)} />
                  <div style={logoBox(theme)}>
                    {tm.logoDataUrl ? (
                      <img src={tm.logoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <span style={{ fontWeight: 1000, color: theme.primary, letterSpacing: 1 }}>
                        {(tm.name || "TEAM").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Main content (clickable => edit) */}
                <button
                  onClick={() => go("petanque_team_edit" as any, { teamId: tm.id })}
                  style={cardMainBtn(theme)}
                  title={t("common.edit", "Éditer")}
                >
                  {/* name row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <div style={teamName(theme)}>{tm.name || "Équipe"}</div>

                    {/* small flags inline */}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
                      <FlagIcon theme={theme} src={flagSrc} label={country} />
                      {isFR ? <FlagIcon theme={theme} src={regionSrc} label={(tm.regionCode || "FR").split("-").pop() || "R"} /> : null}
                    </span>
                  </div>

                  {/* Avatars stack under name */}
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", minHeight: 22 }}>
                    {picked.length > 0 ? (
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {picked.map((p: any, idx: number) => {
                          const src = resolveAvatar(p);
                          const letter = (p?.name || "?").slice(0, 1).toUpperCase();
                          return (
                            <div key={String(p?.id)} title={p?.name || ""} style={avatarDot(theme, idx)}>
                              {src ? (
                                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                              ) : (
                                <span style={{ fontSize: 11, fontWeight: 900 }}>{letter}</span>
                              )}
                            </div>
                          );
                        })}
                        {moreCount > 0 ? <div style={morePill(theme)}>+{moreCount}</div> : null}
                      </div>
                    ) : (
                      <div style={{ opacity: 0.55, fontSize: 12 }}>{t("teams.no_players", "Aucun joueur")}</div>
                    )}
                  </div>
                </button>

                {/* Right rail (players + trash) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "0 0 auto" }}>
                  <div style={playersPill(theme)} title={t("teams.players", "Joueurs")}>
                    {ids.length} {t("common.players", "joueurs")}
                  </div>

                  <button onClick={() => handleDelete(tm.id)} title={t("common.delete", "Supprimer")} style={trashBtn(theme)}>
                    🗑
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Small components ----------
function FlagIcon({ theme, src, label }: any) {
  // SVG fallback (case where src is null or cannot be loaded)
  const [err, setErr] = React.useState(false);

  if (!src || err) {
    return (
      <span
        style={{
          height: 14,
          minWidth: 14,
          padding: "0 6px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(0,0,0,0.22)",
          fontSize: 10,
          fontWeight: 900,
          lineHeight: "14px",
          color: theme?.primary || "#ffd86a",
        }}
      >
        {String(label || "?").toUpperCase().slice(0, 3)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={label || ""}
      onError={() => setErr(true)}
      style={{
        height: 14,
        width: 18,
        borderRadius: 4,
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 6px 12px rgba(0,0,0,0.35)",
        display: "block",
        objectFit: "cover",
      }}
    />
  );
}

// ---------- Styles ----------
function btnBack(theme: any): React.CSSProperties {
  return {
    borderRadius: 999,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.card,
    color: theme.text,
    padding: "6px 10px",
    cursor: "pointer",
  };
}

function btnCreate(theme: any): React.CSSProperties {
  return {
    borderRadius: 999,
    border: "none",
    background: theme.primary,
    color: "#0b0b12",
    padding: "8px 12px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: `0 0 18px ${theme.primary}66`,
  };
}

function cardWrap(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.16))",
    boxShadow: "0 14px 34px rgba(0,0,0,0.55)",
    padding: 12,
    position: "relative",
    overflow: "hidden",
  };
}

function cardGlow(theme: any): React.CSSProperties {
  return {
    position: "absolute",
    inset: -2,
    pointerEvents: "none",
    background: `radial-gradient(520px 180px at 20% -10%, ${theme.primary}33, transparent 60%),
                 radial-gradient(420px 160px at 110% 10%, ${theme.primary}22, transparent 55%)`,
  };
}

function logoRing(theme: any): React.CSSProperties {
  return {
    position: "absolute",
    inset: -2,
    borderRadius: 18,
    border: `1px solid ${theme.primary}55`,
    boxShadow: `0 0 18px ${theme.primary}33`,
    pointerEvents: "none",
  };
}

function logoBox(theme: any): React.CSSProperties {
  return {
    width: 56,
    height: 56,
    borderRadius: 18,
    overflow: "hidden",
    border: `1px solid rgba(255,255,255,0.14)`,
    background: "rgba(255,255,255,0.06)",
    boxShadow: "0 10px 18px rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function cardMainBtn(theme: any): React.CSSProperties {
  return {
    flex: 1,
    minWidth: 0,
    border: "none",
    background: "transparent",
    color: theme.text,
    textAlign: "left",
    padding: 0,
    cursor: "pointer",
  };
}

function teamName(theme: any): React.CSSProperties {
  return {
    fontWeight: 950,
    letterSpacing: 0.8,
    fontSize: 14,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  };
}

function avatarDot(theme: any, idx: number): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: 999,
    overflow: "hidden",
    border: `1px solid rgba(255,255,255,0.22)`,
    outline: `2px solid rgba(0,0,0,0.35)`,
    background: "rgba(255,255,255,0.06)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: idx === 0 ? 0 : -9,
    boxShadow: "0 8px 16px rgba(0,0,0,0.38)",
  };
}

function morePill(theme: any): React.CSSProperties {
  return {
    marginLeft: 10,
    fontSize: 12,
    opacity: 0.9,
    border: `1px solid rgba(255,255,255,0.14)`,
    background: "rgba(0,0,0,0.18)",
    padding: "3px 8px",
    borderRadius: 999,
    fontWeight: 900,
  };
}

function playersPill(theme: any): React.CSSProperties {
  return {
    width: 74,
    textAlign: "center",
    fontSize: 11,
    fontWeight: 900,
    opacity: 0.95,
    border: `1px solid rgba(255,255,255,0.14)`,
    background: "rgba(0,0,0,0.18)",
    padding: "5px 8px",
    borderRadius: 999,
    boxShadow: `0 0 16px ${theme.primary}22`,
    alignSelf: "flex-end",
  };
}

function trashBtn(theme: any): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 999,
    border: `1px solid rgba(255,80,120,0.35)`,
    background: "rgba(255,80,120,0.12)",
    color: "#ffd1e0",
    cursor: "pointer",
    fontWeight: 900,
    boxShadow: "0 0 16px rgba(255,80,120,0.18)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
