// src/pages/SettingsAudioKiller.tsx
import React from "react";
import {
  getKillerVoiceEnabled,
  getKillerVoiceDelay,
  getKillerVoicePhrases,
  setKillerVoicePhrases,
} from "../lib/killerVoice";

const LS_ENABLED = "killer_voice_enabled";
const LS_DELAY = "killer_voice_delay_ms";

export default function SettingsAudioKiller() {
  const [enabled, setEnabled] = React.useState<boolean>(getKillerVoiceEnabled());
  const [delay, setDelay] = React.useState<number>(getKillerVoiceDelay());
  const [phrases, setPhrases] = React.useState(getKillerVoicePhrases());

  React.useEffect(() => {
    localStorage.setItem(LS_ENABLED, String(enabled));
  }, [enabled]);

  React.useEffect(() => {
    localStorage.setItem(LS_DELAY, String(delay));
  }, [delay]);

  React.useEffect(() => {
    setKillerVoicePhrases(phrases);
  }, [phrases]);

  const area = (key: "hit" | "self" | "autokill", label: string) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <textarea
        value={(phrases[key] || []).join("\n")}
        onChange={(e) =>
          setPhrases((p) => ({ ...p, [key]: e.target.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) }))
        }
        rows={5}
        style={{
          width: "100%",
          resize: "vertical",
          padding: 10,
          borderRadius: 12,
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(255,255,255,0.12)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 12,
        }}
      />
      <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
        Variables: {"{killer}"} {key === "hit" ? `, {victim}` : ""}
      </div>
    </div>
  );

  const reset = () => {
    const def = getKillerVoicePhrases(); // already falls back to defaults if none
    setPhrases(def);
  };

  const exportJson = async () => {
    const data = JSON.stringify(phrases, null, 2);
    try {
      await navigator.clipboard.writeText(data);
      alert("JSON copié dans le presse-papiers.");
    } catch {
      prompt("Copie ce JSON :", data);
    }
  };

  const importJson = () => {
    const raw = prompt("Colle le JSON (hit/self/autokill) :");
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      setPhrases({
        hit: Array.isArray(obj.hit) ? obj.hit : [],
        self: Array.isArray(obj.self) ? obj.self : [],
        autokill: Array.isArray(obj.autokill) ? obj.autokill : [],
      });
    } catch {
      alert("JSON invalide.");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>Voix IA — Killer</div>

      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <span>Activer la voix (TTS)</span>
      </label>

      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ opacity: 0.9 }}>Délai (ms)</span>
        <input
          type="number"
          value={delay}
          min={0}
          step={100}
          onChange={(e) => setDelay(Number(e.target.value))}
          style={{
            width: 120,
            padding: "6px 8px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        />
        <span style={{ opacity: 0.7, fontSize: 12 }}>(recommandé: 2000–2500)</span>
      </div>

      {area("hit", "Hit adverse")}
      {area("self", "Self-hit")}
      {area("autokill", "Auto-kill")}

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={reset} style={{ padding: "8px 12px", borderRadius: 12, cursor: "pointer" }}>
          Reset défaut
        </button>
        <button onClick={exportJson} style={{ padding: "8px 12px", borderRadius: 12, cursor: "pointer" }}>
          Export JSON
        </button>
        <button onClick={importJson} style={{ padding: "8px 12px", borderRadius: 12, cursor: "pointer" }}>
          Import JSON
        </button>
      </div>
    </div>
  );
}
