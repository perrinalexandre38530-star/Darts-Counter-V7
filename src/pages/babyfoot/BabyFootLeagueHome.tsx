// =============================================================
// src/pages/babyfoot/BabyFootLeagueHome.tsx
// Ligues Baby-Foot V1
// ✅ Saison calendrier + Championnat infini amical
// ✅ Variante fusionnée avec Équipe: 2v2 + 2v1 dans le même scope
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import logoBabyFoot from "../../assets/games/logo-babyfoot.png";
import {
  addBabyFootLeagueManualMatch,
  computeBabyFootLeagueStandings,
  createBabyFootLeague,
  deleteBabyFootLeague,
  kindLabel,
  loadBabyFootLeagues,
  scopeLabel,
  setBabyFootFixtureScore,
  type BabyFootLeague,
  type BabyFootLeagueKind,
  type BabyFootLeagueScope,
} from "../../lib/babyfootLeagueStore";

type Props = { go: (tab: any, params?: any) => void; onBack?: () => void };

type View = "list" | "create" | "detail";

const DEFAULT_PARTICIPANTS = "BSS\nPissette FC\nRicard United\nPastaga Boys";
const LEAGUE_CREATE_DRAFT_KEY = "babyfoot_league_create_draft_v1";
const RETURN_TO_LEAGUE_KEY = "return_to_babyfoot_league";

export default function BabyFootLeagueHome({ go, onBack }: Props) {
  const { theme } = useTheme();
  const [leagues, setLeagues] = React.useState<BabyFootLeague[]>(() => loadBabyFootLeagues());
  const [view, setView] = React.useState<View>(() => sessionStorage.getItem(RETURN_TO_LEAGUE_KEY) ? "create" : "list");
  const [selectedId, setSelectedId] = React.useState<string | null>(leagues[0]?.id || null);

  const selected = leagues.find((l) => l.id === selectedId) || null;

  React.useEffect(() => {
    if (sessionStorage.getItem(RETURN_TO_LEAGUE_KEY)) {
      setView("create");
      sessionStorage.removeItem(RETURN_TO_LEAGUE_KEY);
    }
  }, []);

  function refresh(nextSelectedId?: string | null) {
    const next = loadBabyFootLeagues();
    setLeagues(next);
    if (typeof nextSelectedId !== "undefined") setSelectedId(nextSelectedId);
    else if (selectedId && !next.some((l) => l.id === selectedId)) setSelectedId(next[0]?.id || null);
  }

  function goBack() {
    if (view === "detail") return setView("list");
    if (view === "create") return setView("list");
    if (onBack) return onBack();
    go("babyfoot_menu");
  }

  return (
    <div style={{ minHeight: "100vh", padding: 14, paddingBottom: 94, background: theme.bg, color: theme.text }}>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <img src={logoBabyFoot} alt="" style={{ width: "100%", height: 86, objectFit: "cover", borderRadius: 16, opacity: 0.42, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}` }} />
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", padding: "0 8px" }}>
          <BackDot onClick={goBack} />
          <div style={{ textAlign: "center", fontWeight: 1000, letterSpacing: 1.2, fontSize: 18, textShadow: "0 4px 18px #000" }}>LIGUES BABY-FOOT</div>
          <InfoDot title="LIGUES" body="Deux familles: Saison calendrier, ou Championnat infini amical. Le scope Équipe regroupe volontairement 2v2 et 2v1: même logique de confrontation entre deux camps." />
        </div>
      </div>

      {view === "create" && <CreateLeague theme={theme} go={go} onCancel={() => setView("list")} onCreated={(id) => { refresh(id); setView("detail"); }} />}

      {view === "detail" && selected && (
        <LeagueDetail
          theme={theme}
          league={selected}
          onRefresh={() => refresh(selected.id)}
          onDelete={() => {
            if (window.confirm("Supprimer cette ligue locale ?")) {
              deleteBabyFootLeague(selected.id);
              refresh(null);
              setView("list");
            }
          }}
        />
      )}

      {view === "list" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <button style={primaryBtn(theme)} onClick={() => setView("create")}>＋ NOUVELLE LIGUE</button>
            <button style={ghostBtn(theme)} onClick={() => refresh()}>⟳ RECHARGER</button>
          </div>

          <div style={{ ...panel(theme), marginBottom: 12 }}>
            <div style={sectionTitle(theme)}>Principe validé</div>
            <div style={small(theme)}>
              <b>SOLO</b> = 1v1 uniquement. <b>ÉQUIPE</b> = 2v2 et 2v1 fusionnés, car même avec un joueur seul en face de deux, ça reste une confrontation entre deux équipes/camps.
            </div>
          </div>

          {leagues.length === 0 ? (
            <div style={empty(theme)}>
              <div style={{ fontSize: 34 }}>🏆</div>
              <div style={{ fontWeight: 1000 }}>Aucune ligue créée</div>
              <div style={small(theme)}>Crée une saison classique ou une ligue amicale infinie.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {leagues.map((l) => {
                const standings = computeBabyFootLeagueStandings(l);
                return (
                  <button key={l.id} style={leagueCard(theme)} onClick={() => { setSelectedId(l.id); setView("detail"); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 1000, fontSize: 16 }}>{l.name}</div>
                        <div style={small(theme)}>{kindLabel(l.kind)} • {scopeLabel(l.scope)}</div>
                      </div>
                      <div style={badge(theme)}>{l.participants.length} participants</div>
                    </div>
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      <MiniStat theme={theme} label="MATCHS" value={l.fixtures.filter((f) => f.playedAt).length} />
                      <MiniStat theme={theme} label="LEADER" value={standings[0]?.participant.name || "—"} />
                      <MiniStat theme={theme} label="PTS" value={standings[0]?.points ?? 0} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CreateLeague({ theme, go, onCancel, onCreated }: { theme: any; go: (tab: any, params?: any) => void; onCancel: () => void; onCreated: (id: string) => void }) {
  const draft = React.useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem(LEAGUE_CREATE_DRAFT_KEY) || "null") || {}; } catch { return {}; }
  }, []);
  const [name, setName] = React.useState(draft.name || "Ligue Apéro");
  const [kind, setKind] = React.useState<BabyFootLeagueKind>(draft.kind || "infinite");
  const [scope, setScope] = React.useState<BabyFootLeagueScope>(draft.scope || "team");
  const [format, setFormat] = React.useState<"single" | "double">(draft.format || "single");
  const [participants, setParticipants] = React.useState(draft.participants || DEFAULT_PARTICIPANTS);
  const [showTeamPicker,setShowTeamPicker]=React.useState(false);
  const [teams,setTeams]=React.useState<any[]>(()=>{
    try{
      const raw=localStorage.getItem("babyfoot_teams")||localStorage.getItem("teams_store_v1")||"[]";
      const arr=JSON.parse(raw);
      return Array.isArray(arr)?arr:[];
    }catch{return []}
  });

  React.useEffect(() => {
    sessionStorage.setItem(LEAGUE_CREATE_DRAFT_KEY, JSON.stringify({ name, kind, scope, format, participants }));
  }, [name, kind, scope, format, participants]);

  function persistDraftBeforeTeams() {
    sessionStorage.setItem(LEAGUE_CREATE_DRAFT_KEY, JSON.stringify({ name, kind, scope, format, participants }));
    sessionStorage.setItem(RETURN_TO_LEAGUE_KEY, "1");
  }

  function applyTeams(){
    const names=teams.map((t:any)=>t.name||t.label).filter(Boolean);
    if(names.length) setParticipants(names.join("\n"));
    setShowTeamPicker(false);
  }

  function submit() {
    const lines = participants.split(/\n|,/g).map((s) => s.trim()).filter(Boolean);
    if (lines.length < 2) return alert("Ajoute au moins 2 participants.");
    const league = createBabyFootLeague({ name, kind, scope, format, participants: lines });
    sessionStorage.removeItem(LEAGUE_CREATE_DRAFT_KEY);
    onCreated(league.id);
  }

  return (
    <div style={panel(theme)}>
      <div style={sectionTitle(theme)}>Créer une ligue</div>
      <Label theme={theme} text="Nom" />
      <input value={name} onChange={(e) => setName(e.target.value)} style={input(theme)} />

      <Label theme={theme} text="Type" />
      <div style={choiceGrid}>
        <Choice theme={theme} active={kind === "infinite"} onClick={() => setKind("infinite")} title="INFINIE" sub="Matchs amicaux ajoutés au fil de l’eau" />
        <Choice theme={theme} active={kind === "season"} onClick={() => setKind("season")} title="SAISON" sub="Calendrier généré" />
      </div>

      <Label theme={theme} text="Classement" />
      <div style={choiceGrid}>
        <Choice theme={theme} active={scope === "solo"} onClick={() => setScope("solo")} title="SOLO" sub="1v1 uniquement" />
        <Choice theme={theme} active={scope === "team"} onClick={() => setScope("team")} title="ÉQUIPE" sub="2v2 + 2v1 fusionnés" />
      </div>

      {kind === "season" && (
        <>
          <Label theme={theme} text="Calendrier" />
          <div style={choiceGrid}>
            <Choice theme={theme} active={format === "single"} onClick={() => setFormat("single")} title="ALLER" sub="Une confrontation" />
            <Choice theme={theme} active={format === "double"} onClick={() => setFormat("double")} title="A/R" sub="Aller-retour" />
          </div>
        </>
      )}

      <Label theme={theme} text={scope === "solo" ? "Joueurs" : "Équipes / camps"} />

      {scope==="team" && (
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <button style={{...ghostBtn(theme),flex:1}} onClick={()=>setShowTeamPicker(v=>!v)}>⚽ Sélectionner équipes</button>
        <button style={{...primaryBtn(theme),flex:1}} onClick={()=>{
          persistDraftBeforeTeams();
          go?.("babyfoot_teams");
        }}>＋ Créer équipe</button>
      </div>)}

      {showTeamPicker && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"grid",placeItems:"center",zIndex:99}}>
        <div style={{width:"90%",maxWidth:420,...panel(theme)}}>
          <div style={sectionTitle(theme)}>Équipes existantes</div>
          <div style={{maxHeight:320,overflow:"auto"}}>
            {teams.length?teams.map((t:any,i:number)=><label key={i} style={{display:"block",padding:8}}>
              <input type="checkbox" defaultChecked/> {t.name||t.label}
            </label>):<div style={small(theme)}>Aucune équipe trouvée.</div>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={ghostBtn(theme)} onClick={()=>setShowTeamPicker(false)}>Fermer</button>
            <button style={primaryBtn(theme)} onClick={applyTeams}>Utiliser</button>
          </div>
        </div>
      </div>
      )}
      <textarea value={participants} onChange={(e) => setParticipants(e.target.value)} rows={6} style={{ ...input(theme), resize: "vertical", lineHeight: 1.35 }} />
      <div style={small(theme)}>Un participant par ligne. Pour le 2v1, indique simplement les deux camps/équipes.</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
        <button style={ghostBtn(theme)} onClick={onCancel}>ANNULER</button>
        <button style={primaryBtn(theme)} onClick={submit}>CRÉER</button>
      </div>
    </div>
  );
}

function LeagueDetail({ theme, league, onRefresh, onDelete }: { theme: any; league: BabyFootLeague; onRefresh: () => void; onDelete: () => void }) {
  const rows = computeBabyFootLeagueStandings(league);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={panel(theme)}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 1000, fontSize: 18 }}>{league.name}</div>
            <div style={small(theme)}>{kindLabel(league.kind)} • {scopeLabel(league.scope)}</div>
          </div>
          <button style={dangerBtn(theme)} onClick={onDelete}>SUPPR.</button>
        </div>
      </div>

      <StandingsTable theme={theme} rows={rows} />

      {league.kind === "infinite" ? (
        <ManualMatchForm theme={theme} league={league} onDone={onRefresh} />
      ) : (
        <Calendar theme={theme} league={league} onDone={onRefresh} />
      )}
    </div>
  );
}

function StandingsTable({ theme, rows }: { theme: any; rows: ReturnType<typeof computeBabyFootLeagueStandings> }) {
  return (
    <div style={panel(theme)}>
      <div style={sectionTitle(theme)}>Classement</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620, fontSize: 12 }}>
          <thead><tr>{["#", "Nom", "MJ", "V", "N", "D", "BP", "BC", "+/-", "PTS", "Forme"].map((h) => <th key={h} style={th(theme)}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.participant.id}>
                <td style={td(theme)}>{idx + 1}</td><td style={{ ...td(theme), fontWeight: 1000 }}>{r.participant.name}</td><td style={td(theme)}>{r.played}</td><td style={td(theme)}>{r.wins}</td><td style={td(theme)}>{r.draws}</td><td style={td(theme)}>{r.losses}</td><td style={td(theme)}>{r.goalsFor}</td><td style={td(theme)}>{r.goalsAgainst}</td><td style={td(theme)}>{r.diff}</td><td style={{ ...td(theme), fontWeight: 1000, color: theme.primary }}>{r.points}</td><td style={td(theme)}>{r.form.map((f, i) => <span key={i} style={{ marginRight: 3 }}>{f === "W" ? "🟢" : f === "D" ? "🟡" : "🔴"}</span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManualMatchForm({ theme, league, onDone }: { theme: any; league: BabyFootLeague; onDone: () => void }) {
  const [homeId, setHomeId] = React.useState(league.participants[0]?.id || "");
  const [awayId, setAwayId] = React.useState(league.participants[1]?.id || "");
  const [home, setHome] = React.useState(10);
  const [away, setAway] = React.useState(7);
  return (
    <div style={panel(theme)}>
      <div style={sectionTitle(theme)}>Ajouter un match amical</div>
      <div style={small(theme)}>Cette ligue n’a pas de calendrier. Tous les matchs ajoutés ici alimentent le classement infini.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 72px", gap: 8, marginTop: 10 }}>
        <select value={homeId} onChange={(e) => setHomeId(e.target.value)} style={input(theme)}>{league.participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <input type="number" min={0} value={home} onChange={(e) => setHome(Number(e.target.value))} style={input(theme)} />
        <select value={awayId} onChange={(e) => setAwayId(e.target.value)} style={input(theme)}>{league.participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <input type="number" min={0} value={away} onChange={(e) => setAway(Number(e.target.value))} style={input(theme)} />
      </div>
      <button style={{ ...primaryBtn(theme), marginTop: 10, width: "100%" }} onClick={() => { if (homeId === awayId) return alert("Choisis deux participants différents."); addBabyFootLeagueManualMatch(league.id, homeId, awayId, home, away); onDone(); }}>AJOUTER AU CLASSEMENT</button>
    </div>
  );
}

function Calendar({ theme, league, onDone }: { theme: any; league: BabyFootLeague; onDone: () => void }) {
  const byId = new Map(league.participants.map((p) => [p.id, p.name]));
  const [editing, setEditing] = React.useState<string | null>(null);
  const [a, setA] = React.useState(10);
  const [b, setB] = React.useState(7);
  const rounds = Array.from(new Set(league.fixtures.map((f) => f.round))).sort((x, y) => x - y);
  return (
    <div style={panel(theme)}>
      <div style={sectionTitle(theme)}>Calendrier</div>
      {rounds.map((round) => (
        <div key={round} style={{ marginTop: 10 }}>
          <div style={{ ...small(theme), fontWeight: 1000, color: theme.primary }}>JOURNÉE {round}</div>
          {league.fixtures.filter((f) => f.round === round).map((f) => (
            <div key={f.id} style={fixture(theme)}>
              <div style={{ fontWeight: 900 }}>{byId.get(f.homeId)} <span style={{ color: theme.textSoft }}>vs</span> {byId.get(f.awayId)}</div>
              {editing === f.id ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="number" min={0} value={a} onChange={(e) => setA(Number(e.target.value))} style={{ ...input(theme), width: 58 }} />
                  <input type="number" min={0} value={b} onChange={(e) => setB(Number(e.target.value))} style={{ ...input(theme), width: 58 }} />
                  <button style={primaryBtn(theme)} onClick={() => { setBabyFootFixtureScore(league.id, f.id, a, b); setEditing(null); onDone(); }}>OK</button>
                </div>
              ) : (
                <button style={ghostBtn(theme)} onClick={() => { setEditing(f.id); setA(f.scoreHome ?? 10); setB(f.scoreAway ?? 7); }}>{f.playedAt ? `${f.scoreHome} - ${f.scoreAway}` : "Score"}</button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MiniStat({ theme, label, value }: { theme: any; label: string; value: any }) { return <div style={{ border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}`, borderRadius: 12, padding: 8, background: "rgba(0,0,0,.18)", minWidth: 0 }}><div style={{ fontSize: 10, color: theme.textSoft, fontWeight: 900 }}>{label}</div><div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div></div>; }
function Label({ theme, text }: { theme: any; text: string }) { return <div style={{ ...small(theme), marginTop: 12, marginBottom: 5, fontWeight: 1000 }}>{text}</div>; }
function Choice({ theme, active, onClick, title, sub }: { theme: any; active: boolean; onClick: () => void; title: string; sub: string }) { return <button onClick={onClick} style={{ borderRadius: 14, border: `1px solid ${active ? theme.primary : theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: active ? `${theme.primary}22` : "rgba(255,255,255,.05)", color: theme.text, padding: 10, textAlign: "left", boxShadow: active ? `0 0 18px ${theme.primary}55` : "none" }}><div style={{ fontWeight: 1000 }}>{title}</div><div style={small(theme)}>{sub}</div></button>; }

const choiceGrid: any = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
const panel = (theme: any): React.CSSProperties => ({ border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: theme.card ?? "rgba(255,255,255,.06)", borderRadius: 18, padding: 12, boxShadow: "0 12px 30px rgba(0,0,0,.35)" });
const sectionTitle = (theme: any): React.CSSProperties => ({ fontWeight: 1000, letterSpacing: .7, color: theme.text, marginBottom: 8 });
const small = (theme: any): React.CSSProperties => ({ fontSize: 12, color: theme.textSoft ?? "rgba(255,255,255,.7)", lineHeight: 1.35 });
const input = (theme: any): React.CSSProperties => ({ width: "100%", boxSizing: "border-box", borderRadius: 12, border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: "rgba(0,0,0,.28)", color: theme.text, padding: "10px 11px", fontWeight: 800, outline: "none" });
const primaryBtn = (theme: any): React.CSSProperties => ({ border: `1px solid ${theme.primary}`, background: `${theme.primary}22`, color: theme.text, borderRadius: 14, padding: "10px 12px", fontWeight: 1000, boxShadow: `0 0 18px ${theme.primary}55`, cursor: "pointer" });
const ghostBtn = (theme: any): React.CSSProperties => ({ border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: "rgba(255,255,255,.05)", color: theme.text, borderRadius: 14, padding: "10px 12px", fontWeight: 1000, cursor: "pointer" });
const dangerBtn = (theme: any): React.CSSProperties => ({ border: "1px solid rgba(255,80,80,.45)", background: "rgba(255,80,80,.12)", color: theme.text, borderRadius: 12, padding: "8px 10px", fontWeight: 1000, cursor: "pointer" });
const empty = (theme: any): React.CSSProperties => ({ ...panel(theme), textAlign: "center", padding: 24 });
const leagueCard = (theme: any): React.CSSProperties => ({ ...panel(theme), textAlign: "left", color: theme.text, cursor: "pointer", width: "100%" });
const badge = (theme: any): React.CSSProperties => ({ border: `1px solid ${theme.primary}77`, background: `${theme.primary}18`, borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 1000, whiteSpace: "nowrap" });
const th = (theme: any): React.CSSProperties => ({ textAlign: "left", padding: "7px 6px", color: theme.textSoft, borderBottom: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, fontWeight: 1000 });
const td = (theme: any): React.CSSProperties => ({ padding: "8px 6px", borderBottom: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.08)"}` });
const fixture = (theme: any): React.CSSProperties => ({ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}`, borderRadius: 14, padding: 8, marginTop: 6, background: "rgba(0,0,0,.16)" });
