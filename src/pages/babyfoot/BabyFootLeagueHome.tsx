// =============================================================
// src/pages/babyfoot/BabyFootLeagueHome.tsx
// Ligues Baby-Foot V1
// ✅ Saison calendrier + Championnat infini amical
// ✅ ÉQUIPE = 2v2 + 2v1 fusionnés
// ✅ Sélecteurs réels équipes/profils + draft conservé pendant création équipe
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import tickerBabyFootLigue from "../../assets/tickers/ticker_babyfoot_ligue.png";
import { BABYFOOT_LEAGUE_BADGES } from "../../lib/leagueBadgeAssets";
import {
  addBabyFootLeagueManualMatch,
  computeBabyFootLeagueStandings,
  createBabyFootLeague,
  deleteBabyFootLeague,
  kindLabel,
  loadBabyFootLeagues,
  scopeLabel,
  setBabyFootFixtureScore,
  upsertBabyFootLeague,
  type BabyFootLeague,
  type BabyFootLeagueKind,
  type BabyFootLeagueScope,
} from "../../lib/babyfootLeagueStore";
import { loadBabyFootTeams, type BabyFootTeam } from "../../lib/petanqueTeamsStore";
import {
  resetBabyFoot,
  setMode as setBabyFootMode,
  setTarget as setBabyFootTarget,
  setTeams as setBabyFootTeams,
  setTeamsProfiles as setBabyFootTeamsProfiles,
  setAdvancedOptions as setBabyFootAdvancedOptions,
  startMatch as startBabyFootMatch,
} from "../../lib/babyfootStore";
import {
  deleteBabyFootLeagueOnline,
  getBabyFootLeagueOnlineId,
  publishBabyFootLeagueOnline,
  syncBabyFootLeagueOnline,
  submitBabyFootLeagueOnlineResult,
  listBabyFootOnlineFriends,
  startBabyFootLeagueFixtureOnline,
  type BabyFootLeagueVisibility,
  type BabyFootOnlineFriend,
} from "../../lib/babyfootLeagueOnlineApi";

type Props = { go: (tab: any, params?: any) => void; onBack?: () => void; store?: any; params?: any };

type View = "list" | "create" | "detail";

type LeagueDraft = {
  name: string;
  kind: BabyFootLeagueKind;
  scope: BabyFootLeagueScope;
  format: "single" | "double";
  participants: string;
  logoDataUrl?: string | null;
  selectedTeamIds?: string[];
  selectedProfileIds?: string[];
  onlineAccess?: "none" | "private" | "public";
  participantOnlineLinks?: Record<string, string>;
};

const DEFAULT_PARTICIPANTS = "BSS\nPissette FC\nRicard United\nPastaga Boys";
const DRAFT_KEY = "babyfoot_league_create_draft_v1";
const RETURN_KEY = "babyfoot_league_return_create";

function readDraft(): LeagueDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      name: String(parsed.name || "Ligue Apéro"),
      kind: parsed.kind === "season" ? "season" : "infinite",
      scope: parsed.scope === "solo" ? "solo" : "team",
      format: parsed.format === "double" ? "double" : "single",
      participants: String(parsed.participants || DEFAULT_PARTICIPANTS),
      logoDataUrl: parsed.logoDataUrl || null,
      selectedTeamIds: Array.isArray(parsed.selectedTeamIds) ? parsed.selectedTeamIds.map(String) : [],
      selectedProfileIds: Array.isArray(parsed.selectedProfileIds) ? parsed.selectedProfileIds.map(String) : [],
      onlineAccess: parsed.onlineAccess === "public" ? "public" : parsed.onlineAccess === "private" ? "private" : "none",
      participantOnlineLinks: parsed.participantOnlineLinks && typeof parsed.participantOnlineLinks === "object" ? parsed.participantOnlineLinks : {},
    };
  } catch {
    return null;
  }
}

function writeDraft(draft: LeagueDraft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    sessionStorage.setItem(RETURN_KEY, "1");
  } catch {}
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(RETURN_KEY);
  } catch {}
}

function readProfilesFromStore(store: any) {
  const sources = [store?.profiles, store?.localProfiles, store?.players];
  const map = new Map<string, any>();
  for (const src of sources) {
    if (!Array.isArray(src)) continue;
    for (const p of src) {
      const id = String(p?.id || "").trim();
      const name = String(p?.name || p?.displayName || p?.display_name || "").trim();
      if (!id || !name || p?.isBot) continue;
      if (!map.has(id)) map.set(id, { id, name, avatar: p?.avatarDataUrl || p?.avatarUrl || p?.avatar || null });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}


type HistoryImportCandidate = {
  id: string;
  label: string;
  date: number;
  homeName: string;
  awayName: string;
  scoreHome: number;
  scoreAway: number;
  raw?: any;
};

function normName(v: any) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findParticipantByNameOrRef(league: BabyFootLeague, name: any, ref?: any) {
  const n = normName(name);
  const r = String(ref || "").trim();
  return league.participants.find((p) => (r && (String(p.refId || "") === r || String(p.id) === r)) || normName(p.name) === n) || null;
}

function numberOrNull(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function collectObjects(value: any, out: any[] = [], depth = 0) {
  if (depth > 5 || value == null) return out;
  if (Array.isArray(value)) {
    value.slice(0, 1200).forEach((x) => collectObjects(x, out, depth + 1));
    return out;
  }
  if (typeof value === "object") {
    out.push(value);
    const keys = ["payload", "summary", "match", "result", "data", "record"];
    keys.forEach((k) => {
      if ((value as any)[k] && typeof (value as any)[k] === "object") collectObjects((value as any)[k], out, depth + 1);
    });
  }
  return out;
}

function extractBabyFootHistoryCandidates(store: any, league: BabyFootLeague): HistoryImportCandidate[] {
  const rawSources: any[] = [];
  if (Array.isArray(store?.history)) rawSources.push(...store.history);
  if (Array.isArray(store?.matches)) rawSources.push(...store.matches);

  try {
    if (typeof window !== "undefined") {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i) || "";
        const lk = key.toLowerCase();
        if (!lk.includes("history") && !lk.includes("match") && !lk.includes("babyfoot")) continue;
        const raw = window.localStorage.getItem(key);
        if (!raw || raw.length > 8_000_000) continue;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) rawSources.push(...parsed);
          else if (parsed && typeof parsed === "object") rawSources.push(parsed);
        } catch {}
      }
    }
  } catch {}

  const candidates: HistoryImportCandidate[] = [];
  const signatures = new Set<string>();

  for (const src of rawSources) {
    for (const obj of collectObjects(src)) {
      const blob = JSON.stringify({
        sport: obj?.sport,
        kind: obj?.kind,
        mode: obj?.mode,
        game: obj?.game,
        title: obj?.title,
        summarySport: obj?.summary?.sport,
        payloadSport: obj?.payload?.sport,
      }).toLowerCase();
      const looksBabyFoot =
        blob.includes("babyfoot") ||
        blob.includes("baby-foot") ||
        blob.includes("foos") ||
        String(obj?.sport || obj?.kind || obj?.mode || "").toLowerCase().includes("baby");

      if (!looksBabyFoot) continue;

      const summary = obj?.summary || obj?.payload?.summary || obj?.payload || obj;
      const homeName = obj?.teamA || obj?.homeName || obj?.playerA || obj?.teamHome || summary?.teamA || summary?.homeName || summary?.playerA || summary?.teamAName;
      const awayName = obj?.teamB || obj?.awayName || obj?.playerB || obj?.teamAway || summary?.teamB || summary?.awayName || summary?.playerB || summary?.teamBName;
      const homeRef = obj?.teamARefId || summary?.teamARefId || (Array.isArray(obj?.teamAProfileIds) ? obj.teamAProfileIds[0] : null) || (Array.isArray(summary?.teamAProfileIds) ? summary.teamAProfileIds[0] : null);
      const awayRef = obj?.teamBRefId || summary?.teamBRefId || (Array.isArray(obj?.teamBProfileIds) ? obj.teamBProfileIds[0] : null) || (Array.isArray(summary?.teamBProfileIds) ? summary.teamBProfileIds[0] : null);

      const scoreHome = numberOrNull(obj?.scoreA ?? obj?.homeScore ?? obj?.scoreHome ?? summary?.scoreA ?? summary?.homeScore ?? summary?.scoreHome);
      const scoreAway = numberOrNull(obj?.scoreB ?? obj?.awayScore ?? obj?.scoreAway ?? summary?.scoreB ?? summary?.awayScore ?? summary?.scoreAway);
      if (!homeName || !awayName || scoreHome == null || scoreAway == null) continue;

      const home = findParticipantByNameOrRef(league, homeName, homeRef);
      const away = findParticipantByNameOrRef(league, awayName, awayRef);
      if (!home || !away || home.id === away.id) continue;

      const date = Number(obj?.finishedAt || obj?.playedAt || obj?.updatedAt || obj?.createdAt || summary?.finishedAt || summary?.playedAt || Date.now()) || Date.now();
      const sig = `${home.id}|${away.id}|${scoreHome}|${scoreAway}|${Math.floor(date / 1000)}`;
      if (signatures.has(sig)) continue;
      const alreadyInLeague = league.fixtures.some((f) => f.homeId === home.id && f.awayId === away.id && f.scoreHome === scoreHome && f.scoreAway === scoreAway && Math.abs(Number(f.playedAt || 0) - date) < 2000);
      if (alreadyInLeague) continue;
      signatures.add(sig);
      candidates.push({
        id: String(obj?.id || obj?.matchId || sig),
        label: `${home.name} ${scoreHome} - ${scoreAway} ${away.name}`,
        date,
        homeName: home.name,
        awayName: away.name,
        scoreHome,
        scoreAway,
        raw: obj,
      });
    }
  }

  return candidates.sort((a, b) => b.date - a.date).slice(0, 80);
}

export default function BabyFootLeagueHome({ go, onBack, store, params }: Props) {
  const { theme } = useTheme();
  const [leagues, setLeagues] = React.useState<BabyFootLeague[]>(() => loadBabyFootLeagues());
  const [view, setView] = React.useState<View>(() => {
    const wantsCreate = params?.view === "create" || params?.restoreDraft || (typeof sessionStorage !== "undefined" && sessionStorage.getItem(RETURN_KEY) === "1");
    return wantsCreate ? "create" : "list";
  });
  const [selectedId, setSelectedId] = React.useState<string | null>(() => String(params?.leagueId || leagues[0]?.id || "") || null);

  React.useEffect(() => {
    if (params?.view === "create" || params?.restoreDraft) setView("create");
    if (params?.leagueId) {
      setSelectedId(String(params.leagueId));
      setView("detail");
    }
  }, [params?.view, params?.restoreDraft, params?.leagueId]);

  const selected = leagues.find((l) => l.id === selectedId) || null;

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
    go("tournaments");
  }

  return (
    <div style={{ minHeight: "100vh", padding: 14, paddingBottom: 94, background: theme.bg, color: theme.text }}>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <img
          src={tickerBabyFootLigue}
          alt="Ligue Baby-Foot"
          style={{
            width: "100%",
            aspectRatio: "800 / 230",
            height: "auto",
            objectFit: "contain",
            borderRadius: 16,
            background: "#05070c",
            border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`,
            boxShadow: "0 10px 26px rgba(0,0,0,.35)",
          }}
          draggable={false}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
          <BackDot onClick={goBack} />
          <InfoDot
            title="LIGUES"
            content={
              <div style={{ display: "grid", gap: 12, lineHeight: 1.35 }}>
                <div><strong>Saison calendrier</strong><br />Calendrier généré, journées, scores saisis et classement automatique.</div>
                <div><strong>Championnat infini amical</strong><br />Pas de calendrier fixe : chaque match ajouté manuellement alimente la ligue.</div>
                <div><strong>Classements séparés</strong><br />SOLO = 1v1. ÉQUIPE = 2v2 et 2v1 fusionnés, car ça reste une confrontation entre deux camps.</div>
              </div>
            }
          />
        </div>
      </div>

      {view === "create" && (
        <CreateLeague
          theme={theme}
          go={go}
          store={store}
          onCancel={() => {
            clearDraft();
            setView("list");
          }}
          onCreated={(id) => {
            clearDraft();
            refresh(id);
            setView("detail");
          }}
        />
      )}

      {view === "detail" && selected && (
        <LeagueDetail
          theme={theme}
          go={go}
          store={store}
          league={selected}
          initialTab={params?.tab}
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
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 1000, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</div>
                        <div style={small(theme)}>{kindLabel(l.kind)} • {scopeLabel(l.scope)}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <div style={badge(theme)}>{l.participants.length} participants</div>
                        <button
                          style={iconDangerBtn(theme)}
                          title="Supprimer la ligue"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Supprimer la ligue « ${l.name} » ?`)) {
                              deleteBabyFootLeague(l.id);
                              refresh(null);
                            }
                          }}
                        >🗑</button>
                      </div>
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

function CreateLeague({ theme, go, store, onCancel, onCreated }: { theme: any; go: (tab: any, params?: any) => void; store?: any; onCancel: () => void; onCreated: (id: string) => void }) {
  const draft = React.useMemo(() => readDraft(), []);
  const [name, setName] = React.useState(draft?.name || "Ligue Apéro");
  const [kind, setKind] = React.useState<BabyFootLeagueKind>(draft?.kind || "infinite");
  const [scope, setScope] = React.useState<BabyFootLeagueScope>(draft?.scope || "team");
  const [format, setFormat] = React.useState<"single" | "double">(draft?.format || "single");
  const [participants, setParticipants] = React.useState(draft?.participants || DEFAULT_PARTICIPANTS);
  const [logoDataUrl, setLogoDataUrl] = React.useState<string | null>(draft?.logoDataUrl || null);
  const [selectedTeamIds, setSelectedTeamIds] = React.useState<string[]>(draft?.selectedTeamIds || []);
  const [selectedProfileIds, setSelectedProfileIds] = React.useState<string[]>(draft?.selectedProfileIds || []);
  const [onlineAccess, setOnlineAccess] = React.useState<"none" | "private" | "public">((draft?.onlineAccess as any) || "none");
  const [participantOnlineLinks, setParticipantOnlineLinks] = React.useState<Record<string, string>>(draft?.participantOnlineLinks || {});
  const [onlineFriends, setOnlineFriends] = React.useState<BabyFootOnlineFriend[]>([]);
  const [loadingFriends, setLoadingFriends] = React.useState(false);
  const [showOnlineLinker, setShowOnlineLinker] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [showTeamPicker, setShowTeamPicker] = React.useState(false);
  const [showProfilePicker, setShowProfilePicker] = React.useState(false);
  const [showLogoPicker, setShowLogoPicker] = React.useState(false);
  const [teams, setTeams] = React.useState<BabyFootTeam[]>(() => loadBabyFootTeams());

  const profiles = React.useMemo(() => readProfilesFromStore(store), [store]);

  React.useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") setTeams(loadBabyFootTeams());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const currentDraft: LeagueDraft = { name, kind, scope, format, participants, logoDataUrl, selectedTeamIds, selectedProfileIds, onlineAccess, participantOnlineLinks };

  function saveCurrentDraft() {
    writeDraft(currentDraft);
  }

  function applyTeams(ids = selectedTeamIds) {
    const names = teams.filter((t) => ids.includes(String(t.id))).map((t) => t.name).filter(Boolean);
    if (names.length) setParticipants(names.join("\n"));
    setShowTeamPicker(false);
  }

  function applyProfiles(ids = selectedProfileIds) {
    const names = profiles.filter((p) => ids.includes(String(p.id))).map((p) => p.name).filter(Boolean);
    if (names.length) setParticipants(names.join("\n"));
    setShowProfilePicker(false);
  }

  function draftParticipantNames() {
    if (scope === "team" && selectedTeamIds.length >= 2) return teams.filter((t) => selectedTeamIds.includes(String(t.id))).map((t) => t.name).filter(Boolean);
    if (scope === "solo" && selectedProfileIds.length >= 2) return profiles.filter((p) => selectedProfileIds.includes(String(p.id))).map((p) => p.name).filter(Boolean);
    return participants.split(/\n|,/g).map((s) => s.trim()).filter(Boolean);
  }

  async function openOnlineLinker() {
    setShowOnlineLinker(true);
    if (onlineFriends.length || loadingFriends) return;
    try {
      setLoadingFriends(true);
      setOnlineFriends(await listBabyFootOnlineFriends());
    } catch (error: any) {
      alert(error?.message || "Impossible de charger les amis online. Vérifie que tu es connecté au compte NAS.");
    } finally {
      setLoadingFriends(false);
    }
  }

  function withOnlineLink(entry: any) {
    const name = typeof entry === "string" ? entry : entry?.name;
    const friendId = participantOnlineLinks[String(name || "")];
    const friend = onlineFriends.find((f) => f.userId === friendId || f.id === friendId);
    if (!friendId) return entry;
    const base = typeof entry === "string" ? { name: entry } : { ...entry };
    return {
      ...base,
      onlineUserId: friend?.userId || friendId,
      onlineDisplayName: friend?.displayName || null,
      onlineAvatarUrl: friend?.avatarUrl || null,
      role: "player",
    };
  }

  async function submit() {
    if (creating) return;
    const lines = participants.split(/\n|,/g).map((s) => s.trim()).filter(Boolean);
    let entries: Array<string | { id?: string; name: string; avatarDataUrl?: string | null; logoDataUrl?: string | null; refId?: string | null; onlineUserId?: string | null; onlineDisplayName?: string | null; onlineAvatarUrl?: string | null; role?: string }> = lines;

    if (scope === "team" && selectedTeamIds.length >= 2) {
      entries = teams
        .filter((t) => selectedTeamIds.includes(String(t.id)))
        .map((t) => ({ id: String(t.id), refId: String(t.id), name: t.name, logoDataUrl: t.logoDataUrl ?? t.regionLogoDataUrl ?? null }));
    }
    if (scope === "solo" && selectedProfileIds.length >= 2) {
      entries = profiles
        .filter((p) => selectedProfileIds.includes(String(p.id)))
        .map((p) => ({ id: String(p.id), refId: String(p.id), name: p.name, avatarDataUrl: p.avatar ?? p.avatarUrl ?? p.avatarDataUrl ?? null }));
    }

    if (entries.length < 2) return alert("Ajoute au moins 2 participants.");
    if (onlineAccess !== "none") entries = entries.map(withOnlineLink);
    setCreating(true);
    try {
      let league: any = createBabyFootLeague({ name, kind, scope, format, participants: entries, logoDataUrl });
      if (onlineAccess !== "none") {
        try {
          const remote = await publishBabyFootLeagueOnline({ ...(league as any), visibility: onlineAccess }, onlineAccess as BabyFootLeagueVisibility);
          league = { ...(league as any), ...(remote as any), visibility: onlineAccess };
          upsertBabyFootLeague(league as any);
        } catch (error: any) {
          alert(error?.message || "Ligue créée localement, mais publication online impossible. Vérifie la connexion au NAS / ton compte.");
        }
      }
      onCreated(league.id);
    } finally {
      setCreating(false);
    }
  }

  function goCreateTeam() {
    saveCurrentDraft();
    go("babyfoot_team_edit" as any, { returnTo: "babyfoot_league_create" });
  }

  function goManageTeams() {
    saveCurrentDraft();
    go("babyfoot_teams" as any, { returnTo: "babyfoot_league_create" });
  }

  return (
    <div style={panel(theme)}>
      <div style={sectionTitle(theme)}>Créer une ligue</div>
      <Label theme={theme} text="Nom" />
      <input value={name} onChange={(e) => setName(e.target.value)} style={input(theme)} />

      <Label theme={theme} text="Logo de la ligue" />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 58, height: 58, borderRadius: 999, border: `1px solid ${theme.primary}77`, background: "rgba(255,255,255,.05)", display: "grid", placeItems: "center", overflow: "hidden", boxShadow: `0 0 18px ${theme.primary}33`, flexShrink: 0 }}>
          {logoDataUrl ? <img src={logoDataUrl} alt="Logo ligue" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 24 }}>🏆</span>}
        </div>
        <button type="button" style={{ ...primaryBtn(theme), flex: 1 }} onClick={() => setShowLogoPicker(true)}>CHOISIR DANS LA GALERIE</button>
        <label style={{ ...ghostBtn(theme), textAlign: "center", whiteSpace: "nowrap" }}>
          Import
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setLogoDataUrl(typeof reader.result === "string" ? reader.result : null);
            reader.readAsDataURL(file);
          }} />
        </label>
        {logoDataUrl ? <button type="button" style={iconDangerBtn(theme)} onClick={() => setLogoDataUrl(null)} title="Retirer le logo">×</button> : null}
      </div>
      <div style={{ ...small(theme), marginTop: 6 }}>Galerie intégrée : 25 logos par page, carousel horizontal, sans stocker d’image lourde dans la ligue.</div>

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

      <Label theme={theme} text="Online" />
      <div style={{ ...panel(theme), padding: 10, marginBottom: 10 }}>
        <div style={{ ...small(theme), marginBottom: 8 }}>
          Pour jouer à distance, les joueurs doivent avoir un compte online. Cette option publie la ligue au NAS dès sa création.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          <Choice theme={theme} active={onlineAccess === "none"} onClick={() => setOnlineAccess("none")} title="LOCAL" sub="Appareil" />
          <Choice theme={theme} active={onlineAccess === "private"} onClick={() => setOnlineAccess("private")} title="PRIVÉ" sub="Code" />
          <Choice theme={theme} active={onlineAccess === "public"} onClick={() => setOnlineAccess("public")} title="PUBLIC" sub="Spectateurs" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 8 }}>
          <button type="button" style={onlineAccess === "none" ? ghostBtn(theme) : primaryBtn(theme)} disabled={onlineAccess === "none"} onClick={openOnlineLinker}>
            👥 Associer participants ↔ amis online
          </button>
          <div style={small(theme)}>
            {onlineAccess === "none" ? "Active PRIVÉ ou PUBLIC pour lier des amis online." : `${Object.keys(participantOnlineLinks).filter((k) => participantOnlineLinks[k]).length} liaison(s) online configurée(s).`}
          </div>
        </div>
      </div>

      <Label theme={theme} text={scope === "solo" ? "Joueurs / profils" : "Équipes / camps"} />

      {scope === "team" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <button style={ghostBtn(theme)} onClick={() => { setTeams(loadBabyFootTeams()); setShowTeamPicker(true); }}>⚽ Sélectionner équipes</button>
          <button style={primaryBtn(theme)} onClick={goCreateTeam}>＋ Créer équipe</button>
          <button style={{ ...ghostBtn(theme), gridColumn: "1 / -1" }} onClick={goManageTeams}>Gérer les équipes existantes</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 10 }}>
          <button style={ghostBtn(theme)} onClick={() => setShowProfilePicker(true)}>👤 Sélectionner profils existants</button>
        </div>
      )}

      <textarea value={participants} onChange={(e) => setParticipants(e.target.value)} rows={6} style={{ ...input(theme), resize: "vertical", lineHeight: 1.35 }} />
      <div style={small(theme)}>{scope === "solo" ? "Sélectionne les profils existants ou ajoute un joueur par ligne." : "Sélectionne des équipes existantes ou indique un camp/équipe par ligne. Le 2v1 reste dans le classement ÉQUIPE."}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
        <button style={ghostBtn(theme)} onClick={onCancel}>ANNULER</button>
        <button style={primaryBtn(theme)} disabled={creating} onClick={submit}>{creating ? "CRÉATION..." : "CRÉER"}</button>
      </div>

      {showTeamPicker && (
        <PickerModal
          theme={theme}
          title="Équipes existantes"
          empty="Aucune équipe trouvée. Crée d’abord une équipe puis reviens ici."
          items={teams.map((t) => ({ id: String(t.id), name: t.name || "Équipe", sub: `${Array.isArray(t.playerIds) ? t.playerIds.length : 0} joueur(s)` }))}
          selectedIds={selectedTeamIds}
          onToggle={(id) => setSelectedTeamIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
          onClose={() => setShowTeamPicker(false)}
          onApply={() => applyTeams()}
          extraAction={<button style={primaryBtn(theme)} onClick={goCreateTeam}>＋ Créer une équipe</button>}
        />
      )}


      {showLogoPicker && (
        <LeagueLogoPickerModal
          theme={theme}
          selected={logoDataUrl}
          onClose={() => setShowLogoPicker(false)}
          onPick={(url) => {
            setLogoDataUrl(url);
            setShowLogoPicker(false);
          }}
        />
      )}
      {showProfilePicker && (
        <PickerModal
          theme={theme}
          title="Profils existants"
          empty="Aucun profil local trouvé. Crée d’abord des profils dans l’onglet Profils."
          items={profiles.map((p) => ({ id: String(p.id), name: p.name, sub: "Profil local" }))}
          selectedIds={selectedProfileIds}
          onToggle={(id) => setSelectedProfileIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
          onClose={() => setShowProfilePicker(false)}
          onApply={() => applyProfiles()}
        />
      )}

      {showOnlineLinker && (
        <OnlineFriendsLinkModal
          theme={theme}
          participants={draftParticipantNames()}
          friends={onlineFriends}
          links={participantOnlineLinks}
          loading={loadingFriends}
          onChange={(participantName, userId) => setParticipantOnlineLinks((prev) => ({ ...prev, [participantName]: userId }))}
          onRefresh={async () => {
            try { setLoadingFriends(true); setOnlineFriends(await listBabyFootOnlineFriends()); }
            catch (error: any) { alert(error?.message || "Impossible de charger les amis online."); }
            finally { setLoadingFriends(false); }
          }}
          onClose={() => setShowOnlineLinker(false)}
        />
      )}
    </div>
  );
}


function LeagueLogoPickerModal({ theme, selected, onPick, onClose }: { theme: any; selected?: string | null; onPick: (url: string) => void; onClose: () => void }) {
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(BABYFOOT_LEAGUE_BADGES.length / pageSize));
  const selectedIndex = selected ? BABYFOOT_LEAGUE_BADGES.findIndex((url) => url === selected) : -1;
  const [page, setPage] = React.useState(() => selectedIndex >= 0 ? Math.floor(selectedIndex / pageSize) : 0);
  const start = page * pageSize;
  const badges = BABYFOOT_LEAGUE_BADGES.slice(start, start + pageSize);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", display: "grid", placeItems: "center", zIndex: 10000, padding: 14 }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 560, maxHeight: "86vh", overflow: "hidden", ...panel(theme), padding: 12 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...sectionTitle(theme), marginBottom: 2 }}>Choisir le logo de ligue</div>
            <div style={small(theme)}>Page {page + 1}/{totalPages} · 25 logos max par page</div>
          </div>
          <button type="button" style={iconDangerBtn(theme)} onClick={onClose} title="Fermer">×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "34px 1fr 34px", gap: 8, alignItems: "center" }}>
          <button type="button" disabled={!canPrev} style={{ ...carouselBtn(theme), opacity: canPrev ? 1 : .35 }} onClick={() => setPage((p) => Math.max(0, p - 1))}>‹</button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, maxHeight: "62vh", overflowY: "auto", padding: 2 }}>
            {badges.map((url, idx) => {
              const active = selected === url;
              const n = start + idx + 1;
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => onPick(url)}
                  title={`Logo ligue ${n}`}
                  style={{
                    aspectRatio: "1 / 1",
                    borderRadius: 999,
                    border: `2px solid ${active ? theme.primary : theme.borderSoft ?? "rgba(255,255,255,.16)"}`,
                    background: active ? `${theme.primary}20` : "rgba(255,255,255,.04)",
                    boxShadow: active ? `0 0 20px ${theme.primary}88` : "0 10px 20px rgba(0,0,0,.25)",
                    padding: 3,
                    cursor: "pointer",
                    overflow: "hidden",
                  }}
                >
                  <img src={url} alt={`Logo ligue ${n}`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 999, display: "block" }} />
                </button>
              );
            })}
          </div>
          <button type="button" disabled={!canNext} style={{ ...carouselBtn(theme), opacity: canNext ? 1 : .35 }} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>›</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
          <button type="button" style={ghostBtn(theme)} onClick={onClose}>ANNULER</button>
          <button type="button" style={primaryBtn(theme)} onClick={() => selected ? onClose() : onPick(BABYFOOT_LEAGUE_BADGES[0])}>VALIDER</button>
        </div>
      </div>
    </div>
  );
}

function PickerModal({ theme, title, empty, items, selectedIds, onToggle, onClose, onApply, extraAction }: { theme: any; title: string; empty: string; items: Array<{ id: string; name: string; sub?: string }>; selectedIds: string[]; onToggle: (id: string) => void; onClose: () => void; onApply: () => void; extraAction?: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", display: "grid", placeItems: "center", zIndex: 9999, padding: 16 }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 440, maxHeight: "78vh", overflow: "auto", ...panel(theme) }} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...sectionTitle(theme), fontSize: 18 }}>{title}</div>
        {items.length ? (
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {items.map((it) => {
              const checked = selectedIds.includes(it.id);
              return (
                <button key={it.id} onClick={() => onToggle(it.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, borderRadius: 14, border: `1px solid ${checked ? theme.primary : theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: checked ? `${theme.primary}18` : "rgba(255,255,255,.05)", color: theme.text, padding: 10, textAlign: "left" }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
                    {it.sub ? <span style={small(theme)}>{it.sub}</span> : null}
                  </span>
                  <span style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${checked ? theme.primary : theme.borderSoft ?? "rgba(255,255,255,.14)"}`, color: checked ? theme.primary : theme.textSoft }}>{checked ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ ...small(theme), marginTop: 8 }}>{empty}</div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: extraAction ? "1fr 1fr" : "1fr 1fr", gap: 8, marginTop: 12 }}>
          <button style={ghostBtn(theme)} onClick={onClose}>Fermer</button>
          <button style={primaryBtn(theme)} onClick={onApply}>Utiliser</button>
          {extraAction ? <div style={{ gridColumn: "1 / -1" }}>{extraAction}</div> : null}
        </div>
      </div>
    </div>
  );
}


function OnlineFriendsLinkModal({ theme, participants, friends, links, loading, onChange, onRefresh, onClose }: { theme: any; participants: string[]; friends: BabyFootOnlineFriend[]; links: Record<string, string>; loading: boolean; onChange: (participantName: string, userId: string) => void; onRefresh: () => void; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.68)", display: "grid", placeItems: "center", zIndex: 10010, padding: 16 }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 520, maxHeight: "82vh", overflow: "auto", ...panel(theme) }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <div style={{ ...sectionTitle(theme), fontSize: 18 }}>Associer aux amis online</div>
            <div style={small(theme)}>Chaque participant local peut être lié à un compte ami. Cette liaison donnera le droit de jouer ses matchs de ligue depuis un autre appareil.</div>
          </div>
          <button type="button" style={iconDangerBtn(theme)} onClick={onClose}>×</button>
        </div>
        <button type="button" style={{ ...ghostBtn(theme), width: "100%", marginTop: 10 }} onClick={onRefresh} disabled={loading}>{loading ? "Chargement..." : "⟳ Recharger mes amis"}</button>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {participants.map((name) => (
            <div key={name} style={{ border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, borderRadius: 14, padding: 10, background: "rgba(255,255,255,.04)" }}>
              <div style={{ fontWeight: 1000, color: theme.primary, marginBottom: 6, textTransform: "uppercase" }}>{name}</div>
              <select value={links[name] || ""} onChange={(e) => onChange(name, e.target.value)} style={input(theme)}>
                <option value="">Profil local seulement</option>
                {friends.map((f) => <option key={f.userId} value={f.userId}>{f.displayName}{f.status ? ` · ${f.status}` : ""}</option>)}
              </select>
            </div>
          ))}
          {!participants.length ? <div style={small(theme)}>Aucun participant à lier pour l’instant.</div> : null}
          {!friends.length && !loading ? <div style={{ ...small(theme), border: `1px dashed ${theme.borderSoft ?? "rgba(255,255,255,.16)"}`, borderRadius: 14, padding: 10 }}>Aucun ami online trouvé. Ajoute d’abord des amis dans la page Online/Amis.</div> : null}
        </div>
        <button type="button" style={{ ...primaryBtn(theme), width: "100%", marginTop: 12 }} onClick={onClose}>VALIDER LES LIAISONS</button>
      </div>
    </div>
  );
}

function LeagueDetail({ theme, go, store, league, initialTab, onRefresh, onDelete }: { theme: any; go: (tab: any, params?: any) => void; store?: any; league: BabyFootLeague; initialTab?: any; onRefresh: () => void; onDelete: () => void }) {
  type LeagueTab = "calendar" | "results" | "standings" | "stats";
  const normalizeTab = (value: any): LeagueTab => {
    if (league.kind === "infinite" && value === "calendar") return "results";
    return value === "results" || value === "standings" || value === "calendar" || value === "stats" ? value : (league.kind === "infinite" ? "results" : "calendar");
  };
  const [tab, setTab] = React.useState<LeagueTab>(() => normalizeTab(initialTab));

  React.useEffect(() => {
    setTab(normalizeTab(initialTab || tab));
  }, [initialTab, league.id, league.kind]);
  const rows = computeBabyFootLeagueStandings(league);
  const playedCount = league.fixtures.filter((f) => f.playedAt).length;
  const upcomingCount = league.fixtures.filter((f) => !f.playedAt).length;
  const leader = rows[0]?.participant.name || "—";
  const highlights = React.useMemo(() => buildLeagueHighlights(rows), [rows]);
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  React.useEffect(() => {
    if (highlights.length <= 1) return;
    const timer = window.setInterval(() => setHighlightIndex((i) => (i + 1) % highlights.length), 2800);
    return () => window.clearInterval(timer);
  }, [highlights.length]);
  const profiles = React.useMemo(() => readProfilesFromStore(store), [store]);
  const teams = React.useMemo(() => loadBabyFootTeams(), []);
  const byId = React.useMemo(() => new Map(league.participants.map((p) => [p.id, p])), [league.participants]);

  function findProfile(participant: any) {
    const pid = String(participant?.refId || participant?.id || "");
    const n = String(participant?.name || "").trim().toLowerCase();
    return profiles.find((p: any) => String(p.id) === pid) || profiles.find((p: any) => String(p.name || "").trim().toLowerCase() === n) || null;
  }

  function findTeam(participant: any) {
    const pid = String(participant?.refId || participant?.id || "");
    const n = String(participant?.name || "").trim().toLowerCase();
    return teams.find((t: any) => String(t.id) === pid) || teams.find((t: any) => String(t.name || "").trim().toLowerCase() === n) || null;
  }

  function participantAvatar(participant: any) {
    if (!participant) return null;
    if (participant.avatarDataUrl) return participant.avatarDataUrl;
    const tm = findTeam(participant);
    if (tm?.logoDataUrl || tm?.regionLogoDataUrl) return tm.logoDataUrl || tm.regionLogoDataUrl;
    const pr = findProfile(participant);
    return pr?.avatar || pr?.avatarUrl || pr?.avatarDataUrl || null;
  }

  async function launchFixture(fixture: BabyFootLeague["fixtures"][number]) {
    const home = byId.get(fixture.homeId);
    const away = byId.get(fixture.awayId);
    if (!home || !away || fixture.playedAt) return;
    const onlineIdForFixture = getBabyFootLeagueOnlineId(league as any);
    const hasOnlinePlayers = !!((home as any)?.onlineUserId || (away as any)?.onlineUserId);
    if (onlineIdForFixture && hasOnlinePlayers) {
      try {
        setOnlineBusy(true);
        setOnlineMessage(null);
        const res: any = await startBabyFootLeagueFixtureOnline(league as any, fixture.id);
        const code = String(res?.lobbyCode || res?.lobby?.code || "").trim();
        setOnlineMessage(code ? `Salon Baby-Foot créé : ${code}` : "Salon Baby-Foot créé.");
        go("online" as any, { lobbyCode: code, onlineMode: "babyfoot", mode: "babyfoot", source: "babyfoot_league", leagueId: league.id, fixtureId: fixture.id });
        return;
      } catch (error: any) {
        setOnlineMessage(error?.message || "Impossible de créer le salon online. Lancement local conservé.");
      } finally {
        setOnlineBusy(false);
      }
    }
    const homeTeam = findTeam(home);
    const awayTeam = findTeam(away);
    const homeProfile = findProfile(home);
    const awayProfile = findProfile(away);
    resetBabyFoot();
    setBabyFootMode((league.scope === "solo" ? "1v1" : "2v2") as any);
    setBabyFootTeams(home.name, away.name, {
      teamARefId: homeTeam?.id ?? null,
      teamBRefId: awayTeam?.id ?? null,
      teamALogoDataUrl: participantAvatar(home),
      teamBLogoDataUrl: participantAvatar(away),
    });
    setBabyFootTeamsProfiles(
      league.scope === "solo" ? (homeProfile?.id ? [String(homeProfile.id)] : []) : (Array.isArray(homeTeam?.playerIds) ? homeTeam.playerIds : []),
      league.scope === "solo" ? (awayProfile?.id ? [String(awayProfile.id)] : []) : (Array.isArray(awayTeam?.playerIds) ? awayTeam.playerIds : [])
    );
    setBabyFootTarget(10);
    setBabyFootAdvancedOptions({ setsEnabled: false, rulesPreset: "competition" as any, allowDrawOnTimeEnd: true });
    startBabyFootMatch();
    go("babyfoot_play" as any, { leagueId: league.id, fixtureId: fixture.id, fromLeague: true });
  }

  const [onlineBusy, setOnlineBusy] = React.useState(false);
  const [onlineMessage, setOnlineMessage] = React.useState<string | null>(null);
  const onlineId = getBabyFootLeagueOnlineId(league as any);
  const onlineVisibility = ((league as any).visibility === "public" ? "public" : "private") as BabyFootLeagueVisibility;

  async function publishOrSyncOnline(visibility?: BabyFootLeagueVisibility) {
    try {
      setOnlineBusy(true);
      setOnlineMessage(null);
      const nextVisibility = visibility || onlineVisibility;
      const remote = onlineId
        ? await syncBabyFootLeagueOnline({ ...(league as any), visibility: nextVisibility }, nextVisibility)
        : await publishBabyFootLeagueOnline({ ...(league as any), visibility: nextVisibility }, nextVisibility);
      upsertBabyFootLeague({ ...(league as any), ...(remote as any), visibility: nextVisibility } as any);
      setOnlineMessage(nextVisibility === "public" ? "Ligue publiée en public." : "Ligue publiée en privé.");
      onRefresh();
    } catch (error: any) {
      setOnlineMessage(error?.message || "Erreur publication online.");
    } finally {
      setOnlineBusy(false);
    }
  }

  async function removeOnline() {
    if (!onlineId) return;
    if (!confirm("Retirer cette ligue du online ? La ligue locale sera conservée.")) return;
    try {
      setOnlineBusy(true);
      setOnlineMessage(null);
      await deleteBabyFootLeagueOnline(league as any);
      const next = { ...(league as any), onlineId: null, online: null, visibility: undefined, shareCode: null };
      upsertBabyFootLeague(next as any);
      setOnlineMessage("Ligue retirée du online.");
      onRefresh();
    } catch (error: any) {
      setOnlineMessage(error?.message || "Erreur suppression online.");
    } finally {
      setOnlineBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: 10, height: "calc(100vh - 218px)", minHeight: 430, overflow: "hidden" }}>
      <div style={{ ...panel(theme), padding: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 42, height: 42, borderRadius: 999, border: `1px solid ${theme.primary}77`, background: "rgba(255,255,255,.05)", display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0, boxShadow: `0 0 18px ${theme.primary}33` }}>
              {league.logoDataUrl ? <img src={league.logoDataUrl} alt={league.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>🏆</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 1000, fontSize: 18, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{league.name}</div>
              <div style={small(theme)}>{kindLabel(league.kind)} • {scopeLabel(league.scope)}</div>
            </div>
          </div>
          <IconTrashButton theme={theme} onClick={onDelete} title="Supprimer la ligue" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 10 }}>
          <MiniStat theme={theme} label="JOUÉS" value={playedCount} />
          <MiniStat theme={theme} label={league.kind === "season" ? "À VENIR" : "MATCHS"} value={league.kind === "season" ? upcomingCount : playedCount} />
          <HighlightMiniStat theme={theme} item={highlights[highlightIndex % Math.max(1, highlights.length)]} getAvatar={participantAvatar} index={highlightIndex} fallback={leader} />
        </div>
        <OnlineLeagueControls
          theme={theme}
          league={league as any}
          busy={onlineBusy}
          message={onlineMessage}
          onPublishPrivate={() => publishOrSyncOnline("private")}
          onPublishPublic={() => publishOrSyncOnline("public")}
          onSync={() => publishOrSyncOnline(onlineVisibility)}
          onRemove={removeOnline}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: league.kind === "infinite" ? "repeat(3, 1fr)" : "repeat(4, 1fr)", gap: 8 }}>
        {league.kind !== "infinite" ? <TabButton theme={theme} active={tab === "calendar"} onClick={() => setTab("calendar")} label="Calendrier" /> : null}
        <TabButton theme={theme} active={tab === "results"} onClick={() => setTab("results")} label="Résultats" />
        <TabButton theme={theme} active={tab === "standings"} onClick={() => setTab("standings")} label="Classement" />
        <TabButton theme={theme} active={tab === "stats"} onClick={() => setTab("stats")} label="Stats" />
      </div>

      <div style={{ minHeight: 0, overflow: "hidden" }}>
        {tab === "calendar" && league.kind !== "infinite" && <CalendarPane theme={theme} league={league} getAvatar={participantAvatar} onLaunch={launchFixture} />}
        {tab === "results" && <ResultsPane theme={theme} store={store} league={league} getAvatar={participantAvatar} onDone={onRefresh} />}
        {tab === "standings" && <StandingsPane theme={theme} rows={rows} getAvatar={participantAvatar} />}
        {tab === "stats" && <LeagueStatsPane theme={theme} league={league} rows={rows} getAvatar={participantAvatar} />}
      </div>
    </div>
  );
}



function OnlineLeagueControls({
  theme,
  league,
  busy,
  message,
  onPublishPrivate,
  onPublishPublic,
  onSync,
  onRemove,
}: {
  theme: any;
  league: BabyFootLeague & any;
  busy: boolean;
  message: string | null;
  onPublishPrivate: () => void;
  onPublishPublic: () => void;
  onSync: () => void;
  onRemove: () => void;
}) {
  const onlineId = getBabyFootLeagueOnlineId(league);
  const visibility = league.visibility === "public" ? "public" : "private";
  return (
    <div style={{ marginTop: 10, border: `1px solid ${onlineId ? theme.primary + "77" : theme.borderSoft ?? "rgba(255,255,255,.14)"}`, borderRadius: 14, padding: 8, background: onlineId ? `${theme.primary}10` : "rgba(255,255,255,.035)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 1000, color: onlineId ? theme.primary : theme.textSoft }}>
            {onlineId ? `ONLINE ${visibility === "public" ? "PUBLIC" : "PRIVÉ"}` : "ONLINE NON PUBLIÉ"}
          </div>
          <div style={{ ...small(theme), fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {onlineId ? `Code: ${league.shareCode || "—"}` : "Publie la ligue pour partage, spectateurs, forum et résultats distants."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {onlineId ? (
            <>
              <button type="button" disabled={busy} style={{ ...ghostBtn(theme), padding: "8px 9px", fontSize: 11 }} onClick={onSync}>SYNC</button>
              <button type="button" disabled={busy} style={{ ...dangerBtn(theme), padding: "8px 9px", fontSize: 11 }} onClick={onRemove}>OFF</button>
            </>
          ) : (
            <>
              <button type="button" disabled={busy} style={{ ...ghostBtn(theme), padding: "8px 9px", fontSize: 11 }} onClick={onPublishPrivate}>PRIVÉ</button>
              <button type="button" disabled={busy} style={{ ...primaryBtn(theme), padding: "8px 9px", fontSize: 11 }} onClick={onPublishPublic}>PUBLIC</button>
            </>
          )}
        </div>
      </div>
      {message ? <div style={{ ...small(theme), color: message.toLowerCase().includes("erreur") ? "#ff8080" : theme.primary, marginTop: 6, fontWeight: 900 }}>{message}</div> : null}
    </div>
  );
}


function IconTrashButton({ theme, onClick, title }: { theme: any; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      title={title || "Supprimer"}
      aria-label={title || "Supprimer"}
      onClick={onClick}
      style={{
        width: 54,
        height: 54,
        borderRadius: 18,
        border: "1px solid rgba(255,80,80,.45)",
        background: "linear-gradient(135deg, rgba(255,80,80,.18), rgba(0,0,0,.22))",
        color: theme.text,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        boxShadow: "0 0 18px rgba(255,80,80,.20), inset 0 0 18px rgba(255,255,255,.03)",
        cursor: "pointer",
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ filter: "drop-shadow(0 0 7px rgba(255,255,255,.35))" }}>
        <path d="M9 4h6l.8 2H20" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 6h16" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M7.5 9l.8 10.2c.08 1.02.92 1.8 1.94 1.8h3.52c1.02 0 1.86-.78 1.94-1.8L16.5 9" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10.2 11.2v6M13.8 11.2v6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      </svg>
    </button>
  );
}

type LeagueHighlight = {
  label: string;
  value: React.ReactNode;
  participant?: any;
  color: string;
};

function buildLeagueHighlights(rows: ReturnType<typeof computeBabyFootLeagueStandings>): LeagueHighlight[] {
  if (!rows.length) return [];
  const playedRows = rows.filter((r) => r.played > 0);
  const best = <T,>(items: T[], fn: (x: T) => number, fallback = rows[0] as any) => {
    if (!items.length) return fallback;
    return [...items].sort((a, b) => fn(b) - fn(a))[0] as any;
  };
  const bestLow = <T,>(items: T[], fn: (x: T) => number, fallback = rows[0] as any) => {
    if (!items.length) return fallback;
    return [...items].sort((a, b) => fn(a) - fn(b))[0] as any;
  };
  const leader = rows[0];
  const attack = best(playedRows, (r: any) => r.goalsFor);
  const defense = bestLow(playedRows, (r: any) => r.goalsAgainst);
  const diff = best(playedRows, (r: any) => r.diff);
  const winSeries = best(playedRows, (r: any) => countTrailingForm(r.form, "W"));
  const lossSeries = best(playedRows, (r: any) => countTrailingForm(r.form, "L"));
  return [
    { label: "LEADER", value: `${leader.points} pts`, participant: leader.participant, color: "#f9c74f" },
    { label: "MEILLEURE ATT", value: `${attack.goalsFor} BP`, participant: attack.participant, color: "#ff7a2f" },
    { label: "MEILLEURE DEF", value: `${defense.goalsAgainst} BC`, participant: defense.participant, color: "#4fd1ff" },
    { label: "SÉRIE V", value: `${countTrailingForm(winSeries.form, "W")} V`, participant: winSeries.participant, color: "#8cff00" },
    { label: "SÉRIE D", value: `${countTrailingForm(lossSeries.form, "L")} D`, participant: lossSeries.participant, color: "#ff4f6d" },
    { label: "MEILLEURE DIFF", value: `${diff.diff > 0 ? "+" : ""}${diff.diff}`, participant: diff.participant, color: "#c77dff" },
  ];
}

function countTrailingForm(form: Array<"W" | "D" | "L"> | undefined, target: "W" | "D" | "L") {
  if (!Array.isArray(form) || !form.length) return 0;
  let n = 0;
  for (let i = form.length - 1; i >= 0; i--) {
    if (form[i] !== target) break;
    n++;
  }
  return n;
}

function HighlightMiniStat({ theme, item, getAvatar, index, fallback }: { theme: any; item?: LeagueHighlight; getAvatar: (p: any) => string | null; index: number; fallback: string }) {
  const participant = item?.participant;
  const avatar = participant ? getAvatar(participant) : null;
  const color = item?.color || theme.primary;
  return (
    <div
      key={`${item?.label || "leader"}-${index}`}
      style={{
        position: "relative",
        overflow: "hidden",
        border: `1px solid ${color}88`,
        borderRadius: 12,
        padding: 8,
        minWidth: 0,
        minHeight: 48,
        background: `linear-gradient(135deg, ${color}20, rgba(0,0,0,.25))`,
        boxShadow: `0 0 20px ${color}55, inset 0 0 18px rgba(255,255,255,.03)`,
        transition: "box-shadow .25s ease, border-color .25s ease",
      }}
    >
      {avatar ? <img src={avatar} alt="" aria-hidden="true" style={{ position: "absolute", right: -8, bottom: -12, width: 58, height: 58, borderRadius: 999, objectFit: "cover", opacity: .24, pointerEvents: "none" }} /> : null}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 9, color: theme.textSoft, fontWeight: 1000, whiteSpace: "nowrap" }}>{item?.label || "LEADER"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, minWidth: 0 }}>
          {avatar ? <img src={avatar} alt="" style={{ width: 24, height: 24, borderRadius: 999, objectFit: "cover", border: `1px solid ${color}` }} /> : null}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 1100, lineHeight: 1.05, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{participant?.name || fallback || "—"}</div>
            <div style={{ fontSize: 10, color, fontWeight: 1000 }}>{item?.value || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeagueStatsPane({ theme, league, rows, getAvatar }: { theme: any; league: BabyFootLeague; rows: ReturnType<typeof computeBabyFootLeagueStandings>; getAvatar: (p: any) => string | null }) {
  const played = league.fixtures.filter((f) => f.playedAt);
  const totalGoals = played.reduce((sum, f) => sum + Number(f.scoreHome || 0) + Number(f.scoreAway || 0), 0);
  const biggestScore = played.reduce((best, f) => {
    const total = Number(f.scoreHome || 0) + Number(f.scoreAway || 0);
    return !best || total > best.total ? { fixture: f, total } : best;
  }, null as null | { fixture: BabyFootLeague["fixtures"][number]; total: number });
  const biggestGap = played.reduce((best, f) => {
    const gap = Math.abs(Number(f.scoreHome || 0) - Number(f.scoreAway || 0));
    return !best || gap > best.gap ? { fixture: f, gap } : best;
  }, null as null | { fixture: BabyFootLeague["fixtures"][number]; gap: number });
  const byId = new Map(league.participants.map((p) => [p.id, p]));
  const highlights = buildLeagueHighlights(rows);

  return (
    <ScrollPane theme={theme}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={panel(theme)}>
          <div style={sectionTitle(theme)}>Stats de ligue</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            <MiniStat theme={theme} label="MATCHS" value={played.length} />
            <MiniStat theme={theme} label="BUTS" value={totalGoals} />
            <MiniStat theme={theme} label="MOY/MATCH" value={played.length ? (totalGoals / played.length).toFixed(1) : "0.0"} />
          </div>
        </div>

        <div style={panel(theme)}>
          <div style={sectionTitle(theme)}>Records</div>
          <div style={{ display: "grid", gap: 8 }}>
            {highlights.map((h, i) => (
              <div key={`${h.label}-${i}`} style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", alignItems: "center", gap: 10, border: `1px solid ${h.color}55`, borderRadius: 14, padding: 8, background: `${h.color}10` }}>
                <AvatarMedal theme={theme} name={h.participant?.name || "—"} src={h.participant ? getAvatar(h.participant) : null} size={38} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: theme.textSoft, fontWeight: 1000 }}>{h.label}</div>
                  <div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.participant?.name || "—"}</div>
                </div>
                <div style={{ color: h.color, fontWeight: 1100 }}>{h.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={panel(theme)}>
          <div style={sectionTitle(theme)}>Records matchs</div>
          <div style={{ display: "grid", gap: 8 }}>
            <RecordMatchLine theme={theme} label="Plus gros score cumulé" item={biggestScore?.fixture} value={biggestScore ? `${biggestScore.total} buts` : "—"} byId={byId} />
            <RecordMatchLine theme={theme} label="Plus gros écart" item={biggestGap?.fixture} value={biggestGap ? `${biggestGap.gap} buts` : "—"} byId={byId} />
          </div>
        </div>
      </div>
    </ScrollPane>
  );
}

function RecordMatchLine({ theme, label, item, value, byId }: { theme: any; label: string; item?: BabyFootLeague["fixtures"][number]; value: string; byId: Map<string, any> }) {
  const home = item ? byId.get(item.homeId)?.name : "—";
  const away = item ? byId.get(item.awayId)?.name : "—";
  return (
    <div style={{ border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}`, borderRadius: 14, padding: 8, background: "rgba(0,0,0,.16)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ ...small(theme), fontWeight: 1000 }}>{label}</div>
        <div style={{ color: theme.primary, fontWeight: 1100 }}>{value}</div>
      </div>
      <div style={{ marginTop: 4, fontWeight: 900 }}>{home} {item ? `${item.scoreHome} - ${item.scoreAway}` : ""} {away}</div>
    </div>
  );
}

function TabButton({ theme, active, onClick, label }: { theme: any; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${active ? theme.primary : theme.borderSoft ?? "rgba(255,255,255,.14)"}`,
        background: active ? `${theme.primary}24` : "rgba(255,255,255,.05)",
        color: active ? theme.text : theme.textSoft ?? theme.text,
        borderRadius: 14,
        padding: "10px 6px",
        fontWeight: 1000,
        fontSize: 12,
        boxShadow: active ? `0 0 18px ${theme.primary}55` : "none",
        cursor: "pointer",
      }}
    >{label}</button>
  );
}

function ScrollPane({ theme, children }: { theme: any; children: React.ReactNode }) {
  return <div style={{ height: "100%", overflowY: "auto", overflowX: "hidden", paddingRight: 2, WebkitOverflowScrolling: "touch" }}>{children}</div>;
}

function CalendarPane({ theme, league, getAvatar, onLaunch }: { theme: any; league: BabyFootLeague; getAvatar: (p: any) => string | null; onLaunch: (f: BabyFootLeague["fixtures"][number]) => void }) {
  const upcoming = league.fixtures.filter((f) => !f.playedAt);
  const rounds = Array.from(new Set(upcoming.map((f) => f.round))).sort((x, y) => x - y);

  return (
    <ScrollPane theme={theme}>
      <div style={{ ...panel(theme), minHeight: "100%" }}>
        <div style={sectionTitle(theme)}>Calendrier</div>
        {league.kind === "infinite" ? (
          <div style={emptyCompact(theme)}>
            <div style={{ fontSize: 28 }}>♾️</div>
            <div style={{ fontWeight: 1000 }}>Championnat infini</div>
            <div style={small(theme)}>Pas de calendrier fixe : ajoute les matchs dans l’onglet Résultats.</div>
          </div>
        ) : upcoming.length === 0 ? (
          <div style={emptyCompact(theme)}>
            <div style={{ fontSize: 28 }}>✅</div>
            <div style={{ fontWeight: 1000 }}>Tous les matchs sont joués</div>
            <div style={small(theme)}>Les scores sont disponibles dans Résultats.</div>
          </div>
        ) : (
          rounds.map((round) => (
            <RoundBlock key={round} theme={theme} league={league} round={round} fixtures={upcoming.filter((f) => f.round === round)} getAvatar={getAvatar} onLaunch={onLaunch} />
          ))
        )}
      </div>
    </ScrollPane>
  );
}

function ResultsPane({ theme, store, league, getAvatar, onDone }: { theme: any; store?: any; league: BabyFootLeague; getAvatar: (p: any) => string | null; onDone: () => void }) {
  const played = [...league.fixtures].filter((f) => f.playedAt).sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0));
  const byId = new Map(league.participants.map((p) => [p.id, p]));

  return (
    <ScrollPane theme={theme}>
      <div style={{ display: "grid", gap: 10 }}>
        {league.kind === "infinite" && <ManualMatchForm theme={theme} league={league} onDone={onDone} />}
        {league.kind === "infinite" && <HistoryImportPanel theme={theme} store={store} league={league} onDone={onDone} />}
        <div style={panel(theme)}>
          <div style={sectionTitle(theme)}>Résultats</div>
          {played.length === 0 ? (
            <div style={emptyCompact(theme)}>
              <div style={{ fontSize: 28 }}>📝</div>
              <div style={{ fontWeight: 1000 }}>Aucun résultat</div>
              <div style={small(theme)}>{league.kind === "infinite" ? "Ajoute le premier match ci-dessus." : "Saisis les scores depuis l’onglet Calendrier."}</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {played.map((f) => (
                <ResultCard key={f.id} theme={theme} home={byId.get(f.homeId)} away={byId.get(f.awayId)} getAvatar={getAvatar} homeScore={f.scoreHome ?? 0} awayScore={f.scoreAway ?? 0} round={f.round} source={f.source} playedAt={f.playedAt} />
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollPane>
  );
}

function StandingsPane({ theme, rows, getAvatar }: { theme: any; rows: ReturnType<typeof computeBabyFootLeagueStandings>; getAvatar: (p: any) => string | null }) {
  return (
    <ScrollPane theme={theme}>
      <div style={panel(theme)}>
        <div style={sectionTitle(theme)}>Classement</div>
        {rows.length === 0 ? (
          <div style={emptyCompact(theme)}>
            <div style={{ fontSize: 28 }}>📊</div>
            <div style={{ fontWeight: 1000 }}>Aucun participant</div>
          </div>
        ) : (
          <div style={{ border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}`, borderRadius: 16, overflowX: "auto", overflowY: "hidden", background: "rgba(0,0,0,.18)", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,.05)" }}>
                  <th style={{ ...th(theme), width: 22, textAlign: "center" }}>#</th>
                  <th style={{ ...th(theme), width: 34, textAlign: "center" }}>Logo</th>
                  <th style={{ ...th(theme), width: 24, textAlign: "center" }}>MJ</th>
                  <th style={{ ...th(theme), width: 18, textAlign: "center" }}>V</th>
                  <th style={{ ...th(theme), width: 18, textAlign: "center" }}>N</th>
                  <th style={{ ...th(theme), width: 18, textAlign: "center" }}>D</th>
                  <th style={{ ...th(theme), width: 24, textAlign: "center" }}>BP</th>
                  <th style={{ ...th(theme), width: 24, textAlign: "center" }}>BC</th>
                  <th style={{ ...th(theme), width: 28, textAlign: "center" }}>DIFF</th>
                  <th style={{ ...th(theme), width: 24, textAlign: "center" }}>PTS</th>
                  <th style={{ ...th(theme), width: 52, textAlign: "center" }}>FORME</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const first = idx === 0;
                  return (
                    <tr key={r.participant.id} style={{ background: first ? `${theme.primary}14` : idx % 2 ? "rgba(255,255,255,.02)" : "transparent" }}>
                      <td style={{ ...td(theme), textAlign: "center", color: first ? theme.primary : theme.text, fontWeight: 1000 }}>{idx + 1}</td>
                      <td style={{ ...td(theme), textAlign: "center" }} title={r.participant.name}>
                        <AvatarMedal theme={theme} name={r.participant.name} src={getAvatar(r.participant)} size={26} />
                      </td>
                      <td style={{ ...td(theme), textAlign: "center" }}>{r.played}</td>
                      <td style={{ ...td(theme), textAlign: "center" }}>{r.wins}</td>
                      <td style={{ ...td(theme), textAlign: "center" }}>{r.draws}</td>
                      <td style={{ ...td(theme), textAlign: "center" }}>{r.losses}</td>
                      <td style={{ ...td(theme), textAlign: "center" }}>{r.goalsFor}</td>
                      <td style={{ ...td(theme), textAlign: "center" }}>{r.goalsAgainst}</td>
                      <td style={{ ...td(theme), textAlign: "center", color: r.diff > 0 ? theme.primary : theme.text }}>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                      <td style={{ ...td(theme), textAlign: "center", fontWeight: 1000, color: first ? theme.primary : theme.text }}>{r.points}</td>
                      <td style={{ ...td(theme), textAlign: "center", fontSize: 11, whiteSpace: "nowrap" }}>{r.form.length ? r.form.slice(-5).map((f, i) => <span key={i}>{f === "W" ? "🟢" : f === "D" ? "🟡" : "🔴"}</span>) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ScrollPane>
  );
}

function RoundBlock({ theme, league, round, fixtures, getAvatar, onLaunch }: { theme: any; league: BabyFootLeague; round: number; fixtures: BabyFootLeague["fixtures"]; getAvatar: (p: any) => string | null; onLaunch: (f: BabyFootLeague["fixtures"][number]) => void }) {
  const byId = new Map(league.participants.map((p) => [p.id, p]));
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ ...small(theme), fontWeight: 1000, color: theme.primary, marginBottom: 6 }}>JOURNÉE {round}</div>
      <div style={{ display: "grid", gap: 10 }}>
        {fixtures.map((f) => {
          const home = byId.get(f.homeId);
          const away = byId.get(f.awayId);
          return (
            <MatchCard
              key={f.id}
              theme={theme}
              home={home?.name || "—"}
              away={away?.name || "—"}
              homeAvatar={getAvatar(home)}
              awayAvatar={getAvatar(away)}
              topLabel={`JOURNÉE ${round}`}
              middle="VS"
              onClick={() => onLaunch(f)}
            />
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({ theme, home, away, homeAvatar, awayAvatar, topLabel, middle, subLabel, action, played = false, onClick }: { theme: any; home: string; away: string; homeAvatar?: string | null; awayAvatar?: string | null; topLabel?: string; middle: React.ReactNode; subLabel?: string; action?: React.ReactNode; played?: boolean; onClick?: () => void }) {
  const scoreStyle: React.CSSProperties = played
    ? {
        minWidth: 82,
        textAlign: "center",
        padding: "2px 6px",
        fontWeight: 1100,
        fontSize: 30,
        fontStyle: "italic",
        lineHeight: 1,
        letterSpacing: 0.9,
        color: theme.primary,
        textShadow: `0 0 13px ${theme.primary}dd, 0 3px 10px rgba(0,0,0,.95)`,
      }
    : {
        minWidth: 64,
        textAlign: "center",
        padding: "4px 8px",
        fontWeight: 1100,
        fontSize: 16,
        color: theme.text,
        textShadow: "0 2px 8px rgba(0,0,0,.85)",
      };

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      title={onClick ? "Lancer ce match de ligue" : undefined}
      style={{
        position: "relative",
        overflow: "hidden",
        border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}`,
        borderRadius: 18,
        padding: 10,
        background: "linear-gradient(135deg, rgba(255,255,255,.06), rgba(0,0,0,.24))",
        boxShadow: "inset 0 0 20px rgba(255,255,255,.02)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {homeAvatar ? (
        <img src={homeAvatar} alt="" aria-hidden="true" style={{ position: "absolute", left: -52, top: -34, width: 160, height: 160, objectFit: "cover", borderRadius: 999, opacity: .16, filter: "saturate(1.15) contrast(1.1)", pointerEvents: "none" }} />
      ) : null}
      {awayAvatar ? (
        <img src={awayAvatar} alt="" aria-hidden="true" style={{ position: "absolute", right: -52, top: -34, width: 160, height: 160, objectFit: "cover", borderRadius: 999, opacity: .16, filter: "saturate(1.15) contrast(1.1)", pointerEvents: "none" }} />
      ) : null}

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-end", gap: 6, minWidth: 0, minHeight: 86 }}>
            <div style={{ fontWeight: 1100, color: theme.primary, textTransform: "uppercase", letterSpacing: .6, minWidth: 0, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 2px 8px rgba(0,0,0,.9)" }}>{home}</div>
          </div>
          <div style={{ display: "grid", placeItems: "center", gap: 4, minHeight: 86 }}>
            {topLabel ? <div style={{ ...small(theme), fontWeight: 1000, color: theme.primary, textAlign: "center", textTransform: "uppercase", letterSpacing: .5 }}>{topLabel}</div> : null}
            <div style={scoreStyle}>{middle}</div>
            {subLabel ? <div style={{ ...small(theme), fontWeight: 900, fontSize: 10, opacity: .92, textAlign: "center" }}>{subLabel}</div> : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "flex-end", gap: 6, minWidth: 0, minHeight: 86 }}>
            <div style={{ fontWeight: 1100, color: theme.primary, textTransform: "uppercase", letterSpacing: .6, textAlign: "right", minWidth: 0, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 2px 8px rgba(0,0,0,.9)" }}>{away}</div>
          </div>
        </div>
        {action ? <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>{action}</div> : null}
      </div>
    </div>
  );
}

function FixtureScoreButton({ theme, league, fixtureId, defaultHome, defaultAway, onDone }: { theme: any; league: BabyFootLeague; fixtureId: string; defaultHome: number; defaultAway: number; onDone: () => void }) {
  const [editing, setEditing] = React.useState(false);
  const [a, setA] = React.useState(defaultHome);
  const [b, setB] = React.useState(defaultAway);
  if (!editing) return <button style={ghostBtn(theme)} onClick={() => setEditing(true)}>Saisir score</button>;
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
      <input type="number" min={0} value={a} onChange={(e) => setA(Number(e.target.value))} style={{ ...input(theme), width: 54, padding: "8px 6px", textAlign: "center" }} />
      <span style={{ color: theme.textSoft, fontWeight: 1000 }}>-</span>
      <input type="number" min={0} value={b} onChange={(e) => setB(Number(e.target.value))} style={{ ...input(theme), width: 54, padding: "8px 6px", textAlign: "center" }} />
      <button style={{ ...primaryBtn(theme), padding: "8px 10px" }} onClick={() => { setBabyFootFixtureScore(league.id, fixtureId, a, b); setEditing(false); onDone(); }}>OK</button>
    </div>
  );
}

function ResultCard({ theme, home, away, getAvatar, homeScore, awayScore, round, source, playedAt }: { theme: any; home: any; away: any; getAvatar: (p: any) => string | null; homeScore: number; awayScore: number; round: number; source: string; playedAt: number | null }) {
  const date = playedAt ? new Date(playedAt).toLocaleDateString() : "—";
  return <MatchCard theme={theme} home={home?.name || "—"} away={away?.name || "—"} homeAvatar={getAvatar(home)} awayAvatar={getAvatar(away)} topLabel={source === "manual" ? "AMICAL" : `JOURNÉE ${round}`} subLabel={date} middle={`${homeScore} - ${awayScore}`} played />;
}

function AvatarMedal({ theme, name, src, size = 48 }: { theme: any; name: string; src?: string | null; size?: number }) {
  const logo = src || resolveTeamLogo(name);
  const initials = getInitials(name);
  const glow = pickGlow(name);
  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 999,
    border: `1px solid ${theme.primary}55`,
    boxShadow: `0 0 14px ${glow}55`,
    overflow: "hidden",
    flexShrink: 0,
  };
  if (logo) return <img src={logo} alt={name} style={{ ...common, objectFit: "cover", background: "#05070c" }} />;
  return <div style={{ ...common, display: "grid", placeItems: "center", background: `radial-gradient(circle at 30% 30%, ${glow}, rgba(0,0,0,.95))`, color: "#fff", fontWeight: 1000, fontSize: Math.max(11, Math.round(size * 0.28)) }}>{initials}</div>;
}

function resolveTeamLogo(name: string) {
  try {
    const n = String(name || "").trim().toLowerCase();
    if (!n) return null;
    const teams = loadBabyFootTeams();
    const found = teams.find((t) => String(t?.name || "").trim().toLowerCase() === n);
    return found?.logoDataUrl || null;
  } catch {
    return null;
  }
}

function getInitials(name: string) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function pickGlow(name: string) {
  const palette = ["#4fd1ff", "#b7ff00", "#ff9d2f", "#ff4fd8", "#7d7bff", "#ff4f4f"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function HistoryImportPanel({ theme, store, league, onDone }: { theme: any; store?: any; league: BabyFootLeague; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const candidates = React.useMemo(() => extractBabyFootHistoryCandidates(store, league), [store, league]);

  return (
    <div style={panel(theme)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={sectionTitle(theme)}>Importer depuis l’historique</div>
          <div style={small(theme)}>{candidates.length ? `${candidates.length} match(s) compatible(s) trouvé(s).` : "Aucun match compatible trouvé pour les participants de cette ligue."}</div>
        </div>
        <button type="button" style={candidates.length ? primaryBtn(theme) : ghostBtn(theme)} disabled={!candidates.length} onClick={() => setOpen(true)}>IMPORTER</button>
      </div>

      {open ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 10020, padding: 16, background: "rgba(0,0,0,.68)", display: "grid", placeItems: "center" }} onClick={() => setOpen(false)}>
          <div style={{ width: "100%", maxWidth: 480, maxHeight: "78vh", overflow: "auto", ...panel(theme) }} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...sectionTitle(theme), fontSize: 18 }}>Matchs historiques compatibles</div>
            <div style={{ ...small(theme), marginBottom: 10 }}>Importe uniquement les matchs Baby-Foot dont les deux joueurs/camps existent dans cette ligue.</div>
            <div style={{ display: "grid", gap: 8 }}>
              {candidates.map((c) => {
                const home = findParticipantByNameOrRef(league, c.homeName);
                const away = findParticipantByNameOrRef(league, c.awayName);
                return (
                  <div key={`${c.id}-${c.date}`} style={{ border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}`, borderRadius: 14, padding: 10, background: "rgba(255,255,255,.04)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                      <strong style={{ color: theme.primary, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.homeName}</strong>
                      <strong style={{ color: theme.text, fontSize: 18, fontStyle: "italic" }}>{c.scoreHome} - {c.scoreAway}</strong>
                      <strong style={{ color: theme.primary, textAlign: "right", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.awayName}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <span style={small(theme)}>{new Date(c.date).toLocaleDateString()}</span>
                      <button type="button" style={{ ...primaryBtn(theme), padding: "7px 10px" }} onClick={() => {
                        if (!home || !away) return;
                        addBabyFootLeagueManualMatch(league.id, home.id, away.id, c.scoreHome, c.scoreAway, { playedAt: c.date });
                        submitBabyFootLeagueOnlineResult(league as any, { homeId: home.id, awayId: away.id, scoreHome: c.scoreHome, scoreAway: c.scoreAway, playedAt: c.date, source: "manual" }).catch(() => {});
                        onDone();
                        setOpen(false);
                      }}>Ajouter</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button type="button" style={{ ...ghostBtn(theme), width: "100%", marginTop: 12 }} onClick={() => setOpen(false)}>Fermer</button>
          </div>
        </div>
      ) : null}
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
      <div style={sectionTitle(theme)}>Ajouter un résultat</div>
      <div style={small(theme)}>Match amical ajouté directement au classement infini.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 66px", gap: 8, marginTop: 10 }}>
        <select value={homeId} onChange={(e) => setHomeId(e.target.value)} style={input(theme)}>{league.participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <input type="number" min={0} value={home} onChange={(e) => setHome(Number(e.target.value))} style={input(theme)} />
        <select value={awayId} onChange={(e) => setAwayId(e.target.value)} style={input(theme)}>{league.participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <input type="number" min={0} value={away} onChange={(e) => setAway(Number(e.target.value))} style={input(theme)} />
      </div>
      <button style={{ ...primaryBtn(theme), marginTop: 10, width: "100%" }} onClick={() => {
        if (homeId === awayId) return alert("Choisis deux participants différents.");
        const playedAt = Date.now();
        addBabyFootLeagueManualMatch(league.id, homeId, awayId, home, away, { playedAt });
        submitBabyFootLeagueOnlineResult(league as any, { homeId, awayId, scoreHome: home, scoreAway: away, playedAt, source: "manual" }).catch(() => {});
        onDone();
      }}>AJOUTER LE RÉSULTAT</button>
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
const carouselBtn = (theme: any): React.CSSProperties => ({ border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, background: "rgba(255,255,255,.06)", color: theme.text, borderRadius: 999, width: 34, height: 44, display: "grid", placeItems: "center", fontWeight: 1000, fontSize: 24, cursor: "pointer", padding: 0 });
const dangerBtn = (theme: any): React.CSSProperties => ({ border: "1px solid rgba(255,80,80,.45)", background: "rgba(255,80,80,.12)", color: theme.text, borderRadius: 12, padding: "8px 10px", fontWeight: 1000, cursor: "pointer" });
const iconDangerBtn = (theme: any): React.CSSProperties => ({ border: "1px solid rgba(255,80,80,.45)", background: "rgba(255,80,80,.12)", color: theme.text, borderRadius: 999, width: 30, height: 30, display: "grid", placeItems: "center", fontWeight: 1000, cursor: "pointer", padding: 0 });
const emptyCompact = (theme: any): React.CSSProperties => ({ border: `1px dashed ${theme.borderSoft ?? "rgba(255,255,255,.16)"}`, borderRadius: 16, padding: 16, textAlign: "center", background: "rgba(0,0,0,.16)" });
const empty = (theme: any): React.CSSProperties => ({ ...panel(theme), textAlign: "center", padding: 24 });
const leagueCard = (theme: any): React.CSSProperties => ({ ...panel(theme), textAlign: "left", color: theme.text, cursor: "pointer", width: "100%" });
const badge = (theme: any): React.CSSProperties => ({ border: `1px solid ${theme.primary}77`, background: `${theme.primary}18`, borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 1000, whiteSpace: "nowrap" });
const th = (theme: any): React.CSSProperties => ({ textAlign: "left", padding: "7px 4px", fontSize: 11, color: theme.textSoft, borderBottom: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.14)"}`, fontWeight: 1000 });
const td = (theme: any): React.CSSProperties => ({ padding: "8px 4px", fontSize: 12, borderBottom: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.08)"}` });
const fixture = (theme: any): React.CSSProperties => ({ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.12)"}`, borderRadius: 14, padding: 8, marginTop: 6, background: "rgba(0,0,0,.16)" });
