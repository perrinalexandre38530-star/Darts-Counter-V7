import React from "react";
import type { Store } from "../lib/types";
import SportLiveHub from "../sportsLive/SportLiveHub";
import LocalSpectatorPanel from "./LocalSpectatorPanel";

type Props = {
  store: Store;
  update: (mut: (s: Store) => Store) => void;
  go: (tab: any, params?: any) => void;
};

type HubTab = "sport_live" | "spectator";

export default function SpectatorPage(props: Props) {
  const [tab, setTab] = React.useState<HubTab>(() => {
    try {
      const saved = localStorage.getItem("msc_spectator_hub_tab_v2");
      return saved === "spectator" ? "spectator" : "sport_live";
    } catch {
      return "sport_live";
    }
  });

  const choose = (next: HubTab) => {
    setTab(next);
    try { localStorage.setItem("msc_spectator_hub_tab_v2", next); } catch {}
  };

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
      <div style={{ position: "sticky", top: 8, zIndex: 5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 7, marginBottom: 13, borderRadius: 16, border: "1px solid rgba(255,255,255,.11)", background: "rgba(8,8,13,.91)", backdropFilter: "blur(12px)", boxShadow: "0 10px 24px rgba(0,0,0,.35)" }}>
        <button type="button" onClick={() => choose("sport_live")} style={tabButton(tab === "sport_live")}>🏆 LIVE & COMPÉTITIONS</button>
        <button type="button" onClick={() => choose("spectator")} style={tabButton(tab === "spectator")}>👁 SPECTATEUR</button>
      </div>

      {tab === "sport_live" ? <SportLiveHub /> : <LocalSpectatorPanel {...props} />}
    </div>
  );
}

function tabButton(active: boolean): React.CSSProperties {
  return { minHeight: 46, borderRadius: 12, border: active ? "1px solid rgba(255,213,106,.52)" : "1px solid rgba(255,255,255,.09)", background: active ? "linear-gradient(180deg, rgba(255,213,106,.20), rgba(255,213,106,.07))" : "rgba(255,255,255,.035)", color: active ? "#ffe492" : "rgba(255,255,255,.74)", fontWeight: 1000, fontSize: 11.5, cursor: "pointer" };
}
