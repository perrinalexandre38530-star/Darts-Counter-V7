import React from "react";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import { getOrganizationRankings, resolveOrganizationInstallationQr, type OrganizationInstallation, type OrganizationRankingRow } from "../organizations/organizationService";

export default function OrganizationVenueBoardPage({ params }: { params?: any }) {
  const auth = useAuthOnline() as any;
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const userId = String(auth?.userId || auth?.user?.id || "") || null;
  const token = String(params?.venueToken || "").trim();
  const [item, setItem] = React.useState<OrganizationInstallation | null>(null);
  const [rows, setRows] = React.useState<OrganizationRankingRow[]>([]);
  const [error, setError] = React.useState("");
  const [updatedAt, setUpdatedAt] = React.useState(Date.now());

  const refresh = React.useCallback(async () => {
    try {
      const venue = item || await resolveOrganizationInstallationQr(userId, token);
      if (!item) setItem(venue);
      const result = await getOrganizationRankings(userId, venue.organizationId, { sportId: venue.sportId && venue.sportId !== "Multisport" ? venue.sportId : null });
      setRows(result.slice(0, 12));
      setUpdatedAt(Date.now());
      setError("");
    } catch (e: any) { setError(String(e?.message || e)); }
  }, [item, token, userId]);

  React.useEffect(() => { void refresh(); const id = window.setInterval(() => void refresh(), 30000); return () => window.clearInterval(id); }, [refresh]);

  return <div style={{ position: "fixed", inset: 0, zIndex: 220, overflow: "auto", background: `radial-gradient(circle at 50% -10%, ${theme.primary}22, transparent 42%), #04070d`, color: theme.text, padding: "3vh 4vw" }}>
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ color: theme.primary, fontSize: "clamp(13px,1.4vw,22px)", fontWeight: 1000, letterSpacing: 2 }}>MULTISPORTS SCORING · LIVE VENUE</div>
        <div style={{ marginTop: 9, fontSize: "clamp(28px,4vw,64px)", lineHeight: 1, fontWeight: 1000 }}>{item?.organizationName || "MULTISPORTS SCORING"}</div>
        <div style={{ marginTop: 10, color: theme.textSoft, fontSize: "clamp(14px,1.8vw,26px)" }}>{item ? `${item.name} · ${item.sportId}${item.zoneLabel ? ` · ${item.zoneLabel}` : ""}` : "…"}</div>
      </div>
      {error ? <div style={{ maxWidth: 760, margin: "40px auto", border: "1px solid rgba(255,90,90,.5)", borderRadius: 18, padding: 24, color: "#ffb0b0", textAlign: "center", fontSize: 18 }}>{error}<div style={{ marginTop: 10, color: theme.textSoft, fontSize: 13 }}>{L("Le compte affichant cet écran doit être membre de l’organisation pour consulter le classement interne.", "The account displaying this screen must be a member of the organization to view its internal leaderboard.", "La cuenta que muestra esta pantalla debe ser miembro de la organización para ver la clasificación interna.")}</div></div> : rows.length ? <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row, index) => <div key={`${row.entityType}-${row.entityId}`} style={{ minHeight: 68, borderRadius: 18, border: `1px solid ${index < 3 ? theme.primary : theme.borderSoft}`, background: index < 3 ? `${theme.primary}10` : "rgba(255,255,255,.035)", display: "grid", gridTemplateColumns: "80px minmax(0,1fr) repeat(4,minmax(70px,120px))", alignItems: "center", gap: 12, padding: "10px 18px" }}>
          <div style={{ color: index < 3 ? theme.primary : theme.textSoft, fontSize: index < 3 ? 34 : 24, fontWeight: 1000 }}>#{row.rank}</div>
          <div style={{ minWidth: 0, fontSize: "clamp(18px,2vw,30px)", fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.displayName}</div>
          <Metric label="MJ" value={row.played} color={theme.text} />
          <Metric label="V" value={row.wins} color={theme.primary} />
          <Metric label="PTS" value={row.points} color={theme.primary} />
          <Metric label="FORME" value={row.recentForm || "—"} color={theme.text} />
        </div>)}
      </div> : !error ? <div style={{ textAlign: "center", color: theme.textSoft, fontSize: 22, marginTop: "18vh" }}>{L("Aucun résultat classé pour le moment.", "No ranked results yet.", "Aún no hay resultados clasificados.")}</div> : null}
      <div style={{ marginTop: 24, color: theme.textSoft, textAlign: "right", fontSize: 12 }}>{L("Actualisation automatique", "Auto refresh", "Actualización automática")} · {new Date(updatedAt).toLocaleTimeString()}</div>
    </div>
  </div>;
}

function Metric({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return <div style={{ textAlign: "center" }}><div style={{ color, fontSize: "clamp(16px,1.8vw,28px)", fontWeight: 1000 }}>{value}</div><div style={{ marginTop: 2, color: "rgba(255,255,255,.5)", fontSize: 10, fontWeight: 900 }}>{label}</div></div>;
}
