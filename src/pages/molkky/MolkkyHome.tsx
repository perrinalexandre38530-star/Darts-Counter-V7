// =============================================================
// src/pages/molkky/MolkkyHome.tsx
// Home MÖLKKY (LOCAL ONLY)
// - Aligné sur Home sport-aware (Pétanque/Ping-Pong/Baby-Foot)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import BackDot from "../../components/BackDot";
import PageHeader from "../../components/PageHeader";

type Props = {
  store: any;
  update: (p: any) => void;
  go: (t: any, p?: any) => void;
};

export default function MolkkyHome({ go }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  return (
    <div style={wrap(theme)}>
      <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", gap: 10 }}>
        <BackDot onClick={() => go("gameSelect")} />
        <PageHeader title="MÖLKKY" />
        <div />
      </div>

      <div style={card(theme)}>
        <div style={{ fontWeight: 1000, letterSpacing: 1, marginBottom: 8 }}>Bienvenue</div>
        <div style={{ opacity: 0.85, lineHeight: 1.35 }}>
          {t?.("Choisis un mode de jeu") ?? "Choisis un mode de jeu"}.
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <button style={btn(theme)} onClick={() => go("molkky_menu")}>MENU MÖLKKY</button>
        <button style={btn(theme)} onClick={() => go("molkky_config")}>NOUVELLE PARTIE</button>
        <button style={btn(theme)} onClick={() => go("molkky_stats")}>STATISTIQUES</button>
      </div>
    </div>
  );
}

const wrap = (theme: any) => ({
  minHeight: "100vh",
  padding: 14,
  background: theme?.colors?.bg ?? "#05060a",
  color: theme?.colors?.text ?? "#fff",
});

const card = (theme: any) => ({
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 18,
  padding: 12,
  margin: "12px 0",
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});

const btn = (theme: any) => ({
  width: "100%",
  borderRadius: 16,
  padding: "14px 12px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 1100,
  letterSpacing: 1,
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});
