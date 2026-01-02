// ============================================
// src/components/StatsCricketDashboard.tsx
// Dashboard Cricket — KPIs + Heatmap + Tableau
// Utilise useCricketStatsForProfile()
// ✅ FIX: anti-crash si stats.targets undefined / clés string
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useCricketStatsForProfile } from "../hooks/useCricketStats";

export default function StatsCricketDashboard({
  profileId,
}: {
  profileId: string;
}) {
  const { theme } = useTheme();
  const { t } = useLang();

  const { loading, error, stats } = useCricketStatsForProfile(profileId);

  if (loading) return <div style={{ padding: 20 }}>Loading…</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>Erreur</div>;
  if (!stats) return <div style={{ padding: 20 }}>Aucune donnée Cricket</div>;

  const neon = theme.accent ?? "#FFD700";

  // ✅ FIX: targets peut être undefined / ou clés "20" string
  const targetsAny: any = (stats as any).targets ?? {};

  const getTarget = (T: number) => {
    // support number key + string key
    return (
      targetsAny[T] ??
      targetsAny[String(T)] ??
      null
    );
  };

  // ✅ FIX: robust pour accuracy
  const accuracy = Number((stats as any).accuracy ?? 0) || 0;

  return (
    <div style={{ padding: 16 }}>
      <h2
        style={{
          textAlign: "center",
          color: neon,
          fontWeight: 700,
          marginBottom: 12,
          fontSize: 22,
        }}
      >
        {t("stats.cricket.title", "Statistiques Cricket")}
      </h2>

      {/* ==============================
          KPIs
      ============================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <KPI label="Hits" value={(stats as any).totalHits ?? 0} neon={neon} />
        <KPI
          label="Précision"
          value={((accuracy * 100) | 0) + "%"}
          neon={neon}
        />

        <KPI label="Singles" value={(stats as any).singles ?? 0} neon={neon} />
        <KPI label="Doubles" value={(stats as any).doubles ?? 0} neon={neon} />
        <KPI label="Triples" value={(stats as any).triples ?? 0} neon={neon} />

        <KPI label="Meilleure manche" value={(stats as any).bestLeg ?? 0} neon={neon} />
        <KPI label="Pire manche" value={(stats as any).worstLeg ?? 0} neon={neon} />
      </div>

      {/* ==============================
          HEATMAP 15–20 + BULL
      ============================== */}
      <h3
        style={{
          color: neon,
          fontWeight: 600,
          marginTop: 20,
          marginBottom: 10,
        }}
      >
        {t("stats.cricket.byTarget", "Tirs par cible")}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[20, 19, 18, 17, 16, 15, 25].map((T) => {
          const seg: any = getTarget(T);
          if (!seg) return null;

          const S = Number(seg.singles ?? 0) || 0;
          const D = Number(seg.doubles ?? 0) || 0;
          const Tr = Number(seg.triples ?? 0) || 0;

          const total = S + D + Tr || 1;
          const sPct = (S / total) * 100;
          const dPct = (D / total) * 100;
          const tPct = (Tr / total) * 100;

          const hits = Number(seg.hits ?? 0) || 0;

          return (
            <div key={T}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#ccc" }}>{T === 25 ? "BULL" : T}</span>
                <span style={{ color: neon }}>{hits} hits</span>
              </div>

              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  overflow: "hidden",
                  display: "flex",
                  marginTop: 4,
                }}
              >
                <div style={{ width: `${sPct}%`, background: "#0af2" }} />
                <div style={{ width: `${dPct}%`, background: "#0f02" }} />
                <div style={{ width: `${tPct}%`, background: "#f002" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ==============================
          TABLEAU DÉTAILLÉ
      ============================== */}
      <h3
        style={{
          color: neon,
          fontWeight: 600,
          marginTop: 25,
          marginBottom: 10,
        }}
      >
        {t("stats.cricket.details", "Détails par cible")}
      </h3>

      <table style={{ width: "100%", fontSize: 14 }}>
        <thead>
          <tr style={{ color: neon }}>
            <th style={{ textAlign: "left" }}>Cible</th>
            <th>Hits</th>
            <th>Pts+</th>
            <th>Pts-</th>
            <th>Dom</th>
          </tr>
        </thead>
        <tbody>
          {[20, 19, 18, 17, 16, 15, 25].map((T) => {
            const seg: any = getTarget(T);
            if (!seg) return null;

            const hits = Number(seg.hits ?? 0) || 0;
            const ps = Number(seg.pointsScored ?? 0) || 0;
            const pc = Number(seg.pointsConceded ?? 0) || 0;

            // domination peut être 0..1 OU déjà en %
            const domRaw = Number(seg.domination ?? 0) || 0;
            const domPct = domRaw <= 1 ? ((domRaw * 100) | 0) : (domRaw | 0);

            return (
              <tr key={T} style={{ color: "#ddd" }}>
                <td>{T === 25 ? "BULL" : T}</td>
                <td style={{ textAlign: "center" }}>{hits}</td>
                <td style={{ textAlign: "center" }}>{ps}</td>
                <td style={{ textAlign: "center" }}>{pc}</td>
                <td style={{ textAlign: "center" }}>{domPct + "%"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KPI({
  label,
  value,
  neon,
}: {
  label: string;
  value: any;
  neon: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        padding: 10,
        borderRadius: 10,
        border: `1px solid ${neon}40`,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: 20, color: neon, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}
