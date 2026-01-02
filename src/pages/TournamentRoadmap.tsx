// ============================================
// src/pages/TournamentRoadmap.tsx
// TOURNOIS — ROADMAP (LOCAL)
// - Page simple style "cards"
// - Explique BRACKET / AUTO / BYE / SWISS / EXPORT / STATS
// - CTA vers création BRACKET/AUTO
// ============================================

import React from "react";

type Props = {
  go: (tab: any, params?: any) => void;
};

function Card({
  children,
  tone = "dark",
}: {
  children: React.ReactNode;
  tone?: "dark" | "gold" | "blue" | "pink" | "green";
}) {
  const bg =
    tone === "gold"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.14), transparent 55%), linear-gradient(180deg, rgba(22,22,26,.96), rgba(10,10,12,.98))"
      : tone === "blue"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(79,180,255,.12), transparent 55%), linear-gradient(180deg, rgba(18,18,26,.96), rgba(10,10,12,.98))"
      : tone === "pink"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(255,79,216,.12), transparent 55%), linear-gradient(180deg, rgba(18,18,26,.96), rgba(10,10,12,.98))"
      : tone === "green"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(127,226,169,.12), transparent 55%), linear-gradient(180deg, rgba(18,18,26,.96), rgba(10,10,12,.98))"
      : "linear-gradient(180deg, rgba(24,24,30,.96), rgba(10,10,12,.98))";

  const border =
    tone === "gold"
      ? "1px solid rgba(255,195,26,.22)"
      : "1px solid rgba(255,255,255,.10)";

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        background: bg,
        border,
        boxShadow: "0 18px 45px rgba(0,0,0,.60)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function Pill({
  label,
  tone = "dark",
}: {
  label: string;
  tone?: "dark" | "gold" | "blue" | "pink" | "green";
}) {
  const color =
    tone === "gold"
      ? "#ffd56a"
      : tone === "pink"
      ? "#ff7fe2"
      : tone === "green"
      ? "#7fe2a9"
      : tone === "blue"
      ? "#4fb4ff"
      : "rgba(255,255,255,.86)";

  const border =
    tone === "gold"
      ? "1px solid rgba(255,195,26,.35)"
      : tone === "pink"
      ? "1px solid rgba(255,79,216,.35)"
      : tone === "green"
      ? "1px solid rgba(127,226,169,.35)"
      : tone === "blue"
      ? "1px solid rgba(79,180,255,.35)"
      : "1px solid rgba(255,255,255,.14)";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 950,
        letterSpacing: 0.3,
        color,
        border,
        background: "rgba(0,0,0,.30)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function Row({
  title,
  desc,
  tone,
  status,
}: {
  title: string;
  desc: string;
  tone: "gold" | "pink" | "green" | "blue" | "dark";
  status: "OK" | "EN COURS" | "BIENTÔT";
}) {
  const statusTone =
    status === "OK" ? "green" : status === "EN COURS" ? "gold" : "pink";

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(255,255,255,.04)",
        padding: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Pill label={title} tone={tone} />
          <div style={{ fontWeight: 950, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {desc}
          </div>
        </div>
        <Pill label={status} tone={statusTone as any} />
      </div>
    </div>
  );
}

export default function TournamentRoadmap({ go }: Props) {
  return (
    <div style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
      <Card tone="gold">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => go("tournaments_home")}
            style={{
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(0,0,0,.25)",
              color: "rgba(255,255,255,.90)",
              borderRadius: 12,
              padding: "8px 10px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ← Retour
          </button>

          <div style={{ fontWeight: 950, fontSize: 18, letterSpacing: 0.4 }}>ROADMAP TOURNOIS</div>
        </div>

        <div style={{ opacity: 0.82, fontSize: 12.5, marginTop: 10, lineHeight: 1.35 }}>
          Ici on liste ce qui est déjà solide et ce qu’on développe ensuite (dans l’ordre logique).
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => go("tournament_create", { mode: "bracket_ko_pools" })}
            style={{
              flex: "1 1 180px",
              borderRadius: 999,
              padding: "11px 14px",
              border: "none",
              fontWeight: 950,
              letterSpacing: 0.8,
              background: "linear-gradient(90deg, #ffd56a, #ff4fd8)",
              color: "#1b1508",
              boxShadow: "0 16px 30px rgba(0,0,0,.55)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Créer BRACKET
          </button>

          <button
            onClick={() => go("tournament_create", { mode: "auto" })}
            style={{
              flex: "1 1 180px",
              borderRadius: 999,
              padding: "11px 14px",
              border: "1px solid rgba(255,255,255,.14)",
              fontWeight: 950,
              letterSpacing: 0.8,
              background: "rgba(0,0,0,.25)",
              color: "rgba(255,255,255,.92)",
              boxShadow: "0 16px 30px rgba(0,0,0,.45)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Créer AUTO
          </button>
        </div>
      </Card>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <Card tone="blue">
          <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 10 }}>Fonctions de base</div>
          <div style={{ display: "grid", gap: 8 }}>
            <Row
              title="LOCAL STORAGE"
              desc="Tournois + matchs sauvegardés (IndexedDB) + reprise"
              tone="blue"
              status="OK"
            />
            <Row
              title="REFRESH UI"
              desc="Les nouveaux tournois remontent automatiquement"
              tone="green"
              status="OK"
            />
            <Row
              title="VIEW"
              desc="Résumé / Tableau / Matchs / Poules (multi-vues)"
              tone="blue"
              status="EN COURS"
            />
          </div>
        </Card>

        <Card tone="gold">
          <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 10 }}>BRACKET</div>
          <div style={{ display: "grid", gap: 8 }}>
            <Row
              title="BRACKET KO"
              desc="Arbre par rounds (scroll horizontal) + progression guided"
              tone="gold"
              status="EN COURS"
            />
            <Row
              title="POULES"
              desc="Carrousel poules + classement + matchs"
              tone="gold"
              status="EN COURS"
            />
            <Row
              title="BYE SMART"
              desc="Plus jamais BYE vs BYE, et BYE répartis proprement"
              tone="pink"
              status="EN COURS"
            />
          </div>
        </Card>

        <Card tone="green">
          <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 10 }}>AUTO</div>
          <div style={{ display: "grid", gap: 8 }}>
            <Row
              title="AUTO QUEUE"
              desc="Match suivant proposé automatiquement (1 clic pour lancer)"
              tone="green"
              status="EN COURS"
            />
            <Row
              title="AUTO ADVANCE"
              desc="Quand un match est terminé, le bracket/poules se met à jour"
              tone="green"
              status="EN COURS"
            />
          </div>
        </Card>

        <Card tone="pink">
          <div style={{ fontWeight: 950, fontSize: 14, marginBottom: 10 }}>À venir</div>
          <div style={{ display: "grid", gap: 8 }}>
            <Row
              title="SWISS"
              desc="Rondes suisses (appairage automatique)"
              tone="pink"
              status="BIENTÔT"
            />
            <Row
              title="DOUBLE ELIM"
              desc="Double élimination (winner/loser bracket)"
              tone="pink"
              status="BIENTÔT"
            />
            <Row
              title="EXPORT"
              desc="Export / partage du tournoi (JSON / QR / lien)"
              tone="pink"
              status="BIENTÔT"
            />
            <Row
              title="STATS TOURNOI"
              desc="Top AVG/3D, best visit, checkout %, MVP…"
              tone="pink"
              status="BIENTÔT"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
