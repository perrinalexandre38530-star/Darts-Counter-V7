import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAwena } from "../AwenaProvider";
import type { AwenaInterventionMode } from "../awena.types";

const AVATAR = "/awena/awena-avatar.webp";

export default function AwenaSettingsSection() {
  const { theme } = useTheme() as any;
  const { settings, setSettings, voiceStatus, voices, refreshVoices, say, stop } = useAwena();
  const primary = theme?.primary || "#22e6ff";

  function patch(next: Partial<typeof settings>) {
    setSettings((prev) => ({ ...prev, ...next }));
  }

  const modes: Array<[AwenaInterventionMode, string, string]> = [
    ["off", "Désactivée", "Awena reste totalement silencieuse et masquée."],
    ["discreet", "Discrète", "Accessible manuellement, sans interventions spontanées."],
    ["active", "Active", "Assistante disponible et réactions importantes."],
    ["coach", "Coach", "Conseils et accompagnement plus fréquents pendant les parties."],
  ];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ borderRadius: 18, border: `1px solid ${primary}66`, background: "linear-gradient(180deg,rgba(10,15,32,.95),rgba(4,7,18,.98))", padding: 14, boxShadow: `0 0 24px ${primary}18` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={AVATAR} alt="Awena" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `2px solid ${primary}`, boxShadow: `0 0 18px ${primary}66` }} />
          <div>
            <div style={{ color: "#fff", fontWeight: 950, fontSize: 20, letterSpacing: 1 }}>AWENA</div>
            <div style={{ color: primary, fontSize: 11, fontWeight: 900, letterSpacing: .5 }}>PRÉSENTATRICE · ASSISTANTE · BOT IA</div>
            <div style={{ color: theme.textSoft, fontSize: 11, marginTop: 5, lineHeight: 1.35 }}>La V2 ajoute la mémoire de conversation, la navigation directe dans l’application et le premier contexte de partie en direct avec X01. La couche vocale reste locale et pourra recevoir ensuite le modèle neuronal officiel d’Awena sans modifier les modes de jeu.</div>
          </div>
        </div>
      </section>

      <section style={{ borderRadius: 18, border: `1px solid ${theme.borderSoft}`, background: theme.card, padding: 14 }}>
        <div style={{ color: primary, fontWeight: 950, fontSize: 13, textTransform: "uppercase", marginBottom: 9 }}>Présence d'Awena</div>
        <div style={{ display: "grid", gap: 7 }}>
          {modes.map(([id, label, desc]) => {
            const active = settings.interventionMode === id;
            return <button key={id} onClick={() => patch({ interventionMode: id, enabled: id !== "off" })} style={{ textAlign: "left", padding: 10, borderRadius: 12, border: `1px solid ${active ? primary : theme.borderSoft}`, background: active ? `${primary}18` : "rgba(0,0,0,.15)", color: "#fff", cursor: "pointer" }}>
              <div style={{ fontSize: 12, fontWeight: 950 }}>{label}</div>
              <div style={{ color: theme.textSoft, fontSize: 10.5, marginTop: 2 }}>{desc}</div>
            </button>;
          })}
        </div>
      </section>

      <section style={{ borderRadius: 18, border: `1px solid ${theme.borderSoft}`, background: theme.card, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ color: primary, fontWeight: 950, fontSize: 13, textTransform: "uppercase" }}>Awena Voice · Local V2</div>
            <div style={{ color: theme.textSoft, fontSize: 10.5, marginTop: 3 }}>
              {voiceStatus?.engine === "android-native" ? `Android local${voiceStatus.enginePackage ? ` · ${voiceStatus.enginePackage}` : ""}` : voiceStatus?.engine === "web-speech" ? "Prévisualisation navigateur" : "Moteur vocal indisponible"}
            </div>
          </div>
          <button onClick={() => patch({ voiceEnabled: !settings.voiceEnabled })} style={{ borderRadius: 999, padding: "7px 11px", border: `1px solid ${settings.voiceEnabled ? primary : theme.borderSoft}`, background: settings.voiceEnabled ? `${primary}22` : "rgba(0,0,0,.2)", color: settings.voiceEnabled ? primary : theme.textSoft, fontWeight: 900, cursor: "pointer" }}>{settings.voiceEnabled ? "VOIX ON" : "VOIX OFF"}</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
          <label style={{ color: theme.textSoft, fontSize: 10.5 }}>Débit
            <input type="range" min="0.65" max="1.45" step="0.05" value={settings.rate} onChange={(e) => patch({ rate: Number(e.target.value) })} style={{ width: "100%" }} />
          </label>
          <label style={{ color: theme.textSoft, fontSize: 10.5 }}>Tonalité
            <input type="range" min="0.75" max="1.25" step="0.05" value={settings.pitch} onChange={(e) => patch({ pitch: Number(e.target.value) })} style={{ width: "100%" }} />
          </label>
        </div>

        <label style={{ display: "block", color: theme.textSoft, fontSize: 10.5, marginTop: 8 }}>Voix française installée
          <select value={settings.voiceName || ""} onChange={(e) => patch({ voiceName: e.target.value || null })} style={{ width: "100%", marginTop: 5, borderRadius: 11, padding: "9px 10px", border: `1px solid ${theme.borderSoft}`, background: "#080b18", color: "#fff" }}>
            <option value="">Automatique</option>
            {voices.map((voice) => {
              const quality = Number(voice.quality || 0);
              const qualityLabel = quality >= 500 ? " · qualité ++" : quality >= 400 ? " · haute qualité" : "";
              return <option key={voice.name} value={voice.name}>{voice.name}{qualityLabel}{voice.offline ? " · hors ligne" : ""}</option>;
            })}
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 11, marginTop: 10 }}>
          <input type="checkbox" checked={settings.autoSpeak} onChange={(e) => patch({ autoSpeak: e.target.checked })} /> Lire automatiquement les réponses d'Awena
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginTop: 12 }}>
          <button onClick={() => void say("Bonjour, moi c'est Awena. Je suis prête à t'accompagner dans MULTISPORTS SCORING.")} style={{ borderRadius: 11, border: `1px solid ${primary}`, background: `${primary}18`, color: "#fff", padding: 9, fontWeight: 900, cursor: "pointer", fontSize: 10.5 }}>Tester</button>
          <button onClick={() => void stop()} style={{ borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.04)", color: "#fff", padding: 9, fontWeight: 900, cursor: "pointer", fontSize: 10.5 }}>Stop</button>
          <button onClick={() => void refreshVoices()} style={{ borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.04)", color: "#fff", padding: 9, fontWeight: 900, cursor: "pointer", fontSize: 10.5 }}>Actualiser</button>
        </div>
      </section>
    </div>
  );
}
