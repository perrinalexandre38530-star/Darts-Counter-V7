import React from "react";
import { sendFriendRequest } from "../lib/friendsApi";
import {
  findNearbyPlayers,
  listNearbyGameRequests,
  loadNearbySettings,
  respondNearbyGameRequest,
  saveNearbySettings,
  sendNearbyGameRequest,
  type NearbyGameRequest,
  type NearbyPlayer,
  type NearbySettings,
} from "../lib/nearbyPlayersApi";

type Props = {
  signedIn: boolean;
  accent: string;
  activeSportId?: string | null;
  activeProfile?: any;
  onOpenMessages?: () => void;
};

type Coordinates = { latitude: number; longitude: number };

const SPORT_LABEL: Record<string, string> = {
  darts: "Fléchettes", babyfoot: "Baby-foot", petanque: "Pétanque", pingpong: "Ping-pong",
  molkky: "Mölkky", dice: "Dés", foot: "Football",
};
const SPORTS = Object.keys(SPORT_LABEL);
const RADII = [2, 5, 10, 25, 50];

function normalizeSport(raw?: string | null) {
  const s = String(raw || "darts").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s.includes("baby")) return "babyfoot";
  if (s.includes("pet")) return "petanque";
  if (s.includes("ping")) return "pingpong";
  if (s.includes("molk")) return "molkky";
  if (s.includes("dice") || s.includes("de")) return "dice";
  if (s.includes("foot")) return "foot";
  return "darts";
}
function readProfileName(p: any) { return String(p?.displayName || p?.name || p?.nickname || "Joueur"); }
function readAvatar(p: any) { return p?.avatarUrl || p?.avatar || p?.avatarDataUrl || null; }
function readCountry(p: any) { return p?.countryCode || p?.country || null; }
function locate(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return reject(new Error("La géolocalisation n'est pas disponible sur cet appareil."));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(new Error(err?.message || "Localisation refusée.")),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

export default function NearbyPlayersPanel({ signedIn, accent, activeSportId, activeProfile, onOpenMessages }: Props) {
  const sport = normalizeSport(activeSportId);
  const profile = activeProfile || {};
  const [settings, setSettings] = React.useState<NearbySettings>({ visible: false, radiusKm: 10, sports: [sport], skillLevel: null, availableNow: false, lookingForGame: false, preferredModes: [], hasLocation: false });
  const [players, setPlayers] = React.useState<NearbyPlayer[]>([]);
  const [requests, setRequests] = React.useState<NearbyGameRequest[]>([]);
  const [coords, setCoords] = React.useState<Coordinates | null>(null);
  const [availableOnly, setAvailableOnly] = React.useState(false);
  const [lookingOnly, setLookingOnly] = React.useState(false);
  const [skillFilter, setSkillFilter] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const panel: React.CSSProperties = { border: `1px solid ${accent}55`, background: "rgba(7,10,16,.78)", borderRadius: 18, padding: 14, boxShadow: "0 12px 30px rgba(0,0,0,.24)" };
  const btn: React.CSSProperties = { border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.055)", color: "#fff", borderRadius: 12, padding: "9px 11px", fontWeight: 900, cursor: "pointer" };
  const chip = (active: boolean): React.CSSProperties => ({ ...btn, padding: "7px 9px", borderColor: active ? accent : "rgba(255,255,255,.14)", background: active ? `${accent}22` : "rgba(255,255,255,.04)", color: active ? accent : "#fff", fontSize: 11.5 });

  const refreshRequests = React.useCallback(async () => {
    if (!signedIn) return;
    try { setRequests(await listNearbyGameRequests()); } catch {}
  }, [signedIn]);

  React.useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    (async () => {
      try {
        const s = await loadNearbySettings();
        if (alive) setSettings({ ...s, sports: s.sports.length ? s.sports : [sport] });
      } catch (e: any) { if (alive) setError(String(e?.message || e)); }
      await refreshRequests();
    })();
    return () => { alive = false; };
  }, [signedIn, sport, refreshRequests]);

  async function persist(next: NearbySettings, newCoords: Coordinates | null = coords) {
    const saved = await saveNearbySettings({
      latitude: newCoords?.latitude ?? null,
      longitude: newCoords?.longitude ?? null,
      visible: next.visible,
      radiusKm: next.radiusKm,
      sports: next.sports,
      skillLevel: next.skillLevel ?? null,
      availableNow: next.availableNow,
      lookingForGame: next.lookingForGame,
      preferredModes: next.preferredModes,
      areaLabel: next.areaLabel ?? null,
      displayName: readProfileName(profile),
      avatarUrl: readAvatar(profile),
      countryCode: readCountry(profile),
    });
    setSettings(saved);
    return saved;
  }

  async function activateLocation(visible = true, baseSettings: NearbySettings = settings) {
    setBusy(true); setError(null); setMessage(null);
    try {
      const c = await locate(); setCoords(c);
      const next = { ...baseSettings, visible, sports: baseSettings.sports.length ? baseSettings.sports : [sport] };
      const saved = await persist(next, c);
      setMessage(saved.visible ? "Position privée enregistrée. Les autres joueurs ne voient jamais tes coordonnées GPS." : "Position enregistrée uniquement pour tes recherches. Tu restes invisible.");
      return saved;
    } finally { setBusy(false); }
  }

  async function refreshPlayers() {
    setBusy(true); setError(null); setMessage(null);
    try {
      let current = settings;
      if (!current.hasLocation) current = await activateLocation(false);
      const found = await findNearbyPlayers({ radiusKm: current.radiusKm, sport, availableOnly, lookingOnly });
      const filtered = skillFilter == null ? found : found.filter((player) => Number(player.skillLevel || 0) === skillFilter);
      setPlayers(filtered);
      setMessage(filtered.length ? `${filtered.length} joueur(s) trouvé(s) dans le rayon.` : "Aucun joueur visible avec ces filtres pour le moment.");
    } catch (e: any) { setError(String(e?.message || e || "Recherche impossible.")); }
    finally { setBusy(false); }
  }

  async function toggleSport(value: string) {
    const sports = settings.sports.includes(value) ? settings.sports.filter((x) => x !== value) : [...settings.sports, value];
    const next = { ...settings, sports: sports.length ? sports : [value] };
    setSettings(next); try { await persist(next); } catch (e: any) { setError(String(e?.message || e)); }
  }

  async function propose(player: NearbyPlayer) {
    try {
      await sendNearbyGameRequest({ toUserId: player.userId, sport, modes: settings.preferredModes, message: `${readProfileName(profile)} propose une partie de ${SPORT_LABEL[sport] || sport}.` });
      setMessage(`Proposition envoyée à ${player.displayName}.`); await refreshRequests();
    } catch (e: any) { setError(String(e?.message || e)); }
  }

  if (!signedIn) return <div style={panel}><b style={{ color: accent }}>📍 Joueurs à proximité</b><div style={{ marginTop: 8, fontSize: 12.5, opacity: .8 }}>Connecte ton compte public pour utiliser la recherche locale. La position exacte n'est jamais affichée aux autres utilisateurs.</div></div>;

  const incoming = requests.filter((r) => r.direction === "incoming" && r.status === "pending");
  return <div style={{ display: "grid", gap: 12 }}>
    <div style={panel}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div><div style={{ fontSize: 17, fontWeight: 1000, color: accent }}>📍 JOUEURS À PROXIMITÉ</div><div style={{ fontSize: 11.5, opacity: .72, marginTop: 3 }}>Opt-in uniquement • distance approximative • aucune coordonnée affichée</div></div>
        <button disabled={busy} style={{ ...btn, marginLeft: "auto", borderColor: settings.visible ? "#65e58a88" : undefined, color: settings.visible ? "#84f7a3" : "#fff" }} onClick={async () => {
          try {
            if (!settings.visible && !settings.hasLocation) await activateLocation(true);
            else { const next = { ...settings, visible: !settings.visible }; setSettings(next); await persist(next); setMessage(next.visible ? "Tu es visible à proximité." : "Tu es maintenant invisible à proximité."); }
          } catch (e: any) { setError(String(e?.message || e)); }
        }}>{settings.visible ? "🟢 VISIBLE" : "⚫ INVISIBLE"}</button>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 7 }}>{RADII.map((r) => <button key={r} style={chip(settings.radiusKm === r)} onClick={async () => { const next = { ...settings, radiusKm: r }; setSettings(next); try { await persist(next); } catch {} }}>{r} km</button>)}</div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 7 }}>{SPORTS.map((s) => <button key={s} style={chip(settings.sports.includes(s))} onClick={() => toggleSport(s)}>{SPORT_LABEL[s]}</button>)}</div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}><span style={{ fontSize: 11.5, opacity: .72, fontWeight: 900 }}>MON NIVEAU</span>{[1,2,3,4,5].map((level) => <button key={level} style={chip(Number(settings.skillLevel || 0) === level)} onClick={async () => { const next = { ...settings, skillLevel: Number(settings.skillLevel || 0) === level ? null : level }; setSettings(next); try { await persist(next); } catch (e: any) { setError(String(e?.message || e)); } }}>{"★".repeat(level)}</button>)}</div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button style={{ ...btn, color: settings.availableNow ? accent : "#fff" }} onClick={async () => { const next = { ...settings, availableNow: !settings.availableNow }; setSettings(next); try { await persist(next); } catch {} }}>{settings.availableNow ? "🟢 DISPONIBLE MAINTENANT" : "Disponible maintenant"}</button>
        <button style={{ ...btn, color: settings.lookingForGame ? accent : "#fff" }} onClick={async () => { try { let next = { ...settings, lookingForGame: !settings.lookingForGame, visible: settings.lookingForGame ? settings.visible : true }; setSettings(next); if (next.visible && !settings.hasLocation && !coords) next = await activateLocation(true, next); else await persist(next); setMessage(next.lookingForGame ? "Ta recherche de partie est publiée pour 24 h." : "Recherche de partie désactivée."); } catch (e: any) { setError(String(e?.message || e)); } }}>{settings.lookingForGame ? "🔥 JE CHERCHE UNE PARTIE" : "Je cherche une partie"}</button>
        <button style={btn} disabled={busy} onClick={() => activateLocation(settings.visible).catch((e) => setError(String(e?.message || e)))}>↻ Mettre à jour ma position</button>
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button style={chip(availableOnly)} onClick={() => setAvailableOnly(v => !v)}>Disponibles seulement</button>
        <button style={chip(lookingOnly)} onClick={() => setLookingOnly(v => !v)}>Cherchent une partie</button>
        <span style={{ fontSize: 11.5, opacity: .72, fontWeight: 900, marginLeft: 4 }}>NIVEAU</span><button style={chip(skillFilter == null)} onClick={() => setSkillFilter(null)}>Tous</button>{[1,2,3,4,5].map((level) => <button key={`filter-${level}`} style={chip(skillFilter === level)} onClick={() => setSkillFilter(level)}>{"★".repeat(level)}</button>)}
        <button disabled={busy} style={{ ...btn, marginLeft: "auto", background: `${accent}22`, borderColor: accent, color: accent }} onClick={refreshPlayers}>{busy ? "Recherche…" : "RECHERCHER"}</button>
      </div>
      {error && <div style={{ marginTop: 10, color: "#ff9a9a", fontSize: 12 }}>{error}</div>}
      {message && <div style={{ marginTop: 10, color: "#bfe8c8", fontSize: 12 }}>{message}</div>}
    </div>

    {incoming.length > 0 && <div style={panel}><div style={{ fontWeight: 1000, color: accent, marginBottom: 8 }}>🔥 PROPOSITIONS REÇUES</div>{incoming.map((r) => <div key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: "9px 0", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><div style={{ flex: 1 }}><b>{r.fromDisplayName || "Joueur"}</b><div style={{ fontSize: 11.5, opacity: .7 }}>{SPORT_LABEL[r.sport] || r.sport}{r.message ? ` • ${r.message}` : ""}</div></div><button style={btn} onClick={async () => { await respondNearbyGameRequest(r.id, "accepted"); await refreshRequests(); onOpenMessages?.(); }}>Accepter</button><button style={btn} onClick={async () => { await respondNearbyGameRequest(r.id, "rejected"); await refreshRequests(); }}>Refuser</button></div>)}</div>}

    <div style={{ display: "grid", gap: 9 }}>{players.map((p) => <div key={p.userId} style={{ ...panel, padding: 11, display: "flex", gap: 11, alignItems: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", border: `2px solid ${accent}88`, display: "grid", placeItems: "center", background: "rgba(255,255,255,.06)", flex: "0 0 auto" }}>{p.avatarUrl ? <img src={p.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}</div>
      <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000, fontSize: 14.5 }}>{p.displayName}</div><div style={{ fontSize: 11.5, color: accent, fontWeight: 900 }}>📍 {p.distanceLabel}{p.cityLabel ? ` • ${p.cityLabel}` : ""}</div><div style={{ fontSize: 11, opacity: .72, marginTop: 3 }}>{p.sports.map((s) => SPORT_LABEL[s] || s).join(" • ")}{p.skillLevel != null ? ` • Niveau ${p.skillLevel}` : ""}</div><div style={{ marginTop: 3, fontSize: 11.5 }}>{p.availableNow ? "🟢 Disponible" : ""}{p.availableNow && p.lookingForGame ? " • " : ""}{p.lookingForGame ? "🔥 Cherche une partie" : ""}</div></div>
      <div style={{ display: "grid", gap: 6 }}><button style={btn} onClick={async () => { try { await sendFriendRequest(p.userId); setMessage(`Demande d'ami envoyée à ${p.displayName}.`); } catch (e: any) { setError(String(e?.message || e)); } }}>Ajouter</button><button style={{ ...btn, borderColor: accent, color: accent }} onClick={() => propose(p)}>Proposer une partie</button></div>
    </div>)}</div>
  </div>;
}
