import React from "react";
import { sendFriendRequest } from "../lib/friendsApi";
import {
  clearNearbyEncounters,
  deleteNearbyPlace,
  findNearbyPlaces,
  findNearbyPlayers,
  listNearbyEncounters,
  listNearbyGameRequests,
  loadNearbySettings,
  publishNearbyPlace,
  respondNearbyGameRequest,
  saveNearbySettings,
  sendNearbyGameRequest,
  type NearbyEncounter,
  type NearbyGameRequest,
  type NearbyPlace,
  type NearbyPlaceKind,
  type NearbyPlayer,
  type NearbySettings,
} from "../lib/nearbyPlayersApi";
import NearbyEncountersPanel from "./nearby/NearbyEncountersPanel";
import NearbyMapView from "./nearby/NearbyMapView";
import NearbyPlaceCard from "./nearby/NearbyPlaceCard";
import NearbyPlayerCard from "./nearby/NearbyPlayerCard";

type Props = {
  signedIn: boolean;
  accent: string;
  activeSportId?: string | null;
  activeProfile?: any;
  onOpenMessages?: () => void;
};

type Coordinates = { latitude: number; longitude: number };
type NearbyView = "list" | "map" | "crossed" | "places";

type PublishDraft = {
  kind: NearbyPlaceKind;
  title: string;
  description: string;
  areaLabel: string;
  startsAt: string;
  endsAt: string;
  preciseLocation: boolean;
};

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
const LOCAL_ENCOUNTERS_KEY = "mss_nearby_encounters_v1";

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

function loadLocalEncounters(): NearbyEncounter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_ENCOUNTERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((row) => row && row.userId).slice(0, 100) : [];
  } catch {
    return [];
  }
}

function recordLocalEncounters(players: NearbyPlayer[]) {
  if (typeof window === "undefined" || players.length === 0) return loadLocalEncounters();
  const now = new Date().toISOString();
  const current = loadLocalEncounters();
  const byId = new Map(current.map((row) => [row.userId, row]));
  for (const player of players) {
    const previous = byId.get(player.userId);
    const previousTime = previous?.lastCrossedAt ? new Date(previous.lastCrossedAt).getTime() : 0;
    const countIncrement = !previousTime || Date.now() - previousTime > 30 * 60 * 1000 ? 1 : 0;
    byId.set(player.userId, {
      userId: player.userId,
      displayName: player.displayName,
      avatarUrl: player.avatarUrl,
      countryCode: player.countryCode,
      cityLabel: player.cityLabel,
      sports: player.sports,
      skillLevel: player.skillLevel,
      crossedCount: Math.max(1, Number(previous?.crossedCount || 0) + countIncrement),
      closestDistanceKm: Math.min(Number(previous?.closestDistanceKm || 100), Number(player.distanceKm || 100)),
      distanceLabel: player.distanceLabel,
      firstCrossedAt: previous?.firstCrossedAt || now,
      lastCrossedAt: now,
      availableNow: player.availableNow,
      lookingForGame: player.lookingForGame,
    });
  }
  const next = [...byId.values()]
    .sort((a, b) => new Date(b.lastCrossedAt || 0).getTime() - new Date(a.lastCrossedAt || 0).getTime())
    .slice(0, 100);
  try { window.localStorage.setItem(LOCAL_ENCOUNTERS_KEY, JSON.stringify(next)); } catch {}
  return next;
}

function clearLocalEncounters() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(LOCAL_ENCOUNTERS_KEY); } catch {}
}

function toIsoOrNull(raw: string) {
  if (!raw.trim()) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function isMissingMapMigration(error: any) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("ms_find_nearby_places") || message.includes("ms_list_nearby_encounters") || message.includes("could not find the function") || message.includes("pgrst202");
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

const DEFAULT_PUBLISH: PublishDraft = {
  kind: "tournament",
  title: "",
  description: "",
  areaLabel: "",
  startsAt: "",
  endsAt: "",
  preciseLocation: false,
};

export default function NearbyPlayersPanel({ signedIn, accent, activeSportId, activeProfile, onOpenMessages }: Props) {
  const activeSport = normalizeSport(activeSportId);
  const profile = activeProfile || {};
  const [settings, setSettings] = React.useState<NearbySettings>({ ...DEFAULT_SETTINGS, sports: [activeSport] });
  const [players, setPlayers] = React.useState<NearbyPlayer[]>([]);
  const [requests, setRequests] = React.useState<NearbyGameRequest[]>([]);
  const [encounters, setEncounters] = React.useState<NearbyEncounter[]>(() => loadLocalEncounters());
  const [places, setPlaces] = React.useState<NearbyPlace[]>([]);
  const [coords, setCoords] = React.useState<Coordinates | null>(null);
  const [searchSport, setSearchSport] = React.useState<string | null>(activeSport);
  const [availableOnly, setAvailableOnly] = React.useState(false);
  const [lookingOnly, setLookingOnly] = React.useState(false);
  const [skillFilter, setSkillFilter] = React.useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = React.useState(false);
  const [settingsLoaded, setSettingsLoaded] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [lastSearchAt, setLastSearchAt] = React.useState<number | null>(null);
  const [view, setView] = React.useState<NearbyView>("list");
  const [selectedMapPlayer, setSelectedMapPlayer] = React.useState<NearbyPlayer | null>(null);
  const [selectedMapPlace, setSelectedMapPlace] = React.useState<NearbyPlace | null>(null);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [publishDraft, setPublishDraft] = React.useState<PublishDraft>(DEFAULT_PUBLISH);
  const [mapMigrationReady, setMapMigrationReady] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const panel: React.CSSProperties = {
    border: `1px solid ${accent}55`,
    background: "rgba(7,10,16,.82)",
    borderRadius: 20,
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
    try { setRequests(await listNearbyGameRequests()); } catch {}
  }, [signedIn]);

  const refreshEncounters = React.useCallback(async () => {
    if (!signedIn) return;
    try {
      const rows = await listNearbyEncounters(100);
      setEncounters(rows.length ? rows : loadLocalEncounters());
      setMapMigrationReady(true);
    } catch (caught) {
      if (isMissingMapMigration(caught)) setMapMigrationReady(false);
      setEncounters(loadLocalEncounters());
    }
  }, [signedIn]);

  const refreshPlaces = React.useCallback(async (currentSettings: NearbySettings = settings, sport: string | null = searchSport) => {
    if (!signedIn || !currentSettings.hasLocation) return;
    try {
      const rows = await findNearbyPlaces({ radiusKm: currentSettings.radiusKm, sport, limit: 100 });
      setPlaces(rows);
      setMapMigrationReady(true);
    } catch (caught) {
      if (isMissingMapMigration(caught)) setMapMigrationReady(false);
      setPlaces([]);
    }
  }, [searchSport, settings, signedIn]);

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
    const sport = options?.sport === undefined ? searchSport : options.sport;
    const found = await findNearbyPlayers({
      radiusKm: current.radiusKm,
      sport,
      availableOnly: options?.available ?? availableOnly,
      lookingOnly: options?.looking ?? lookingOnly,
    });
    const level = options?.level === undefined ? skillFilter : options.level;
    const filtered = level == null ? found : found.filter((player) => Number(player.skillLevel || 0) === level);
    setPlayers(filtered);
    setHasSearched(true);
    setLastSearchAt(Date.now());
    setEncounters(recordLocalEncounters(filtered));
    void refreshEncounters();
    void refreshPlaces(current, sport);
    if (!options?.silent) setMessage(filtered.length ? `${filtered.length} joueur(s) visible(s) trouvé(s).` : "Aucun joueur visible avec ces filtres pour le moment.");
    return filtered;
  }, [availableOnly, lookingOnly, refreshEncounters, refreshPlaces, searchSport, skillFilter]);

  const activateLocation = React.useCallback(async (visible: boolean, baseSettings: NearbySettings = settings) => {
    const position = await locate();
    setCoords(position);
    const next = { ...baseSettings, visible, sports: baseSettings.sports.length ? baseSettings.sports : [activeSport] };
    const saved = await persist(next, position);
    setMessage(saved.visible
      ? "Position privée enregistrée. Les autres joueurs ne voient jamais tes coordonnées GPS."
      : "Position privée enregistrée pour ta recherche. Tu restes invisible tant que tu ne l'actives pas."
    );
    return saved;
  }, [activeSport, persist, settings]);

  const ensureCoordinates = React.useCallback(async () => {
    if (coords) return coords;
    const position = await locate();
    setCoords(position);
    return position;
  }, [coords]);

  React.useEffect(() => { setSearchSport(activeSport); }, [activeSport]);

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
        await Promise.allSettled([refreshRequests(), refreshEncounters(), refreshPlaces(normalized, preferredSearchSport)]);
        if (normalized.hasLocation && alive) {
          try { await searchWithSettings(normalized, { silent: true, sport: preferredSearchSport, available: false, looking: false, level: null }); } catch {}
        }
      } catch (caught: any) {
        if (alive) { setSettingsLoaded(true); setError(String(caught?.message || caught)); }
      }
    })();
    return () => { alive = false; };
  }, [activeSport, refreshEncounters, refreshPlaces, refreshRequests, searchWithSettings, signedIn]);

  React.useEffect(() => {
    if (!signedIn) return;
    const timer = window.setInterval(() => { void refreshRequests(); }, 30000);
    return () => window.clearInterval(timer);
  }, [refreshRequests, signedIn]);

  async function refreshPlayers() {
    setBusy(true); setError(null); setMessage(null);
    try {
      let current = settings;
      if (!current.hasLocation) current = await activateLocation(false, current);
      await searchWithSettings(current);
    } catch (caught: any) {
      setError(String(caught?.message || caught || "Recherche impossible."));
    } finally { setBusy(false); }
  }

  async function firstActivation() {
    setBusy(true); setError(null); setMessage(null);
    try {
      const saved = await activateLocation(false, settings);
      await searchWithSettings(saved);
    } catch (caught: any) { setError(String(caught?.message || caught)); }
    finally { setBusy(false); }
  }

  async function updateSettings(next: NearbySettings, successMessage?: string) {
    setSettings(next); setError(null);
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
    const sports = settings.sports.includes(value) ? settings.sports.filter((item) => item !== value) : [...settings.sports, value];
    const safeSports = sports.length ? sports : [value];
    await updateSettings({ ...settings, sports: safeSports });
    if (!safeSports.includes(String(searchSport || ""))) setSearchSport(safeSports[0] || activeSport);
  }

  async function proposePlayer(player: Pick<NearbyPlayer, "userId" | "displayName">, kind: "match" | "tournament" = "match") {
    setError(null);
    try {
      const sport = searchSport || activeSport;
      const label = SPORT_LABEL[sport] || sport;
      await sendNearbyGameRequest({
        toUserId: player.userId,
        sport,
        modes: settings.preferredModes,
        message: kind === "tournament"
          ? `${readProfileName(profile)} t'invite à organiser ou rejoindre un tournoi de ${label}.`
          : `${readProfileName(profile)} propose une partie de ${label}.`,
      });
      setMessage(kind === "tournament" ? `Invitation tournoi envoyée à ${player.displayName}.` : `Proposition envoyée à ${player.displayName}.`);
      await refreshRequests();
    } catch (caught: any) { setError(String(caught?.message || caught)); }
  }

  async function addFriend(player: Pick<NearbyPlayer, "userId" | "displayName">) {
    try { await sendFriendRequest(player.userId); setMessage(`Demande d'ami envoyée à ${player.displayName}.`); }
    catch (caught: any) { setError(String(caught?.message || caught)); }
  }

  async function publishPlace() {
    if (!publishDraft.title.trim()) { setError("Donne un nom au club, à l'équipe, au tournoi ou au lieu."); return; }
    setBusy(true); setError(null); setMessage(null);
    try {
      const position = await ensureCoordinates();
      await publishNearbyPlace({
        kind: publishDraft.kind,
        title: publishDraft.title.trim(),
        description: publishDraft.description.trim() || null,
        sport: searchSport || activeSport,
        latitude: position.latitude,
        longitude: position.longitude,
        areaLabel: publishDraft.areaLabel.trim() || null,
        startsAt: toIsoOrNull(publishDraft.startsAt),
        endsAt: toIsoOrNull(publishDraft.endsAt),
        preciseLocation: publishDraft.preciseLocation,
        metadata: { publisherName: readProfileName(profile) },
      });
      setPublishDraft(DEFAULT_PUBLISH);
      setPublishOpen(false);
      setMessage("Point local publié sur la carte.");
      await refreshPlaces(settings, searchSport);
      setView("map");
      setMapMigrationReady(true);
    } catch (caught: any) {
      if (isMissingMapMigration(caught)) setMapMigrationReady(false);
      setError(isMissingMapMigration(caught) ? "La migration Supabase CARTE LOCALE doit être installée avant de publier." : String(caught?.message || caught));
    } finally { setBusy(false); }
  }

  async function removePlace(place: NearbyPlace) {
    setBusy(true); setError(null);
    try {
      await deleteNearbyPlace(place.id);
      setPlaces((rows) => rows.filter((row) => row.id !== place.id));
      setSelectedMapPlace(null);
      setMessage(`${place.title} a été retiré de la carte.`);
    } catch (caught: any) { setError(String(caught?.message || caught)); }
    finally { setBusy(false); }
  }

  if (!signedIn) {
    return <div style={panel}><div style={{ fontSize: 17, fontWeight: 1000, color: accent }}>📍 CARTE LOCALE</div><div style={{ marginTop: 8, fontSize: 12.5, opacity: .82, lineHeight: 1.4 }}>Connecte ton compte public pour rechercher joueurs, clubs, équipes et tournois autour de toi. Ta position exacte n'est jamais affichée.</div></div>;
  }

  const incoming = requests.filter((request) => request.direction === "incoming" && request.status === "pending");
  const outgoing = requests.filter((request) => request.direction === "outgoing" && request.status === "pending");
  const pendingTargets = new Set(outgoing.map((request) => request.toUserId));
  const crossedUserIds = new Set(encounters.map((encounter) => encounter.userId));

  if (!settingsLoaded) return <div style={panel}><div style={{ color: accent, fontWeight: 1000 }}>📍 Chargement de la carte locale…</div></div>;

  const viewTabs: Array<{ id: NearbyView; icon: string; label: string; count?: number }> = [
    { id: "list", icon: "👥", label: "Joueurs", count: players.length },
    { id: "map", icon: "🗺️", label: "Carte", count: players.length + places.length },
    { id: "crossed", icon: "✦", label: "Croisés", count: encounters.length },
    { id: "places", icon: "🏆", label: "Clubs & événements", count: places.length },
  ];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!settings.hasLocation ? (
        <div style={{ ...panel, background: `radial-gradient(120% 160% at 0% 0%, ${accent}24, rgba(7,10,16,.88) 55%)` }}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: accent }}>📍 TROUVER DES PARTENAIRES AUTOUR DE MOI</div>
          <div style={{ marginTop: 7, fontSize: 12.5, opacity: .86, lineHeight: 1.45 }}>Active une première fois la localisation. Elle sert uniquement à calculer les distances et à centrer ta carte privée.</div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
            {["1. Localiser", "2. Explorer", "3. Contacter"].map((label) => <div key={label} style={{ borderRadius: 12, padding: "9px 7px", textAlign: "center", border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", fontSize: 11, fontWeight: 900 }}>{label}</div>)}
          </div>
          <button type="button" disabled={busy} style={{ ...primary, width: "100%", marginTop: 12 }} onClick={firstActivation}>{busy ? "LOCALISATION…" : "ACTIVER LA CARTE LOCALE"}</button>
          <div style={{ marginTop: 8, fontSize: 11.3, opacity: .68, textAlign: "center" }}>Tu resteras invisible après cette activation.</div>
        </div>
      ) : null}

      <div style={panel}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 17, fontWeight: 1000, color: accent }}>🔎 RECHERCHE LOCALE MULTISPORTS</div><div style={{ fontSize: 11.5, opacity: .72, marginTop: 3 }}>Joueurs • clubs • équipes • tournois • lieux de pratique</div></div>
          {lastSearchAt ? <div style={{ fontSize: 10.5, opacity: .62 }}>Actualisé à {formatTime(lastSearchAt)}</div> : null}
        </div>

        <div style={{ marginTop: 12, fontSize: 10.5, opacity: .68, fontWeight: 1000 }}>RAYON</div>
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 7 }}>{RADII.map((radius) => <button key={radius} type="button" style={chip(settings.radiusKm === radius)} onClick={() => void updateSettings({ ...settings, radiusKm: radius })}>{radius} km</button>)}</div>

        <div style={{ marginTop: 11, fontSize: 10.5, opacity: .68, fontWeight: 1000 }}>SPORT RECHERCHÉ</div>
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 7 }}>
          <button type="button" style={chip(searchSport == null)} onClick={() => setSearchSport(null)}>Tous mes sports</button>
          {settings.sports.map((sportId) => <button key={sportId} type="button" style={chip(searchSport === sportId)} onClick={() => setSearchSport(sportId)}>{SPORT_LABEL[sportId] || sportId}</button>)}
        </div>

        <div style={{ marginTop: 11, display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button type="button" style={chip(availableOnly)} onClick={() => setAvailableOnly((value) => !value)}>🟢 Disponibles</button>
          <button type="button" style={chip(lookingOnly)} onClick={() => setLookingOnly((value) => !value)}>🔥 Cherchent une partie</button>
          <button type="button" style={chip(filtersOpen)} onClick={() => setFiltersOpen((value) => !value)}>⚙ Filtres</button>
        </div>

        {filtersOpen ? <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 10 }}><div style={{ fontSize: 10.5, opacity: .68, fontWeight: 1000 }}>NIVEAU RECHERCHÉ</div><div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 7 }}><button type="button" style={chip(skillFilter == null)} onClick={() => setSkillFilter(null)}>Tous</button>{LEVELS.map((level) => <button key={level} type="button" style={chip(skillFilter === level)} onClick={() => setSkillFilter(level)}>{"★".repeat(level)}</button>)}</div></div> : null}

        <button type="button" disabled={busy || !settings.hasLocation} style={{ ...primary, width: "100%", marginTop: 12, opacity: settings.hasLocation ? 1 : .55 }} onClick={refreshPlayers}>{busy ? "RECHERCHE EN COURS…" : "CHERCHER AUTOUR DE MOI"}</button>
        {error ? <div style={{ marginTop: 10, color: "#ff9a9a", fontSize: 12, lineHeight: 1.35 }}>{error}</div> : null}
        {message ? <div style={{ marginTop: 10, color: "#bfe8c8", fontSize: 12, lineHeight: 1.35 }}>{message}</div> : null}
        {!mapMigrationReady ? <div style={{ marginTop: 10, borderRadius: 12, border: "1px solid rgba(255,196,91,.35)", background: "rgba(255,196,91,.08)", color: "#ffd173", padding: 9, fontSize: 11.5, lineHeight: 1.4 }}>La liste des joueurs fonctionne. Pour activer les joueurs croisés, clubs, tournois et points cartographiques partagés, installe la migration Supabase fournie dans le patch.</div> : null}
      </div>

      <div style={{ ...panel, padding: 9 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
          {viewTabs.map((tab) => <button key={tab.id} type="button" onClick={async () => { setView(tab.id); setSelectedMapPlayer(null); setSelectedMapPlace(null); if (tab.id === "map") { try { await ensureCoordinates(); } catch (caught: any) { setError(String(caught?.message || caught)); } } }} style={{ ...btn, minHeight: 48, borderColor: view === tab.id ? accent : "rgba(255,255,255,.12)", background: view === tab.id ? `${accent}18` : "rgba(255,255,255,.035)", color: view === tab.id ? accent : "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><span style={{ fontSize: 17 }}>{tab.icon}</span><span>{tab.label}</span>{tab.count != null ? <span style={{ borderRadius: 999, minWidth: 20, padding: "2px 5px", background: "rgba(255,255,255,.08)", fontSize: 9.5 }}>{tab.count}</span> : null}</button>)}
        </div>
      </div>

      <div style={panel}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 15, fontWeight: 1000 }}>MON STATUT LOCAL</div><div style={{ marginTop: 3, fontSize: 11.3, opacity: .7 }}>{settings.visible ? "Les profils compatibles peuvent te trouver." : "Tu peux explorer la carte sans apparaître."}</div></div><button type="button" disabled={busy} style={{ ...btn, borderColor: settings.visible ? "#65e58a88" : undefined, color: settings.visible ? "#84f7a3" : "#fff" }} onClick={async () => { setBusy(true); setError(null); try { if (!settings.visible && !settings.hasLocation) await activateLocation(true, settings); else await updateSettings({ ...settings, visible: !settings.visible }, !settings.visible ? "Tu es maintenant visible à proximité." : "Tu es maintenant invisible à proximité."); } finally { setBusy(false); } }}>{settings.visible ? "🟢 VISIBLE" : "⚫ INVISIBLE"}</button></div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><button type="button" style={{ ...btn, color: settings.availableNow ? accent : "#fff", minHeight: 48 }} onClick={() => void updateSettings({ ...settings, availableNow: !settings.availableNow }, !settings.availableNow ? "Tu es disponible pendant 6 heures." : "Disponibilité désactivée.")}>{settings.availableNow ? "🟢 DISPONIBLE" : "Me rendre disponible"}</button><button type="button" style={{ ...btn, color: settings.lookingForGame ? accent : "#fff", minHeight: 48 }} onClick={async () => { setBusy(true); setError(null); try { let next = { ...settings, lookingForGame: !settings.lookingForGame, visible: settings.lookingForGame ? settings.visible : true }; if (next.visible && !settings.hasLocation) next = await activateLocation(true, next); else next = await updateSettings(next); setMessage(next.lookingForGame ? "Ta recherche de partie est publiée pour 24 heures." : "Recherche de partie désactivée."); } finally { setBusy(false); } }}>{settings.lookingForGame ? "🔥 JE CHERCHE UNE PARTIE" : "Publier une recherche"}</button></div>
        <button type="button" style={{ ...btn, width: "100%", marginTop: 8 }} disabled={busy} onClick={async () => { setBusy(true); setError(null); try { await activateLocation(settings.visible, settings); } catch (caught: any) { setError(String(caught?.message || caught)); } finally { setBusy(false); } }}>↻ Mettre à jour ma position privée</button>
        <button type="button" style={{ ...btn, width: "100%", marginTop: 8, opacity: .86 }} onClick={() => setProfileSettingsOpen((value) => !value)}>{profileSettingsOpen ? "Masquer mes réglages" : "Configurer mes sports et mon niveau"}</button>
        {profileSettingsOpen ? <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 10 }}><div style={{ fontSize: 10.5, opacity: .68, fontWeight: 1000 }}>MES SPORTS</div><div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 7 }}>{SPORTS.map((sportId) => <button key={sportId} type="button" style={chip(settings.sports.includes(sportId))} onClick={() => void toggleSport(sportId)}>{SPORT_LABEL[sportId]}</button>)}</div><div style={{ marginTop: 10, fontSize: 10.5, opacity: .68, fontWeight: 1000 }}>MON NIVEAU</div><div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 7 }}>{LEVELS.map((level) => <button key={level} type="button" style={chip(Number(settings.skillLevel || 0) === level)} onClick={() => void updateSettings({ ...settings, skillLevel: Number(settings.skillLevel || 0) === level ? null : level })}>{"★".repeat(level)}</button>)}</div></div> : null}
      </div>

      {incoming.length > 0 ? <div style={{ ...panel, borderColor: `${accent}99` }}><div style={{ fontWeight: 1000, color: accent, marginBottom: 8 }}>🔥 PROPOSITIONS REÇUES ({incoming.length})</div>{incoming.map((request) => <div key={request.id} style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: "10px 0", display: "grid", gap: 8 }}><div><b>{request.fromDisplayName || "Joueur"}</b><div style={{ fontSize: 11.5, opacity: .72 }}>{SPORT_LABEL[request.sport] || request.sport}{request.message ? ` • ${request.message}` : ""}</div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}><button type="button" style={{ ...primary, minHeight: 40 }} onClick={async () => { await respondNearbyGameRequest(request.id, "accepted"); await refreshRequests(); setMessage("Proposition acceptée. Tu peux maintenant contacter ce joueur."); onOpenMessages?.(); }}>Accepter</button><button type="button" style={btn} onClick={async () => { await respondNearbyGameRequest(request.id, "rejected"); await refreshRequests(); }}>Refuser</button></div></div>)}</div> : null}

      {outgoing.length > 0 ? <div style={panel}><div style={{ fontWeight: 1000, marginBottom: 8 }}>MES PROPOSITIONS EN ATTENTE ({outgoing.length})</div>{outgoing.map((request) => <div key={request.id} style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: "9px 0", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><div style={{ flex: 1, minWidth: 160 }}><b>{request.toDisplayName || "Joueur"}</b><div style={{ fontSize: 11.5, opacity: .7 }}>{SPORT_LABEL[request.sport] || request.sport}</div></div><button type="button" style={btn} onClick={async () => { await respondNearbyGameRequest(request.id, "cancelled"); await refreshRequests(); setMessage("Proposition annulée."); }}>Annuler</button></div>)}</div> : null}

      {view === "list" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ fontWeight: 1000, fontSize: 13 }}>{players.length} JOUEUR(S) TROUVÉ(S)</div><button type="button" disabled={busy} style={{ ...btn, padding: "7px 10px", fontSize: 11 }} onClick={refreshPlayers}>↻ Actualiser</button></div>
          {!hasSearched ? <div style={{ ...panel, textAlign: "center", padding: 22 }}><div style={{ fontSize: 32 }}>🔎</div><div style={{ marginTop: 6, fontWeight: 1000 }}>Lance une recherche pour afficher les partenaires proches</div></div> : players.length === 0 ? <div style={{ ...panel, textAlign: "center", padding: 22 }}><div style={{ fontSize: 32 }}>📍</div><div style={{ marginTop: 6, fontWeight: 1000 }}>Aucun joueur visible pour le moment</div><div style={{ marginTop: 5, fontSize: 12, opacity: .72, lineHeight: 1.4 }}>Élargis le rayon ou retire un filtre.</div></div> : players.map((player) => <NearbyPlayerCard key={player.userId} player={player} accent={accent} proposed={pendingTargets.has(player.userId)} onFriend={() => void addFriend(player)} onMessage={onOpenMessages} onMatch={() => void proposePlayer(player, "match")} onTournament={() => void proposePlayer(player, "tournament")} />)}
        </div>
      ) : null}

      {view === "map" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <NearbyMapView center={coords} radiusKm={settings.radiusKm} players={players} places={places} crossedUserIds={crossedUserIds} accent={accent} onNeedLocation={async () => { try { await ensureCoordinates(); } catch (caught: any) { setError(String(caught?.message || caught)); } }} onSelectPlayer={(player) => { setSelectedMapPlayer(player); setSelectedMapPlace(null); }} onSelectPlace={(place) => { setSelectedMapPlace(place); setSelectedMapPlayer(null); }} />
          {selectedMapPlayer ? <NearbyPlayerCard player={selectedMapPlayer} accent={accent} crossedCount={encounters.find((row) => row.userId === selectedMapPlayer.userId)?.crossedCount} proposed={pendingTargets.has(selectedMapPlayer.userId)} onFriend={() => void addFriend(selectedMapPlayer)} onMessage={onOpenMessages} onMatch={() => void proposePlayer(selectedMapPlayer, "match")} onTournament={() => void proposePlayer(selectedMapPlayer, "tournament")} /> : null}
          {selectedMapPlace ? <NearbyPlaceCard place={selectedMapPlace} accent={accent} onContact={!selectedMapPlace.isOwner ? () => void addFriend({ userId: selectedMapPlace.ownerUserId, displayName: selectedMapPlace.title }) : undefined} onInvite={!selectedMapPlace.isOwner ? () => void proposePlayer({ userId: selectedMapPlace.ownerUserId, displayName: selectedMapPlace.title }, selectedMapPlace.kind === "tournament" ? "tournament" : "match") : undefined} onDelete={selectedMapPlace.isOwner ? () => void removePlace(selectedMapPlace) : undefined} /> : null}
        </div>
      ) : null}

      {view === "crossed" ? <NearbyEncountersPanel encounters={encounters} accent={accent} onClear={async () => { setBusy(true); setError(null); try { clearLocalEncounters(); try { await clearNearbyEncounters(); } catch (caught) { if (!isMissingMapMigration(caught)) throw caught; } setEncounters([]); setMessage("Historique des croisements effacé."); } catch (caught: any) { setError(String(caught?.message || caught)); } finally { setBusy(false); } }} onFriend={(encounter) => void addFriend(encounter)} onMessage={() => onOpenMessages?.()} onMatch={(encounter) => void proposePlayer(encounter, "match")} onTournament={(encounter) => void proposePlayer(encounter, "tournament")} /> : null}

      {view === "places" ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ ...panel, background: `radial-gradient(120% 140% at 0% 0%, ${accent}20, rgba(7,10,16,.88) 60%)` }}><div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 1000, color: accent }}>🏆 CLUBS, ÉQUIPES ET ÉVÉNEMENTS LOCAUX</div><div style={{ marginTop: 4, fontSize: 11.5, opacity: .72 }}>Publie un tournoi, un lieu de pratique, ton club ou une équipe pour faciliter les rencontres.</div></div><button type="button" style={primary} onClick={() => setPublishOpen((value) => !value)}>{publishOpen ? "Fermer" : "＋ Publier"}</button></div></div>

          {publishOpen ? <div style={panel}><div style={{ fontSize: 15, fontWeight: 1000 }}>PUBLIER SUR LA CARTE</div><div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 7 }}>{(["club","team","tournament","venue"] as NearbyPlaceKind[]).map((kind) => <button key={kind} type="button" style={chip(publishDraft.kind === kind)} onClick={() => setPublishDraft((draft) => ({ ...draft, kind, preciseLocation: false }))}>{kind === "club" ? "🏛 Club" : kind === "team" ? "🛡 Équipe" : kind === "tournament" ? "🏆 Tournoi" : "📌 Lieu"}</button>)}</div><div style={{ marginTop: 10, display: "grid", gap: 8 }}><input value={publishDraft.title} onChange={(event) => setPublishDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Nom du club, équipe, tournoi ou lieu" style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", padding: 11, outline: "none" }} /><textarea value={publishDraft.description} onChange={(event) => setPublishDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Description, format, niveau recherché, informations utiles…" rows={3} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", padding: 11, outline: "none", resize: "vertical" }} /><input value={publishDraft.areaLabel} onChange={(event) => setPublishDraft((draft) => ({ ...draft, areaLabel: event.target.value }))} placeholder="Secteur affiché : Grenoble centre, Voiron…" style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", padding: 11, outline: "none" }} />{publishDraft.kind === "tournament" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}><label style={{ fontSize: 10.5, opacity: .72 }}>DÉBUT<input type="datetime-local" value={publishDraft.startsAt} onChange={(event) => setPublishDraft((draft) => ({ ...draft, startsAt: event.target.value }))} style={{ marginTop: 4, width: "100%", boxSizing: "border-box", borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", padding: 9 }} /></label><label style={{ fontSize: 10.5, opacity: .72 }}>FIN<input type="datetime-local" value={publishDraft.endsAt} onChange={(event) => setPublishDraft((draft) => ({ ...draft, endsAt: event.target.value }))} style={{ marginTop: 4, width: "100%", boxSizing: "border-box", borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", padding: 9 }} /></label></div> : null}<label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11.5, lineHeight: 1.4, opacity: .84 }}><input type="checkbox" checked={publishDraft.preciseLocation} onChange={(event) => setPublishDraft((draft) => ({ ...draft, preciseLocation: event.target.checked }))} /><span><b>Lieu public précisément positionné</b><br />Décoche pour afficher seulement une zone arrondie.</span></label><button type="button" disabled={busy} style={{ ...primary, width: "100%" }} onClick={publishPlace}>{busy ? "PUBLICATION…" : "PUBLIER SUR LA CARTE"}</button></div></div> : null}

          {places.length === 0 ? <div style={{ ...panel, textAlign: "center", padding: 22 }}><div style={{ fontSize: 35 }}>🏆</div><div style={{ marginTop: 7, fontWeight: 1000 }}>Aucun club ou événement visible dans ce rayon</div><div style={{ marginTop: 5, fontSize: 12, opacity: .7 }}>Sois le premier à publier un tournoi, une équipe ou un lieu de pratique local.</div></div> : places.map((place) => <NearbyPlaceCard key={place.id} place={place} accent={accent} onContact={!place.isOwner ? () => void addFriend({ userId: place.ownerUserId, displayName: place.title }) : undefined} onInvite={!place.isOwner ? () => void proposePlayer({ userId: place.ownerUserId, displayName: place.title }, place.kind === "tournament" ? "tournament" : "match") : undefined} onDelete={place.isOwner ? () => void removePlace(place) : undefined} />)}
        </div>
      ) : null}
    </div>
  );
}
