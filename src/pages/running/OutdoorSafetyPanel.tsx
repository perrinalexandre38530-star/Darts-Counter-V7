import React from "react";
import { saveRunningLocalJson } from "../../activity/runningShared";
import { estimateOutdoorRouteDurationMs } from "../../activity/outdoorNavigation";
import type { OutdoorPerformanceSport } from "../../activity/outdoorPerformance";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import { RunningSurface } from "./RunningUi";

const STORAGE_KEY = "mss-outdoor-safety-v1";

type SafetyPrefs = {
  emergencyName: string;
  emergencyPhone: string;
  solo: boolean;
  returnBufferMin: number;
};

function loadPrefs(): SafetyPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      emergencyName: String(raw?.emergencyName || "").slice(0, 60),
      emergencyPhone: String(raw?.emergencyPhone || "").slice(0, 32),
      solo: raw?.solo === true,
      returnBufferMin: [30, 60, 90, 120].includes(Number(raw?.returnBufferMin)) ? Number(raw.returnBufferMin) : 60,
    };
  } catch {
    return { emergencyName: "", emergencyPhone: "", solo: false, returnBufferMin: 60 };
  }
}

export default function OutdoorSafetyPanel({ route, sport, lang, accent, textSoft }: { route: RunningRouteTemplate | null; sport: OutdoorPerformanceSport; lang: string; accent: string; textSoft: string }) {
  const [prefs, setPrefs] = React.useState<SafetyPrefs>(() => loadPrefs());
  const [open, setOpen] = React.useState(false);
  const [shared, setShared] = React.useState(false);
  const expectedMs = route ? estimateOutdoorRouteDurationMs(route, sport) : 0;
  const returnAt = expectedMs ? Date.now() + expectedMs + prefs.returnBufferMin * 60_000 : null;
  const copy = lang.startsWith("fr") ? {
    title: "SÉCURITÉ SORTIE", ready: "FICHE PRÊTE", setup: "CONFIGURER", close: "FERMER", solo: "Je pars seul", contact: "CONTACT À PRÉVENIR", name: "Nom", phone: "Téléphone", buffer: "MARGE RETOUR", expected: "RETOUR PRÉVU", share: "PARTAGER LA FICHE", copied: "FICHE PARTAGÉE", noRoute: "Sélectionne un parcours pour calculer une heure de retour indicative.", note: "Stocké uniquement sur cet appareil. Cette fiche ne remplace pas un dispositif de sécurité ou de secours.", route: "Parcours", duration: "Durée estimée",
  } : lang.startsWith("es") ? {
    title: "SEGURIDAD DE SALIDA", ready: "FICHA LISTA", setup: "CONFIGURAR", close: "CERRAR", solo: "Salgo solo", contact: "CONTACTO DE AVISO", name: "Nombre", phone: "Teléfono", buffer: "MARGEN REGRESO", expected: "REGRESO PREVISTO", share: "COMPARTIR FICHA", copied: "FICHA COMPARTIDA", noRoute: "Selecciona una ruta para calcular una hora de regreso orientativa.", note: "Guardado solo en este dispositivo. Esta ficha no sustituye un sistema de seguridad o rescate.", route: "Ruta", duration: "Duración estimada",
  } : {
    title: "OUTING SAFETY", ready: "SAFETY CARD READY", setup: "SET UP", close: "CLOSE", solo: "I am going solo", contact: "EMERGENCY CONTACT", name: "Name", phone: "Phone", buffer: "RETURN BUFFER", expected: "EXPECTED RETURN", share: "SHARE SAFETY CARD", copied: "CARD SHARED", noRoute: "Select a route to calculate an indicative return time.", note: "Stored only on this device. This card does not replace a safety or rescue device.", route: "Route", duration: "Estimated duration",
  };

  const update = (patch: Partial<SafetyPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveRunningLocalJson(STORAGE_KEY, next);
  };

  const safetyText = () => {
    const rows = [
      `RUNNING PERFORMANCE · ${copy.title}`,
      `${copy.route}: ${route?.name || "—"}`,
      route ? `${copy.duration}: ${Math.max(1, Math.round(expectedMs / 60_000))} min` : "",
      returnAt ? `${copy.expected}: ${new Date(returnAt).toLocaleString()}` : "",
      prefs.solo ? `✓ ${copy.solo}` : "",
      prefs.emergencyName || prefs.emergencyPhone ? `${copy.contact}: ${prefs.emergencyName || "—"}${prefs.emergencyPhone ? ` · ${prefs.emergencyPhone}` : ""}` : "",
    ].filter(Boolean);
    return rows.join("\n");
  };

  const share = async () => {
    const text = safetyText();
    try {
      if (navigator.share) await navigator.share({ title: copy.title, text });
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else throw new Error("share unavailable");
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {}
  };

  const configured = !!(prefs.emergencyName || prefs.emergencyPhone || prefs.solo);
  return <RunningSurface accent={configured ? "#71ff9a" : accent} style={{ marginTop: 10 }}>
    <div style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 9, alignItems: "center" }}>
      <div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: `${accent}12`, border: `1px solid ${accent}28`, fontSize: 20 }}>🛟</div>
      <div><div style={{ color: configured ? "#71ff9a" : accent, fontSize: 9, fontWeight: 1000, letterSpacing: .7 }}>{copy.title}</div><div style={{ marginTop: 3, fontSize: 8, color: textSoft }}>{returnAt ? `${copy.expected} · ${new Date(returnAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : copy.noRoute}</div></div>
      <button className="btn" onClick={() => setOpen((value) => !value)} style={{ minHeight: 34, padding: "4px 8px", color: accent, borderColor: `${accent}44`, fontSize: 7.5, fontWeight: 1000 }}>{open ? copy.close : copy.setup}</button>
    </div>
    {open ? <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.07)" }}>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 8.5, fontWeight: 900 }}><input type="checkbox" checked={prefs.solo} onChange={(event) => update({ solo: event.target.checked })}/>{copy.solo}</label>
      <div style={{ marginTop: 10, color: textSoft, fontSize: 7.3, fontWeight: 1000 }}>{copy.contact}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 5 }}><input value={prefs.emergencyName} onChange={(event) => update({ emergencyName: event.target.value.slice(0, 60) })} placeholder={copy.name} style={inputStyle}/><input value={prefs.emergencyPhone} onChange={(event) => update({ emergencyPhone: event.target.value.slice(0, 32) })} placeholder={copy.phone} inputMode="tel" style={inputStyle}/></div>
      <label style={{ display: "grid", gap: 4, marginTop: 9, fontSize: 7.3, color: textSoft, fontWeight: 1000 }}><span>{copy.buffer}</span><select value={prefs.returnBufferMin} onChange={(event) => update({ returnBufferMin: Number(event.target.value) })} style={inputStyle}>{[30,60,90,120].map((value) => <option key={value} value={value}>+{value} min</option>)}</select></label>
      <button className="btn" onClick={() => void share()} style={{ width: "100%", minHeight: 38, marginTop: 9, color: accent, borderColor: `${accent}55`, fontSize: 8, fontWeight: 1000 }}>{shared ? `✓ ${copy.copied}` : copy.share}</button>
      <div style={{ marginTop: 7, color: textSoft, fontSize: 7.1, lineHeight: 1.45 }}>{copy.note}</div>
    </div> : null}
  </RunningSurface>;
}

const inputStyle: React.CSSProperties = { minWidth: 0, minHeight: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,.10)", background: "rgba(0,0,0,.24)", color: "inherit", padding: "0 9px", font: "inherit", fontSize: 8.4, outline: "none" };
