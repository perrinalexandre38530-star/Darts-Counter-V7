// =============================================================
// src/pages/petanque/PetanqueTeamEdit.tsx
// Edition d'une équipe (nom, pays, logo)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import {
  loadPetanqueTeams,
  upsertPetanqueTeam,
  createPetanqueTeam,
  type PetanqueTeam,
} from "../../lib/petanqueTeamsStore";

type Props = { go: (tab: any, params?: any) => void; params?: any };

function findTeam(teamId: string | undefined): PetanqueTeam | null {
  if (!teamId) return null;
  return loadPetanqueTeams().find((t) => t.id === teamId) ?? null;
}

export default function PetanqueTeamEdit({ go, params }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;
  const teamId = params?.teamId as string | undefined;

  const [team, setTeam] = React.useState<PetanqueTeam>(() => findTeam(teamId) ?? createPetanqueTeam({ id: teamId }));

  function save(next: PetanqueTeam) {
    setTeam(next);
    upsertPetanqueTeam(next);
  }

  async function handlePickLogo(file: File | null) {
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("read failed"));
      r.readAsDataURL(file);
    });
    save({ ...team, logoDataUrl: dataUrl });
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <button
        onClick={() => go("petanque_teams" as any)}
        style={{
          borderRadius: 999,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          color: theme.text,
          padding: "6px 10px",
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        ← {t("common.back", "Retour")}
      </button>

      <h1 style={{ margin: 0, textAlign: "center", color: theme.primary, textTransform: "uppercase", letterSpacing: 2 }}>
        {t("teams.edit.title", "Équipe")}
      </h1>

      <div
        style={{
          marginTop: 14,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          padding: 14,
          boxShadow: "0 14px 34px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: 18,
              overflow: "hidden",
              background: "rgba(255,255,255,0.06)",
              border: `1px solid rgba(255,255,255,0.08)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {team.logoDataUrl ? (
              <img src={team.logoDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontWeight: 900, color: theme.primary, fontSize: 20 }}>
                {(team.name || "?").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>{t("teams.edit.logo", "Logo")}</div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePickLogo(e.target.files?.[0] ?? null)}
              style={{ width: "100%" }}
            />
            {team.logoDataUrl && (
              <button
                onClick={() => save({ ...team, logoDataUrl: null })}
                style={{
                  marginTop: 8,
                  borderRadius: 999,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.15)",
                  color: theme.text,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                {t("common.remove", "Retirer")}
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>{t("teams.edit.name", "Nom")}</span>
            <input
              value={team.name}
              onChange={(e) => save({ ...team, name: e.target.value })}
              style={{
                height: 40,
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,0.18)",
                color: theme.text,
                padding: "0 12px",
                outline: "none",
              }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>{t("teams.edit.countryCode", "Code pays")}</span>
              <input
                value={team.countryCode || ""}
                onChange={(e) => save({ ...team, countryCode: e.target.value.toUpperCase().slice(0, 2) })}
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.18)",
                  color: theme.text,
                  padding: "0 12px",
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>{t("teams.edit.countryName", "Pays")}</span>
              <input
                value={team.countryName || ""}
                onChange={(e) => save({ ...team, countryName: e.target.value })}
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,0.18)",
                  color: theme.text,
                  padding: "0 12px",
                  outline: "none",
                }}
              />
            </label>
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, opacity: 0.7 }}>
          {t("teams.edit.hint", "Ces équipes sont utilisées uniquement en Pétanque.")}
        </div>
      </div>
    </div>
  );
}
