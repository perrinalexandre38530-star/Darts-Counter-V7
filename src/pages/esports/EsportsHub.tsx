import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import { ESPORTS_GAMES, getEsportsGame } from "../../esports/catalog";
import { createOnlineEsportsRoom, joinOnlineEsportsRoom, listPublicOnlineEsportsRooms, refreshOnlineEsportsRoom, setOnlineEsportsReady, startOnlineEsportsMatch, subscribeOnlineEsportsRoom } from "../../esports/online";
import { createEsportsLfgPost, createEsportsTeam, createEsportsTournament, createLocalEsportsRoom, deleteEsportsLfgPost, deleteEsportsTeam, deleteEsportsTournament, readEsportsState, recordEsportsMatch, recordEsportsRoomInvite, recordEsportsTournamentMatchResult, removeEsportsRoom, saveGamerIdentity, selectEsportsGame, setEsportsLfgStatus, subscribeEsportsStore, toggleFavoriteGame, upsertEsportsRoom } from "../../esports/store";
import type { EsportsGameDefinition, EsportsPlatform, EsportsRoom, EsportsState, EsportsTournamentFormat } from "../../esports/types";
import { buildRoundRobinStandings } from "../../esports/tournamentEngine";
import { fetchEsportsRoomMessages, loadEsportsFriends, loadIncomingEsportsRoomInvites, postEsportsRoomMessage, requestEsportsFriend, searchEsportsPlayers, sendEsportsRoomInvite, subscribeEsportsRoomMessages, syncEsportsPresence, type EsportsFriend } from "../../esports/community";
import {
  createPublicEsportsTeam,
  deletePublicEsportsTeam,
  listPublicEsportsLfg,
  listPublicEsportsTeams,
  publishPublicEsportsLfg,
  publishPublicEsportsProfile,
  searchPublicEsportsPlayers,
  setPublicEsportsLfgStatus,
  type PublicEsportsLfgPost,
  type PublicEsportsPlayer,
  type PublicEsportsTeam,
} from "../../esports/publicNetwork";
import { EsportsCompetitiveNetworkV4, EsportsLfgApplicationsV4, EsportsTeamMembershipV4, applyToLfgFromCard } from "./EsportsNetworkV4";
import type { Store } from "../../lib/types";

export type EsportsSection = "overview" | "games" | "rooms" | "matches" | "tournaments" | "profile" | "stats";

type Props = {
  store: Store;
  go: (route: any, params?: any) => void;
  section?: EsportsSection;
};

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function formatDate(ts: number): string {
  try { return new Date(ts).toLocaleString(); } catch { return ""; }
}

function displayPlatform(value: string): string {
  const labels: Record<string, string> = { pc: "PC", playstation: "PlayStation", xbox: "Xbox", switch: "Switch", mobile: "Mobile", crossplay: "Cross-play" };
  return labels[value] || value;
}

function winnerText(match: any): string {
  if (match.winner === "draw") return "Match nul";
  return match.winner === "A" ? match.sideA.name : match.sideB.name;
}

export default function EsportsHub({ store, go, section = "overview" }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const tr = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const [state, setState] = React.useState<EsportsState>(() => readEsportsState());
  const [toast, setToast] = React.useState("");

  React.useEffect(() => subscribeEsportsStore(() => setState(readEsportsState())), []);

  const activeLocalProfile = React.useMemo(() => {
    const profiles = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];
    const id = String((store as any)?.activeProfileId || "");
    return profiles.find((p: any) => String(p?.id || "") === id) || profiles[0] || null;
  }, [store]);

  React.useEffect(() => {
    if (state.gamer.displayName !== "Gamer") return;
    const name = String(activeLocalProfile?.name || activeLocalProfile?.displayName || activeLocalProfile?.nickname || "").trim();
    if (name) saveGamerIdentity({ displayName: name });
  }, [activeLocalProfile, state.gamer.displayName]);

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const accent = (theme as any)?.primary || "#f7c948";
  const bg = (theme as any)?.bg || "#050608";
  const card = (theme as any)?.card || "#0d111a";
  const cardSoft = (theme as any)?.cardSoft || "#151b27";
  const textMain = (theme as any)?.textMain || "#f8fafc";
  const textSoft = (theme as any)?.textSoft || "#9ca3af";

  const refresh = React.useCallback(() => setState(readEsportsState()), []);
  const selectedGame = getEsportsGame(state.selectedGameId);

  const shellStyle: React.CSSProperties = { minHeight: "100%", background: `radial-gradient(circle at 82% 0%, ${selectedGame.accent}20, transparent 34%), ${bg}`, color: textMain, padding: "14px 12px 112px" };
  const panelStyle: React.CSSProperties = { borderRadius: 22, border: `1px solid ${cardSoft}`, background: `linear-gradient(180deg, ${card}, rgba(5,8,14,.94))`, boxShadow: "0 18px 46px rgba(0,0,0,.24)" };
  const buttonStyle = (active = false): React.CSSProperties => ({ border: `1px solid ${active ? accent : cardSoft}`, borderRadius: 14, minHeight: 40, padding: "8px 12px", background: active ? `${accent}20` : "rgba(255,255,255,.035)", color: active ? accent : textMain, fontWeight: 900, cursor: "pointer" });
  const inputStyle: React.CSSProperties = { width: "100%", minHeight: 42, borderRadius: 13, border: `1px solid ${cardSoft}`, background: "rgba(0,0,0,.28)", color: textMain, padding: "9px 11px", outline: "none" };

  const navigateSection = (next: EsportsSection) => {
    const routes: Record<EsportsSection, string> = { overview: "home", games: "games", rooms: "esports_rooms", matches: "esports_matches", tournaments: "esports_tournaments", profile: "esports_profile", stats: "esports_stats" };
    go(routes[next]);
  };

  const counts = {
    games: state.gamer.favoriteGameIds.length,
    rooms: state.rooms.filter((r) => r.status !== "finished").length,
    matches: state.matches.length,
    tournaments: state.tournaments.length,
    teams: state.teams.length,
    lfg: state.lfgPosts.filter((post) => post.status === "open").length,
  };

  return (
    <div style={shellStyle}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 12 }}>
        <header style={{ ...panelStyle, padding: 16, overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", inset: "auto -60px -90px auto", width: 260, height: 260, borderRadius: "50%", background: `${selectedGame.accent}18`, filter: "blur(4px)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "relative" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: textSoft, fontSize: 11, fontWeight: 900, letterSpacing: 2 }}>{tr("BIENVENUE", "WELCOME", "BIENVENIDO")}</div>
              <div style={{ marginTop: 2, fontSize: "clamp(24px,5vw,42px)", fontWeight: 1000, letterSpacing: 1.2 }}>E-SPORTS HUB</div>
              <div style={{ marginTop: 4, color: textSoft, fontSize: 12.5 }}>{tr("Scores · salons · matchs · équipes · tournois", "Scores · rooms · matches · teams · tournaments", "Puntuaciones · salas · partidos · equipos · torneos")}</div>
            </div>
            <button type="button" onClick={() => navigateSection("profile")} style={{ ...buttonStyle(false), borderColor: `${selectedGame.accent}80`, display: "grid", gridTemplateColumns: "36px auto", alignItems: "center", gap: 8, textAlign: "left" }}>
              <span style={{ width: 36, height: 36, borderRadius: 12, display: "grid", placeItems: "center", background: `${selectedGame.accent}25`, color: selectedGame.accent, fontWeight: 1000 }}>🎮</span>
              <span><span style={{ display: "block", fontSize: 12 }}>{state.gamer.displayName}</span><span style={{ display: "block", fontSize: 9.5, color: textSoft }}>{state.gamer.lookingForGroup ? tr("Cherche un groupe", "Looking for group", "Busca grupo") : tr("Profil gamer", "Gamer profile", "Perfil gamer")}</span></span>
            </button>
          </div>
        </header>

        {section === "overview" ? <Overview state={state} selectedGame={selectedGame} counts={counts} panelStyle={panelStyle} buttonStyle={buttonStyle} textSoft={textSoft} accent={accent} navigateSection={navigateSection} tr={tr} /> : null}
        {section === "games" ? <GamesSection state={state} refresh={refresh} panelStyle={panelStyle} buttonStyle={buttonStyle} textSoft={textSoft} inputStyle={inputStyle} navigateSection={navigateSection} tr={tr} /> : null}
        {section === "rooms" ? <RoomsSection state={state} refresh={refresh} panelStyle={panelStyle} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} accent={accent} setToast={setToast} tr={tr} /> : null}
        {section === "matches" ? <MatchesSection state={state} refresh={refresh} panelStyle={panelStyle} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} accent={accent} setToast={setToast} tr={tr} /> : null}
        {section === "tournaments" ? <TournamentsSection state={state} refresh={refresh} panelStyle={panelStyle} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} accent={accent} setToast={setToast} tr={tr} /> : null}
        {section === "profile" ? <ProfileSection state={state} refresh={refresh} panelStyle={panelStyle} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} accent={accent} go={go} setToast={setToast} tr={tr} /> : null}
        {section === "stats" ? <StatsSection state={state} panelStyle={panelStyle} textSoft={textSoft} tr={tr} /> : null}
      </div>
      {toast ? <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 104, zIndex: 120, borderRadius: 999, background: "rgba(5,8,14,.96)", border: `1px solid ${accent}`, color: textMain, padding: "9px 14px", fontSize: 12, fontWeight: 900, boxShadow: `0 0 24px ${accent}40` }}>{toast}</div> : null}
    </div>
  );
}

function Overview({ state, selectedGame, counts, panelStyle, buttonStyle, textSoft, accent, navigateSection, tr }: any) {
  const recent = state.matches.slice(0, 4);
  const activeRooms = state.rooms.filter((r: EsportsRoom) => r.status !== "finished").slice(0, 4);
  return <>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9 }}>
      {[
        ["★", counts.games, tr("Jeux favoris", "Favorite games", "Juegos favoritos"), "games"],
        ["◉", counts.rooms, tr("Salons actifs", "Active rooms", "Salas activas"), "rooms"],
        ["VS", counts.matches, tr("Matchs enregistrés", "Recorded matches", "Partidos guardados"), "matches"],
        ["🏆", counts.tournaments, tr("Tournois", "Tournaments", "Torneos"), "tournaments"],
        ["🛡", counts.teams, tr("Équipes / clans", "Teams / clans", "Equipos / clanes"), "profile"],
        ["📡", counts.lfg, tr("Recherches LFG", "LFG searches", "Búsquedas LFG"), "profile"],
      ].map(([icon, value, label, target]) => <button key={String(target)} type="button" onClick={() => navigateSection(target)} style={{ ...panelStyle, padding: 13, textAlign: "left", color: "inherit", cursor: "pointer" }}><div style={{ fontSize: 18, color: accent, fontWeight: 1000 }}>{icon}</div><div style={{ marginTop: 8, fontSize: 24, fontWeight: 1000 }}>{value}</div><div style={{ color: textSoft, fontSize: 10.5 }}>{label}</div></button>)}
    </section>

    <section style={{ ...panelStyle, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><div style={{ fontSize: 11, color: textSoft, fontWeight: 900 }}>{tr("JEU ACTIF", "ACTIVE GAME", "JUEGO ACTIVO")}</div><div style={{ marginTop: 3, fontSize: 20, fontWeight: 1000 }}>{selectedGame.icon} {selectedGame.name}</div></div><button type="button" onClick={() => navigateSection("games")} style={buttonStyle(false)}>{tr("Changer", "Change", "Cambiar")}</button></div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>{[
        [tr("Format", "Format", "Formato"), selectedGame.matchShape.toUpperCase()],
        [tr("Équipes", "Teams", "Equipos"), selectedGame.teamSizes.join(" / ")],
        [tr("Résultat", "Result", "Resultado"), selectedGame.resultKind.toUpperCase()],
        [tr("Plateformes", "Platforms", "Plataformas"), selectedGame.platforms.slice(0,3).map(displayPlatform).join(" · ")],
      ].map(([k,v]) => <div key={k} style={{ borderRadius: 14, background: "rgba(255,255,255,.035)", padding: 10 }}><div style={{ color: textSoft, fontSize: 9.5 }}>{k}</div><div style={{ marginTop: 3, fontSize: 11, fontWeight: 900 }}>{v}</div></div>)}</div>
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}><button type="button" onClick={() => navigateSection("rooms")} style={buttonStyle(true)}>＋ {tr("Créer / rejoindre un salon", "Create / join a room", "Crear / unirse a sala")}</button><button type="button" onClick={() => navigateSection("matches")} style={buttonStyle(false)}>VS {tr("Enregistrer un match", "Record a match", "Guardar partido")}</button><button type="button" onClick={() => navigateSection("tournaments")} style={buttonStyle(false)}>🏆 {tr("Créer un tournoi", "Create tournament", "Crear torneo")}</button><button type="button" onClick={() => navigateSection("stats")} style={buttonStyle(false)}>▥ Stats</button></div>
    </section>

    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 10 }}>
      <div style={{ ...panelStyle, padding: 14 }}><div style={{ fontWeight: 1000 }}>{tr("Salons récents", "Recent rooms", "Salas recientes")}</div>{activeRooms.length ? <div style={{ marginTop: 9, display: "grid", gap: 7 }}>{activeRooms.map((room: EsportsRoom) => <div key={room.id} style={{ borderRadius: 13, padding: 10, background: "rgba(255,255,255,.035)", display: "flex", justifyContent: "space-between", gap: 8 }}><div><div style={{ fontWeight: 900 }}>{getEsportsGame(room.gameId).shortName} · {room.title}</div><div style={{ color: textSoft, fontSize: 10 }}>{room.code} · {room.members.length}/{room.maxPlayers} · {room.source.toUpperCase()}</div></div><div style={{ color: getEsportsGame(room.gameId).accent, fontSize: 10, fontWeight: 1000 }}>{room.status.toUpperCase()}</div></div>)}</div> : <Empty text={tr("Aucun salon pour l'instant.", "No rooms yet.", "Sin salas todavía.")} textSoft={textSoft} />}</div>
      <div style={{ ...panelStyle, padding: 14 }}><div style={{ fontWeight: 1000 }}>{tr("Derniers résultats", "Latest results", "Últimos resultados")}</div>{recent.length ? <div style={{ marginTop: 9, display: "grid", gap: 7 }}>{recent.map((m: any) => <div key={m.id} style={{ borderRadius: 13, padding: 10, background: "rgba(255,255,255,.035)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{getEsportsGame(m.gameId).shortName}</strong><span style={{ color: textSoft, fontSize: 9.5 }}>{formatDate(m.playedAt)}</span></div><div style={{ marginTop: 5, fontSize: 13, fontWeight: 900 }}>{m.sideA.name} {m.sideA.score} — {m.sideB.score} {m.sideB.name}</div></div>)}</div> : <Empty text={tr("Aucun match enregistré.", "No recorded matches.", "Sin partidos guardados.")} textSoft={textSoft} />}</div>
    </section>
  </>;
}

function GamesSection({ state, refresh, panelStyle, buttonStyle, textSoft, inputStyle, navigateSection, tr }: any) {
  const [query, setQuery] = React.useState("");
  const [genre, setGenre] = React.useState("all");
  const [platform, setPlatform] = React.useState("all");
  const games = ESPORTS_GAMES.filter((game) => (!query || `${game.name} ${game.shortName} ${game.publisher || ""}`.toLowerCase().includes(query.toLowerCase())) && (genre === "all" || game.genre === genre) && (platform === "all" || game.platforms.includes(platform as any)));
  const pick = (game: EsportsGameDefinition) => { selectEsportsGame(game.id); refresh(); };
  return <section style={{ ...panelStyle, padding: 14 }}>
    <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><div style={{ color: textSoft, fontSize: 10, fontWeight: 900, letterSpacing: 1.5 }}>{tr("CATALOGUE GÉNÉRIQUE", "GENERIC CATALOG", "CATÁLOGO GENÉRICO")}</div><div style={{ fontSize: 24, fontWeight: 1000 }}>{ESPORTS_GAMES.length} {tr("jeux déjà configurés", "games already configured", "juegos ya configurados")}</div></div><button type="button" onClick={() => navigateSection("rooms")} style={buttonStyle(true)}>＋ {tr("Salon", "Room", "Sala")}</button></div>
    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(180px,1fr) repeat(2,minmax(120px,190px))", gap: 8 }}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Rechercher un jeu...", "Search a game...", "Buscar un juego...")} style={inputStyle}/><select value={genre} onChange={(e) => setGenre(e.target.value)} style={inputStyle}><option value="all">{tr("Tous genres", "All genres", "Todos géneros")}</option>{[...new Set(ESPORTS_GAMES.map((g) => g.genre))].map((x) => <option key={x} value={x}>{x.toUpperCase()}</option>)}</select><select value={platform} onChange={(e) => setPlatform(e.target.value)} style={inputStyle}><option value="all">{tr("Toutes plateformes", "All platforms", "Todas plataformas")}</option>{["pc","playstation","xbox","switch","mobile","crossplay"].map((x) => <option key={x} value={x}>{displayPlatform(x)}</option>)}</select></div>
    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 9 }}>{games.map((game) => { const selected = state.selectedGameId === game.id; const favorite = state.gamer.favoriteGameIds.includes(game.id); return <article key={game.id} style={{ borderRadius: 18, border: `1px solid ${selected ? game.accent : "rgba(255,255,255,.09)"}`, background: selected ? `${game.accent}12` : "rgba(255,255,255,.03)", padding: 12 }}><div style={{ display: "flex", gap: 10, alignItems: "center" }}><button type="button" onClick={() => pick(game)} style={{ width: 48, height: 48, borderRadius: 15, border: `1px solid ${game.accent}55`, background: `${game.accent}18`, color: game.accent, fontWeight: 1000, fontSize: 20, cursor: "pointer" }}>{game.icon}</button><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000 }}>{game.name}</div><div style={{ color: textSoft, fontSize: 9.5 }}>{game.genre.toUpperCase()} · {game.platforms.slice(0,3).map(displayPlatform).join(" · ")}</div></div><button type="button" aria-label="Favori" onClick={() => { toggleFavoriteGame(game.id); refresh(); }} style={{ border: 0, background: "transparent", color: favorite ? "#ffd54a" : textSoft, fontSize: 20, cursor: "pointer" }}>{favorite ? "★" : "☆"}</button></div><div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 5 }}>{[game.matchShape.toUpperCase(), `BO ${game.bestOf.join("/")}`, game.resultKind.toUpperCase(), game.crossplay ? "CROSSPLAY" : ""].filter(Boolean).map((tag) => <span key={tag} style={{ borderRadius: 999, padding: "4px 7px", background: "rgba(255,255,255,.05)", color: textSoft, fontSize: 8.5, fontWeight: 900 }}>{tag}</span>)}</div><div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}><button type="button" onClick={() => pick(game)} style={buttonStyle(selected)}>{selected ? tr("Sélectionné", "Selected", "Seleccionado") : tr("Sélectionner", "Select", "Seleccionar")}</button><button type="button" onClick={() => { pick(game); navigateSection("rooms"); }} style={buttonStyle(false)}>＋ {tr("Salon", "Room", "Sala")}</button></div></article>; })}</div>
  </section>;
}

function RoomsSection({ state, refresh, panelStyle, buttonStyle, inputStyle, textSoft, accent, setToast, tr }: any) {
  const game = getEsportsGame(state.selectedGameId);
  const [gameId, setGameId] = React.useState(game.id);
  const currentGame = getEsportsGame(gameId);
  const [title, setTitle] = React.useState(`${currentGame.shortName} · ${tr("Entre amis", "Friends", "Amigos")}`);
  const [teamSize, setTeamSize] = React.useState(currentGame.teamSizes[0] || 1);
  const [bestOf, setBestOf] = React.useState(currentGame.bestOf[0] || 1);
  const [visibility, setVisibility] = React.useState<"private"|"friends"|"public">("private");
  const [source, setSource] = React.useState<"local"|"online">("local");
  const [joinCode, setJoinCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [openRoomId, setOpenRoomId] = React.useState<string | null>(state.rooms[0]?.id || null);

  React.useEffect(() => { const next = getEsportsGame(gameId); setTeamSize(next.teamSizes[0] || 1); setBestOf(next.bestOf[0] || 1); }, [gameId]);
  const maxPlayers = currentGame.matchShape === "battle_royale" || currentGame.matchShape === "ffa" ? Math.min(currentGame.maxPlayers, Math.max(2, teamSize * 4)) : Math.min(currentGame.maxPlayers, Math.max(2, teamSize * 2));
  const formatLabel = currentGame.matchShape === "1v1" ? "1v1" : currentGame.matchShape === "team" ? `${teamSize}v${teamSize}` : currentGame.matchShape === "battle_royale" ? `BR · ${teamSize}` : "FFA";

  React.useEffect(() => {
    const room = state.rooms.find((r: EsportsRoom) => r.id === openRoomId && r.source === "online");
    if (!room?.code) return;
    return subscribeOnlineEsportsRoom(room.code, () => refresh());
  }, [openRoomId, state.rooms, refresh]);

  const createRoom = async () => {
    setError(""); setBusy(true);
    try {
      selectEsportsGame(gameId);
      const hostName = state.gamer.displayName || "Gamer";
      const room = source === "online"
        ? await createOnlineEsportsRoom({ gameId, title, teamSize, maxPlayers, bestOf, formatLabel, visibility, hostName })
        : createLocalEsportsRoom({ gameId, title, teamSize, maxPlayers, bestOf, formatLabel, visibility, source: "local", hostName });
      setOpenRoomId(room.id); refresh();
      if (room.source === "online") void publishPublicEsportsProfile(state.gamer, { gameId: room.gameId, label: `${tr("Dans un salon", "In a room", "En una sala")} · ${room.formatLabel}`, roomCode: room.code, state: "in_room" }).catch(() => null);
      setToast(source === "online" ? `${tr("Salon online créé", "Online room created", "Sala online creada")} · ${room.code}` : tr("Salon local créé", "Local room created", "Sala local creada"));
    } catch (e: any) { setError(String(e?.message || e || tr("Création impossible.", "Unable to create.", "No se pudo crear."))); }
    finally { setBusy(false); }
  };

  const joinOnline = async () => {
    const code = joinCode.trim().toUpperCase(); if (!code) return;
    setBusy(true); setError("");
    try { const room = await joinOnlineEsportsRoom(code); setOpenRoomId(room.id); refresh(); void publishPublicEsportsProfile(state.gamer, { gameId: room.gameId, label: `${tr("Dans un salon", "In a room", "En una sala")} · ${room.formatLabel}`, roomCode: room.code, state: "in_room" }).catch(() => null); setToast(`${tr("Salon rejoint", "Room joined", "Sala unida")} · ${room.code}`); }
    catch (e: any) { setError(String(e?.message || e || tr("Salon introuvable.", "Room not found.", "Sala no encontrada."))); }
    finally { setBusy(false); }
  };

  return <div style={{ display: "grid", gap: 10 }}>
    <section style={{ ...panelStyle, padding: 14 }}><div style={{ fontSize: 22, fontWeight: 1000 }}>{tr("Créer un salon", "Create a room", "Crear una sala")}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 11 }}>{tr("Le mode Online réutilise le moteur temps réel déjà présent dans MULTISPORTS SCORING.", "Online mode reuses the real-time engine already in MULTISPORTS SCORING.", "El modo Online reutiliza el motor en tiempo real ya presente.")}</div><div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}><select value={gameId} onChange={(e) => setGameId(e.target.value)} style={inputStyle}>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle}/><select value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} style={inputStyle}>{currentGame.teamSizes.map((n) => <option key={n} value={n}>{currentGame.matchShape === "team" ? `${n}v${n}` : `${n} joueur${n>1?"s":""}/équipe`}</option>)}</select><select value={bestOf} onChange={(e) => setBestOf(Number(e.target.value))} style={inputStyle}>{currentGame.bestOf.map((n) => <option key={n} value={n}>BO{n}</option>)}</select><select value={visibility} onChange={(e) => setVisibility(e.target.value as any)} style={inputStyle}><option value="private">🔒 {tr("Privé", "Private", "Privado")}</option><option value="friends">👥 {tr("Amis", "Friends", "Amigos")}</option><option value="public">🌍 {tr("Public", "Public", "Público")}</option></select><select value={source} onChange={(e) => setSource(e.target.value as any)} style={inputStyle}><option value="local">📱 LOCAL</option><option value="online">🌐 ONLINE BETA</option></select></div><div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ color: textSoft, fontSize: 10 }}>{formatLabel} · {maxPlayers} max · {currentGame.resultKind.toUpperCase()}</span><button type="button" disabled={busy} onClick={createRoom} style={buttonStyle(true)}>{busy ? "…" : `＋ ${tr("Créer", "Create", "Crear")}`}</button></div>{error ? <div style={{ marginTop: 9, color: "#fb7185", fontSize: 11, fontWeight: 800 }}>{error}</div> : null}</section>

    <section style={{ ...panelStyle, padding: 14 }}><div style={{ fontWeight: 1000 }}>{tr("Rejoindre un salon Online", "Join an Online room", "Unirse a una sala Online")}</div><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}><input value={joinCode} maxLength={8} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="CODE SALON" style={{ ...inputStyle, textTransform: "uppercase", letterSpacing: 3, fontWeight: 1000 }}/><button type="button" disabled={busy} onClick={joinOnline} style={buttonStyle(false)}>{tr("Rejoindre", "Join", "Unirse")}</button></div></section>

    <PublicRoomsAndInvitesPanel selectedGameId={gameId} refresh={refresh} panelStyle={panelStyle} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} setToast={setToast} tr={tr}/>

    <section style={{ display: "grid", gridTemplateColumns: "minmax(220px,.75fr) minmax(300px,1.25fr)", gap: 10 }}><div style={{ ...panelStyle, padding: 12 }}><div style={{ fontWeight: 1000 }}>{tr("Mes salons", "My rooms", "Mis salas")} · {state.rooms.length}</div><div style={{ marginTop: 9, display: "grid", gap: 7 }}>{state.rooms.length ? state.rooms.map((room: EsportsRoom) => <button type="button" key={room.id} onClick={() => setOpenRoomId(room.id)} style={{ textAlign: "left", borderRadius: 14, border: `1px solid ${openRoomId === room.id ? getEsportsGame(room.gameId).accent : "rgba(255,255,255,.08)"}`, background: openRoomId === room.id ? `${getEsportsGame(room.gameId).accent}14` : "rgba(255,255,255,.025)", color: "inherit", padding: 10, cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 7 }}><strong>{getEsportsGame(room.gameId).shortName} · {room.title}</strong><span style={{ color: room.source === "online" ? "#34d399" : textSoft, fontSize: 9, fontWeight: 1000 }}>{room.source.toUpperCase()}</span></div><div style={{ marginTop: 4, color: textSoft, fontSize: 9.5 }}>{room.code} · {room.members.length}/{room.maxPlayers} · BO{room.bestOf}</div></button>) : <Empty text={tr("Aucun salon.", "No rooms.", "Sin salas.")} textSoft={textSoft}/>}</div></div><div style={{ ...panelStyle, padding: 12 }}>{openRoomId ? <RoomDetail room={state.rooms.find((r: EsportsRoom) => r.id === openRoomId)} state={state} refresh={refresh} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} accent={accent} setToast={setToast} tr={tr}/> : <Empty text={tr("Sélectionne un salon.", "Select a room.", "Selecciona una sala.")} textSoft={textSoft}/>}</div></section>
  </div>;
}


function PublicRoomsAndInvitesPanel({ selectedGameId, refresh, panelStyle, buttonStyle, inputStyle, textSoft, setToast, tr }: any) {
  const [rooms, setRooms] = React.useState<EsportsRoom[]>([]);
  const [invites, setInvites] = React.useState<any[]>([]);
  const [gameFilter, setGameFilter] = React.useState(selectedGameId || "all");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const load = React.useCallback(async () => {
    setLoading(true); setError("");
    const [roomsResult, invitesResult] = await Promise.allSettled([listPublicOnlineEsportsRooms(80), loadIncomingEsportsRoomInvites()]);
    if (roomsResult.status === "fulfilled") setRooms(roomsResult.value);
    else setError(String(roomsResult.reason?.message || roomsResult.reason || tr("Salons publics indisponibles.", "Public rooms unavailable.", "Salas públicas no disponibles.")));
    if (invitesResult.status === "fulfilled") setInvites(invitesResult.value);
    setLoading(false);
  }, [tr]);
  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => { setGameFilter(selectedGameId || "all"); }, [selectedGameId]);
  const join = async (code: string) => {
    try {
      const room = await joinOnlineEsportsRoom(code);
      refresh();
      setToast(`${tr("Salon rejoint", "Room joined", "Sala unida")} · ${room.code}`);
      void load();
    } catch (e: any) { setToast(String(e?.message || e)); }
  };
  const visibleRooms = rooms.filter((room) => gameFilter === "all" || room.gameId === gameFilter);
  return <section style={{ ...panelStyle, padding: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start", flexWrap: "wrap" }}>
      <div><div style={{ fontSize: 20, fontWeight: 1000 }}>🌍 {tr("Réseau E-SPORTS", "E-SPORTS network", "Red E-SPORTS")}</div><div style={{ color: textSoft, fontSize: 10, marginTop: 3 }}>{tr("Découvre les salons publics et rejoins directement les invitations reçues.", "Discover public rooms and directly join received invites.", "Descubre salas públicas y únete directamente a invitaciones recibidas.")}</div></div>
      <button type="button" disabled={loading} onClick={load} style={{ ...buttonStyle(false), minHeight: 32, padding: "5px 9px" }}>↻ {loading ? "…" : tr("Actualiser", "Refresh", "Actualizar")}</button>
    </div>
    {invites.length ? <div style={{ marginTop: 10 }}><div style={{ fontSize: 10, fontWeight: 1000, color: "#34d399" }}>✉ {tr("INVITATIONS REÇUES", "RECEIVED INVITES", "INVITACIONES RECIBIDAS")} · {invites.length}</div><div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 7 }}>{invites.slice(0, 8).map((invite: any) => { const g = getEsportsGame(invite.gameId); return <div key={invite.id} style={{ borderRadius: 14, padding: 10, background: `${g.accent}0d`, border: `1px solid ${g.accent}45` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div><strong style={{ color: g.accent }}>{g.icon} {invite.title}</strong><div style={{ marginTop: 3, color: textSoft, fontSize: 9 }}>{invite.fromName} · {invite.formatLabel || "Match"}{invite.bestOf ? ` · BO${invite.bestOf}` : ""}</div></div><span style={{ fontSize: 9, fontWeight: 1000, letterSpacing: 1 }}>{invite.roomCode}</span></div><button type="button" onClick={() => join(invite.roomCode)} style={{ ...buttonStyle(true), width: "100%", marginTop: 8, minHeight: 32 }}>▶ {tr("REJOINDRE", "JOIN", "UNIRSE")}</button></div>; })}</div></div> : null}
    <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "minmax(160px,240px) 1fr", gap: 8, alignItems: "center" }}><select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)} style={inputStyle}><option value="all">🌍 {tr("Tous les jeux", "All games", "Todos los juegos")}</option>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><div style={{ color: textSoft, fontSize: 9.5 }}>{visibleRooms.length} {tr("salon(s) public(s) actif(s)", "active public room(s)", "sala(s) pública(s) activa(s)")}</div></div>
    {error ? <div style={{ marginTop: 8, color: "#fb7185", fontSize: 9.5 }}>{error}</div> : null}
    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 7 }}>{visibleRooms.length ? visibleRooms.map((room) => { const g = getEsportsGame(room.gameId); return <div key={`public_${room.id}`} style={{ borderRadius: 15, padding: 10, background: "rgba(255,255,255,.03)", border: `1px solid ${g.accent}32` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 7 }}><strong style={{ color: g.accent }}>{g.icon} {room.title}</strong><span style={{ fontSize: 8.5, color: "#34d399", fontWeight: 1000 }}>LIVE</span></div><div style={{ marginTop: 4, color: textSoft, fontSize: 9 }}>{room.formatLabel} · BO{room.bestOf} · {room.members.length}/{room.maxPlayers}</div><div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "center" }}><span style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 2 }}>{room.code}</span><button type="button" onClick={() => join(room.code)} style={{ ...buttonStyle(false), minHeight: 30, padding: "4px 8px" }}>{tr("Rejoindre", "Join", "Unirse")}</button></div></div>; }) : <Empty text={loading ? tr("Recherche des salons publics…", "Searching public rooms…", "Buscando salas públicas…") : tr("Aucun salon public pour ce filtre.", "No public room for this filter.", "No hay salas públicas para este filtro.")} textSoft={textSoft}/>}</div>
  </section>;
}

function RoomDetail({ room, state, refresh, buttonStyle, inputStyle, textSoft, setToast, tr }: any) {
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  if (!room) return <Empty text={tr("Salon introuvable.", "Room not found.", "Sala no encontrada.")} textSoft={textSoft}/>;
  const game = getEsportsGame(room.gameId);
  const addLocalMember = () => {
    const clean = name.trim(); if (!clean) return;
    const members = [...room.members, {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      name: clean,
      ready: false,
      team: room.members.filter((m: any) => m.team === "A").length <= room.members.filter((m: any) => m.team === "B").length ? "A" : "B",
      role: "player",
    }].slice(0, room.maxPlayers);
    upsertEsportsRoom({ ...room, members }); setName(""); refresh();
  };
  const toggleReady = async () => {
    setBusy(true);
    try {
      if (room.source === "online") await setOnlineEsportsReady(room.code, true);
      else upsertEsportsRoom({ ...room, members: room.members.map((m: any, i: number) => i === 0 ? { ...m, ready: !m.ready } : m) });
      refresh();
    } catch (e: any) { setToast(String(e?.message || e)); }
    finally { setBusy(false); }
  };
  const launch = async () => {
    setBusy(true);
    try {
      if (room.source === "online") {
        await startOnlineEsportsMatch(room);
        await refreshOnlineEsportsRoom(room.code).catch(() => null);
      }
      upsertEsportsRoom({ ...room, status: "playing" }); refresh();
      void publishPublicEsportsProfile(state.gamer, { gameId: room.gameId, label: `${tr("En match", "In match", "En partido")} · ${room.formatLabel}`, roomCode: room.code, state: "playing" }).catch(() => null);
      setToast(tr("Match lancé — saisie du résultat disponible dans MATCHS.", "Match started — result entry is available in MATCHES.", "Partido iniciado — resultado disponible en PARTIDOS."));
    } catch (e: any) { setToast(String(e?.message || e)); }
    finally { setBusy(false); }
  };
  const copyCode = async () => {
    try { await navigator.clipboard?.writeText(room.code); setToast(`${tr("Code copié", "Code copied", "Código copiado")} · ${room.code}`); }
    catch { setToast(room.code); }
  };
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
      <div><div style={{ color: game.accent, fontSize: 11, fontWeight: 1000 }}>{game.icon} {game.name}</div><div style={{ marginTop: 2, fontSize: 20, fontWeight: 1000 }}>{room.title}</div><div style={{ color: textSoft, fontSize: 10 }}>{room.formatLabel} · BO{room.bestOf} · {room.visibility.toUpperCase()}</div></div>
      <button type="button" onClick={copyCode} style={{ border: 0, borderRadius: 12, padding: "7px 9px", background: `${game.accent}18`, color: game.accent, textAlign: "center", cursor: "pointer" }}><div style={{ fontSize: 8.5, fontWeight: 900 }}>CODE · COPY</div><div style={{ fontSize: 16, fontWeight: 1000, letterSpacing: 2 }}>{room.code}</div></button>
    </div>
    <div style={{ marginTop: 12, display: "grid", gap: 6 }}>{room.members.map((member: any, index: number) => <div key={member.id} style={{ borderRadius: 13, padding: 9, background: "rgba(255,255,255,.035)", display: "grid", gridTemplateColumns: "32px 1fr auto auto", alignItems: "center", gap: 8 }}><span style={{ width: 32, height: 32, borderRadius: 10, background: `${game.accent}18`, display: "grid", placeItems: "center", color: game.accent, fontWeight: 1000 }}>{index + 1}</span><div><strong>{member.name}</strong><div style={{ color: textSoft, fontSize: 9 }}>{member.role || "player"}</div></div><span style={{ fontSize: 9, color: member.team === "A" ? "#60a5fa" : member.team === "B" ? "#fb923c" : textSoft, fontWeight: 1000 }}>{member.team ? `TEAM ${member.team}` : "—"}</span><span style={{ fontSize: 9, color: member.ready ? "#34d399" : textSoft }}>{member.ready ? "READY" : "WAIT"}</span></div>)}</div>
    {room.source === "local" && room.members.length < room.maxPlayers ? <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "1fr auto", gap: 7 }}><input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLocalMember()} placeholder={tr("Ajouter un joueur / une équipe", "Add a player / team", "Añadir jugador / equipo")} style={inputStyle}/><button type="button" onClick={addLocalMember} style={buttonStyle(false)}>＋</button></div> : null}
    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 7 }}><button type="button" disabled={busy} onClick={toggleReady} style={buttonStyle(false)}>✓ READY</button><button type="button" disabled={busy || room.status === "finished"} onClick={launch} style={buttonStyle(true)}>▶ {tr("Lancer le match", "Start match", "Iniciar partido")}</button><button type="button" onClick={() => { removeEsportsRoom(room.id); refresh(); }} style={buttonStyle(false)}>× {tr("Supprimer", "Delete", "Eliminar")}</button></div>
    {room.source === "online" ? <RoomSocialPanel room={room} gamerName={state.gamer.displayName} refresh={refresh} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} setToast={setToast} tr={tr}/> : null}
  </div>;
}

function RoomSocialPanel({ room, gamerName, refresh, buttonStyle, inputStyle, textSoft, setToast, tr }: any) {
  const [friends, setFriends] = React.useState<EsportsFriend[]>([]);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [friendId, setFriendId] = React.useState("");
  const [chatText, setChatText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const messageKey = React.useCallback((row: any) => String(row?.id || `${row?.created_at || row?.createdAt || ""}:${row?.user_id || ""}:${JSON.stringify(row?.message || row?.text || "")}`), []);

  React.useEffect(() => {
    let alive = true;
    loadEsportsFriends().then((rows) => { if (alive) setFriends(rows || []); }).catch(() => { if (alive) setFriends([]); });
    fetchEsportsRoomMessages(room.code).then((rows) => { if (alive) setMessages(rows || []); }).catch(() => { if (alive) setMessages([]); });
    const unsub = subscribeEsportsRoomMessages(room.code, (row: any) => {
      if (!alive) return;
      setMessages((prev) => prev.some((item) => messageKey(item) === messageKey(row)) ? prev : [...prev, row].slice(-80));
    });
    return () => { alive = false; try { void unsub?.(); } catch {} };
  }, [room.code, messageKey]);

  const invite = async () => {
    const friend = friends.find((f) => String(f.userId || f.id) === friendId);
    if (!friend) return;
    setBusy(true);
    try {
      await sendEsportsRoomInvite(room, friend, gamerName || "Gamer");
      recordEsportsRoomInvite({ roomId: room.id, roomCode: room.code, gameId: room.gameId, targetUserId: String(friend.userId || friend.id), targetName: String(friend.displayName || friend.nickname || "Ami"), status: "sent" });
      refresh(); setToast(tr("Invitation envoyée.", "Invite sent.", "Invitación enviada."));
    } catch (e: any) {
      recordEsportsRoomInvite({ roomId: room.id, roomCode: room.code, gameId: room.gameId, targetUserId: String(friend.userId || friend.id), targetName: String(friend.displayName || friend.nickname || "Ami"), status: "failed" });
      setToast(String(e?.message || e));
    } finally { setBusy(false); }
  };

  const sendChat = async () => {
    const clean = chatText.trim(); if (!clean) return;
    setBusy(true);
    try { const row = await postEsportsRoomMessage(room.code, clean, gamerName); if (row) setMessages((prev) => prev.some((item) => messageKey(item) === messageKey(row)) ? prev : [...prev, row].slice(-80)); setChatText(""); }
    catch (e: any) { setToast(String(e?.message || e)); }
    finally { setBusy(false); }
  };

  const parseMessage = (row: any) => {
    const payload = row?.message && typeof row.message === "object" ? row.message : null;
    return { author: payload?.authorName || row?.nickname || row?.display_name || tr("Joueur", "Player", "Jugador"), text: payload?.text || row?.text || (typeof row?.message === "string" ? row.message : ""), at: row?.created_at || row?.createdAt || null };
  };

  return <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 9 }}>
    <div style={{ borderRadius: 16, padding: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}><div style={{ fontWeight: 1000 }}>👥 {tr("Inviter un ami", "Invite a friend", "Invitar a un amigo")}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 9.5 }}>{tr("Utilise directement tes amis MULTISPORTS SCORING.", "Uses your MULTISPORTS SCORING friends directly.", "Usa directamente tus amigos de MULTISPORTS SCORING.")}</div>{friends.length ? <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}><select value={friendId} onChange={(e) => setFriendId(e.target.value)} style={inputStyle}><option value="">{tr("Choisir un ami…", "Choose a friend…", "Elegir un amigo…")}</option>{friends.map((friend) => { const id = String(friend.userId || friend.id); return <option key={id} value={id}>{friend.status === "online" ? "🟢" : friend.status === "away" ? "🟠" : "⚫"} {friend.displayName || friend.nickname || id}</option>; })}</select><button type="button" disabled={!friendId || busy} onClick={invite} style={buttonStyle(true)}>✉ {tr("Inviter", "Invite", "Invitar")}</button></div> : <div style={{ marginTop: 8, color: textSoft, fontSize: 10 }}>{tr("Ami en ligne indisponible ou compte non connecté.", "Friends unavailable or account not signed in.", "Amigos no disponibles o cuenta no conectada.")}</div>}</div>
    <div style={{ borderRadius: 16, padding: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}><div style={{ fontWeight: 1000 }}>💬 {tr("Chat du salon", "Room chat", "Chat de la sala")}</div><div style={{ marginTop: 7, maxHeight: 180, overflowY: "auto", display: "grid", gap: 5 }}>{messages.length ? messages.slice(-30).map((row: any) => { const m = parseMessage(row); return <div key={messageKey(row)} style={{ borderRadius: 10, padding: "6px 8px", background: "rgba(255,255,255,.035)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}><strong style={{ fontSize: 9.5 }}>{m.author}</strong><span style={{ color: textSoft, fontSize: 8 }}>{m.at ? formatDate(Date.parse(m.at) || Number(m.at)) : ""}</span></div><div style={{ marginTop: 2, fontSize: 10.5 }}>{m.text}</div></div>; }) : <div style={{ color: textSoft, fontSize: 9.5 }}>{tr("Aucun message.", "No messages.", "Sin mensajes.")}</div>}</div><div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}><input value={chatText} maxLength={500} onChange={(e) => setChatText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder={tr("Écrire dans le salon…", "Write in the room…", "Escribir en la sala…")} style={inputStyle}/><button type="button" disabled={busy || !chatText.trim()} onClick={sendChat} style={buttonStyle(false)}>➤</button></div></div>
  </div>;
}

function MatchesSection({ state, refresh, panelStyle, buttonStyle, inputStyle, textSoft, accent, setToast, tr }: any) {
  const [gameId, setGameId] = React.useState(state.selectedGameId);
  const game = getEsportsGame(gameId);
  const [sideA, setSideA] = React.useState(state.gamer.displayName || "Team A");
  const [sideB, setSideB] = React.useState("Opponent");
  const [scoreA, setScoreA] = React.useState(0);
  const [scoreB, setScoreB] = React.useState(0);
  const [bestOf, setBestOf] = React.useState(game.bestOf[0] || 1);
  const [notes, setNotes] = React.useState("");
  React.useEffect(() => { const next = getEsportsGame(gameId); setBestOf(next.bestOf[0] || 1); }, [gameId]);
  const save = () => { if (!sideA.trim() || !sideB.trim()) return; recordEsportsMatch({ gameId, bestOf, resultKind: game.resultKind, sideA: { name: sideA.trim(), playerNames: [sideA.trim()], score: Number(scoreA) }, sideB: { name: sideB.trim(), playerNames: [sideB.trim()], score: Number(scoreB) }, notes: notes.trim(), playedAt: Date.now() }); selectEsportsGame(gameId); refresh(); setToast(tr("Résultat enregistré.", "Result recorded.", "Resultado guardado.")); setNotes(""); };
  return <div style={{ display: "grid", gap: 10 }}><section style={{ ...panelStyle, padding: 14 }}><div style={{ fontSize: 22, fontWeight: 1000 }}>{tr("Enregistrer un résultat", "Record a result", "Guardar un resultado")}</div><div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8 }}><select value={gameId} onChange={(e) => setGameId(e.target.value)} style={inputStyle}>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={bestOf} onChange={(e) => setBestOf(Number(e.target.value))} style={inputStyle}>{game.bestOf.map((n) => <option key={n} value={n}>BO{n}</option>)}</select><input value={sideA} onChange={(e) => setSideA(e.target.value)} style={inputStyle} placeholder="Team / Player A"/><input value={sideB} onChange={(e) => setSideB(e.target.value)} style={inputStyle} placeholder="Team / Player B"/><input type="number" value={scoreA} onChange={(e) => setScoreA(clampNumber(e.target.value, 0, 999, 0))} style={inputStyle}/><input type="number" value={scoreB} onChange={(e) => setScoreB(clampNumber(e.target.value, 0, 999, 0))} style={inputStyle}/></div><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tr("Notes optionnelles...", "Optional notes...", "Notas opcionales...")} style={{ ...inputStyle, minHeight: 72, marginTop: 8, resize: "vertical" }}/><div style={{ marginTop: 9, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span style={{ color: textSoft, fontSize: 10 }}>{game.resultKind.toUpperCase()} · {scoreA === scoreB ? tr("Nul", "Draw", "Empate") : Number(scoreA) > Number(scoreB) ? `${sideA} ✓` : `${sideB} ✓`}</span><button type="button" onClick={save} style={buttonStyle(true)}>✓ {tr("Enregistrer", "Save", "Guardar")}</button></div></section><section style={{ ...panelStyle, padding: 14 }}><div style={{ fontWeight: 1000 }}>{tr("Historique E-SPORTS", "E-SPORTS history", "Historial E-SPORTS")} · {state.matches.length}</div><div style={{ marginTop: 9, display: "grid", gap: 7 }}>{state.matches.length ? state.matches.map((match: any) => <div key={match.id} style={{ borderRadius: 14, padding: 10, background: "rgba(255,255,255,.035)", display: "grid", gridTemplateColumns: "minmax(90px,.6fr) minmax(200px,1.5fr) minmax(100px,.7fr)", gap: 8, alignItems: "center" }}><div><div style={{ color: getEsportsGame(match.gameId).accent, fontWeight: 1000 }}>{getEsportsGame(match.gameId).shortName}</div><div style={{ color: textSoft, fontSize: 8.5 }}>{formatDate(match.playedAt)}</div></div><div style={{ fontWeight: 1000 }}>{match.sideA.name} <span style={{ color: accent }}>{match.sideA.score} — {match.sideB.score}</span> {match.sideB.name}</div><div style={{ textAlign: "right", color: match.winner === "draw" ? textSoft : "#34d399", fontSize: 10, fontWeight: 1000 }}>🏆 {winnerText(match)}</div></div>) : <Empty text={tr("Aucun résultat enregistré.", "No results recorded.", "Sin resultados guardados.")} textSoft={textSoft}/>}</div></section></div>;
}

function TournamentsSection({ state, refresh, panelStyle, buttonStyle, inputStyle, textSoft, accent, setToast, tr }: any) {
  const [gameId, setGameId] = React.useState(state.selectedGameId);
  const game = getEsportsGame(gameId);
  const [name, setName] = React.useState(`${game.shortName} Cup`);
  const [format, setFormat] = React.useState<EsportsTournamentFormat>("single_elimination");
  const [bestOf, setBestOf] = React.useState(game.bestOf[0] || 1);
  const [participantsText, setParticipantsText] = React.useState("Player 1\nPlayer 2\nPlayer 3\nPlayer 4");
  const [openId, setOpenId] = React.useState(state.tournaments[0]?.id || null);
  React.useEffect(() => { const g = getEsportsGame(gameId); setBestOf(g.bestOf[0] || 1); }, [gameId]);
  const create = () => { const names = participantsText.split(/\n|,/).map((s) => s.trim()).filter(Boolean); if (names.length < 2) return setToast(tr("Ajoute au moins 2 participants.", "Add at least 2 participants.", "Añade al menos 2 participantes.")); const t = createEsportsTournament({ name, gameId, format, bestOf, participantNames: names }); setOpenId(t.id); refresh(); setToast(tr("Tournoi créé.", "Tournament created.", "Torneo creado.")); };
  const open = state.tournaments.find((t: any) => t.id === openId) || null;
  return <div style={{ display: "grid", gap: 10 }}><section style={{ ...panelStyle, padding: 14 }}><div style={{ fontSize: 22, fontWeight: 1000 }}>{tr("Générateur de tournoi", "Tournament generator", "Generador de torneos")}</div><div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8 }}><input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle}/><select value={gameId} onChange={(e) => setGameId(e.target.value)} style={inputStyle}>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={format} onChange={(e) => setFormat(e.target.value as EsportsTournamentFormat)} style={inputStyle}><option value="single_elimination">{tr("Élimination directe", "Single elimination", "Eliminación directa")}</option><option value="round_robin">Round Robin</option></select><select value={bestOf} onChange={(e) => setBestOf(Number(e.target.value))} style={inputStyle}>{game.bestOf.map((n) => <option key={n} value={n}>BO{n}</option>)}</select></div><textarea value={participantsText} onChange={(e) => setParticipantsText(e.target.value)} style={{ ...inputStyle, minHeight: 110, marginTop: 8, resize: "vertical" }} placeholder={tr("Un joueur / équipe par ligne", "One player / team per line", "Un jugador / equipo por línea")}/><div style={{ marginTop: 9, textAlign: "right" }}><button type="button" onClick={create} style={buttonStyle(true)}>🏆 {tr("Générer le tournoi", "Generate tournament", "Generar torneo")}</button></div></section><section style={{ display: "grid", gridTemplateColumns: "minmax(220px,.65fr) minmax(340px,1.35fr)", gap: 10 }}><div style={{ ...panelStyle, padding: 12 }}><div style={{ fontWeight: 1000 }}>{tr("Mes tournois", "My tournaments", "Mis torneos")} · {state.tournaments.length}</div><div style={{ marginTop: 8, display: "grid", gap: 6 }}>{state.tournaments.map((t: any) => <button type="button" key={t.id} onClick={() => setOpenId(t.id)} style={{ textAlign: "left", borderRadius: 13, border: `1px solid ${openId === t.id ? getEsportsGame(t.gameId).accent : "rgba(255,255,255,.08)"}`, background: "rgba(255,255,255,.03)", color: "inherit", padding: 9, cursor: "pointer" }}><strong>{t.name}</strong><div style={{ color: textSoft, fontSize: 9 }}>{getEsportsGame(t.gameId).shortName} · {t.participants.length} · BO{t.bestOf}</div></button>)}</div></div><div style={{ ...panelStyle, padding: 12 }}>{open ? <TournamentBracket tournament={open} textSoft={textSoft} accent={accent} buttonStyle={buttonStyle} refresh={refresh} setOpenId={setOpenId} setToast={setToast} tr={tr}/> : <Empty text={tr("Crée ou sélectionne un tournoi.", "Create or select a tournament.", "Crea o selecciona un torneo.")} textSoft={textSoft}/>}</div></section></div>;
}

function TournamentBracket({ tournament, textSoft, buttonStyle, refresh, setOpenId, setToast, tr }: any) {
  const game = getEsportsGame(tournament.gameId);
  const rounds = [...new Set(tournament.matches.map((m: any) => m.round))].sort((a: any,b: any) => a-b);
  const finalMatch = tournament.format === "single_elimination" ? tournament.matches.find((m: any) => m.round === rounds[rounds.length - 1]) : null;
  const champion = finalMatch?.status === "finished" && finalMatch?.winnerId ? (finalMatch.winnerId === finalMatch.participantAId ? finalMatch.participantAName : finalMatch.participantBName) : null;
  const standings = tournament.format === "round_robin" ? buildRoundRobinStandings(tournament.participants, tournament.matches) : [];
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}><div><div style={{ color: game.accent, fontWeight: 1000 }}>{game.icon} {game.name}</div><div style={{ fontSize: 20, fontWeight: 1000 }}>{tournament.name}</div><div style={{ color: textSoft, fontSize: 9.5 }}>{tournament.format.replace("_", " ").toUpperCase()} · {tournament.participants.length} · BO{tournament.bestOf} · {tournament.status.toUpperCase()}</div></div><button type="button" onClick={() => { deleteEsportsTournament(tournament.id); setOpenId(null); refresh(); }} style={buttonStyle(false)}>×</button></div>
    {champion ? <div style={{ marginTop: 10, borderRadius: 16, padding: 12, textAlign: "center", background: `${game.accent}16`, border: `1px solid ${game.accent}65` }}><div style={{ color: textSoft, fontSize: 9, fontWeight: 900 }}>{tr("CHAMPION", "CHAMPION", "CAMPEÓN")}</div><div style={{ marginTop: 2, color: game.accent, fontSize: 22, fontWeight: 1000 }}>🏆 {champion}</div></div> : null}
    {standings.length ? <div style={{ marginTop: 10, borderRadius: 15, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ padding: "8px 10px", fontWeight: 1000, background: "rgba(255,255,255,.04)" }}>{tr("Classement", "Standings", "Clasificación")}</div>{standings.map((row: any, index: number) => <div key={row.participantId} style={{ display: "grid", gridTemplateColumns: "30px 1fr repeat(5,42px)", gap: 5, alignItems: "center", padding: "7px 9px", borderTop: "1px solid rgba(255,255,255,.06)", fontSize: 9.5 }}><strong>{index + 1}</strong><strong>{row.name}</strong><span style={{ textAlign: "center", color: textSoft }}>P {row.played}</span><span style={{ textAlign: "center" }}>W {row.wins}</span><span style={{ textAlign: "center" }}>L {row.losses}</span><span style={{ textAlign: "center" }}>± {row.diff}</span><strong style={{ textAlign: "center", color: game.accent }}>{row.points} pts</strong></div>)}</div> : null}
    <div style={{ marginTop: 12, overflowX: "auto", paddingBottom: 6 }}><div style={{ display: "flex", gap: 9, minWidth: Math.max(520, rounds.length * 250) }}>{rounds.map((round: any) => <div key={round} style={{ width: 240, flex: "0 0 240px" }}><div style={{ color: textSoft, fontSize: 9, fontWeight: 1000, marginBottom: 6 }}>{tournament.format === "round_robin" ? `${tr("JOURNÉE", "ROUND", "JORNADA")} ${round}` : round === rounds.length ? tr("FINALE", "FINAL", "FINAL") : `${tr("TOUR", "ROUND", "RONDA")} ${round}`}</div><div style={{ display: "grid", gap: 7 }}>{tournament.matches.filter((m: any) => m.round === round).map((m: any) => <TournamentMatchCard key={m.id} tournament={tournament} match={m} game={game} textSoft={textSoft} buttonStyle={buttonStyle} refresh={refresh} setToast={setToast} tr={tr}/>)}</div></div>)}</div></div>
  </div>;
}

function TournamentMatchCard({ tournament, match, game, textSoft, buttonStyle, refresh, setToast, tr }: any) {
  const [scoreA, setScoreA] = React.useState<number>(Number(match.scoreA ?? 0));
  const [scoreB, setScoreB] = React.useState<number>(Number(match.scoreB ?? 0));
  React.useEffect(() => { setScoreA(Number(match.scoreA ?? 0)); setScoreB(Number(match.scoreB ?? 0)); }, [match.scoreA, match.scoreB, match.id]);
  const ready = !!match.participantAId && !!match.participantBId;
  const winnerName = match.status === "finished" && match.winnerId ? (match.winnerId === match.participantAId ? match.participantAName : match.participantBName) : null;
  const save = () => {
    if (!ready) return;
    if (Number(scoreA) === Number(scoreB)) { setToast(tr("Un match de tournoi doit avoir un vainqueur.", "A tournament match needs a winner.", "Un partido de torneo debe tener un ganador.")); return; }
    try { recordEsportsTournamentMatchResult(tournament.id, match.id, Number(scoreA), Number(scoreB)); refresh(); setToast(tr("Résultat validé — bracket mis à jour.", "Result saved — bracket updated.", "Resultado guardado — cuadro actualizado.")); }
    catch (e: any) { setToast(String(e?.message || e)); }
  };
  return <div style={{ borderRadius: 13, border: `1px solid ${winnerName ? `${game.accent}55` : "rgba(255,255,255,.08)"}`, background: winnerName ? `${game.accent}0c` : "rgba(255,255,255,.03)", padding: 8 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 48px", gap: 6, alignItems: "center" }}><span style={{ fontWeight: match.winnerId === match.participantAId ? 1000 : 600 }}>{match.participantAName || "TBD"}</span><input type="number" min={0} disabled={!ready} value={scoreA} onChange={(e) => setScoreA(clampNumber(e.target.value,0,999,0))} style={{ width: 48, minHeight: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.25)", color: "inherit", textAlign: "center", fontWeight: 1000 }}/></div>
    <div style={{ height: 1, background: "rgba(255,255,255,.07)", margin: "6px 0" }}/>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 48px", gap: 6, alignItems: "center" }}><span style={{ fontWeight: match.winnerId === match.participantBId ? 1000 : 600 }}>{match.participantBName || "TBD"}</span><input type="number" min={0} disabled={!ready} value={scoreB} onChange={(e) => setScoreB(clampNumber(e.target.value,0,999,0))} style={{ width: 48, minHeight: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.25)", color: "inherit", textAlign: "center", fontWeight: 1000 }}/></div>
    <div style={{ marginTop: 7, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 5 }}><span style={{ color: winnerName ? game.accent : textSoft, fontSize: 8.5, fontWeight: 900 }}>{winnerName ? `✓ ${winnerName}` : match.status.toUpperCase()}</span>{ready ? <button type="button" onClick={save} style={{ ...buttonStyle(match.status !== "finished"), minHeight: 28, padding: "4px 7px", fontSize: 8.5 }}>{match.status === "finished" ? tr("Modifier", "Edit", "Editar") : tr("Valider", "Save", "Guardar")}</button> : null}</div>
  </div>;
}

function ProfileSection({ state, refresh, panelStyle, buttonStyle, inputStyle, textSoft, accent, go, setToast, tr }: any) {
  const [tab, setTab] = React.useState<"profile" | "friends" | "teams" | "lfg" | "network">("profile");
  const [displayName, setDisplayName] = React.useState(state.gamer.displayName);
  const [bio, setBio] = React.useState(state.gamer.bio);
  const [country, setCountry] = React.useState(state.gamer.country || "FR");
  const [availability, setAvailability] = React.useState(state.gamer.availability);
  const [lookingForGroup, setLookingForGroup] = React.useState(state.gamer.lookingForGroup);
  const [handles, setHandles] = React.useState({ ...state.gamer.handles } as any);
  const [primaryPlatform, setPrimaryPlatform] = React.useState<EsportsPlatform>(state.gamer.primaryPlatform || "pc");
  const [rankGameId, setRankGameId] = React.useState(state.selectedGameId);
  const [rankByGame, setRankByGame] = React.useState<Record<string,string>>({ ...(state.gamer.rankByGame || {}) });
  const save = async () => {
    const nextGamer = { displayName: displayName.trim() || "Gamer", bio: bio.trim(), country: country.trim().toUpperCase(), availability, lookingForGroup, handles, primaryPlatform, rankByGame };
    saveGamerIdentity(nextGamer);
    refresh();
    try { await syncEsportsPresence(availability); } catch {}
    try { await publishPublicEsportsProfile({ ...state.gamer, ...nextGamer }); setToast(tr("Profil gamer enregistré et synchronisé sur le réseau E-SPORTS.", "Gamer profile saved and synced to the E-SPORTS network.", "Perfil gamer guardado y sincronizado en la red E-SPORTS.")); }
    catch (e: any) { const migrationMissing = String(e?.code || "") === "esports_public_migration_required"; setToast(migrationMissing ? tr("Profil local enregistré · migration Supabase E-SPORTS V0.3 à appliquer pour la synchro publique.", "Local profile saved · apply the E-SPORTS V0.3 Supabase migration for public sync.", "Perfil local guardado · aplica la migración Supabase E-SPORTS V0.3 para sincronización pública.") : tr("Profil local enregistré · synchro publique indisponible.", "Local profile saved · public sync unavailable.", "Perfil local guardado · sincronización pública no disponible.")); }
  };
  const tabs = [
    ["profile", "🎮", tr("Profil", "Profile", "Perfil")],
    ["friends", "👥", tr("Amis", "Friends", "Amigos")],
    ["teams", "🛡", tr("Équipes", "Teams", "Equipos")],
    ["lfg", "📡", "LFG"],
    ["network", "⚡", tr("Réseau", "Network", "Red")],
  ] as const;
  return <div style={{ display: "grid", gap: 10 }}>
    <section style={{ ...panelStyle, padding: 10 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(105px,1fr))", gap: 6 }}>{tabs.map(([id, icon, label]) => <button type="button" key={id} onClick={() => setTab(id)} style={{ ...buttonStyle(tab === id), minWidth: 0, padding: "8px 6px" }}>{icon} <span style={{ marginLeft: 3 }}>{label}</span></button>)}</div></section>
    {tab === "profile" ? <>
      <section style={{ ...panelStyle, padding: 14 }}><div style={{ fontSize: 22, fontWeight: 1000 }}>{tr("Profil gamer", "Gamer profile", "Perfil gamer")}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 10.5 }}>{tr("Ton identité gaming transverse : jeux, plateformes, disponibilité et recherche de groupe.", "Your cross-game identity: games, platforms, availability and group search.", "Tu identidad gaming: juegos, plataformas, disponibilidad y búsqueda de grupo.")}</div><div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Pseudo gamer" style={inputStyle}/><input value={country} maxLength={3} onChange={(e) => setCountry(e.target.value)} placeholder="FR" style={inputStyle}/><select value={availability} onChange={(e) => setAvailability(e.target.value)} style={inputStyle}><option value="available">🟢 {tr("Disponible", "Available", "Disponible")}</option><option value="busy">🟠 {tr("Occupé", "Busy", "Ocupado")}</option><option value="offline">⚫ Offline</option></select><label style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={lookingForGroup} onChange={(e) => setLookingForGroup(e.target.checked)}/>{tr("Je cherche des joueurs / une équipe", "I'm looking for players / a team", "Busco jugadores / equipo")}</label></div><textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio gaming..." style={{ ...inputStyle, minHeight: 76, marginTop: 8, resize: "vertical" }}/><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}><label style={{ display: "grid", gap: 4 }}><span style={{ color: textSoft, fontSize: 9, fontWeight: 900 }}>{tr("Plateforme principale", "Primary platform", "Plataforma principal")}</span><select value={primaryPlatform} onChange={(e) => setPrimaryPlatform(e.target.value as EsportsPlatform)} style={inputStyle}>{["pc","playstation","xbox","switch","mobile","crossplay"].map((p) => <option key={p} value={p}>{displayPlatform(p)}</option>)}</select></label><label style={{ display: "grid", gap: 4 }}><span style={{ color: textSoft, fontSize: 9, fontWeight: 900 }}>{tr("Jeu pour le niveau", "Game for rank", "Juego para rango")}</span><select value={rankGameId} onChange={(e) => setRankGameId(e.target.value)} style={inputStyle}>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label style={{ display: "grid", gap: 4 }}><span style={{ color: textSoft, fontSize: 9, fontWeight: 900 }}>{tr("Niveau / rang", "Skill / rank", "Nivel / rango")}</span><input value={rankByGame[rankGameId] || ""} onChange={(e) => setRankByGame((prev) => ({ ...prev, [rankGameId]: e.target.value }))} placeholder={tr("Ex : Diamant III", "e.g. Diamond III", "Ej.: Diamante III")} style={inputStyle}/></label></div></section>
      <section style={{ ...panelStyle, padding: 14 }}><div style={{ fontWeight: 1000 }}>{tr("Identifiants plateformes", "Platform IDs", "IDs de plataformas")}</div><div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8 }}>{["steam","epic","riot","ea","playstation","xbox","battlenet","switch"].map((key) => <label key={key} style={{ display: "grid", gap: 4 }}><span style={{ color: textSoft, fontSize: 9, fontWeight: 900 }}>{key.toUpperCase()}</span><input value={handles[key] || ""} onChange={(e) => setHandles((prev: any) => ({ ...prev, [key]: e.target.value }))} style={inputStyle}/></label>)}</div><div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => go("profiles")} style={buttonStyle(false)}>{tr("Ouvrir mon profil MULTISPORTS", "Open my MULTISPORTS profile", "Abrir mi perfil MULTISPORTS")}</button><button type="button" onClick={save} style={buttonStyle(true)}>✓ {tr("Enregistrer", "Save", "Guardar")}</button></div></section>
      <section style={{ ...panelStyle, padding: 14 }}><div style={{ fontWeight: 1000 }}>{tr("Jeux favoris", "Favorite games", "Juegos favoritos")}</div><div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>{state.gamer.favoriteGameIds.map((id: string) => { const game = getEsportsGame(id); return <span key={id} style={{ borderRadius: 999, padding: "7px 10px", border: `1px solid ${game.accent}50`, background: `${game.accent}12`, color: game.accent, fontSize: 10, fontWeight: 1000 }}>{game.icon} {game.shortName}</span>; })}</div></section>
    </> : null}
    {tab === "friends" ? <EsportsFriendsPanel panelStyle={panelStyle} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} setToast={setToast} tr={tr}/> : null}
    {tab === "teams" ? <EsportsTeamsPanel state={state} refresh={refresh} panelStyle={panelStyle} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} setToast={setToast} tr={tr}/> : null}
    {tab === "lfg" ? <EsportsLfgPanel state={state} refresh={refresh} panelStyle={panelStyle} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} accent={accent} setToast={setToast} tr={tr}/> : null}
    {tab === "network" ? <EsportsCompetitiveNetworkV4 state={state} panelStyle={panelStyle} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} setToast={setToast} tr={tr}/> : null}
  </div>;
}

function EsportsFriendsPanel({ panelStyle, buttonStyle, inputStyle, textSoft, setToast, tr }: any) {
  const [friends, setFriends] = React.useState<EsportsFriend[]>([]);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<EsportsFriend[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const load = React.useCallback(async () => {
    setLoading(true); setError("");
    try { setFriends(await loadEsportsFriends()); }
    catch (e: any) { setFriends([]); setError(String(e?.message || e || tr("Connexion requise.", "Sign-in required.", "Conexión requerida."))); }
    finally { setLoading(false); }
  }, [tr]);
  React.useEffect(() => { void load(); }, [load]);
  const search = async () => {
    const clean = query.trim(); if (clean.length < 2) return;
    setLoading(true); setError("");
    try { setResults(await searchEsportsPlayers(clean)); }
    catch (e: any) { setResults([]); setError(String(e?.message || e)); }
    finally { setLoading(false); }
  };
  const request = async (user: EsportsFriend) => {
    const id = String(user.userId || user.id || ""); if (!id) return;
    try { await requestEsportsFriend(id); setToast(tr("Demande d'ami envoyée.", "Friend request sent.", "Solicitud de amistad enviada.")); }
    catch (e: any) { setToast(String(e?.message || e)); }
  };
  return <div style={{ display: "grid", gap: 10 }}>
    <section style={{ ...panelStyle, padding: 14 }}><div style={{ fontSize: 22, fontWeight: 1000 }}>👥 {tr("Communauté gaming", "Gaming community", "Comunidad gaming")}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 10.5 }}>{tr("Ce sont les mêmes amis que dans MULTISPORTS SCORING : pas de doublon de réseau social.", "These are the same friends as MULTISPORTS SCORING: no duplicate social network.", "Son los mismos amigos de MULTISPORTS SCORING: sin red social duplicada.")}</div><div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 7 }}><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder={tr("Chercher un joueur / pseudo…", "Search player / nickname…", "Buscar jugador / alias…")} style={inputStyle}/><button type="button" disabled={loading || query.trim().length < 2} onClick={search} style={buttonStyle(true)}>⌕ {tr("Chercher", "Search", "Buscar")}</button></div>{error ? <div style={{ marginTop: 8, color: "#fb7185", fontSize: 10 }}>{error}</div> : null}</section>
    {results.length ? <section style={{ ...panelStyle, padding: 12 }}><div style={{ fontWeight: 1000 }}>{tr("Résultats", "Results", "Resultados")}</div><div style={{ marginTop: 8, display: "grid", gap: 6 }}>{results.map((user) => { const id = String(user.userId || user.id); return <div key={id} style={{ borderRadius: 13, padding: 9, background: "rgba(255,255,255,.035)", display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}><div><strong>{user.displayName || user.nickname || id}</strong><div style={{ color: textSoft, fontSize: 9 }}>{user.countryCode || user.country || ""} · {user.status || "offline"}</div></div><button type="button" onClick={() => request(user)} style={buttonStyle(false)}>＋ {tr("Ami", "Friend", "Amigo")}</button></div>; })}</div></section> : null}
    <section style={{ ...panelStyle, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ fontWeight: 1000 }}>{tr("Mes amis", "My friends", "Mis amigos")} · {friends.length}</div><button type="button" onClick={load} style={{ ...buttonStyle(false), minHeight: 30, padding: "4px 8px" }}>↻</button></div><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 7 }}>{friends.length ? friends.map((friend) => { const id = String(friend.userId || friend.id); const status = friend.status === "online" ? "🟢" : friend.status === "away" ? "🟠" : "⚫"; return <div key={id} style={{ borderRadius: 14, padding: 10, background: "rgba(255,255,255,.035)" }}><div style={{ fontWeight: 1000 }}>{status} {friend.displayName || friend.nickname || id}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 9 }}>{friend.countryCode || friend.country || ""} {friend.lastSeenAt ? `· ${friend.lastSeenAt}` : ""}</div></div>; }) : <Empty text={loading ? tr("Chargement…", "Loading…", "Cargando…") : tr("Aucun ami chargé.", "No friends loaded.", "No hay amigos cargados.")} textSoft={textSoft}/>}</div></section>
    <EsportsPublicPlayerDiscovery panelStyle={panelStyle} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} setToast={setToast} tr={tr}/>
  </div>;
}

function EsportsPublicPlayerDiscovery({ panelStyle, buttonStyle, inputStyle, textSoft, setToast, tr }: any) {
  const [query, setQuery] = React.useState("");
  const [gameId, setGameId] = React.useState("all");
  const [platform, setPlatform] = React.useState("all");
  const [rank, setRank] = React.useState("");
  const [rows, setRows] = React.useState<PublicEsportsPlayer[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const search = async () => {
    setLoading(true); setError("");
    try { setRows(await searchPublicEsportsPlayers({ query, gameId: gameId === "all" ? undefined : gameId, platform: platform === "all" ? undefined : platform, rank, limit: 60 })); }
    catch (e: any) { setRows([]); setError(String(e?.code || "") === "esports_public_migration_required" ? tr("Migration Supabase E-SPORTS V0.3 requise pour la recherche publique.", "E-SPORTS V0.3 Supabase migration required for public search.", "Se requiere la migración Supabase E-SPORTS V0.3 para búsqueda pública.") : String(e?.message || e)); }
    finally { setLoading(false); }
  };
  const add = async (row: PublicEsportsPlayer) => {
    try { await requestEsportsFriend(row.userId, tr("Je t'ai trouvé via le réseau E-SPORTS.", "I found you through the E-SPORTS network.", "Te encontré mediante la red E-SPORTS.")); setToast(tr("Demande d'ami envoyée.", "Friend request sent.", "Solicitud de amistad enviada.")); }
    catch (e: any) { setToast(String(e?.message || e)); }
  };
  return <section style={{ ...panelStyle, padding: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start", flexWrap: "wrap" }}><div><div style={{ fontSize: 18, fontWeight: 1000 }}>🌐 {tr("Trouver des gamers", "Find gamers", "Encontrar gamers")}</div><div style={{ color: textSoft, fontSize: 9.5, marginTop: 3 }}>{tr("Recherche publique par jeu, plateforme, pseudo et niveau.", "Public search by game, platform, nickname and rank.", "Búsqueda pública por juego, plataforma, alias y nivel.")}</div></div><span style={{ borderRadius: 999, padding: "5px 8px", background: "rgba(52,211,153,.1)", color: "#34d399", fontSize: 8.5, fontWeight: 1000 }}>PUBLIC NETWORK V0.3 → V0.4</span></div>
    <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 7 }}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Pseudo / mot-clé", "Nickname / keyword", "Alias / palabra clave")} style={inputStyle}/><select value={gameId} onChange={(e) => setGameId(e.target.value)} style={inputStyle}><option value="all">{tr("Tous les jeux", "All games", "Todos los juegos")}</option>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={platform} onChange={(e) => setPlatform(e.target.value)} style={inputStyle}><option value="all">{tr("Toutes plateformes", "All platforms", "Todas plataformas")}</option>{["pc","playstation","xbox","switch","mobile","crossplay"].map((p) => <option key={p} value={p}>{displayPlatform(p)}</option>)}</select><input value={rank} onChange={(e) => setRank(e.target.value)} placeholder={tr("Niveau : Diamant, Gold…", "Rank: Diamond, Gold…", "Nivel: Diamante, Oro…")} style={inputStyle}/></div>
    <div style={{ marginTop: 8, textAlign: "right" }}><button type="button" disabled={loading} onClick={search} style={buttonStyle(true)}>⌕ {loading ? "…" : tr("Chercher sur le réseau", "Search network", "Buscar en la red")}</button></div>
    {error ? <div style={{ marginTop: 8, color: "#fb7185", fontSize: 9.5 }}>{error}</div> : null}
    {rows.length ? <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 7 }}>{rows.map((row) => { const activityGame = row.activity?.gameId ? getEsportsGame(String(row.activity.gameId)) : null; return <div key={row.userId} style={{ borderRadius: 14, padding: 10, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div><strong>{row.status === "online" ? "🟢" : row.status === "away" ? "🟠" : "⚫"} {row.displayName}</strong><div style={{ color: textSoft, fontSize: 8.5, marginTop: 2 }}>{row.countryCode || ""} · {row.platforms.map(displayPlatform).join(" · ") || "—"}</div></div>{row.lookingForGroup ? <span style={{ color: "#34d399", fontSize: 8, fontWeight: 1000 }}>LFG</span> : null}</div>{activityGame ? <div style={{ marginTop: 6, color: activityGame.accent, fontSize: 9.5, fontWeight: 900 }}>🎮 {activityGame.shortName}{row.activity?.label ? ` · ${row.activity.label}` : ""}</div> : null}<div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>{row.gameIds.slice(0,4).map((id) => { const g=getEsportsGame(id); const r=row.rankByGame?.[id]; return <span key={id} style={{ borderRadius: 999, padding: "3px 6px", background: `${g.accent}10`, color: g.accent, fontSize: 8 }}>{g.shortName}{r ? ` · ${r}` : ""}</span>; })}</div><button type="button" onClick={() => add(row)} style={{ ...buttonStyle(false), width: "100%", marginTop: 8, minHeight: 30 }}>＋ {tr("Ajouter / contacter", "Add / contact", "Añadir / contactar")}</button></div>; })}</div> : null}
  </section>;
}

function EsportsTeamsPanel({ state, refresh, panelStyle, buttonStyle, inputStyle, textSoft, setToast, tr }: any) {
  const [name, setName] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [gameId, setGameId] = React.useState(state.selectedGameId);
  const [members, setMembers] = React.useState("");
  const [visibility, setVisibility] = React.useState<"public"|"private">("public");
  const [cloudTeams, setCloudTeams] = React.useState<PublicEsportsTeam[]>([]);
  const [cloudError, setCloudError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const loadCloud = React.useCallback(async () => {
    try { setCloudTeams(await listPublicEsportsTeams({ limit: 80 })); setCloudError(""); }
    catch (e: any) { setCloudTeams([]); setCloudError(String(e?.code || "") === "esports_public_migration_required" ? tr("Migration Supabase E-SPORTS V0.3 requise pour les clans partagés.", "E-SPORTS V0.3 Supabase migration required for shared clans.", "Se requiere la migración Supabase E-SPORTS V0.3 para clanes compartidos.") : String(e?.message || e)); }
  }, [tr]);
  React.useEffect(() => { void loadCloud(); }, [loadCloud]);
  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const memberNames = members.split(/\n|,/).map((v) => v.trim()).filter(Boolean);
    try {
      createEsportsTeam({ name, tag, gameIds: [gameId], memberNames, captainName: state.gamer.displayName });
      refresh();
      try { await createPublicEsportsTeam({ name: name.trim(), tag, gameIds: [gameId], memberNames, visibility }); await loadCloud(); setToast(tr("Équipe créée et synchronisée sur le réseau.", "Team created and synced to the network.", "Equipo creado y sincronizado en la red.")); }
      catch (e: any) { setToast(String(e?.code || "") === "esports_public_migration_required" ? tr("Équipe créée localement · migration Supabase V0.3 à appliquer pour le partage.", "Team created locally · apply Supabase V0.3 migration for sharing.", "Equipo creado localmente · aplica la migración Supabase V0.3 para compartir.") : tr("Équipe créée localement · synchro réseau indisponible.", "Team created locally · network sync unavailable.", "Equipo creado localmente · sincronización de red no disponible.")); }
      setName(""); setTag(""); setMembers("");
    } catch (e: any) { setToast(String(e?.message || e)); }
    finally { setBusy(false); }
  };
  const removeCloud = async (team: PublicEsportsTeam) => {
    try { await deletePublicEsportsTeam(team.id); await loadCloud(); setToast(tr("Équipe synchronisée supprimée.", "Synced team deleted.", "Equipo sincronizado eliminado.")); }
    catch (e: any) { setToast(String(e?.message || e)); }
  };
  const mineCloud = cloudTeams.filter((team) => team.mine);
  const publicCloud = cloudTeams.filter((team) => !team.mine && team.visibility === "public");
  return <div style={{ display: "grid", gap: 10 }}>
    <section style={{ ...panelStyle, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start", flexWrap: "wrap" }}><div><div style={{ fontSize: 22, fontWeight: 1000 }}>🛡 {tr("Équipes & clans", "Teams & clans", "Equipos y clanes")}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 10.5 }}>{tr("Les équipes peuvent maintenant être synchronisées entre tes appareils et rendues visibles à la communauté.", "Teams can now sync across your devices and be visible to the community.", "Los equipos ahora pueden sincronizarse entre dispositivos y ser visibles para la comunidad.")}</div></div><span style={{ borderRadius: 999, padding: "5px 8px", background: "rgba(52,211,153,.1)", color: "#34d399", fontSize: 8.5, fontWeight: 1000 }}>CLOUD V0.3 → CLANS V0.4</span></div><div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "minmax(160px,1fr) 100px minmax(180px,1fr) 130px", gap: 7 }}><input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("Nom de l'équipe", "Team name", "Nombre del equipo")} style={inputStyle}/><input value={tag} maxLength={8} onChange={(e) => setTag(e.target.value.toUpperCase())} placeholder="TAG" style={inputStyle}/><select value={gameId} onChange={(e) => setGameId(e.target.value)} style={inputStyle}>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={visibility} onChange={(e) => setVisibility(e.target.value as any)} style={inputStyle}><option value="public">🌍 PUBLIC</option><option value="private">🔒 PRIVÉ</option></select></div><textarea value={members} onChange={(e) => setMembers(e.target.value)} placeholder={tr("Membres, un par ligne (optionnel)", "Members, one per line (optional)", "Miembros, uno por línea (opcional)")} style={{ ...inputStyle, minHeight: 74, marginTop: 7, resize: "vertical" }}/><div style={{ marginTop: 8, textAlign: "right" }}><button type="button" disabled={busy || !name.trim()} onClick={create} style={buttonStyle(true)}>＋ {busy ? "…" : tr("Créer & synchroniser", "Create & sync", "Crear y sincronizar")}</button></div></section>
    {cloudError ? <section style={{ ...panelStyle, padding: 10, color: "#fb7185", fontSize: 9.5 }}>{cloudError}</section> : null}
    <section style={{ ...panelStyle, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div style={{ fontWeight: 1000 }}>☁ {tr("Mes clans synchronisés", "My synced clans", "Mis clanes sincronizados")} · {mineCloud.length}</div><button type="button" onClick={loadCloud} style={{ ...buttonStyle(false), minHeight: 28, padding: "3px 7px" }}>↻</button></div><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 8 }}>{mineCloud.length ? mineCloud.map((team) => <div key={team.id} style={{ borderRadius: 15, padding: 11, background: "rgba(52,211,153,.045)", border: "1px solid rgba(52,211,153,.16)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div><strong style={{ fontSize: 15 }}>{team.tag ? `[${team.tag}] ` : ""}{team.name}</strong><div style={{ color: textSoft, fontSize: 9 }}>{team.gameIds.map((id) => getEsportsGame(id).shortName).join(" · ") || tr("Multi-jeux", "Multi-game", "Multijuego")} · {team.visibility.toUpperCase()}</div></div><button type="button" onClick={() => removeCloud(team)} style={{ ...buttonStyle(false), minHeight: 28, padding: "3px 7px" }}>×</button></div><div style={{ marginTop: 6, color: textSoft, fontSize: 9 }}>{team.memberNames.join(" · ") || tr("Aucun membre renseigné", "No listed members", "Sin miembros listados")}</div></div>) : <Empty text={tr("Aucun clan synchronisé.", "No synced clan.", "No hay clanes sincronizados.")} textSoft={textSoft}/>}</div></section>
    <section style={{ ...panelStyle, padding: 12 }}><div style={{ fontWeight: 1000 }}>🌍 {tr("Clans publics", "Public clans", "Clanes públicos")} · {publicCloud.length}</div><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 8 }}>{publicCloud.length ? publicCloud.slice(0,20).map((team) => <div key={team.id} style={{ borderRadius: 15, padding: 11, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}><strong>{team.tag ? `[${team.tag}] ` : ""}{team.name}</strong><div style={{ marginTop: 3, color: textSoft, fontSize: 9 }}>{team.ownerDisplayName || tr("Capitaine", "Captain", "Capitán")} · {team.gameIds.map((id) => getEsportsGame(id).shortName).join(" · ")}</div><div style={{ marginTop: 6, fontSize: 9 }}>{team.memberNames.slice(0,6).join(" · ")}</div></div>) : <Empty text={tr("Aucun clan public chargé.", "No public clans loaded.", "No hay clanes públicos cargados.")} textSoft={textSoft}/>}</div></section>
    <EsportsTeamMembershipV4 cloudTeams={cloudTeams} panelStyle={panelStyle} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} setToast={setToast} tr={tr} onRefresh={loadCloud}/>
    <section style={{ ...panelStyle, padding: 12 }}><div style={{ fontWeight: 1000 }}>📱 {tr("Cache local / hors-ligne", "Local / offline cache", "Caché local / sin conexión")} · {state.teams.length}</div><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 7 }}>{state.teams.length ? state.teams.map((team: any) => <div key={team.id} style={{ borderRadius: 14, padding: 9, background: "rgba(255,255,255,.025)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{team.tag ? `[${team.tag}] ` : ""}{team.name}</strong><button type="button" onClick={() => { deleteEsportsTeam(team.id); refresh(); }} style={{ ...buttonStyle(false), minHeight: 25, padding: "2px 6px" }}>×</button></div></div>) : <Empty text={tr("Aucun cache local.", "No local cache.", "Sin caché local.")} textSoft={textSoft}/>}</div></section>
  </div>;
}

function EsportsLfgPanel({ state, refresh, panelStyle, buttonStyle, inputStyle, textSoft, accent, setToast, tr }: any) {
  const [gameId, setGameId] = React.useState(state.selectedGameId);
  const game = getEsportsGame(gameId);
  const [platform, setPlatform] = React.useState<EsportsPlatform>(game.platforms[0] || "pc");
  const [mode, setMode] = React.useState("Ranked / Casual");
  const [rankLabel, setRankLabel] = React.useState(state.gamer.rankByGame?.[gameId] || "");
  const [slots, setSlots] = React.useState(1);
  const [message, setMessage] = React.useState("");
  const [networkPosts, setNetworkPosts] = React.useState<PublicEsportsLfgPost[]>([]);
  const [filterGame, setFilterGame] = React.useState("all");
  const [filterPlatform, setFilterPlatform] = React.useState("all");
  const [filterQuery, setFilterQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [networkError, setNetworkError] = React.useState("");
  React.useEffect(() => { const g = getEsportsGame(gameId); setPlatform(g.platforms[0] || "pc"); setRankLabel(state.gamer.rankByGame?.[gameId] || ""); }, [gameId, state.gamer.rankByGame]);
  const loadNetwork = React.useCallback(async () => {
    setLoading(true); setNetworkError("");
    try { setNetworkPosts(await listPublicEsportsLfg({ gameId: filterGame === "all" ? undefined : filterGame, platform: filterPlatform === "all" ? undefined : filterPlatform, query: filterQuery, limit: 100 })); }
    catch (e: any) { setNetworkPosts([]); setNetworkError(String(e?.code || "") === "esports_public_migration_required" ? tr("Migration Supabase E-SPORTS V0.3 requise pour le LFG mondial.", "E-SPORTS V0.3 Supabase migration required for global LFG.", "Se requiere la migración Supabase E-SPORTS V0.3 para LFG global.") : String(e?.message || e)); }
    finally { setLoading(false); }
  }, [filterGame, filterPlatform, filterQuery, tr]);
  React.useEffect(() => { void loadNetwork(); }, [loadNetwork]);
  const publish = async () => {
    const local = createEsportsLfgPost({ gameId, authorName: state.gamer.displayName, platform, mode, rankLabel, message, slotsNeeded: slots });
    saveGamerIdentity({ lookingForGroup: true, availability: "available", rankByGame: rankLabel ? { [gameId]: rankLabel } : {} });
    refresh(); setLoading(true);
    try {
      await publishPublicEsportsProfile({ ...state.gamer, lookingForGroup: true, availability: "available", rankByGame: { ...(state.gamer.rankByGame || {}), ...(rankLabel ? { [gameId]: rankLabel } : {}) } }, { gameId, label: mode, lookingForGroup: true });
      await publishPublicEsportsLfg({ gameId, platform, mode, rankLabel, message, slotsNeeded: slots });
      setMessage(""); await loadNetwork();
      setToast(tr("Annonce LFG publiée sur le réseau E-SPORTS.", "LFG post published on the E-SPORTS network.", "Anuncio LFG publicado en la red E-SPORTS."));
    } catch (e: any) {
      setToast(String(e?.code || "") === "esports_public_migration_required" ? tr("Annonce conservée localement · migration Supabase V0.3 à appliquer pour la diffusion mondiale.", "Post kept locally · apply Supabase V0.3 migration for global publishing.", "Anuncio guardado localmente · aplica la migración Supabase V0.3 para publicación global.") : `${tr("Annonce conservée localement", "Post kept locally", "Anuncio guardado localmente")} · ${String(e?.message || e)}`);
      setNetworkError(String(e?.message || e));
    } finally { setLoading(false); }
    return local;
  };
  const closeNetwork = async (post: PublicEsportsLfgPost) => {
    try { await setPublicEsportsLfgStatus(post.id, post.status === "open" ? "closed" : "open"); await loadNetwork(); }
    catch (e: any) { setToast(String(e?.message || e)); }
  };
  const apply = async (post: PublicEsportsLfgPost) => {
    try { setToast(await applyToLfgFromCard(post, tr)); await loadNetwork(); }
    catch (e: any) { setToast(String(e?.code || "") === "esports_network_v4_migration_required" ? tr("Migration Supabase E-SPORTS V0.4 requise pour les candidatures LFG.", "E-SPORTS V0.4 Supabase migration required for LFG applications.", "Se requiere la migración Supabase E-SPORTS V0.4 para candidaturas LFG.") : String(e?.message || e)); }
  };
  const localOpen = state.lfgPosts.filter((post: any) => post.status === "open");
  return <div style={{ display: "grid", gap: 10 }}>
    <section style={{ ...panelStyle, padding: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start", flexWrap: "wrap" }}><div><div style={{ fontSize: 22, fontWeight: 1000 }}>📡 LFG · LOOKING FOR GROUP</div><div style={{ marginTop: 4, color: textSoft, fontSize: 10.5 }}>{tr("Publie une recherche mondiale de joueurs avec jeu, plateforme, mode et niveau.", "Publish a global player search with game, platform, mode and rank.", "Publica una búsqueda global con juego, plataforma, modo y nivel.")}</div></div><span style={{ borderRadius: 999, padding: "5px 8px", background: "rgba(52,211,153,.1)", color: "#34d399", fontSize: 8.5, fontWeight: 1000 }}>GLOBAL LFG V0.3 → V0.4</span></div><div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 7 }}><select value={gameId} onChange={(e) => setGameId(e.target.value)} style={inputStyle}>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={platform} onChange={(e) => setPlatform(e.target.value as EsportsPlatform)} style={inputStyle}>{game.platforms.map((p) => <option key={p} value={p}>{displayPlatform(p)}</option>)}</select><input value={mode} onChange={(e) => setMode(e.target.value)} placeholder="Ranked / Casual / Duo..." style={inputStyle}/><input value={rankLabel} onChange={(e) => setRankLabel(e.target.value)} placeholder={tr("Niveau / rang", "Skill / rank", "Nivel / rango")} style={inputStyle}/><input type="number" min={1} max={20} value={slots} onChange={(e) => setSlots(clampNumber(e.target.value,1,20,1))} style={inputStyle}/></div><textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} placeholder={tr("Ex : cherche 2 joueurs Diamant, micro FR, ce soir…", "Example: looking for 2 Diamond players, mic, tonight…", "Ej.: busco 2 jugadores Diamante, micro, esta noche…")} style={{ ...inputStyle, minHeight: 76, marginTop: 7, resize: "vertical" }}/><div style={{ marginTop: 8, textAlign: "right" }}><button type="button" disabled={loading} onClick={publish} style={buttonStyle(true)}>📡 {loading ? "…" : tr("Publier mondialement", "Publish globally", "Publicar globalmente")}</button></div></section>
    <section style={{ ...panelStyle, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "end", flexWrap: "wrap" }}><div><div style={{ fontSize: 18, fontWeight: 1000 }}>🌍 {tr("Annonces du réseau", "Network posts", "Anuncios de la red")}</div><div style={{ color: textSoft, fontSize: 9.5 }}>{tr("Les annonces expirent automatiquement après 24 h.", "Posts automatically expire after 24h.", "Los anuncios caducan automáticamente tras 24 h.")}</div></div><button type="button" onClick={loadNetwork} style={{ ...buttonStyle(false), minHeight: 30, padding: "4px 8px" }}>↻</button></div><div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 7 }}><select value={filterGame} onChange={(e) => setFilterGame(e.target.value)} style={inputStyle}><option value="all">{tr("Tous les jeux", "All games", "Todos los juegos")}</option>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} style={inputStyle}><option value="all">{tr("Toutes plateformes", "All platforms", "Todas plataformas")}</option>{["pc","playstation","xbox","switch","mobile","crossplay"].map((p) => <option key={p} value={p}>{displayPlatform(p)}</option>)}</select><input value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} placeholder={tr("Pseudo / niveau / message", "Nickname / rank / message", "Alias / nivel / mensaje")} style={inputStyle}/></div>{networkError ? <div style={{ marginTop: 8, color: "#fb7185", fontSize: 9.5 }}>{networkError}</div> : null}<div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(235px,1fr))", gap: 8 }}>{networkPosts.length ? networkPosts.map((post) => { const g=getEsportsGame(post.gameId); return <div key={post.id} style={{ borderRadius: 15, padding: 11, background: post.mine ? `${g.accent}0d` : "rgba(255,255,255,.03)", border: `1px solid ${post.mine ? `${g.accent}45` : "rgba(255,255,255,.07)"}` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 7 }}><div><strong style={{ color: g.accent }}>{g.icon} {post.displayName}</strong><div style={{ color: textSoft, fontSize: 8.5 }}>{g.shortName} · {displayPlatform(post.platform)} · {post.mode}</div></div><span style={{ color: post.status === "open" ? "#34d399" : textSoft, fontSize: 8, fontWeight: 1000 }}>{post.mine ? "ME · " : ""}{post.status.toUpperCase()}</span></div>{post.rankLabel ? <div style={{ marginTop: 6, fontSize: 10, fontWeight: 1000 }}>🏅 {post.rankLabel}</div> : null}{post.message ? <div style={{ marginTop: 5, color: textSoft, fontSize: 9.5 }}>{post.message}</div> : null}<div style={{ marginTop: 6, fontSize: 9, fontWeight: 900 }}>＋{post.slotsNeeded} {tr("joueur(s)", "player(s)", "jugador(es)")}</div><div style={{ marginTop: 8, display: "flex", gap: 5 }}>{post.mine ? <button type="button" onClick={() => closeNetwork(post)} style={{ ...buttonStyle(false), flex: 1, minHeight: 28, fontSize: 8.5 }}>{post.status === "open" ? tr("Clore", "Close", "Cerrar") : tr("Rouvrir", "Reopen", "Reabrir")}</button> : <button type="button" onClick={() => apply(post)} style={{ ...buttonStyle(true), flex: 1, minHeight: 28, fontSize: 8.5 }}>🤝 {tr("Postuler", "Apply", "Postular")}</button>}</div></div>; }) : <Empty text={loading ? tr("Chargement du réseau…", "Loading network…", "Cargando red…") : tr("Aucune annonce pour ces filtres.", "No posts for these filters.", "No hay anuncios para estos filtros.")} textSoft={textSoft}/>}</div></section>
    <EsportsLfgApplicationsV4 posts={networkPosts} panelStyle={panelStyle} buttonStyle={buttonStyle} textSoft={textSoft} setToast={setToast} tr={tr} onRefresh={loadNetwork}/>
    <section style={{ ...panelStyle, padding: 12 }}><div style={{ fontWeight: 1000 }}>📱 {tr("Secours local / hors-ligne", "Local / offline fallback", "Respaldo local / sin conexión")} · {localOpen.length}</div><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 7 }}>{state.lfgPosts.length ? state.lfgPosts.map((post: any) => { const g=getEsportsGame(post.gameId); return <div key={post.id} style={{ borderRadius: 13, padding: 9, background: "rgba(255,255,255,.025)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}><strong style={{ color: g.accent }}>{g.shortName}</strong><span style={{ color: textSoft, fontSize: 8 }}>{post.status.toUpperCase()}</span></div><div style={{ marginTop: 4, fontSize: 9 }}>{post.rankLabel ? `${post.rankLabel} · ` : ""}{post.mode}</div><div style={{ marginTop: 7, display: "flex", gap: 5 }}><button type="button" onClick={() => { setEsportsLfgStatus(post.id, post.status === "open" ? "closed" : "open"); refresh(); }} style={{ ...buttonStyle(false), minHeight: 25, padding: "2px 6px", fontSize: 8 }}>{post.status === "open" ? tr("Clore", "Close", "Cerrar") : tr("Rouvrir", "Reopen", "Reabrir")}</button><button type="button" onClick={() => { deleteEsportsLfgPost(post.id); refresh(); }} style={{ ...buttonStyle(false), minHeight: 25, padding: "2px 6px" }}>×</button></div></div>; }) : <Empty text={tr("Aucun secours local.", "No local fallback.", "Sin respaldo local.")} textSoft={textSoft}/>}</div></section>
  </div>;
}

function StatsSection({ state, panelStyle, textSoft, tr }: any) {
  const stats = React.useMemo(() => {
    const map = new Map<string, { gameId: string; played: number; wins: number; losses: number; draws: number; scored: number; conceded: number }>();
    for (const match of state.matches) {
      const row = map.get(match.gameId) || { gameId: match.gameId, played: 0, wins: 0, losses: 0, draws: 0, scored: 0, conceded: 0 };
      row.played += 1; row.scored += Number(match.sideA.score || 0); row.conceded += Number(match.sideB.score || 0);
      if (match.winner === "A") row.wins += 1; else if (match.winner === "B") row.losses += 1; else row.draws += 1;
      map.set(match.gameId, row);
    }
    return [...map.values()].sort((a,b) => b.played - a.played);
  }, [state.matches]);
  const total = stats.reduce((n,r) => n+r.played, 0); const wins = stats.reduce((n,r) => n+r.wins, 0);
  return <div style={{ display: "grid", gap: 10 }}><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>{[[total,tr("Matchs", "Matches", "Partidos")],[wins,tr("Victoires", "Wins", "Victorias")],[total ? `${Math.round(wins/total*100)}%` : "0%",tr("Win rate", "Win rate", "Win rate")],[stats.length,tr("Jeux joués", "Games played", "Juegos jugados")]].map(([v,k]) => <div key={k} style={{ ...panelStyle, padding: 13 }}><div style={{ fontSize: 24, fontWeight: 1000 }}>{v}</div><div style={{ color: textSoft, fontSize: 10 }}>{k}</div></div>)}</section><section style={{ ...panelStyle, padding: 14 }}><div style={{ fontSize: 20, fontWeight: 1000 }}>{tr("Performance par jeu", "Performance by game", "Rendimiento por juego")}</div><div style={{ marginTop: 9, display: "grid", gap: 7 }}>{stats.length ? stats.map((row) => { const game = getEsportsGame(row.gameId); const rate = Math.round(row.wins / Math.max(1,row.played)*100); return <div key={row.gameId} style={{ borderRadius: 14, padding: 10, background: "rgba(255,255,255,.035)", display: "grid", gridTemplateColumns: "minmax(130px,1.3fr) repeat(4,minmax(58px,.5fr))", gap: 8, alignItems: "center" }}><div><strong style={{ color: game.accent }}>{game.icon} {game.name}</strong><div style={{ marginTop: 5, height: 4, borderRadius: 99, background: "rgba(255,255,255,.07)", overflow: "hidden" }}><div style={{ width: `${rate}%`, height: "100%", background: game.accent }}/></div></div><MiniStat label="P" value={row.played} textSoft={textSoft}/><MiniStat label="W" value={row.wins} textSoft={textSoft}/><MiniStat label="L" value={row.losses} textSoft={textSoft}/><MiniStat label="WR" value={`${rate}%`} textSoft={textSoft}/></div>; }) : <Empty text={tr("Enregistre quelques matchs pour alimenter les statistiques.", "Record a few matches to populate statistics.", "Guarda algunos partidos para alimentar las estadísticas.")} textSoft={textSoft}/>}</div></section></div>;
}

function MiniStat({ label, value, textSoft }: any) { return <div style={{ textAlign: "center" }}><div style={{ color: textSoft, fontSize: 8.5 }}>{label}</div><div style={{ marginTop: 2, fontWeight: 1000 }}>{value}</div></div>; }
function Empty({ text, textSoft }: { text: string; textSoft: string }) { return <div style={{ padding: "18px 4px", color: textSoft, fontSize: 11, textAlign: "center" }}>{text}</div>; }
