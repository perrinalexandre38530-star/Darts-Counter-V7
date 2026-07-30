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
  darts: "Fléchettes",
  babyfoot: "Baby-foot",
  petanque: "Pétanque",
  pingpong: "Ping-pong",
  molkky: "Mölkky",
  dice: "Dés",
  foot: "Football",
};
const SPORTS = Object.keys(SPORT_LABEL);
const RADII = [2, 5, 10, 25, 50];
const LEVELS = [1, 2, 3, 4, 5];

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

function readProfileName(profile: any) {
  return String(profile?.displayName || profile?.name || profile?.nickname || "Joueur");
}
function readAvatar(profile: any) {
  return profile?.avatarUrl || profile?.avatar || profile?.avatarDataUrl || null;
}
function readCountry(profile: any) {
  return profile?.countryCode || profile?.country || null;
}
function flagEmoji(raw?: string | null) {
  const code = String(raw || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0)));
}
function formatTime(value: number | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
function locate(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("La géolocalisation n'est pas disponible sur cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => {
        if (error?.code === 1) reject(new Error("Autorise la localisation dans ton navigateur pour rechercher des joueurs proches."));
        else if (error?.code === 2) reject(new Error("Ta position est momentanément indisponible. Vérifie le GPS ou le réseau."));
        else if (error?.code === 3) reject(new Error("La localisation a pris trop de temps. Relance la recherche."));
        else reject(new Error(error?.message || "Localisation impossible."));
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

const DEFAULT_SETTINGS: NearbySettings = {
  visible: false,
  radiusKm: 10,
  sports: ["darts"],
  skillLevel: null,
  availableNow: false,
  lookingForGame: false,
  preferredModes: [],
  hasLocation: false,
};

export default function NearbyPlayersPanel({ signedIn, accent, activeSportId, activeProfile, onOpenMessages }: Props) {
  const activeSport = normalizeSport(activeSportId);
  const profile = activeProfile || {};
  const [settings, setSettings] = React.useState<NearbySettings>({ ...DEFAULT_SETTINGS, sports: [activeSport] });
  const [players, setPlayers] = React.useState<NearbyPlayer[]>([]);
  const [requests, setRequests] = React.useState<NearbyGameRequest[]>([]);
  const [coords, setCoords] = React.useState<Coordinates | null>(null);
  const [searchSport, setSearchSport] = React.useState<string | null>(activeSport);
  const [availableOnly, setAvailableOnly] = React.useState(false);
  const [lookingOnly, setLookingOnly] = React.useState(false);
  const [skillFilter, setSkillFilter] = React.useState<number | null>(null);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [settingsLoaded, setSettingsLoaded] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [lastSearchAt, setLastSearchAt] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const panel: React.CSSProperties = {
    border: `1px solid ${accent}55`,
    background: "rgba(7,10,16,.82)",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 12px 30px rgba(0,0,0,.24)",
  };
  const btn: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,.16)",
    background: "rgba(255,255,255,.055)",
    color: "#fff",
    borderRadius: 12,
    padding: "9px 11px",
    fontWeight: 900,
    cursor: "pointer",
  };
  const chip = (active: boolean): React.CSSProperties => ({
    ...btn,
    padding: "7px 9px",
    borderColor: active ? accent : "rgba(255,255,255,.14)",
    background: active ? `${accent}22` : "rgba(255,255,255,.04)",
    color: active ? accent : "#fff",
    fontSize: 11.5,
  });
  const primary: React.CSSProperties = {
    ...btn,
    minHeight: 46,
    background: `linear-gradient(180deg, ${accent}32, ${accent}12)`,
    borderColor: accent,
    color: accent,
    boxShadow: `0 0 22px ${accent}2d`,
  };

  const refreshRequests = React.useCallback(async () => {
    if (!signedIn) return;
    try {
      setRequests(await listNearbyGameRequests());
    } catch {
      // Le chargement des propositions ne doit jamais bloquer la recherche.
    }
  }, [signedIn]);

  const persist = React.useCallback(async (next: NearbySettings, newCoords: Coordinates | null = coords) => {
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
  }, [coords, profile]);

  const searchWithSettings = React.useCallback(async (
    current: NearbySettings,
    options?: { silent?: boolean; sport?: string | null; available?: boolean; looking?: boolean; level?: number | null }
  ) => {
    const found = await findNearbyPlayers({
      radiusKm: current.radiusKm,
      sport: options?.sport === undefined ? searchSport : options.sport,
      availableOnly: options?.available ?? availableOnly,
      lookingOnly: options?.looking ?? lookingOnly,
    });
    const level = options?.level === undefined ? skillFilter : options.level;
    const filtered = level == null ? found : found.filter((player) => Number(player.skillLevel || 0) === level);
    setPlayers(filtered);
    setHasSearched(true);
    setLastSearchAt(Date.now());
    if (!options?.silent) {
      setMessage(filtered.length ? `${filtered.length} joueur(s) visible(s) trouvé(s).` : "Aucun joueur visible avec ces filtres pour le moment.");
    }
    return filtered;
  }, [availableOnly, lookingOnly, searchSport, skillFilter]);

  const activateLocation = React.useCallback(async (visible: boolean, baseSettings: NearbySettings = settings) => {
    const position = await locate();
    setCoords(position);
    const next = {
      ...baseSettings,
      visible,
      sports: baseSettings.sports.length ? baseSettings.sports : [activeSport],
    };
    const saved = await persist(next, position);
    setMessage(saved.visible
      ? "Position privée enregistrée. Les autres joueurs ne voient jamais tes coordonnées GPS."
      : "Position privée enregistrée pour ta recherche. Tu restes invisible tant que tu ne l'actives pas."
    );
    return saved;
  }, [activeSport, persist, settings]);

  React.useEffect(() => {
    setSearchSport(activeSport);
  }, [activeSport]);

  React.useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    (async () => {
      try {
        const loaded = await loadNearbySettings();
        if (!alive) return;
        const normalized = { ...loaded, sports: loaded.sports.length ? loaded.sports : [activeSport] };
        setSettings(normalized);
        setSettingsLoaded(true);
        const preferredSearchSport = normalized.sports.includes(activeSport) ? activeSport : (normalized.sports[0] || activeSport);
        setSearchSport(preferredSearchSport);
        await refreshRequests();
        if (normalized.hasLocation && alive) {
          try {
            await searchWithSettings(normalized, { silent: true, sport: preferredSearchSport, available: false, looking: false, level: null });
          } catch {
            // Une recherche automatique ratée ne doit pas masquer l'écran.
          }
        }
      } catch (caught: any) {
        if (alive) {
          setSettingsLoaded(true);
          setError(String(caught?.message || caught));
        }
      }
    })();
    return () => { alive = false; };
  }, [activeSport, refreshRequests, searchWithSettings, signedIn]);

  React.useEffect(() => {
    if (!signedIn) return;
    const timer = window.setInterval(() => { void refreshRequests(); }, 30000);
    return () => window.clearInterval(timer);
  }, [refreshRequests, signedIn]);

  async function refreshPlayers() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      let current = settings;
      if (!current.hasLocation) current = await activateLocation(false, current);
      await searchWithSettings(current);
    } catch (caught: any) {
      setError(String(caught?.message || caught || "Recherche impossible."));
    } finally {
      setBusy(false);
    }
  }

  async function firstActivation() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await activateLocation(false, settings);
      await searchWithSettings(saved);
    } catch (caught: any) {
      setError(String(caught?.message || caught));
    } finally {
      setBusy(false);
    }
  }

  async function updateSettings(next: NearbySettings, successMessage?: string) {
    setSettings(next);
    setError(null);
    try {
      const saved = await persist(next);
      if (successMessage) setMessage(successMessage);
      return saved;
    } catch (caught: any) {
      setError(String(caught?.message || caught));
      throw caught;
    }
  }

  async function toggleSport(value: string) {
    const sports = settings.sports.includes(value)
      ? settings.sports.filter((item) => item !== value)
      : [...settings.sports, value];
    const safeSports = sports.length ? sports : [value];
    await updateSettings({ ...settings, sports: safeSports });
    if (!safeSports.includes(String(searchSport || ""))) setSearchSport(safeSports[0]);
  }

  async function propose(player: NearbyPlayer) {
    setError(null);
    try {
      await sendNearbyGameRequest({
        toUserId: player.userId,
        sport: searchSport || activeSport,
        modes: settings.preferredModes,
        message: `${readProfileName(profile)} propose une partie de ${SPORT_LABEL[searchSport || activeSport] || searchSport || activeSport}.`,
      });
      setMessage(`Proposition envoyée à ${player.displayName}.`);
      await refreshRequests();
    } catch (caught: any) {
      setError(String(caught?.message || caught));
    }
  }

  if (!signedIn) {
    return (
      <div style={panel}>
        <div style={{ fontSize: 17, fontWeight: 1000, color: accent }}>📍 JOUEURS À PROXIMITÉ</div>
        <div style={{ marginTop: 8, fontSize: 12.5, opacity: .82, lineHeight: 1.4 }}>
          Connecte ton compte public pour rechercher des joueurs autour de toi. Ta position exacte n'est jamais affichée.
        </div>
      </div>
    );
  }

  const incoming = requests.filter((request) => request.direction === "incoming" && request.status === "pending");
  const outgoing = requests.filter((request) => request.direction === "outgoing" && request.status === "pending");
  const pendingTargets = new Set(outgoing.map((request) => request.toUserId));

  if (!settingsLoaded) {
    return <div style={panel}><div style={{ color: accent, fontWeight: 1000 }}>📍 Chargement de la recherche locale…</div></div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!settings.hasLocation ? (
        <div style={{ ...panel, background: `radial-gradient(120% 160% at 0% 0%, ${accent}24, rgba(7,10,16,.88) 55%)` }}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: accent }}>📍 TROUVER DES JOUEURS AUTOUR DE MOI</div>
          <div style={{ marginTop: 7, fontSize: 12.5, opacity: .86, lineHeight: 1.45 }}>
            Active une première fois la localisation. Elle est stockée côté Supabase pour calculer une distance approximative, mais tes coordonnées ne sont jamais transmises aux autres joueurs.
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 7 }}>
            {["1. Localiser", "2. Filtrer", "3. Proposer"].map((label) => (
              <div key={label} style={{ borderRadius: 12, padding: "9px 7px", textAlign: "center", border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", fontSize: 11, fontWeight: 900 }}>{label}</div>
            ))}
          </div>
          <button type="button" disabled={busy} style={{ ...primary, width: "100%", marginTop: 12 }} onClick={firstActivation}>
            {busy ? "LOCALISATION…" : "ACTIVER LA RECHERCHE LOCALE"}
          </button>
          <div style={{ marginTop: 8, fontSize: 11.3, opacity: .68, textAlign: "center" }}>Tu resteras invisible après cette activation.</div>
        </div>
      ) : null}

      <div style={panel}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 1000, color: accent }}>🔎 RECHERCHER UNE PARTIE LOCALE</div>
            <div style={{ fontSize: 11.5, opacity: .72, marginTop: 3 }}>Distance approximative • profils volontaires uniquement</div>
          </div>
          {lastSearchAt ? <div style={{ fontSize: 10.5, opacity: .62 }}>Actualisé à {formatTime(lastSearchAt)}</div> : null}
        </div>

        <div style={{ marginTop: 12, fontSize: 10.5, opacity: .68, fontWeight: 1000 }}>RAYON</div>
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 7 }}>
          {RADII.map((radius) => (
            <button key={radius} type="button" style={chip(settings.radiusKm === radius)} onClick={() => void updateSettings({ ...settings, radiusKm: radius })}>{radius} km</button>
          ))}
        </div>

        <div style={{ marginTop: 11, fontSize: 10.5, opacity: .68, fontWeight: 1000 }}>SPORT RECHERCHÉ</div>
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 7 }}>
          <button type="button" style={chip(searchSport == null)} onClick={() => setSearchSport(null)}>Tous mes sports</button>
          {settings.sports.map((sportId) => (
            <button key={sportId} type="button" style={chip(searchSport === sportId)} onClick={() => setSearchSport(sportId)}>{SPORT_LABEL[sportId] || sportId}</button>
          ))}
        </div>

        <div style={{ marginTop: 11, display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button type="button" style={chip(availableOnly)} onClick={() => setAvailableOnly((value) => !value)}>🟢 Disponibles seulement</button>
          <button type="button" style={chip(lookingOnly)} onClick={() => setLookingOnly((value) => !value)}>🔥 Cherchent une partie</button>
          <button type="button" style={chip(advancedOpen)} onClick={() => setAdvancedOpen((value) => !value)}>⚙ Filtres avancés</button>
        </div>

        {advancedOpen ? (
          <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 10 }}>
            <div style={{ fontSize: 10.5, opacity: .68, fontWeight: 1000 }}>NIVEAU RECHERCHÉ</div>
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 7 }}>
              <button type="button" style={chip(skillFilter == null)} onClick={() => setSkillFilter(null)}>Tous</button>
              {LEVELS.map((level) => <button key={level} type="button" style={chip(skillFilter === level)} onClick={() => setSkillFilter(level)}>{"★".repeat(level)}</button>)}
            </div>
          </div>
        ) : null}

        <button type="button" disabled={busy || !settings.hasLocation} style={{ ...primary, width: "100%", marginTop: 12, opacity: settings.hasLocation ? 1 : .55 }} onClick={refreshPlayers}>
          {busy ? "RECHERCHE EN COURS…" : "CHERCHER AUTOUR DE MOI"}
        </button>

        {error ? <div style={{ marginTop: 10, color: "#ff9a9a", fontSize: 12, lineHeight: 1.35 }}>{error}</div> : null}
        {message ? <div style={{ marginTop: 10, color: "#bfe8c8", fontSize: 12, lineHeight: 1.35 }}>{message}</div> : null}
      </div>

      <div style={panel}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 1000 }}>MON STATUT LOCAL</div>
            <div style={{ marginTop: 3, fontSize: 11.3, opacity: .7 }}>
              {settings.visible ? "Les joueurs compatibles peuvent te trouver." : "Tu peux chercher sans apparaître chez les autres."}
            </div>
          </div>
          <button type="button" disabled={busy} style={{ ...btn, borderColor: settings.visible ? "#65e58a88" : undefined, color: settings.visible ? "#84f7a3" : "#fff" }} onClick={async () => {
            setBusy(true); setError(null);
            try {
              if (!settings.visible && !settings.hasLocation) await activateLocation(true, settings);
              else await updateSettings({ ...settings, visible: !settings.visible }, !settings.visible ? "Tu es maintenant visible à proximité." : "Tu es maintenant invisible à proximité.");
            } finally { setBusy(false); }
          }}>{settings.visible ? "🟢 VISIBLE" : "⚫ INVISIBLE"}</button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          <button type="button" style={{ ...btn, color: settings.availableNow ? accent : "#fff", minHeight: 48 }} onClick={() => void updateSettings({ ...settings, availableNow: !settings.availableNow }, !settings.availableNow ? "Tu es disponible pendant 6 heures." : "Disponibilité désactivée.")}>{settings.availableNow ? "🟢 DISPONIBLE" : "Me rendre disponible"}</button>
          <button type="button" style={{ ...btn, color: settings.lookingForGame ? accent : "#fff", minHeight: 48 }} onClick={async () => {
            setBusy(true); setError(null);
            try {
              let next = { ...settings, lookingForGame: !settings.lookingForGame, visible: settings.lookingForGame ? settings.visible : true };
              if (next.visible && !settings.hasLocation) next = await activateLocation(true, next);
              else next = await updateSettings(next);
              setMessage(next.lookingForGame ? "Ta recherche de partie est publiée pour 24 heures." : "Recherche de partie désactivée.");
            } finally { setBusy(false); }
          }}>{settings.lookingForGame ? "🔥 JE CHERCHE UNE PARTIE" : "Publier une recherche"}</button>
        </div>

        <button type="button" style={{ ...btn, width: "100%", marginTop: 8 }} disabled={busy} onClick={async () => {
          setBusy(true); setError(null);
          try { await activateLocation(settings.visible, settings); }
          catch (caught: any) { setError(String(caught?.message || caught)); }
          finally { setBusy(false); }
        }}>↻ Mettre à jour ma position privée</button>

        <button type="button" style={{ ...btn, width: "100%", marginTop: 8, opacity: .86 }} onClick={() => setAdvancedOpen((value) => !value)}>{advancedOpen ? "Masquer mes réglages" : "Configurer mes sports et mon niveau"}</button>
        {advancedOpen ? (
          <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 10 }}>
            <div style={{ fontSize: 10.5, opacity: .68, fontWeight: 1000 }}>MES SPORTS</div>
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 7 }}>
              {SPORTS.map((sportId) => <button key={sportId} type="button" style={chip(settings.sports.includes(sportId))} onClick={() => void toggleSport(sportId)}>{SPORT_LABEL[sportId]}</button>)}
            </div>
            <div style={{ marginTop: 10, fontSize: 10.5, opacity: .68, fontWeight: 1000 }}>MON NIVEAU</div>
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 7 }}>
              {LEVELS.map((level) => <button key={level} type="button" style={chip(Number(settings.skillLevel || 0) === level)} onClick={() => void updateSettings({ ...settings, skillLevel: Number(settings.skillLevel || 0) === level ? null : level })}>{"★".repeat(level)}</button>)}
            </div>
          </div>
        ) : null}
      </div>

      {incoming.length > 0 ? (
        <div style={{ ...panel, borderColor: `${accent}99` }}>
          <div style={{ fontWeight: 1000, color: accent, marginBottom: 8 }}>🔥 PROPOSITIONS REÇUES ({incoming.length})</div>
          {incoming.map((request) => (
            <div key={request.id} style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: "10px 0", display: "grid", gap: 8 }}>
              <div><b>{request.fromDisplayName || "Joueur"}</b><div style={{ fontSize: 11.5, opacity: .72 }}>{SPORT_LABEL[request.sport] || request.sport}{request.message ? ` • ${request.message}` : ""}</div></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                <button type="button" style={{ ...primary, minHeight: 40 }} onClick={async () => { await respondNearbyGameRequest(request.id, "accepted"); await refreshRequests(); setMessage("Proposition acceptée. Tu peux maintenant contacter ce joueur."); onOpenMessages?.(); }}>Accepter</button>
                <button type="button" style={btn} onClick={async () => { await respondNearbyGameRequest(request.id, "rejected"); await refreshRequests(); }}>Refuser</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {outgoing.length > 0 ? (
        <div style={panel}>
          <div style={{ fontWeight: 1000, marginBottom: 8 }}>MES PROPOSITIONS EN ATTENTE ({outgoing.length})</div>
          {outgoing.map((request) => (
            <div key={request.id} style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: "9px 0", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}><b>{request.toDisplayName || "Joueur"}</b><div style={{ fontSize: 11.5, opacity: .7 }}>{SPORT_LABEL[request.sport] || request.sport}</div></div>
              <button type="button" style={btn} onClick={async () => { await respondNearbyGameRequest(request.id, "cancelled"); await refreshRequests(); setMessage("Proposition annulée."); }}>Annuler</button>
            </div>
          ))}
        </div>
      ) : null}

      {hasSearched ? (
        <div style={{ display: "grid", gap: 9 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: 1000, fontSize: 13 }}>{players.length} JOUEUR(S) TROUVÉ(S)</div>
            <button type="button" disabled={busy} style={{ ...btn, padding: "7px 10px", fontSize: 11 }} onClick={refreshPlayers}>↻ Actualiser</button>
          </div>
          {players.length === 0 ? (
            <div style={{ ...panel, textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 28 }}>📍</div>
              <div style={{ marginTop: 6, fontWeight: 1000 }}>Aucun joueur visible pour le moment</div>
              <div style={{ marginTop: 5, fontSize: 12, opacity: .72, lineHeight: 1.4 }}>Élargis le rayon, retire un filtre ou publie « Je cherche une partie » pour être trouvé à ton tour.</div>
            </div>
          ) : players.map((player) => {
            const alreadyProposed = pendingTargets.has(player.userId);
            const flag = flagEmoji(player.countryCode);
            return (
              <div key={player.userId} style={{ ...panel, padding: 11, display: "grid", gridTemplateColumns: "52px minmax(0,1fr)", gap: 11, alignItems: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", border: `2px solid ${accent}88`, display: "grid", placeItems: "center", background: "rgba(255,255,255,.06)" }}>
                  {player.avatarUrl ? <img src={player.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{flag ? `${flag} ` : ""}{player.displayName}</div>
                  <div style={{ fontSize: 11.5, color: accent, fontWeight: 900 }}>📍 {player.distanceLabel}{player.cityLabel ? ` • ${player.cityLabel}` : ""}</div>
                  <div style={{ fontSize: 11, opacity: .72, marginTop: 3 }}>{player.sports.map((sportId) => SPORT_LABEL[sportId] || sportId).join(" • ")}{player.skillLevel != null ? ` • Niveau ${player.skillLevel}` : ""}</div>
                  <div style={{ marginTop: 3, fontSize: 11.5 }}>{player.availableNow ? "🟢 Disponible" : ""}{player.availableNow && player.lookingForGame ? " • " : ""}{player.lookingForGame ? "🔥 Cherche une partie" : ""}</div>
                </div>
                <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "minmax(0,.72fr) minmax(0,1.28fr)", gap: 7 }}>
                  <button type="button" style={btn} onClick={async () => { try { await sendFriendRequest(player.userId); setMessage(`Demande d'ami envoyée à ${player.displayName}.`); } catch (caught: any) { setError(String(caught?.message || caught)); } }}>Ajouter en ami</button>
                  <button type="button" disabled={alreadyProposed} style={{ ...primary, minHeight: 40, opacity: alreadyProposed ? .58 : 1 }} onClick={() => void propose(player)}>{alreadyProposed ? "Proposition envoyée" : "Proposer une partie"}</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : settings.hasLocation ? (
        <div style={{ ...panel, textAlign: "center", padding: 18 }}>
          <div style={{ fontSize: 26 }}>🔎</div>
          <div style={{ marginTop: 5, fontWeight: 1000 }}>Lance une recherche pour voir les joueurs proches</div>
        </div>
      ) : null}
    </div>
  );
}
