// src/pages/SettingsAudioKiller.tsx
// Panel "Voix IA – Killer" (GLOBAL) à intégrer dans ta page Settings/Audio.

import React from "react";
import { getKillerVoiceSettings, setKillerVoiceSettings } from "../lib/killerVoice";

type K = "hit" | "self" | "autokill";

export default function SettingsAudioKiller() {
  const initial = React.useMemo(() => getKillerVoiceSettings(), []);
  const [enabled, setEnabled] = React.useState<boolean>(initial.enabled);
  const [delayMs, setDelayMs] = React.useState<number>(initial.delayMs);
  const [phrases, setPhrases] = React.useState<Record<K, string[]>>(initial.phrases as any);

  React.useEffect(() => {
    setKillerVoiceSettings({ enabled, delayMs, phrases });
  }, [enabled, delayMs, phrases]);

  const setList = (k: K, text: string) => {
    const arr = text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    setPhrases((p) => ({ ...p, [k]: arr }));
  };

  const editor = (k: K, title: string, hint: string) => (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>{hint}</div>
      <textarea
        value={(phrases[k] || []).join("\n")}
        onChange={(e) => setList(k, e.target.value)}
        rows={5}
        style={{
          width: "100%",
          borderRadius: 12,
          padding: 10,
          background: "rgba(255,255,255,.04)",
          border: "1px solid rgba(255,255,255,.10)",
          color: "#fff",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
    </div>
  );

  const resetDefaults = () => {
    // purge localStorage keys => fallback defaults
    try {
      localStorage.removeItem("killer_voice_phrases_v1");
      localStorage.removeItem("killer_voice_delay_ms");
      localStorage.removeItem("killer_voice_enabled");
    } catch {}
    const s = getKillerVoiceSettings();
    setEnabled(s.enabled);
    setDelayMs(s.delayMs);
    setPhrases(s.phrases as any);
  };

  const exportJson = async () => {
    const payload = { enabled, delayMs, phrases };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      alert("Export copié dans le presse-papier.");
    } catch {
      alert(JSON.stringify(payload, null, 2));
    }
  };

  const importJson = () => {
    const raw = prompt("Colle ici le JSON d'import :");
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      if (typeof obj.enabled === "boolean") setEnabled(obj.enabled);
      if (typeof obj.delayMs === "number") setDelayMs(obj.delayMs);
      if (obj.phrases && typeof obj.phrases === "object") setPhrases(obj.phrases);
    } catch {
      alert("JSON invalide.");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
        Voix IA — Killer (GLOBAL)
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Activer la voix (TTS)
      </label>

      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Délai après bruitage (ms)</div>
        <input
          type="number"
          value={delayMs}
          onChange={(e) => setDelayMs(Number(e.target.value))}
          style={{
            width: 140,
            borderRadius: 10,
            padding: "6px 10px",
            background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.10)",
            color: "#fff",
          }}
        />
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
          Astuce: 2000–2500ms marche bien.
        </div>
      </div>

      {editor("hit", "🎯 Hit adverse", "Variables: {killer}, {victim} — 1 phrase par ligne")}
      {editor("self", "🤦 Self-hit", "Variables: {killer} — 1 phrase par ligne")}
      {editor("autokill", "☠️ Auto-kill", "Variables: {killer} — 1 phrase par ligne")}

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={resetDefaults}>Reset défaut</button>
        <button onClick={exportJson}>Exporter (copier JSON)</button>
        <button onClick={importJson}>Importer</button>
      </div>

      <div style={{ opacity: 0.65, fontSize: 12, marginTop: 10 }}>
        Note: Sur iOS, la voix peut nécessiter une interaction utilisateur préalable (un tap) — tu l’as déjà en lançant un dart.
      </div>
    </div>
  );
}
