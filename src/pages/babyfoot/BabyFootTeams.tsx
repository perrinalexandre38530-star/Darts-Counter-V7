// @ts-nocheck
// =============================================================
// src/pages/babyfoot/BabyFootTeams.tsx
// Hub TEAMS Baby-Foot (liste + création + accès edit)
// ✅ Clone strict du rendu PetanqueTeams (arcade glass + glow)
// ✅ Drapeaux fiables via PNG locaux (pays + régions FR)
// ✅ Avatars joueurs en "stack" sous le nom (+N)
//
// PATCH (HEADER TICKER) :
// - Remplace le <h1> par un ticker full width dans le header
// - Superpose BackDot (gauche) + InfoDot (droite) AU-DESSUS du ticker
// - Conserve le bouton "+ Créer" (à droite) comme avant
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { useStore } from "../../contexts/StoreContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import {
  loadBabyFootTeams,
  createBabyFootTeam,
  upsertBabyFootTeam,
  deleteBabyFootTeam,
  type BabyFootTeam,
} from "../../lib/petanqueTeamsStore";
import { getCountryFlagSrc, getFRRegionLogoSrc } from "../../lib/geoAssets";

type Props = { go: (tab: any, params?: any) => void; params?: any };

function resolveAvatar(p: any): string | null {
  return p?.avatarDataUrl || p?.avatarUrl || p?.avatar || null;
}

function safeUpper2(code?: string) {
  return String(code || "").toUpperCase().slice(0, 2);
}

// ✅ Tickers images (Vite) — même logique que Games/Pétanque
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

export default function BabyFootTeams({ go }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;
  const { store } = useStore() as any;

  const [teams, setTeams] = React.useState<BabyFootTeam[]>(() =>
    loadBabyFootTeams()
  );

  const [showInfo, setShowInfo] = React.useState(false);

  React.useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") setTeams(loadBabyFootTeams());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function refresh() {
    setTeams(loadBabyFootTeams());
  }

  function handleCreate() {
    const team = createBabyFootTeam();
    upsertBabyFootTeam(team);
    go("babyfoot_team_edit" as any, { teamId: team.id });
  }

  function handleDelete(teamId: string) {
    if (!confirm(t("teams.delete.confirm", "Supprimer cette équipe ?"))) return;
    deleteBabyFootTeam(teamId);
    refresh();
  }

  const profiles = React.useMemo(
    () => (Array.isArray(store?.profiles) ? store.profiles : []),
    [store?.profiles]
  );
  const profilesById = React.useMemo(() => {
    const map: Record<string, any> = {};
    for (const p of profiles) map[String(p?.id)] = p;
    return map;
  }, [profiles]);

  const headerSrc =
    getTicker("babyfoot_teams") ||
    getTicker("babyfoot_ligue") ||
    getTicker("babyfoot_games") ||
    null;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 90,
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* HEADER: ticker full width + boutons superposés + create */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ position: "relative", width: "100%" }}>
          <div style={{ borderRadius: 16, overflow: "hidden" }}>
            {headerSrc ? (
              <img
                src={headerSrc}
                alt="TEAMS — Baby-Foot"
                style={{
                  width: "100%",
                  height: 92,
                  objectFit: "cover",
                  display: "block",
                  border: `1px solid ${theme.borderSoft}`,
                  boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
                }}
                draggable={false}
              />
            ) : (
              // Fallback: pas de ticker trouvé
              <div
                style={{
                  width: "100%",
                  height: 92,
                  borderRadius: 16,
                  border: `1px solid ${theme.borderSoft}`,
                  background: theme.card,
                  boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
                  display: "grid",
                  placeItems: "center",
                  color: theme.primary,
                  fontWeight: 1000,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {t("teams.title", "Teams")}
              </div>
            )}
          </div>

          {/* BackDot superposé */}
          <div
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3,
            }}
          >
            <BackDot onClick={() => go("babyfoot_menu" as any)} />
          </div>

          {/* InfoDot superposé */}
          <div
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 3,
            }}
          >
            <InfoDot
              onClick={(ev: any) => {
                try {
                  ev?.stopPropagation?.();
                  ev?.preventDefault?.();
                } catch {}
                setShowInfo(true);
              }}
              glow={(theme.primary || "#ffd86a") + "88"}
            />
          </div>
        </div>

        {/* Ligne actions: Create à droite (comme avant) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            marginTop: 10,
          }}
        >
          <button onClick={handleCreate} style={btnCreate(theme)}>
            + {t("teams.create", "Créer")}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {teams.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            {t("teams.empty", "Aucune équipe. Clique sur “Créer”.")}
          </div>
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
              <div style={cardGlow(theme)} />

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  position: "relative",
                }}
              >
                {/* Logo */}
                <div
                  style={{
                    position: "relative",
                    width: 56,
                    height: 56,
                    flex: "0 0 auto",
                  }}
                >
                  <div style={logoRing(theme)} />
                  <div style={logoBox(theme)}>
                    {tm.logoDataUrl ? (
                      <img
                        src={tm.logoDataUrl}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontWeight: 1000,
                          color: theme.primary,
                          letterSpacing: 1,
                        }}
                      >
                        {(tm.name || "TEAM").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Main content (clickable => edit) */}
                <button
                  onClick={() =>
                    go("babyfoot_team_edit" as any, { teamId: tm.id })
                  }
                  style={cardMainBtn(theme)}
                  title={t("common.edit", "Éditer")}
                >
                  {/* name row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <div style={teamName(theme)}>{tm.name || "Équipe"}</div>

                    {/* small flags inline */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        flex: "0 0 auto",
                      }}
                    >
                      <FlagIcon theme={theme} src={flagSrc} label={country} />
                      {isFR ? (
                        <FlagIcon
                          theme={theme}
                          src={regionSrc}
                          label={(tm.regionCode || "FR").split("-").pop() || "R"}
                        />
                      ) : null}
                    </span>
                  </div>

                  {/* Avatars stack under name */}
                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      minHeight: 22,
                    }}
                  >
                    {picked.length > 0 ? (
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {picked.map((p: any, idx: number) => {
                          const src = resolveAvatar(p);
                          const letter = (p?.name || "?")
                            .slice(0, 1)
                            .toUpperCase();
                          return (
                            <div
                              key={String(p?.id)}
                              title={p?.name || ""}
                              style={avatarDot(theme, idx)}
                            >
                              {src ? (
                                <img
                                  src={src}
                                  alt=""
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: 11, fontWeight: 900 }}>
                                  {letter}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {moreCount > 0 ? (
                          <div style={morePill(theme)}>+{moreCount}</div>
                        ) : null}
                      </div>
                    ) : (
                      <div style={{ opacity: 0.55, fontSize: 12 }}>
                        {t("teams.no_players", "Aucun joueur")}
                      </div>
                    )}
                  </div>
                </button>

                {/* Right rail (players + trash) */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    flex: "0 0 auto",
                  }}
                >
                  <div
                    style={playersPill(theme)}
                    title={t("teams.players", "Joueurs")}
                  >
                    {ids.length} {t("common.players", "joueurs")}
                  </div>

                  <button
                    onClick={() => handleDelete(tm.id)}
                    title={t("common.delete", "Supprimer")}
                    style={trashBtn(theme)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL INFO */}
      {showInfo && (
        <div
          onClick={() => setShowInfo(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              padding: 16,
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              color: theme.text,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 1000, fontSize: 16 }}>
                {t("teams.title", "Teams")} — Baby-Foot
              </div>
              <button
                onClick={() => setShowInfo(false)}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.18)",
                  color: theme.text,
                  fontWeight: 900,
                  borderRadius: 12,
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                OK
              </button>
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                lineHeight: 1.45,
                color: theme.textSoft,
              }}
            >
              {t(
                "teams.info",
                "Crée et gère tes équipes Baby-Foot (1 ou 2 joueurs). Réutilise-les ensuite en Match (1v1 / 2v2 / 2v1)."
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Small components ----------
function FlagIcon({ theme, src, label }: any) {
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
    background: theme.card,
    padding: 12,
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  };
}

function cardGlow(theme: any): React.CSSProperties {
  return {
    position: "absolute",
    inset: -2,
    background: `radial-gradient(120px 60px at 12% 40%, ${theme.primary}2a, transparent 60%), radial-gradient(120px 60px at 85% 25%, ${theme.accent || theme.primary}22, transparent 60%)`,
    filter: "blur(0px)",
    pointerEvents: "none",
  };
}

function logoRing(theme: any): React.CSSProperties {
  return {
    position: "absolute",
    inset: -6,
    borderRadius: 18,
    background: `radial-gradient(circle at 30% 25%, ${theme.primary}55, transparent 60%)`,
    filter: "blur(4px)",
    opacity: 0.8,
  };
}

function logoBox(theme: any): React.CSSProperties {
  return {
    width: 56,
    height: 56,
    borderRadius: 16,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,0.25)",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    position: "relative",
    boxShadow: "0 10px 22px rgba(0,0,0,0.35)",
  };
}

function cardMainBtn(theme: any): React.CSSProperties {
  return {
    flex: 1,
    minWidth: 0,
    textAlign: "left",
    border: "none",
    background: "transparent",
    color: theme.text,
    cursor: "pointer",
    padding: 0,
  };
}

function teamName(theme: any): React.CSSProperties {
  return {
    fontWeight: 1000,
    letterSpacing: 0.4,
    fontSize: 16,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: theme.text,
  };
}

function avatarDot(theme: any, idx: number): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: 999,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    marginLeft: idx === 0 ? 0 : -8,
    boxShadow: "0 10px 18px rgba(0,0,0,0.35)",
  };
}

function morePill(theme: any): React.CSSProperties {
  return {
    marginLeft: 8,
    padding: "2px 8px",
    borderRadius: 999,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,0.22)",
    fontSize: 11,
    fontWeight: 900,
    color: theme.primary,
  };
}

function playersPill(theme: any): React.CSSProperties {
  return {
    padding: "5px 10px",
    borderRadius: 999,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,0.22)",
    fontSize: 12,
    fontWeight: 900,
    color: theme.text,
    opacity: 0.9,
    textAlign: "center",
  };
}

function trashBtn(theme: any): React.CSSProperties {
  return {
    width: 38,
    height: 34,
    borderRadius: 12,
    border: "1px solid rgba(255,80,80,.35)",
    background: "rgba(255,40,40,.10)",
    color: "rgba(255,140,140,1)",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 900,
    display: "grid",
    placeItems: "center",
  };
}
