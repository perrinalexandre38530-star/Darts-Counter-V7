// @ts-nocheck
// =============================================================
// src/pages/BatardConfig.tsx
// BATARD — Config (preset + règles de base)
// Style volontairement proche des configs existantes (safe)
// =============================================================
import * as React from "react";
import { useTheme } from "../contexts/ThemeContext";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import { BATARD_PRESETS, getBatardPreset } from "../lib/batard/batardPresets";

type Props = {
  store: any;
  go: (tab: any, params?: any) => void;
  onBack?: () => void;
};

export default function BatardConfigPage(props: Props) {
  const { store, go } = props;
  const theme = useTheme?.() || ({} as any);

  const profiles = (store?.profiles || []).filter((p: any) => !p?.archived);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    profiles.slice(0, 2).map((p: any) => p.id)
  );

  const [presetId, setPresetId] = React.useState<string>(BATARD_PRESETS[0].presetId);
  const [failPolicy, setFailPolicy] = React.useState<any>(getBatardPreset(presetId).failPolicy);
  const [failValue, setFailValue] = React.useState<number>(getBatardPreset(presetId).failValue);

  React.useEffect(() => {
    const p = getBatardPreset(presetId);
    setFailPolicy(p.failPolicy);
    setFailValue(p.failValue);
  }, [presetId]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      return [...prev, id].slice(0, 8);
    });
  };

  const start = () => {
    const preset = getBatardPreset(presetId);
    const cfg = {
      ...preset,
      failPolicy,
      failValue,
    };
    const players = selectedIds.length ? selectedIds : profiles.slice(0, 2).map((p: any) => p.id);
    go("batard_play", { config: cfg, players });
  };

  return (
    <div style={{ padding: 16, color: theme?.colors?.text || "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <BackDot onClick={() => go("games")} />
        <div style={{ fontWeight: 900, letterSpacing: 2 }}>BATARD</div>
        <InfoDot onClick={() => alert("BATARD = mode configurable (presets + règles d'échec).")} />
      </div>

      <div style={{ marginTop: 14, opacity: 0.9 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Preset</div>
        <select
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 12 }}
        >
          {BATARD_PRESETS.map((p) => (
            <option key={p.presetId} value={p.presetId}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 14, opacity: 0.95 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Règle d'échec (0 hit valide sur la volée)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <select
            value={failPolicy}
            onChange={(e) => setFailPolicy(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 12 }}
          >
            <option value="NONE">Aucune</option>
            <option value="MINUS_POINTS">Malus points</option>
            <option value="BACK_ROUND">Recul round</option>
            <option value="FREEZE">Freeze (reste)</option>
          </select>
          <input
            type="number"
            value={failValue}
            onChange={(e) => setFailValue(Number(e.target.value))}
            style={{ width: "100%", padding: 10, borderRadius: 12 }}
            placeholder="Valeur"
          />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Joueurs</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {profiles.map((p: any) => {
            const on = selectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                style={{
                  padding: 10,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: on ? "rgba(0,255,200,0.18)" : "rgba(255,255,255,0.06)",
                  color: "inherit",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: 800 }}>{p.name || p.nickname || "Profil"}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{on ? "Sélectionné" : "Tap pour ajouter"}</div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          {selectedIds.length} / 8 sélectionnés
        </div>
      </div>

      <button
        onClick={start}
        style={{
          width: "100%",
          marginTop: 18,
          padding: 14,
          borderRadius: 16,
          fontWeight: 900,
          letterSpacing: 1,
          border: "none",
          background: "linear-gradient(90deg, rgba(255,0,200,0.55), rgba(0,255,255,0.45))",
          color: "#fff",
        }}
      >
        LANCER
      </button>
    </div>
  );
}
