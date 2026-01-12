// @ts-nocheck
// =============================================================
// src/pages/petanque/PetanqueTeams.tsx
// Hub TEAMS Pétanque (liste + création + accès edit)
// ✅ NEW: Card ARCADE épurée (glass + glow)
// ✅ NEW: Drapeau + logo région (FR) + labels propres
// ✅ NEW: Avatars joueurs en "stack" + compteur +N
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

// -------- Pays -> drapeau (emoji) --------
const TEAM_COUNTRIES: Array<{ code: string; label: string; flag?: string }> = [
  { code: "FR", label: "France", flag: "🇫🇷" },
  { code: "BE", label: "Belgique", flag: "🇧🇪" },
  { code: "CH", label: "Suisse", flag: "🇨🇭" },
  { code: "ES", label: "Espagne", flag: "🇪🇸" },
  { code: "IT", label: "Italie", flag: "🇮🇹" },
  { code: "DE", label: "Allemagne", flag: "🇩🇪" },
  { code: "PT", label: "Portugal", flag: "🇵🇹" },
  { code: "GB", label: "Royaume-Uni", flag: "🇬🇧" },
  { code: "US", label: "États-Unis", flag: "🇺🇸" },
];

function countryMeta(code?: string, name?: string) {
  const c = String(code || "FR").toUpperCase().slice(0, 2);
  const hit = TEAM_COUNTRIES.find((x) => x.code === c);
  return {
    code: c,
    label: name || hit?.label || c,
    flag: hit?.flag || "",
  };
}

function resolveAvatar(p: any): string | null {
  return p?.avatarDataUrl || p?.avatarUrl || p?.avatar || null;
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

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button
          onClick={() => go("petanque_menu" as any)}
          style={{
            borderRadius: 999,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            color: theme.text,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          ← {t("common.back", "Retour")}
        </button>

        <button
          onClick={handleCreate}
          style={{
            borderRadius: 999,
            border: "none",
            background: theme.primary,
            color: "#0b0b12",
            padding: "8px 12px",
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: `0 0 18px ${theme.primary}66`,
          }}
        >
          + {t("teams.create", "Créer")}
        </button>
      </div>

      <h1 style={{ margin: 0, textAlign: "center", color: theme.primary, textTransform: "uppercase", letterSpacing: 2 }}>
        {t("teams.title", "Teams")}
      </h1>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {teams.length === 0 && (
          <div style={{ opacity: 0.75, fontSize: 13 }}>{t("teams.empty", "Aucune équipe. Clique sur “Créer”.")}</div>
        )}

        {teams.map((tm) => {
          const c = countryMeta(tm.countryCode, tm.countryName);
          const isFR = String(tm.countryCode || "").toUpperCase() === "FR";
          const regionLogo = isFR ? (tm.regionLogoDataUrl || null) : null;

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
    border: `1px solid ${theme.borderSoft}`,
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.16))",
    boxShadow: "0 14px 34px rgba(0,0,0,0.55)",
    padding: 12,
    position: "relative",
    overflow: "hidden",
  }}
>
  {/* Accent néon gauche */}
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      background: `linear-gradient(180deg, ${theme.primary}dd, transparent)`,
      boxShadow: `0 0 18px ${theme.primary}88`,
      opacity: 0.9,
    }}
  />

  {/* Bandeau top */}
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 26,
      background: "linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0))",
      borderBottom: `1px solid rgba(255,255,255,0.08)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 10px 0 12px",
      pointerEvents: "none",
    }}
  >
    <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.85, color: theme.primary, fontWeight: 900 }}>TEAM</div>
    <div style={{ fontSize: 10, letterSpacing: 1.5, opacity: 0.55 }}>{String(tm.id).slice(0, 6)}</div>
  </div>

  {/* Glow */}
  <div
    style={{
      position: "absolute",
      inset: -2,
      pointerEvents: "none",
      background: `radial-gradient(520px 180px at 20% -10%, ${theme.primary}33, transparent 60%),
                   radial-gradient(420px 160px at 110% 10%, ${theme.primary}22, transparent 55%)`,
    }}
  />

  <div style={{ display: "flex", gap: 12, alignItems: "center", position: "relative", paddingTop: 8 }}>
    {/* Logo + anneau */}
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
          transform: "translateY(-1px)",
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

    {/* Contenu */}
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Row nom + chip joueurs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
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

        <div
          style={{
            flex: "0 0 auto",
            fontSize: 11,
            fontWeight: 900,
            opacity: 0.9,
            border: `1px solid rgba(255,255,255,0.14)`,
            background: "rgba(0,0,0,0.18)",
            padding: "4px 10px",
            borderRadius: 999,
            boxShadow: `0 0 16px ${theme.primary}22`,
          }}
          title={t("teams.players", "Joueurs")}
        >
          {Array.isArray(tm.playerIds) ? tm.playerIds.length : 0} {t("common.players", "joueurs")}
        </div>
      </div>

      {/* slogan */}
      {tm.slogan ? (
        <div style={{ marginTop: 2, fontSize: 12, opacity: 0.72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tm.slogan}
        </div>
      ) : null}

      {/* Row badges */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        {/* Drapeau */}
        <div
          title={c.label}
          style={{
            width: 22,
            height: 22,
            borderRadius: 9,
            border: `1px solid rgba(255,255,255,0.14)`,
            background: "rgba(0,0,0,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          {c.flag ? c.flag : c.code}
        </div>

        {/* Région */}
        {isFR ? (
          <div
            title={tm.regionName || "Région"}
            style={{
              width: 22,
              height: 22,
              borderRadius: 9,
              border: `1px solid rgba(255,255,255,0.14)`,
              background: "rgba(0,0,0,0.22)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {regionLogo ? (
              <img src={regionLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <span style={{ fontWeight: 900, fontSize: 11, color: theme.primary }}>R</span>
            )}
          </div>
        ) : null}

        <div style={{ fontSize: 12, opacity: 0.78, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800 }}>{c.label}</span>
          {isFR && tm.regionName ? (
            <>
              <span style={{ opacity: 0.5 }}>•</span>
              <span>{tm.regionName}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Avatars stack */}
      {picked.length > 0 ? (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {picked.map((p: any, idx: number) => {
              const src = resolveAvatar(p);
              const letter = (p?.name || "?").slice(0, 1).toUpperCase();
              return (
                <div
                  key={String(p?.id)}
                  title={p?.name || ""}
                  style={{
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
                  }}
                >
                  {src ? (
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 900 }}>{letter}</span>
                  )}
                </div>
              );
            })}
          </div>

          {moreCount > 0 ? (
            <div
              style={{
                marginLeft: 10,
                fontSize: 12,
                opacity: 0.85,
                border: `1px solid rgba(255,255,255,0.14)`,
                background: "rgba(0,0,0,0.18)",
                padding: "3px 8px",
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

    {/* Rail actions */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: "0 0 auto",
        paddingLeft: 2,
      }}
    >
      <button
        onClick={() => go("petanque_team_edit" as any, { teamId: tm.id })}
        title={t("common.edit", "Éditer")}
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          border: `1px solid rgba(255,255,255,0.14)`,
          background: "rgba(0,0,0,0.22)",
          color: theme.text,
          cursor: "pointer",
          fontWeight: 900,
          boxShadow: `0 0 16px ${theme.primary}18`,
        }}
      >
        ✎
      </button>

      <button
        onClick={() => handleDelete(tm.id)}
        title={t("common.delete", "Supprimer")}
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          border: `1px solid rgba(255,80,120,0.35)`,
          background: "rgba(255,80,120,0.12)",
          color: "#ffd1e0",
          cursor: "pointer",
          fontWeight: 900,
          boxShadow: "0 0 16px rgba(255,80,120,0.18)",
        }}
      >
        ×
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
