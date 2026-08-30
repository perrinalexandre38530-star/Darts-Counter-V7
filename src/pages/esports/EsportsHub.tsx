import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import { ESPORTS_GAMES, getEsportsGame } from "../../esports/catalog";
import { createOnlineEsportsRoom, joinOnlineEsportsRoom, refreshOnlineEsportsRoom, setOnlineEsportsReady, startOnlineEsportsMatch, subscribeOnlineEsportsRoom } from "../../esports/online";
import { createEsportsTournament, createLocalEsportsRoom, deleteEsportsTournament, patchEsportsState, readEsportsState, recordEsportsMatch, removeEsportsRoom, saveGamerIdentity, selectEsportsGame, subscribeEsportsStore, toggleFavoriteGame, upsertEsportsRoom } from "../../esports/store";
import type { EsportsGameDefinition, EsportsRoom, EsportsState, EsportsTournamentFormat } from "../../esports/types";
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
        {section === "profile" ? <ProfileSection state={state} refresh={refresh} panelStyle={panelStyle} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} accent={accent} go={go} tr={tr} /> : null}
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
      setOpenRoomId(room.id); refresh(); setToast(source === "online" ? `${tr("Salon online créé", "Online room created", "Sala online creada")} · ${room.code}` : tr("Salon local créé", "Local room created", "Sala local creada"));
    } catch (e: any) { setError(String(e?.message || e || tr("Création impossible.", "Unable to create.", "No se pudo crear."))); }
    finally { setBusy(false); }
  };

  const joinOnline = async () => {
    const code = joinCode.trim().toUpperCase(); if (!code) return;
    setBusy(true); setError("");
    try { const room = await joinOnlineEsportsRoom(code); setOpenRoomId(room.id); refresh(); setToast(`${tr("Salon rejoint", "Room joined", "Sala unida")} · ${room.code}`); }
    catch (e: any) { setError(String(e?.message || e || tr("Salon introuvable.", "Room not found.", "Sala no encontrada."))); }
    finally { setBusy(false); }
  };

  return <div style={{ display: "grid", gap: 10 }}>
    <section style={{ ...panelStyle, padding: 14 }}><div style={{ fontSize: 22, fontWeight: 1000 }}>{tr("Créer un salon", "Create a room", "Crear una sala")}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 11 }}>{tr("Le mode Online réutilise le moteur temps réel déjà présent dans MULTISPORTS SCORING.", "Online mode reuses the real-time engine already in MULTISPORTS SCORING.", "El modo Online reutiliza el motor en tiempo real ya presente.")}</div><div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}><select value={gameId} onChange={(e) => setGameId(e.target.value)} style={inputStyle}>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle}/><select value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} style={inputStyle}>{currentGame.teamSizes.map((n) => <option key={n} value={n}>{currentGame.matchShape === "team" ? `${n}v${n}` : `${n} joueur${n>1?"s":""}/équipe`}</option>)}</select><select value={bestOf} onChange={(e) => setBestOf(Number(e.target.value))} style={inputStyle}>{currentGame.bestOf.map((n) => <option key={n} value={n}>BO{n}</option>)}</select><select value={visibility} onChange={(e) => setVisibility(e.target.value as any)} style={inputStyle}><option value="private">🔒 {tr("Privé", "Private", "Privado")}</option><option value="friends">👥 {tr("Amis", "Friends", "Amigos")}</option><option value="public">🌍 {tr("Public", "Public", "Público")}</option></select><select value={source} onChange={(e) => setSource(e.target.value as any)} style={inputStyle}><option value="local">📱 LOCAL</option><option value="online">🌐 ONLINE BETA</option></select></div><div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ color: textSoft, fontSize: 10 }}>{formatLabel} · {maxPlayers} max · {currentGame.resultKind.toUpperCase()}</span><button type="button" disabled={busy} onClick={createRoom} style={buttonStyle(true)}>{busy ? "…" : `＋ ${tr("Créer", "Create", "Crear")}`}</button></div>{error ? <div style={{ marginTop: 9, color: "#fb7185", fontSize: 11, fontWeight: 800 }}>{error}</div> : null}</section>

    <section style={{ ...panelStyle, padding: 14 }}><div style={{ fontWeight: 1000 }}>{tr("Rejoindre un salon Online", "Join an Online room", "Unirse a una sala Online")}</div><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}><input value={joinCode} maxLength={8} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="CODE SALON" style={{ ...inputStyle, textTransform: "uppercase", letterSpacing: 3, fontWeight: 1000 }}/><button type="button" disabled={busy} onClick={joinOnline} style={buttonStyle(false)}>{tr("Rejoindre", "Join", "Unirse")}</button></div></section>

    <section style={{ display: "grid", gridTemplateColumns: "minmax(220px,.75fr) minmax(300px,1.25fr)", gap: 10 }}><div style={{ ...panelStyle, padding: 12 }}><div style={{ fontWeight: 1000 }}>{tr("Mes salons", "My rooms", "Mis salas")} · {state.rooms.length}</div><div style={{ marginTop: 9, display: "grid", gap: 7 }}>{state.rooms.length ? state.rooms.map((room: EsportsRoom) => <button type="button" key={room.id} onClick={() => setOpenRoomId(room.id)} style={{ textAlign: "left", borderRadius: 14, border: `1px solid ${openRoomId === room.id ? getEsportsGame(room.gameId).accent : "rgba(255,255,255,.08)"}`, background: openRoomId === room.id ? `${getEsportsGame(room.gameId).accent}14` : "rgba(255,255,255,.025)", color: "inherit", padding: 10, cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 7 }}><strong>{getEsportsGame(room.gameId).shortName} · {room.title}</strong><span style={{ color: room.source === "online" ? "#34d399" : textSoft, fontSize: 9, fontWeight: 1000 }}>{room.source.toUpperCase()}</span></div><div style={{ marginTop: 4, color: textSoft, fontSize: 9.5 }}>{room.code} · {room.members.length}/{room.maxPlayers} · BO{room.bestOf}</div></button>) : <Empty text={tr("Aucun salon.", "No rooms.", "Sin salas.")} textSoft={textSoft}/>}</div></div><div style={{ ...panelStyle, padding: 12 }}>{openRoomId ? <RoomDetail room={state.rooms.find((r: EsportsRoom) => r.id === openRoomId)} state={state} refresh={refresh} buttonStyle={buttonStyle} inputStyle={inputStyle} textSoft={textSoft} accent={accent} setToast={setToast} tr={tr}/> : <Empty text={tr("Sélectionne un salon.", "Select a room.", "Selecciona una sala.")} textSoft={textSoft}/>}</div></section>
  </div>;
}

function RoomDetail({ room, state, refresh, buttonStyle, inputStyle, textSoft, setToast, tr }: any) {
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  if (!room) return <Empty text={tr("Salon introuvable.", "Room not found.", "Sala no encontrada.")} textSoft={textSoft}/>;
  const game = getEsportsGame(room.gameId);
  const addLocalMember = () => { const clean = name.trim(); if (!clean) return; const members = [...room.members, { id: `local_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, name: clean, ready: false, team: room.members.filter((m: any) => m.team === "A").length <= room.members.filter((m: any) => m.team === "B").length ? "A" : "B", role: "player" }].slice(0, room.maxPlayers); upsertEsportsRoom({ ...room, members }); setName(""); refresh(); };
  const toggleReady = async () => { setBusy(true); try { if (room.source === "online") { await setOnlineEsportsReady(room.code, true); } else { const members = room.members.map((m: any, i: number) => i === 0 ? { ...m, ready: !m.ready } : m); upsertEsportsRoom({ ...room, members }); } refresh(); } catch (e: any) { setToast(String(e?.message || e)); } finally { setBusy(false); } };
  const launch = async () => { setBusy(true); try { if (room.source === "online") { await startOnlineEsportsMatch(room); await refreshOnlineEsportsRoom(room.code).catch(() => null); } upsertEsportsRoom({ ...room, status: "playing" }); refresh(); setToast(tr("Match lancé — saisie du résultat disponible dans MATCHS.", "Match started — result entry is available in MATCHES.", "Partido iniciado — resultado disponible en PARTIDOS.")); } catch (e: any) { setToast(String(e?.message || e)); } finally { setBusy(false); } };
  return <div><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}><div><div style={{ color: game.accent, fontSize: 11, fontWeight: 1000 }}>{game.icon} {game.name}</div><div style={{ marginTop: 2, fontSize: 20, fontWeight: 1000 }}>{room.title}</div><div style={{ color: textSoft, fontSize: 10 }}>{room.formatLabel} · BO{room.bestOf} · {room.visibility.toUpperCase()}</div></div><div style={{ borderRadius: 12, padding: "7px 9px", background: `${game.accent}18`, color: game.accent, textAlign: "center" }}><div style={{ fontSize: 8.5, fontWeight: 900 }}>CODE</div><div style={{ fontSize: 16, fontWeight: 1000, letterSpacing: 2 }}>{room.code}</div></div></div><div style={{ marginTop: 12, display: "grid", gap: 6 }}>{room.members.map((member: any, index: number) => <div key={member.id} style={{ borderRadius: 13, padding: 9, background: "rgba(255,255,255,.035)", display: "grid", gridTemplateColumns: "32px 1fr auto auto", alignItems: "center", gap: 8 }}><span style={{ width: 32, height: 32, borderRadius: 10, background: `${game.accent}18`, display: "grid", placeItems: "center", color: game.accent, fontWeight: 1000 }}>{index + 1}</span><div><strong>{member.name}</strong><div style={{ color: textSoft, fontSize: 9 }}>{member.role || "player"}</div></div><span style={{ fontSize: 9, color: member.team === "A" ? "#60a5fa" : member.team === "B" ? "#fb923c" : textSoft, fontWeight: 1000 }}>{member.team ? `TEAM ${member.team}` : "—"}</span><span style={{ fontSize: 9, color: member.ready ? "#34d399" : textSoft }}>{member.ready ? "READY" : "WAIT"}</span></div>)}</div>{room.source === "local" && room.members.length < room.maxPlayers ? <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "1fr auto", gap: 7 }}><input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLocalMember()} placeholder={tr("Ajouter un joueur / une équipe", "Add a player / team", "Añadir jugador / equipo")} style={inputStyle}/><button type="button" onClick={addLocalMember} style={buttonStyle(false)}>＋</button></div> : null}<div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 7 }}><button type="button" disabled={busy} onClick={toggleReady} style={buttonStyle(false)}>✓ READY</button><button type="button" disabled={busy || room.status === "finished"} onClick={launch} style={buttonStyle(true)}>▶ {tr("Lancer le match", "Start match", "Iniciar partido")}</button><button type="button" onClick={() => { removeEsportsRoom(room.id); refresh(); }} style={buttonStyle(false)}>× {tr("Supprimer", "Delete", "Eliminar")}</button></div></div>;
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
  return <div style={{ display: "grid", gap: 10 }}><section style={{ ...panelStyle, padding: 14 }}><div style={{ fontSize: 22, fontWeight: 1000 }}>{tr("Générateur de tournoi", "Tournament generator", "Generador de torneos")}</div><div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8 }}><input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle}/><select value={gameId} onChange={(e) => setGameId(e.target.value)} style={inputStyle}>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><select value={format} onChange={(e) => setFormat(e.target.value as EsportsTournamentFormat)} style={inputStyle}><option value="single_elimination">{tr("Élimination directe", "Single elimination", "Eliminación directa")}</option><option value="round_robin">Round Robin</option></select><select value={bestOf} onChange={(e) => setBestOf(Number(e.target.value))} style={inputStyle}>{game.bestOf.map((n) => <option key={n} value={n}>BO{n}</option>)}</select></div><textarea value={participantsText} onChange={(e) => setParticipantsText(e.target.value)} style={{ ...inputStyle, minHeight: 110, marginTop: 8, resize: "vertical" }} placeholder={tr("Un joueur / équipe par ligne", "One player / team per line", "Un jugador / equipo por línea")}/><div style={{ marginTop: 9, textAlign: "right" }}><button type="button" onClick={create} style={buttonStyle(true)}>🏆 {tr("Générer le tournoi", "Generate tournament", "Generar torneo")}</button></div></section><section style={{ display: "grid", gridTemplateColumns: "minmax(220px,.65fr) minmax(340px,1.35fr)", gap: 10 }}><div style={{ ...panelStyle, padding: 12 }}><div style={{ fontWeight: 1000 }}>{tr("Mes tournois", "My tournaments", "Mis torneos")} · {state.tournaments.length}</div><div style={{ marginTop: 8, display: "grid", gap: 6 }}>{state.tournaments.map((t: any) => <button type="button" key={t.id} onClick={() => setOpenId(t.id)} style={{ textAlign: "left", borderRadius: 13, border: `1px solid ${openId === t.id ? getEsportsGame(t.gameId).accent : "rgba(255,255,255,.08)"}`, background: "rgba(255,255,255,.03)", color: "inherit", padding: 9, cursor: "pointer" }}><strong>{t.name}</strong><div style={{ color: textSoft, fontSize: 9 }}>{getEsportsGame(t.gameId).shortName} · {t.participants.length} · BO{t.bestOf}</div></button>)}</div></div><div style={{ ...panelStyle, padding: 12 }}>{open ? <TournamentBracket tournament={open} textSoft={textSoft} accent={accent} buttonStyle={buttonStyle} refresh={refresh} setOpenId={setOpenId} tr={tr}/> : <Empty text={tr("Crée ou sélectionne un tournoi.", "Create or select a tournament.", "Crea o selecciona un torneo.")} textSoft={textSoft}/>}</div></section></div>;
}

function TournamentBracket({ tournament, textSoft, buttonStyle, refresh, setOpenId, tr }: any) {
  const game = getEsportsGame(tournament.gameId);
  const rounds = [...new Set(tournament.matches.map((m: any) => m.round))].sort((a: any,b: any) => a-b);
  return <div><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={{ color: game.accent, fontWeight: 1000 }}>{game.icon} {game.name}</div><div style={{ fontSize: 20, fontWeight: 1000 }}>{tournament.name}</div><div style={{ color: textSoft, fontSize: 9.5 }}>{tournament.format.replace("_", " ").toUpperCase()} · {tournament.participants.length} · BO{tournament.bestOf}</div></div><button type="button" onClick={() => { deleteEsportsTournament(tournament.id); setOpenId(null); refresh(); }} style={buttonStyle(false)}>×</button></div><div style={{ marginTop: 12, overflowX: "auto", paddingBottom: 6 }}><div style={{ display: "flex", gap: 9, minWidth: Math.max(520, rounds.length * 230) }}>{rounds.map((round: any) => <div key={round} style={{ width: 220, flex: "0 0 220px" }}><div style={{ color: textSoft, fontSize: 9, fontWeight: 1000, marginBottom: 6 }}>{tournament.format === "round_robin" ? `${tr("JOURNÉE", "ROUND", "JORNADA")} ${round}` : round === rounds.length ? tr("FINALE", "FINAL", "FINAL") : `${tr("TOUR", "ROUND", "RONDA")} ${round}`}</div><div style={{ display: "grid", gap: 7 }}>{tournament.matches.filter((m: any) => m.round === round).map((m: any) => <div key={m.id} style={{ borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", padding: 8 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}><span>{m.participantAName || "TBD"}</span><strong>{m.scoreA ?? "—"}</strong></div><div style={{ height: 1, background: "rgba(255,255,255,.07)", margin: "6px 0" }}/><div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}><span>{m.participantBName || "TBD"}</span><strong>{m.scoreB ?? "—"}</strong></div></div>)}</div></div>)}</div></div></div>;
}

function ProfileSection({ state, refresh, panelStyle, buttonStyle, inputStyle, textSoft, accent, go, tr }: any) {
  const [displayName, setDisplayName] = React.useState(state.gamer.displayName);
  const [bio, setBio] = React.useState(state.gamer.bio);
  const [country, setCountry] = React.useState(state.gamer.country || "FR");
  const [availability, setAvailability] = React.useState(state.gamer.availability);
  const [lookingForGroup, setLookingForGroup] = React.useState(state.gamer.lookingForGroup);
  const [handles, setHandles] = React.useState({ ...state.gamer.handles } as any);
  const save = () => { saveGamerIdentity({ displayName: displayName.trim() || "Gamer", bio: bio.trim(), country: country.trim().toUpperCase(), availability, lookingForGroup, handles }); refresh(); };
  return <div style={{ display: "grid", gap: 10 }}><section style={{ ...panelStyle, padding: 14 }}><div style={{ fontSize: 22, fontWeight: 1000 }}>{tr("Profil gamer", "Gamer profile", "Perfil gamer")}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 10.5 }}>{tr("Un profil transverse pour tes identifiants et tes communautés gaming. Il reste séparé des statistiques sportives classiques.", "A cross-game profile for gaming IDs and communities. It remains separate from classic sports statistics.", "Un perfil transversal para IDs y comunidades gaming, separado de las estadísticas deportivas clásicas.")}</div><div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Pseudo gamer" style={inputStyle}/><input value={country} maxLength={3} onChange={(e) => setCountry(e.target.value)} placeholder="FR" style={inputStyle}/><select value={availability} onChange={(e) => setAvailability(e.target.value)} style={inputStyle}><option value="available">🟢 {tr("Disponible", "Available", "Disponible")}</option><option value="busy">🟠 {tr("Occupé", "Busy", "Ocupado")}</option><option value="offline">⚫ Offline</option></select><label style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={lookingForGroup} onChange={(e) => setLookingForGroup(e.target.checked)}/>{tr("Je cherche des joueurs / une équipe", "I'm looking for players / a team", "Busco jugadores / equipo")}</label></div><textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio gaming..." style={{ ...inputStyle, minHeight: 76, marginTop: 8, resize: "vertical" }}/></section><section style={{ ...panelStyle, padding: 14 }}><div style={{ fontWeight: 1000 }}>{tr("Identifiants plateformes", "Platform IDs", "IDs de plataformas")}</div><div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8 }}>{["steam","epic","riot","ea","playstation","xbox","battlenet","switch"].map((key) => <label key={key} style={{ display: "grid", gap: 4 }}><span style={{ color: textSoft, fontSize: 9, fontWeight: 900 }}>{key.toUpperCase()}</span><input value={handles[key] || ""} onChange={(e) => setHandles((prev: any) => ({ ...prev, [key]: e.target.value }))} style={inputStyle}/></label>)}</div><div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => go("profiles")} style={buttonStyle(false)}>{tr("Ouvrir mon profil MULTISPORTS", "Open my MULTISPORTS profile", "Abrir mi perfil MULTISPORTS")}</button><button type="button" onClick={save} style={buttonStyle(true)}>✓ {tr("Enregistrer", "Save", "Guardar")}</button></div></section><section style={{ ...panelStyle, padding: 14 }}><div style={{ fontWeight: 1000 }}>{tr("Jeux favoris", "Favorite games", "Juegos favoritos")}</div><div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>{state.gamer.favoriteGameIds.map((id: string) => { const game = getEsportsGame(id); return <span key={id} style={{ borderRadius: 999, padding: "7px 10px", border: `1px solid ${game.accent}50`, background: `${game.accent}12`, color: game.accent, fontSize: 10, fontWeight: 1000 }}>{game.icon} {game.shortName}</span>; })}</div></section></div>;
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
