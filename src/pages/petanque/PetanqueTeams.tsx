// =============================================================
// src/pages/petanque/PetanqueTeams.tsx
// Hub TEAMS Pétanque (liste + création + accès edit)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import {
  loadPetanqueTeams,
  createPetanqueTeam,
  upsertPetanqueTeam,
  deletePetanqueTeam,
  type PetanqueTeam,
} from "../../lib/petanqueTeamsStore";

type Props = { go: (tab: any, params?: any) => void; params?: any };

export default function PetanqueTeams({ go }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

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
            fontWeight: 800,
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

        {teams.map((tm) => (
          <div
            key={tm.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 12,
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                overflow: "hidden",
                background: "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid rgba(255,255,255,0.08)`,
              }}
            >
              {tm.logoDataUrl ? (
                <img src={tm.logoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontWeight: 900, color: theme.primary }}>{(tm.name || "?").slice(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, letterSpacing: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tm.name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {(tm.countryCode || "").toUpperCase()} {tm.countryName ? `• ${tm.countryName}` : ""}
              </div>
            </div>

            <button
              onClick={() => go("petanque_team_edit" as any, { teamId: tm.id })}
              style={{
                borderRadius: 999,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,0.15)",
                color: theme.text,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              {t("common.edit", "Éditer")}
            </button>

            <button
              onClick={() => handleDelete(tm.id)}
              style={{
                borderRadius: 999,
                border: `1px solid rgba(255,80,120,0.35)`,
                background: "rgba(255,80,120,0.12)",
                color: "#ffd1e0",
                padding: "6px 10px",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              {t("common.delete", "Supprimer")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
