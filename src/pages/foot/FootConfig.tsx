import React from "react";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";
import PlayerPagedSelector from "../../components/PlayerPagedSelector";
import { loadTeamsBySport, type TeamEntity } from "../../lib/petanqueTeamsStore";
import { getFootFormat } from "./footFormats";
import tickerPenalty from "../../assets/tickers/ticker_foot_penalty.webp";
import ticker1v1 from "../../assets/tickers/ticker_foot_1v1.webp";
import ticker2v2 from "../../assets/tickers/ticker_foot_2v2.webp";
import ticker3v3 from "../../assets/tickers/ticker_foot_3v3.webp";
import ticker5v5 from "../../assets/tickers/ticker_foot_5v5.webp";
import ticker7v7 from "../../assets/tickers/ticker_foot_7v7.webp";
import ticker8v8 from "../../assets/tickers/ticker_foot_8v8.webp";
import ticker11v11 from "../../assets/tickers/ticker_foot_11v11.webp";

type Props = { go: (route: any, params?: any) => void; params?: any; store?: any };
type SourceMode = "manual" | "saved";

const FOOT_CONFIG_TICKERS: Record<string, string> = {
  penalty: tickerPenalty,
  "1v1": ticker1v1,
  "2v2": ticker2v2,
  "3v3": ticker3v3,
  "5v5": ticker5v5,
  "7v7": ticker7v7,
  "8v8": ticker8v8,
  "11v11": ticker11v11,
};

type TeamSlot = {
  name: string;
  playerIds: string[];
  logoDataUrl?: string | null;
  teamId?: string | null;
};

function profileName(p: any) {
  return String(p?.name || p?.displayName || p?.label || "Joueur");
}

function isBotProfile(p: any) {
  return Boolean(p?.isBot || p?.bot || p?.type === "bot" || p?.kind === "bot" || p?.botLevel);
}

function teamLogo(team: any) {
  return team?.logoDataUrl || team?.logoUrl || team?.avatarUrl || team?.imageUrl || null;
}

export default function FootConfig({ go, params, store }: Props) {
  const spec = getFootFormat(params?.format || params?.config?.format);
  const tickerSrc = FOOT_CONFIG_TICKERS[spec.id] || tickerPenalty;
  const primary = "#22e6ff";
  const primarySoft = "rgba(34,230,255,.13)";
  const green = "#31f083";

  const profiles = React.useMemo(() => {
    const list = Array.isArray(store?.profiles) ? store.profiles : [];
    return list.filter((p: any) => p && p.id && !isBotProfile(p));
  }, [store?.profiles]);

  const savedTeams = React.useMemo<TeamEntity[]>(() => {
    try {
      const foot = loadTeamsBySport("foot").filter((t: any) => Array.isArray(t?.playerIds) && t.playerIds.length > 0);
      const football = loadTeamsBySport("football").filter((t: any) => Array.isArray(t?.playerIds) && t.playerIds.length > 0);
      const all = [...foot, ...football];
      const seen = new Set<string>();
      return all.filter((t: any) => {
        const id = String(t?.id || "");
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    } catch {
      return [];
    }
  }, [store?.profiles]);

  const [sourceMode, setSourceMode] = React.useState<SourceMode>(spec.kind === "team" ? "manual" : "manual");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>([]);
  const [minutes, setMinutes] = React.useState(spec.minutesPerPeriod);
  const [periods, setPeriods] = React.useState(spec.periods);
  const [breakMinutes, setBreakMinutes] = React.useState(5);
  const [shoots, setShoots] = React.useState(5);
  const [rulesOpen, setRulesOpen] = React.useState(false);

  React.useEffect(() => {
    setMinutes(spec.minutesPerPeriod);
    setPeriods(spec.periods);
    setBreakMinutes(spec.id === "penalty" ? 0 : 5);
    setShoots(5);
    setSelectedIds([]);
    setSelectedTeamIds([]);
    setSourceMode("manual");
  }, [spec.id]);

  const requiredPlayers = spec.kind === "duel" ? 2 : spec.playersPerSide * 2;
  const selectedSet = React.useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  const selectedTeamSet = React.useMemo(() => new Set(selectedTeamIds.map(String)), [selectedTeamIds]);
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);

  function togglePlayer(idRaw: any) {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedIds((prev) => {
      const exists = prev.map(String).includes(id);
      if (exists) return prev.filter((x) => String(x) !== id);
      if (prev.length >= requiredPlayers) return prev;
      return [...prev, id];
    });
  }

  function toggleTeam(idRaw: any) {
    const id = String(idRaw || "");
    if (!id) return;
    setSelectedTeamIds((prev) => {
      const exists = prev.map(String).includes(id);
      if (exists) return prev.filter((x) => String(x) !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  const selectedProfiles = React.useMemo(() => selectedIds.map((id) => profileById.get(String(id))).filter(Boolean), [selectedIds, profileById]);
  const manualA = selectedProfiles.slice(0, spec.playersPerSide);
  const manualB = selectedProfiles.slice(spec.playersPerSide, spec.playersPerSide * 2);
  const savedSelectedTeams = selectedTeamIds.map((id) => savedTeams.find((t: any) => String(t.id) === String(id))).filter(Boolean) as TeamEntity[];

  const ready = spec.kind === "duel" ? selectedIds.length === 2 : sourceMode === "saved" ? savedSelectedTeams.length === 2 : selectedIds.length === requiredPlayers;

  const buildTeamSlots = (): [TeamSlot, TeamSlot] => {
    if (spec.kind === "duel") {
      const a = selectedProfiles[0];
      const b = selectedProfiles[1];
      return [
        { name: profileName(a) || "Joueur A", playerIds: a?.id ? [String(a.id)] : [] },
        { name: profileName(b) || "Joueur B", playerIds: b?.id ? [String(b.id)] : [] },
      ];
    }
    if (sourceMode === "saved" && savedSelectedTeams.length >= 2) {
      const a: any = savedSelectedTeams[0];
      const b: any = savedSelectedTeams[1];
      return [
        { name: String(a?.name || "Équipe A"), playerIds: (a?.playerIds || []).map(String).slice(0, spec.playersPerSide), logoDataUrl: teamLogo(a), teamId: String(a?.id || "") },
        { name: String(b?.name || "Équipe B"), playerIds: (b?.playerIds || []).map(String).slice(0, spec.playersPerSide), logoDataUrl: teamLogo(b), teamId: String(b?.id || "") },
      ];
    }
    return [
      { name: "Équipe A", playerIds: manualA.map((p: any) => String(p.id)) },
      { name: "Équipe B", playerIds: manualB.map((p: any) => String(p.id)) },
    ];
  };

  const start = () => {
    if (!ready) return;
    const [a, b] = buildTeamSlots();
    go("foot_play", {
      config: {
        sport: "foot",
        mode: `foot_${spec.id}`,
        format: spec.id,
        formatLabel: spec.label,
        kind: spec.kind,
        sourceMode,
        teamA: a.name,
        teamB: b.name,
        teamALogo: a.logoDataUrl || null,
        teamBLogo: b.logoDataUrl || null,
        teamAPlayerIds: a.playerIds,
        teamBPlayerIds: b.playerIds,
        playersA: a.playerIds.map((id) => profileName(profileById.get(id)) || id),
        playersB: b.playerIds.map((id) => profileName(profileById.get(id)) || id),
        minutes,
        periods,
        breakMinutes,
        shoots,
      },
    });
  };

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <header style={headerStyle}>
          <div aria-hidden style={headerTickerWrapStyle}>
            <img src={tickerSrc} alt="" style={headerTickerStyle} draggable={false} />
            <div style={headerTickerFadeStyle} />
          </div>
          <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", zIndex: 3 }}>
            <BackDot onClick={() => go("foot_menu")} />
          </div>
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", zIndex: 3 }}>
            <InfoDot onClick={() => setRulesOpen((v) => !v)} title="Règles" size={46} color={primary} glow={`0 0 18px ${primary}`} />
          </div>
        </header>

        {rulesOpen && (
          <section style={cardStyle(primarySoft)}>
            <h2 style={sectionTitle(green)}>RÈGLES DU FORMAT</h2>
            <div style={{ display: "grid", gap: 7 }}>{spec.rules.map((r) => <div key={r} style={hintLine}>• {r}</div>)}</div>
          </section>
        )}

        <section style={cardStyle()}>
          <h2 style={sectionTitle(primary)}>PARTICIPANTS</h2>
          <p style={hintStyle}>
            {spec.kind === "duel"
              ? "Sélectionne exactement 2 profils pour lancer le duel."
              : `Sélectionne ${spec.playersPerSide} joueurs par équipe, soit ${requiredPlayers} joueurs au total, ou choisis 2 équipes enregistrées.`}
          </p>

          {spec.kind === "team" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <Pill label="Manuel" active={sourceMode === "manual"} onClick={() => setSourceMode("manual")} primary={primary} primarySoft={primarySoft} />
              <Pill label="Équipes enregistrées" active={sourceMode === "saved"} onClick={() => setSourceMode("saved")} primary={primary} primarySoft={primarySoft} />
            </div>
          )}

          {sourceMode === "saved" && spec.kind === "team" ? (
            <SavedTeamsPicker teams={savedTeams} selectedSet={selectedTeamSet} onToggle={toggleTeam} profilesById={profileById} primary={primary} primarySoft={primarySoft} maxPlayers={spec.playersPerSide} />
          ) : (
            <>
              {profiles.length === 0 ? (
                <div style={emptyStyle}>Aucun profil local disponible. Crée d’abord tes joueurs dans Profils.</div>
              ) : (
                <PlayerPagedSelector profiles={profiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} pageSize={9} modalTitle={spec.kind === "duel" ? "Choisir les 2 joueurs" : `Choisir ${requiredPlayers} joueurs`} />
              )}
              <SelectedPreview title={spec.kind === "duel" ? "Duel sélectionné" : "Répartition automatique"} leftTitle={spec.kind === "duel" ? "Camp A" : "Équipe A"} rightTitle={spec.kind === "duel" ? "Camp B" : "Équipe B"} left={manualA} right={manualB} primary={primary} />
            </>
          )}
        </section>

        <section style={cardStyle()}>
          <h2 style={sectionTitle(primary)}>PARAMÈTRES DU MATCH</h2>
          {spec.id === "penalty" ? (
            <OptionGrid label="Tirs par camp" value={shoots} setValue={setShoots} options={[3, 5, 7, 10]} suffix=" tirs" />
          ) : (
            <div style={compactParamsGrid}>
              <OptionSelect
                label="Temps d’une mi-temps"
                value={minutes}
                setValue={setMinutes}
                options={[3, 5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45]}
                suffix=" min"
              />
              <OptionSelect
                label="Nombre de mi-temps"
                value={periods}
                setValue={setPeriods}
                options={[1, 2]}
                suffix={periods > 1 ? " mi-temps" : " mi-temps"}
              />
              <OptionSelect
                label="Pause mi-temps"
                value={breakMinutes}
                setValue={setBreakMinutes}
                options={[2, 5, 7, 10, 15]}
                suffix=" min"
              />
            </div>
          )}
        </section>

        <button onClick={start} disabled={!ready} style={{ ...startButton, opacity: ready ? 1 : .45, cursor: ready ? "pointer" : "not-allowed" }}>
          {ready ? `DÉMARRER ${spec.label}` : missingLabel(spec, sourceMode, selectedIds.length, savedSelectedTeams.length)}
        </button>
      </div>
    </div>
  );
}

function missingLabel(spec: any, sourceMode: SourceMode, selectedCount: number, teamCount: number) {
  if (spec.kind === "duel") return `SÉLECTIONNE ${Math.max(0, 2 - selectedCount)} JOUEUR(S)`;
  if (sourceMode === "saved") return `SÉLECTIONNE ${Math.max(0, 2 - teamCount)} ÉQUIPE(S)`;
  return `SÉLECTIONNE ${Math.max(0, spec.playersPerSide * 2 - selectedCount)} JOUEUR(S)`;
}

function SelectedPreview({ title, leftTitle, rightTitle, left, right, primary }: any) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, color: "#9da3c0", fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <RosterCard title={leftTitle} players={left} primary={primary} />
        <RosterCard title={rightTitle} players={right} primary={primary} />
      </div>
    </div>
  );
}

function RosterCard({ title, players, primary }: any) {
  return (
    <div style={{ borderRadius: 16, padding: 10, background: "rgba(5,8,16,.78)", border: "1px solid rgba(255,255,255,.08)" }}>
      <div style={{ color: primary, fontWeight: 1000, fontSize: 12, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gap: 7 }}>
        {players.length === 0 ? <div style={{ color: "#737894", fontSize: 12, fontWeight: 800 }}>En attente</div> : players.map((p: any) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            <ProfileAvatar profile={p} size={28} />
            <span style={{ fontSize: 12, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileName(p)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SavedTeamsPicker({ teams, selectedSet, onToggle, profilesById, primary, primarySoft, maxPlayers }: any) {
  if (!teams.length) return <div style={emptyStyle}>Aucune équipe FOOT enregistrée pour l’instant. Passe en Manuel ou crée tes équipes depuis Profils.</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
      {teams.map((team: any) => {
        const active = selectedSet.has(String(team.id));
        const ids = (Array.isArray(team.playerIds) ? team.playerIds : []).map(String).slice(0, maxPlayers);
        const members = ids.map((id: string) => profilesById.get(id)).filter(Boolean);
        const logo = teamLogo(team);
        return (
          <button key={team.id} type="button" onClick={() => onToggle(team.id)} style={{ textAlign: "left", borderRadius: 18, padding: 11, border: active ? `1px solid ${primary}` : "1px solid rgba(255,255,255,.09)", background: active ? primarySoft : "rgba(5,8,16,.78)", color: "#fff", boxShadow: active ? `0 0 20px ${primary}33` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 46, height: 46, borderRadius: 15, overflow: "hidden", display: "grid", placeItems: "center", border: `1px solid ${active ? primary : "rgba(255,255,255,.12)"}`, background: "rgba(255,255,255,.06)", flex: "0 0 auto" }}>
                {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: primary, fontWeight: 1000 }}>{String(team.name || "EQ").slice(0, 2).toUpperCase()}</span>}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 1000, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.name || "Équipe"}</div>
                <div style={{ color: "#9da3c0", fontSize: 11, fontWeight: 800 }}>{members.length || ids.length} joueur(s)</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function OptionSelect({ label, value, setValue, options, suffix = "" }: any) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: 0 }}>
      <div style={selectLabelStyle}>{label}</div>
      <button type="button" onClick={() => setOpen((v) => !v)} style={selectBoxStyle(open)}>
        <span>{value}{suffix}</span>
        <span style={{ fontSize: 16, transform: open ? "rotate(180deg)" : "none", transition: "transform .16s ease" }}>⌄</span>
      </button>
      {open && (
        <div style={selectListStyle}>
          {options.map((o: number) => (
            <button key={o} type="button" onClick={() => { setValue(o); setOpen(false); }} style={selectItemStyle(value === o)}>
              {o}{suffix}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OptionGrid({ label, value, setValue, options, suffix = "" }: any) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#9da3c0", fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(64px, 1fr))", gap: 8 }}>
        {options.map((o: number) => <button key={o} type="button" onClick={() => setValue(o)} style={{ borderRadius: 14, border: value === o ? "1px solid #22e6ff" : "1px solid rgba(255,255,255,.10)", background: value === o ? "rgba(34,230,255,.15)" : "rgba(255,255,255,.055)", color: "#fff", padding: "10px 8px", fontWeight: 1000 }}>{o}{suffix}</button>)}
      </div>
    </div>
  );
}

function Pill({ label, active, onClick, primary, primarySoft }: any) {
  return <button type="button" onClick={onClick} style={{ border: active ? `1px solid ${primary}` : "1px solid rgba(255,255,255,.10)", background: active ? primarySoft : "rgba(255,255,255,.045)", color: active ? "#fff" : "#c9cee8", borderRadius: 999, padding: "9px 12px", fontWeight: 1000, cursor: "pointer", boxShadow: active ? `0 0 18px ${primary}2f` : "none" }}>{label}</button>;
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", padding: "14px 12px 92px", color: "#fff", background: "radial-gradient(circle at 50% 0%, rgba(34,230,255,.16), transparent 34%), linear-gradient(180deg, #050915, #020409 70%)" };
const shellStyle: React.CSSProperties = { maxWidth: 680, margin: "0 auto", display: "grid", gap: 14 };
const headerStyle: React.CSSProperties = { position: "relative", minHeight: 86, borderRadius: 24, padding: "0 64px", overflow: "hidden", display: "grid", placeItems: "center", background: "rgba(7,11,24,.92)", border: "1px solid rgba(34,230,255,.45)", boxShadow: "0 18px 42px rgba(0,0,0,.45), inset 0 0 36px rgba(34,230,255,.06)" };
const headerTickerWrapStyle: React.CSSProperties = { position: "absolute", right: 0, top: 0, height: "100%", width: "75%", pointerEvents: "none", opacity: .28, zIndex: 0, WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)", maskImage: "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)" };
const headerTickerStyle: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transform: "translateZ(0)", filter: "contrast(1.05) saturate(1.05) drop-shadow(0 0 10px rgba(0,0,0,0.25))" };
const headerTickerFadeStyle: React.CSSProperties = { position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.00) 35%, rgba(0,0,0,0.00) 65%, rgba(0,0,0,0.35) 100%)", opacity: .55 };
const cardStyle = (bg = "rgba(10,12,24,.96)"): React.CSSProperties => ({ borderRadius: 20, padding: 14, background: bg, border: "1px solid rgba(255,255,255,.07)", boxShadow: "0 16px 40px rgba(0,0,0,.5)" });
const sectionTitle = (color: string): React.CSSProperties => ({ margin: "0 0 10px", color, fontSize: 13, fontWeight: 1000, textTransform: "uppercase", letterSpacing: 1.1 });
const hintStyle: React.CSSProperties = { margin: "0 0 12px", color: "#9fa6c0", fontSize: 12, fontWeight: 750, lineHeight: 1.35 };
const hintLine: React.CSSProperties = { color: "#d5d9ec", fontSize: 13, fontWeight: 800, lineHeight: 1.35 };
const compactParamsGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))", gap: 10 };
const selectLabelStyle: React.CSSProperties = { fontSize: 11, color: "#9da3c0", fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, marginBottom: 7 };
const selectBoxStyle = (open: boolean): React.CSSProperties => ({ width: "100%", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderRadius: 16, border: open ? "1px solid #22e6ff" : "1px solid rgba(255,255,255,.10)", background: open ? "rgba(34,230,255,.14)" : "rgba(255,255,255,.055)", color: "#fff", padding: "0 13px", fontWeight: 1000, boxShadow: open ? "0 0 22px rgba(34,230,255,.24)" : "none" });
const selectListStyle: React.CSSProperties = { position: "absolute", zIndex: 20, left: 0, right: 0, top: "calc(100% + 7px)", maxHeight: 210, overflowY: "auto", borderRadius: 16, padding: 6, background: "rgba(5,8,16,.98)", border: "1px solid rgba(34,230,255,.38)", boxShadow: "0 18px 34px rgba(0,0,0,.62), 0 0 22px rgba(34,230,255,.18)" };
const selectItemStyle = (active: boolean): React.CSSProperties => ({ width: "100%", border: 0, borderRadius: 12, padding: "11px 12px", marginBottom: 4, textAlign: "left", background: active ? "rgba(34,230,255,.18)" : "transparent", color: active ? "#22e6ff" : "#fff", fontWeight: 1000 });
const emptyStyle: React.CSSProperties = { color: "#9fa6c0", fontSize: 13, fontWeight: 800, borderRadius: 16, padding: 12, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)" };
const startButton: React.CSSProperties = { width: "100%", border: 0, borderRadius: 20, padding: "16px 18px", background: "linear-gradient(135deg, #22e6ff, #127cff)", color: "#001019", fontWeight: 1000, fontSize: 15, boxShadow: "0 0 28px rgba(34,230,255,.35)" };
