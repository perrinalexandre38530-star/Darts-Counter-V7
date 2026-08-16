import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAwena } from "../AwenaProvider";
import type { AwenaInterventionMode } from "../awena.types";
import { AWENA_VOICE_PROFILE } from "../AwenaVoiceProfile";
import { awenaLine } from "../AwenaVoiceCatalog";
import { awenaVoice } from "../AwenaVoice";

const AVATAR = "/awena/awena-avatar.webp";

function mb(bytes?: number) {
  if (!Number.isFinite(Number(bytes))) return "0";
  return (Number(bytes) / (1024 * 1024)).toFixed(1);
}

export default function AwenaSettingsSection() {
  const { theme } = useTheme() as any;
  const { settings, setSettings, voiceStatus, refreshVoices, say, stop } = useAwena();
  const [voiceBusy, setVoiceBusy] = React.useState(false);
  const [voiceError, setVoiceError] = React.useState<string | null>(null);
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

  const neuralInstalled = !!voiceStatus?.neuralInstalled;
  const neuralReady = !!voiceStatus?.neuralReady;
  const installing = voiceBusy || !!voiceStatus?.installing || !!voiceStatus?.neuralInitializing;
  const progress = Math.max(0, Math.min(1, Number(voiceStatus?.installProgress || 0)));

  async function installAwenaStableVoice() {
    if (installing) return;
    setVoiceBusy(true);
    setVoiceError(null);
    const timer = window.setInterval(() => { void refreshVoices(); }, 650);
    try {
      await awenaVoice.installNeuralVoice();
      patch({ voiceName: "Awena · voix française stable", voiceEnabled: true });
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : String(error));
    } finally {
      window.clearInterval(timer);
      setVoiceBusy(false);
      await refreshVoices();
    }
  }

  async function removeAwenaStableVoice() {
    if (installing) return;
    setVoiceBusy(true);
    setVoiceError(null);
    try {
      await stop();
      await awenaVoice.removeNeuralVoice();
      patch({ voiceName: null });
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : String(error));
    } finally {
      setVoiceBusy(false);
      await refreshVoices();
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ borderRadius: 18, border: `1px solid ${primary}66`, background: "linear-gradient(180deg,rgba(10,15,32,.95),rgba(4,7,18,.98))", padding: 14, boxShadow: `0 0 24px ${primary}18` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={AVATAR} alt="Awena" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `2px solid ${primary}`, boxShadow: `0 0 18px ${primary}66` }} />
          <div>
            <div style={{ color: "#fff", fontWeight: 950, fontSize: 20, letterSpacing: 1 }}>AWENA</div>
            <div style={{ color: primary, fontSize: 11, fontWeight: 900, letterSpacing: .5 }}>PRÉSENTATRICE · ASSISTANTE · BOT IA</div>
            <div style={{ color: theme.textSoft, fontSize: 11, marginTop: 5, lineHeight: 1.35 }}>
              Awena dispose maintenant de son moteur vocal neuronal local et de sa voix française stable. Une fois le pack installé, la synthèse se fait directement sur l'appareil.
            </div>
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

      <section style={{ borderRadius: 18, border: `1px solid ${neuralReady ? "#36f59a88" : theme.borderSoft}`, background: theme.card, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ color: primary, fontWeight: 950, fontSize: 13, textTransform: "uppercase" }}>Awena Voice · Stable V6</div>
            <div style={{ color: theme.textSoft, fontSize: 10.5, marginTop: 3, lineHeight: 1.45 }}>
              {neuralReady
                ? "VITS/Piper FR · sherpa-onnx · local / hors ligne"
                : neuralInstalled
                  ? "Pack vocal installé · initialisation du moteur neuronal…"
                  : installing
                    ? "Installation du pack vocal Awena…"
                    : "Pack vocal neural Awena non installé"}
            </div>
            <div style={{ marginTop: 4, color: neuralReady ? "#36f59a" : "#ffd84a", fontWeight: 900, fontSize: 10.5 }}>
              {AWENA_VOICE_PROFILE.displayName}
            </div>
          </div>
          <button onClick={() => patch({ voiceEnabled: !settings.voiceEnabled })} style={{ borderRadius: 999, padding: "7px 11px", border: `1px solid ${settings.voiceEnabled ? primary : theme.borderSoft}`, background: settings.voiceEnabled ? `${primary}22` : "rgba(0,0,0,.2)", color: settings.voiceEnabled ? primary : theme.textSoft, fontWeight: 900, cursor: "pointer" }}>
            {settings.voiceEnabled ? "VOIX ON" : "VOIX OFF"}
          </button>
        </div>

        {!neuralReady && (
          <div style={{ marginTop: 12, borderRadius: 13, border: `1px solid ${primary}44`, background: "rgba(0,0,0,.2)", padding: 11 }}>
            <div style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>
              Installation unique du moteur vocal français stable
            </div>
            <div style={{ color: theme.textSoft, fontSize: 10.5, marginTop: 4, lineHeight: 1.45 }}>
              Environ 80 Mo sont installés une seule fois puis conservés par l'application. Après cela, Awena génère sa voix localement sans service vocal externe.
            </div>

            {installing && (
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)" }}>
                  <div style={{ width: `${Math.round(progress * 100)}%`, height: "100%", background: "linear-gradient(90deg,#ffe600,#27ff88,#16e8ff,#ff38c7)", transition: "width .25s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: theme.textSoft, fontSize: 9.5, marginTop: 5 }}>
                  <span>{Math.round(progress * 100)} % {voiceStatus?.currentFile ? `· ${voiceStatus.currentFile}` : ""}</span>
                  <span>{mb(voiceStatus?.downloadedBytes)} / {mb(voiceStatus?.totalBytes)} Mo</span>
                </div>
              </div>
            )}

            {!installing && !neuralReady && (
              <button onClick={() => void installAwenaStableVoice()} style={{ width: "100%", marginTop: 10, borderRadius: 12, border: `1px solid ${primary}`, background: `linear-gradient(135deg,${primary}22,rgba(255,56,199,.16))`, color: "#fff", padding: 10, fontWeight: 950, cursor: "pointer" }}>
                Installer la voix stable d’Awena
              </button>
            )}
          </div>
        )}

        {voiceError || voiceStatus?.lastError ? (
          <div style={{ marginTop: 9, color: "#ff8d9a", fontSize: 10.5, lineHeight: 1.4 }}>
            {voiceError || voiceStatus?.lastError}
          </div>
        ) : null}

        <label style={{ display: "block", color: theme.textSoft, fontSize: 10.5, marginTop: 12 }}>
          Volume d'Awena · {Math.round(settings.volume * 100)} %
          <input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(e) => patch({ volume: Number(e.target.value) })} style={{ width: "100%" }} />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", fontSize: 11, marginTop: 10 }}>
          <input type="checkbox" checked={settings.autoSpeak} onChange={(e) => patch({ autoSpeak: e.target.checked })} /> Lire automatiquement les réponses d'Awena
        </label>

        <div style={{ display: "grid", gridTemplateColumns: neuralReady ? "1fr 1fr 1fr" : "1fr", gap: 7, marginTop: 12 }}>
          {neuralReady && <>
            <button onClick={() => void say(`${awenaLine("identity", "hello")} ${awenaLine("identity", "welcome")} ${awenaLine("identity", "ready")}`)} style={{ borderRadius: 11, border: `1px solid ${primary}`, background: `${primary}18`, color: "#fff", padding: 9, fontWeight: 900, cursor: "pointer", fontSize: 10.5 }}>Tester Awena</button>
            <button onClick={() => void stop()} style={{ borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.04)", color: "#fff", padding: 9, fontWeight: 900, cursor: "pointer", fontSize: 10.5 }}>Stop</button>
            <button onClick={() => void removeAwenaStableVoice()} style={{ borderRadius: 11, border: "1px solid rgba(255,90,110,.45)", background: "rgba(255,60,90,.06)", color: "#ffb2bb", padding: 9, fontWeight: 900, cursor: "pointer", fontSize: 10.5 }}>Supprimer pack</button>
          </>}
          {!neuralReady && neuralInstalled && !installing && (
            <button onClick={() => void installAwenaStableVoice()} style={{ borderRadius: 11, border: `1px solid ${primary}`, background: `${primary}18`, color: "#fff", padding: 9, fontWeight: 900, cursor: "pointer", fontSize: 10.5 }}>Initialiser Awena</button>
          )}
        </div>
      </section>
    </div>
  );
}
