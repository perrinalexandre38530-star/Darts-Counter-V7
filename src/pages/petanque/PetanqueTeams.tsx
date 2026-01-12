// @ts-nocheck
// =============================================================
// src/pages/petanque/PetanqueTeams.tsx
// Hub TEAMS Pétanque (liste + création + accès edit)
// ✅ Mix final : card ARCADE épurée
// ✅ Drapeaux = PNG (FlagCDN) => rendu identique partout
// ✅ Région = logo (dataUrl) ou PNG URL (fallback) ou badge texte
// ✅ Actions à droite : chip "Joueurs" + poubelle rouge
// ✅ Plus d'annotations (TEAM / id / tap pour éditer)
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

type Props = { go: (tab: any, params?: any) => void; params?: any };

// -------- Pays (label optionnel) --------
const TEAM_COUNTRIES: Array<{ code: string; label: string }> = [
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "CH", label: "Suisse" },
  { code: "ES", label: "Espagne" },
  { code: "IT", label: "Italie" },
  { code: "DE", label: "Allemagne" },
  { code: "PT", label: "Portugal" },
  { code: "GB", label: "Royaume-Uni" },
  { code: "US", label: "États-Unis" },
];

function countryMeta(code?: string, name?: string) {
  const c = String(code || "FR").toUpperCase().slice(0, 2);
  const hit = TEAM_COUNTRIES.find((x) => x.code === c);
  return {
    code: c,
    label: name || hit?.label || c,
  };
}

// FlagCDN : rendu identique partout
function flagPngUrl(countryCode2: string, size = 40) {
  const cc = String(countryCode2 || "FR").toLowerCase().slice(0, 2);
  return `https://flagcdn.com/w${size}/${cc}.png`;
}

// Région (FR) : PNG via GitHub raw (tu peux remplacer par ton CDN plus tard)
// IMPORTANT: ici on mappe les codes FR-* -> slug de fichier
const FR_REGION_ASSET: Record<string, string> = {
  "FR-ARA": "auvergne-rhone-alpes",
  "FR-BFC": "bourgogne-franche-comte",
  "FR-BRE": "bretagne",
  "FR-CVL": "centre-val-de-loire",
  "FR-COR": "corse",
  "FR-GES": "grand-est",
  "FR-HDF": "hauts-de-france",
  "FR-IDF": "ile-de-france",
  "FR-NOR": "normandie",
  "FR-NAQ": "nouvelle-aquitaine",
  "FR-OCC": "occitanie",
  "FR-PDL": "pays-de-la-loire",
  "FR-PAC": "provence-alpes-cote-dazur",
  "FR-GP": "guadeloupe",
  "FR-MQ": "martinique",
  "FR-GF": "guyane",
  "FR-RE": "la-reunion",
  "FR-YT": "mayotte",
};

// ⚠️ Mets tes PNG dans un repo/CDN quand tu veux.
// Pour l’instant : placeholder “safe” (ça ne crashe pas, fallback texte).
function regionPngUrl(regionCode: string, size = 40) {
  const key = String(regionCode || "").toUpperCase();
  const slug = FR_REGION_ASSET[key];
  if (!slug) return "";
  // exemple : tu peux plus tard mettre tes assets à toi
  // return `https://<ton-cdn>/regions/w${size}/${slug}.png`;
  // par défaut: URL vide => fallback
  return "";
}

function resolveAvatar(p: any): string | null {
  return p?.avatarDataUrl || p?.avatarUrl || p?.avatar || null;
}

function regionShort(code?: string, name?: string) {
  const c = String(code || "").toUpperCase();
  if (c.startsWith("FR-") && c.length >= 5) return c.slice(3); // FR-PAC -> PAC
  const n = String(name || "").trim().toUpperCase();
  if (n) return n.replace(/[^A-Z]/g, "").slice(0, 3) || "REG";
  return "REG";
}

function IconTrash({ size = 18 }: any) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 7l1 14h10l1-14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FlagBadge({ theme, code, label }: any) {
  const [imgOk, setImgOk] = React.useState(true);
  const cc = String(code || "FR").toUpperCase().slice(0, 2);

  return (
    <div
      title={label || cc}
      style={{
        width: 24,
        height: 24,
        borderRadius: 10,
        border: `1px solid rgba(255,255,255,0.14)`,
        background: "rgba(0,0,0,0.22)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      {imgOk ? (
        <img
          src={flagPngUrl(cc, 40)}
          alt={cc}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setImgOk(false)}
        />
      ) : (
        <span style={{ fontSize: 10, fontWeight: 950, color: theme?.primary || "#ffd86a" }}>{cc}</span>
      )}
    </div>
  );
}

function RegionBadge({ theme, regionLogoDataUrl, regionCode, regionName }: any) {
  const [imgOk, setImgOk] = React.useState(true);
  const code = String(regionCode || "").toUpperCase();
  const short = regionShort(regionCode, regionName);
  const url = regionPngUrl(code, 40);

  const hasData = !!regionLogoDataUrl;
  const hasUrl = !!url;

  return (
    <div
      title={regionName || short}
      style={{
        width: 24,
        height: 24,
        borderRadius: 10,
        border: `1px solid rgba(255,255,255,0.14)`,
        background: "rgba(0,0,0,0.22)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      {hasData ? (
        <img
          src={regionLogoDataUrl}
          alt={short}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => {}}
        />
      ) : hasUrl && imgOk ? (
        <img
          src={url}
          alt={short}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setImgOk(false)}
        />
      ) : (
        <span style={{ fontSize: 10, fontWeight: 950, color: theme?.primary || "#ffd86a" }}>{short}</span>
      )}
    </div>
  );
}

export default function PetanqueTeams({ go }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;
  const { store } = useStore() as any;

  const [teams, setTeams] = React.useState<PetanqueTeam[]>(() => loadPetanqueTeams());

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

  // profils locaux pour mini-avatars
  const profiles = React.useMemo(() => (Array.isArray(store?.profiles) ? store.profiles : []), [store?.profiles]);
  const profilesById = React.useMemo(() => {
    const map: Record<string, any> = {};
    for (const p of profiles) map[String(p?.id)] = p;
    return map;
  }, [profiles]);

  const headerBtn = (ghost = true) =>
    ({
      borderRadius: 999,
      border: `1px solid ${ghost ? theme.borderSoft : "transparent"}`,
      background: ghost ? theme.card : theme.primary,
      color: ghost ? theme.text : "#0b0b12",
      padding: "7px 12px",
      cursor: "pointer",
      fontWeight: 900,
      boxShadow: ghost ? "none" : `0 0 18px ${theme.primary}66`,
    } as React.CSSProperties);

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 96, background: theme.bg, color: theme.text }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => go("petanque_menu" as any)} style={headerBtn(true)}>
          ← {t("common.back", "Retour")}
        </button>
        <button onClick={handleCreate} style={headerBtn(false)}>
          + {t("teams.create", "Créer")}
        </button>
      </div>

      <h1 style={{ margin: 0, textAlign: "center", color: theme.primary, textTransform: "uppercase", letterSpacing: 2 }}>
        {t("teams.title", "Teams")}
      </h1>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        {teams.length === 0 && (
          <div style={{ opacity: 0.75, fontSize: 13 }}>{t("teams.empty", "Aucune équipe. Clique sur “Créer”.")}</div>
        )}

        {teams.map((tm) => {
          const c = countryMeta(tm.countryCode, tm.countryName);
          const isFR = String(tm.countryCode || "").toUpperCase() === "FR";

          const ids = Array.isArray(tm.playerIds) ? tm.playerIds : [];
          const picked = ids
            .map((id: string) => profilesById[String(id)])
            .filter(Boolean)
            .slice(0, 6);
          const moreCount = Math.max(0, ids.length - picked.length);

          return (
            <div
              key={tm.id}
              style={{
                borderRadius: 18,
                border: `1px solid rgba(255,255,255,0.10)`,
                background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.18))",
                boxShadow: "0 14px 34px rgba(0,0,0,0.55)",
                padding: 12,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* glow */}
              <div
                style={{
                  position: "absolute",
                  inset: -2,
                  pointerEvents: "none",
                  background: `radial-gradient(520px 180px at 15% -10%, ${theme.primary}2e, transparent 62%),
                               radial-gradient(420px 180px at 115% 10%, ${theme.primary}18, transparent 58%)`,
                }}
              />

              {/* accent left */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: `linear-gradient(180deg, ${theme.primary}cc, transparent)`,
                  boxShadow: `0 0 18px ${theme.primary}66`,
                  opacity: 0.85,
                  pointerEvents: "none",
                }}
              />

              <div style={{ display: "flex", gap: 12, alignItems: "center", position: "relative" }}>
                {/* Logo */}
                <div style={{ position: "relative", width: 56, height: 56, flex: "0 0 auto" }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: -2,
                      borderRadius: 18,
                      border: `1px solid ${theme.primary}55`,
                      boxShadow: `0 0 18px ${theme.primary}33`,
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
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
                    }}
                  >
                    {tm.logoDataUrl ? (
                      <img src={tm.logoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <span style={{ fontWeight: 1000, color: theme.primary, letterSpacing: 1 }}>
                        {(tm.name || "TEAM").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 950,
                      letterSpacing: 0.8,
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tm.name || "Équipe"}
                  </div>

                  {/* Flags row (icons only) */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <FlagBadge theme={theme} code={c.code} label={c.label} />
                    {isFR ? (
                      <RegionBadge
                        theme={theme}
                        regionLogoDataUrl={tm.regionLogoDataUrl || null}
                        regionCode={tm.regionCode || ""}
                        regionName={tm.regionName || ""}
                      />
                    ) : null}

                    {/* avatars stack inline (petit) */}
                    {picked.length > 0 ? (
                      <div style={{ display: "flex", alignItems: "center", marginLeft: 2 }}>
                        {picked.map((p: any, idx: number) => {
                          const src = resolveAvatar(p);
                          const letter = (p?.name || "?").slice(0, 1).toUpperCase();
                          return (
                            <div
                              key={String(p?.id) + "_" + idx}
                              title={p?.name || ""}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 999,
                                overflow: "hidden",
                                border: `1px solid rgba(255,255,255,0.22)`,
                                outline: `2px solid rgba(0,0,0,0.35)`,
                                background: "rgba(255,255,255,0.06)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginLeft: idx === 0 ? 0 : -8,
                                boxShadow: "0 8px 16px rgba(0,0,0,0.38)",
                              }}
                            >
                              {src ? (
                                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                              ) : (
                                <span style={{ fontSize: 10, fontWeight: 900 }}>{letter}</span>
                              )}
                            </div>
                          );
                        })}
                        {moreCount > 0 ? (
                          <div
                            style={{
                              marginLeft: 8,
                              fontSize: 11,
                              opacity: 0.9,
                              border: `1px solid rgba(255,255,255,0.14)`,
                              background: "rgba(0,0,0,0.18)",
                              padding: "2px 7px",
                              borderRadius: 999,
                              fontWeight: 900,
                            }}
                            title={t("common.more", "Plus")}
                          >
                            +{moreCount}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Actions column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "0 0 auto" }}>
                  {/* Joueurs chip */}
                  <button
                    onClick={() => go("petanque_team_edit" as any, { teamId: tm.id })}
                    title={t("teams.players", "Joueurs")}
                    style={{
                      borderRadius: 999,
                      border: `1px solid rgba(255,255,255,0.14)`,
                      background: "rgba(0,0,0,0.20)",
                      color: theme.text,
                      padding: "6px 10px",
                      fontWeight: 950,
                      fontSize: 12,
                      cursor: "pointer",
                      boxShadow: `0 0 16px ${theme.primary}18`,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ids.length} {t("common.players", "joueurs")}
                  </button>

                  {/* Trash */}
                  <button
                    onClick={() => handleDelete(tm.id)}
                    title={t("common.delete", "Supprimer")}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 999,
                      border: `1px solid rgba(255,80,120,0.45)`,
                      background: "rgba(255,80,120,0.14)",
                      color: "#ff8fb0",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 18px rgba(255,80,120,0.18)",
                    }}
                  >
                    <IconTrash size={18} />
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
