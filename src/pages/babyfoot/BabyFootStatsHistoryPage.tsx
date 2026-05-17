import React, { useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LangContext';
import BackDot from '../../components/BackDot';
import ProfileAvatar from '../../components/ProfileAvatar';
import logoBabyFoot from '../../assets/games/logo-babyfoot.png';
import { computeBabyFootRichStats } from '../../lib/babyfootRichStats';
import { History } from '../../lib/history';

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
  params?: any;
};

type RangeKey = 'today' | 'week' | 'month' | 'year' | 'archives';

type BFEntry = {
  id: string;
  kind?: string;
  sport?: string;
  status?: string;
  createdAt?: number;
  updatedAt?: number;
  players?: any[];
  winnerId?: string | null;
  summary?: any;
  payload?: any;
};

const Icon = {
  Eye: (p: any) => <svg viewBox="0 0 24 24" width={18} height={18} {...p}><path fill="currentColor" d="M12 5c5.5 0 9.5 4.5 10 7-.5 2.5-4.5 7-10 7S2.5 14.5 2 12c.5-2.5 4.5-7 10-7Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/></svg>,
  Play: (p: any) => <svg viewBox="0 0 24 24" width={18} height={18} {...p}><path fill="currentColor" d="M8 5v14l11-7z"/></svg>,
  Trash: (p: any) => <svg viewBox="0 0 24 24" width={18} height={18} {...p}><path fill="currentColor" d="M9 3h6l1 2h5v2H3V5h5l1-2Zm-3 6h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9Z"/></svg>,
  Share: (p: any) => <svg viewBox="0 0 24 24" width={18} height={18} {...p}><path fill="currentColor" d="M18 16a3 3 0 0 0-2.4 1.2L8.9 13.7a3.2 3.2 0 0 0 0-3.4l6.6-3.5A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.5 9.2A3 3 0 1 0 9 15l6.1 3.2A3 3 0 1 0 18 16Z"/></svg>,
  Refresh: (p: any) => <svg viewBox="0 0 24 24" width={18} height={18} {...p}><path fill="currentColor" d="M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.76-4.24L13 11h8V3l-3.3 3.3Z"/></svg>,
  Filter: (p: any) => <svg viewBox="0 0 24 24" width={18} height={18} {...p}><path fill="currentColor" d="M3 5h18l-7 8v5l-4 2v-7L3 5Z"/></svg>,
  Trophy: (p: any) => <svg viewBox="0 0 24 24" width={18} height={18} {...p}><path fill="currentColor" d="M6 2h12v2h3a1 1 0 0 1 1 1v1a5 5 0 0 1-5 5h-1.1A6 6 0 0 1 13 13.9V16h3v2H8v-2h3v-2.1A6 6 0 0 1 8.1 11H7A5 5 0 0 1 2 6V5a1 1 0 0 1 1-1h3V2Z"/></svg>,
  Upload: (p: any) => <svg viewBox="0 0 24 24" width={18} height={18} {...p}><path fill="currentColor" d="M5 20h14v-2H5v2Zm7-18 5 5h-3v6h-4V7H7l5-5Z"/></svg>,
};

function safeNum(v: any, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}
function safeArray<T = any>(v: any): T[] { return Array.isArray(v) ? v as T[] : []; }
function fmtTime(ms?: number) {
  const s = Math.max(0, Math.floor((ms || 0) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
function fmtDate(ts?: number) {
  const n = Number(ts);
  return new Date(Number.isFinite(n) && n > 0 ? n : Date.now()).toLocaleString();
}
function getPayload(h: any) {
  const p0 = h?.payload ?? {};
  return p0?.payload ?? p0 ?? {};
}
function getMode(payload: any): '1v1' | '2v2' | '2v1' | 'unknown' {
  const m = String(payload?.mode ?? payload?.meta?.mode ?? payload?.summary?.mode ?? '').trim();
  if (m === '1v1' || m === '2v2' || m === '2v1') return m;
  return 'unknown';
}
function getTeams(payload: any) {
  return {
    teamA: payload?.teamA ?? payload?.summary?.teamA ?? 'JOUEUR A',
    teamB: payload?.teamB ?? payload?.summary?.teamB ?? 'JOUEUR B',
    scoreA: safeNum(payload?.scoreA ?? payload?.summary?.scoreA, 0),
    scoreB: safeNum(payload?.scoreB ?? payload?.summary?.scoreB, 0),
    teamAIds: Array.isArray(payload?.teamAProfileIds) ? payload.teamAProfileIds : [],
    teamBIds: Array.isArray(payload?.teamBProfileIds) ? payload.teamBProfileIds : [],
  };
}
function getWinnerTeam(payload: any): 'A' | 'B' | null {
  const w = payload?.winnerTeam ?? payload?.winner ?? payload?.summary?.winnerTeam ?? null;
  if (w === 'A' || w === 'B') return w;
  const { scoreA, scoreB } = getTeams(payload);
  if (scoreA === scoreB) return null;
  return scoreA > scoreB ? 'A' : 'B';
}
function periodCutoff(key: RangeKey) {
  const now = new Date();
  const t = new Date(now);
  if (key === 'today') {
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  }
  if (key === 'week') {
    now.setDate(now.getDate() - 7);
    return now.getTime();
  }
  if (key === 'month') return new Date(t.getFullYear(), t.getMonth(), 1).getTime();
  if (key === 'year') return new Date(t.getFullYear(), 0, 1).getTime();
  return 0;
}
function inferStatus(e: any) {
  return String(e?.status || 'finished') === 'finished' ? 'done' : 'running';
}
function getNameFromAny(v: any) {
  return String(v?.name || v?.displayName || v?.nickname || '').trim();
}
function getAvatarFromAny(v: any) {
  return v?.avatarDataUrl || v?.avatarUrl || v?.avatar_url || v?.avatar || null;
}

export default function BabyFootStatsHistoryPage({ store, go }: Props) {
  const { theme } = useTheme() as any;
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fb: string) => fb);

  const [tab, setTab] = useState<'all' | 'done' | 'running'>('all');
  const [sub, setSub] = useState<RangeKey>('month');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'games' | 'players'>('games');
  const [gameFilter, setGameFilter] = useState<'all' | '1v1' | '2v2' | '2v1'>('all');
  const [playerFilter, setPlayerFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string>('');
  const [hiddenIds, setHiddenIds] = useState<Record<string, true>>({});
  const [refreshTick, setRefreshTick] = useState(0);

  const profilesById = useMemo(() => {
    const map: Record<string, any> = {};
    for (const p of safeArray(store?.profiles)) if (p?.id) map[p.id] = p;
    return map;
  }, [store?.profiles]);

  const allItems = useMemo<BFEntry[]>(() => {
    const rows = safeArray(store?.history)
      .filter((h: any) => (h?.sport === 'babyfoot' || h?.kind === 'babyfoot') && !hiddenIds[String(h?.id || '')])
      .map((h: any) => ({ ...h, id: String(h?.id || ''), players: safeArray(h?.players) }))
      .sort((a: any, b: any) => safeNum(b?.updatedAt || b?.createdAt, 0) - safeNum(a?.updatedAt || a?.createdAt, 0));
    return rows;
  }, [store?.history, hiddenIds, refreshTick]);

  const done = useMemo(() => allItems.filter((e) => inferStatus(e) === 'done'), [allItems]);
  const running = useMemo(() => allItems.filter((e) => inferStatus(e) === 'running'), [allItems]);
  const sportSource = tab === 'done' ? done : tab === 'running' ? running : allItems;

  const playerOptions = useMemo(() => {
    const byId = new Map<string, { id: string; label: string }>();
    for (const e of allItems) {
      const payload = getPayload(e);
      const ids = [...safeArray(payload?.teamAProfileIds), ...safeArray(payload?.teamBProfileIds)];
      for (const id of ids) {
        if (!id) continue;
        const label = profilesById[id]?.name || profilesById[id]?.displayName || String(id).slice(0, 6);
        byId.set(String(id), { id: String(id), label: String(label) });
      }
      for (const p of safeArray(e.players)) {
        const id = String(p?.id || '');
        if (!id) continue;
        byId.set(id, { id, label: getNameFromAny(p) || profilesById[id]?.name || id.slice(0, 6) });
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [allItems, profilesById]);

  const filtered = useMemo(() => {
    const cutoff = periodCutoff(sub);
    return sportSource.filter((e) => {
      const when = safeNum(e?.updatedAt || e?.createdAt, 0);
      if (sub !== 'archives' && when < cutoff) return false;
      if (sub === 'archives' && when >= periodCutoff('year')) return false;
      const payload = getPayload(e);
      const mode = getMode(payload);
      if (gameFilter !== 'all' && mode !== gameFilter) return false;
      if (playerFilter !== 'all') {
        const ids = new Set<string>([
          ...safeArray(payload?.teamAProfileIds).map(String),
          ...safeArray(payload?.teamBProfileIds).map(String),
          ...safeArray(e.players).map((p: any) => String(p?.id || '')),
        ].filter(Boolean));
        if (!ids.has(String(playerFilter))) return false;
      }
      return true;
    });
  }, [sportSource, sub, gameFilter, playerFilter]);

  const focusMatchId = '';

  async function handleDelete(entry: BFEntry) {
    const id = String(entry?.id || '').trim();
    if (!id) return;
    if (!window.confirm('Supprimer cette partie Baby-Foot ?')) return;
    try {
      await History.remove(id);
    } catch {}
    setHiddenIds((prev) => ({ ...prev, [id]: true }));
  }

  async function handleClearHistory() {
    if (!filtered.length) return;
    if (!window.confirm('Vider les cartes Baby-Foot actuellement affichées ?')) return;
    const next: Record<string, true> = {};
    for (const e of filtered) {
      const id = String(e?.id || '');
      if (!id) continue;
      next[id] = true;
      try { await History.remove(id); } catch {}
    }
    setHiddenIds((prev) => ({ ...prev, ...next }));
  }

  async function handleShare(entry: BFEntry) {
    try {
      const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
      const filename = `babyfoot-${entry.id || Date.now()}.json`;
      const file = new File([blob], filename, { type: 'application/json' });
      const nav: any = navigator;
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'Match Baby-Foot', text: 'Export du match Baby-Foot' });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('share babyfoot history failed', error);
    }
  }

  const S = useMemo(() => buildStyles(theme), [theme]);

  return (
    <div style={S.page}>
      <div style={S.title}>HISTORIQUE</div>

      <div style={S.kpiRow}>
        <div style={S.kpiCard(tab === 'all', theme.primary)} onClick={() => setTab('all')}><div style={S.kpiLabel}>ALL</div><div style={S.kpiValue}>{allItems.length}</div></div>
        <div style={S.kpiCard(tab === 'done', theme.primary)} onClick={() => setTab('done')}><div style={S.kpiLabel}>Terminées</div><div style={S.kpiValue}>{done.length}</div></div>
        <div style={S.kpiCard(tab === 'running', theme.danger)} onClick={() => setTab('running')}><div style={S.kpiLabel}>En cours</div><div style={{ ...S.kpiValue, color: theme.danger }}>{running.length}</div></div>
        <div style={S.kpiCard(false, theme.primary)}><div style={S.kpiLabel}>Reçues</div><div style={S.kpiValue}>0</div></div>
      </div>

      <div style={S.toolbar}>
        <button type="button" style={S.toolIconBtn(false)} onClick={() => setRefreshTick((v) => v + 1)} title="Recharger"><Icon.Refresh /></button>
        <button type="button" style={S.toolIconBtn(false)} onClick={() => {}} title="Importer"><Icon.Upload /></button>
        <div style={S.filterPopoverWrap}>
          <button type="button" style={S.toolIconBtn(filterOpen || gameFilter !== 'all' || playerFilter !== 'all')} onClick={() => setFilterOpen((v) => !v)} title="Filtrer"><Icon.Filter /></button>
          {filterOpen ? (
            <div style={S.filterPanel}>
              <div style={S.filterTabs}>
                <button type="button" style={S.filterTabBtn(filterMode === 'games')} onClick={() => setFilterMode('games')}>Modes</button>
                <button type="button" style={S.filterTabBtn(filterMode === 'players')} onClick={() => setFilterMode('players')}>Joueurs</button>
              </div>
              <div style={S.filterDropdown}>
                {filterMode === 'games' ? (
                  <>
                    {['all', '1v1', '2v2', '2v1'].map((m) => (
                      <button key={m} type="button" style={S.filterChip(gameFilter === m)} onClick={() => setGameFilter(m as any)}>
                        {m === 'all' ? 'Tous les jeux' : m.toUpperCase()}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <button type="button" style={S.filterChip(playerFilter === 'all')} onClick={() => setPlayerFilter('all')}>Tous les joueurs</button>
                    {playerOptions.map((p) => (
                      <button key={p.id} type="button" style={S.filterChip(playerFilter === p.id)} onClick={() => setPlayerFilter(p.id)}>{p.label}</button>
                    ))}
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
        <button type="button" style={S.toolIconBtn(true)} onClick={handleClearHistory} title="Vider historique"><Icon.Trash /></button>
      </div>

      <div style={S.filtersRow}>
        {([
          ['today', 'J'],
          ['week', 'S'],
          ['month', 'M'],
          ['year', 'A'],
          ['archives', 'ARV'],
        ] as const).map(([key, label]) => (
          <div key={key} style={S.filterBtn(sub === key)} onClick={() => setSub(key)}>{label}</div>
        ))}
      </div>

      <div style={S.list}>
        {filtered.length === 0 ? (
          <div style={{ opacity: 0.7, textAlign: 'center', marginTop: 20 }}>Aucune partie ici.</div>
        ) : filtered.map((e) => {
          const payload = getPayload(e);
          const { teamA, teamB, scoreA, scoreB, teamAIds, teamBIds } = getTeams(payload);
          const rich = computeBabyFootRichStats(payload);
          const dur = safeNum(payload?.durationMs ?? payload?.summary?.durationMs, 0);
          const winner = getWinnerTeam(payload);
          const modeRaw = getMode(payload);
          const modeChip = modeRaw === 'unknown' ? 'MATCH' : modeRaw.toUpperCase();
          const aProfiles = (teamAIds || []).map((id: string) => profilesById[id]).filter(Boolean);
          const bProfiles = (teamBIds || []).map((id: string) => profilesById[id]).filter(Boolean);
          const players = safeArray(e.players);
          const fallbackA = players[0] || { id: teamAIds[0], name: teamA };
          const fallbackB = players[1] || { id: teamBIds[0], name: teamB };
          const summaryLine = `${teamA}: ${scoreA} • ${teamB}: ${scoreB}`;
          const isExpanded = expandedId === e.id;

          return (
            <div key={e.id} style={S.cardShell}>
              <img src={logoBabyFoot} style={S.watermarkLogo} />
              <div style={S.rowBetween}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ ...S.modePill, color: '#f8c867', borderColor: '#f8c86799', background: '#f8c86722' }}>BABYFOOT</span>
                  <span style={{ ...S.modePill, color: '#f8c867', borderColor: '#f8c86755', background: 'rgba(255,255,255,0.06)' }}>{modeChip}</span>
                  <span style={{ ...S.modePill, color: '#f8c867', borderColor: '#f8c86755', background: 'rgba(255,255,255,0.06)' }}>Terminé</span>
                </div>
                <span style={{ fontSize: 11, color: theme.primary }}>{fmtDate(e.updatedAt || e.createdAt)}</span>
              </div>

              <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.92)' }}>{summaryLine}</div>

              <div style={{ ...S.rowBetween, marginTop: 10 }}>
                <div style={S.avatars}>
                  {[...aProfiles, ...bProfiles].slice(0, 4).map((p: any, i: number) => (
                    <div key={`${e.id}-av-${i}`} style={{ ...S.avWrap, marginLeft: i === 0 ? 0 : -8 }}>
                      <ProfileAvatar profile={p} size={36} />
                    </div>
                  ))}
                  {aProfiles.length + bProfiles.length === 0 ? (
                    <>
                      <div style={{ ...S.avWrap, marginLeft: 0 }}><ProfileAvatar profile={fallbackA} size={36} /></div>
                      <div style={{ ...S.avWrap, marginLeft: -8 }}><ProfileAvatar profile={fallbackB} size={36} /></div>
                    </>
                  ) : null}
                </div>
                {winner ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.primary }}><Icon.Trophy /> {winner === 'A' ? teamA : teamB}</div> : null}
              </div>

              <div style={S.actionRow}>
                <div style={S.primaryAction} onClick={() => setExpandedId((prev) => prev === e.id ? '' : e.id)}>
                  <Icon.Eye /> Voir stats
                </div>
                <div style={S.iconRow}>
                  <div style={S.iconBtn} onClick={() => handleShare(e)} title="Partager"><Icon.Share /></div>
                  <div style={S.iconBtn} onClick={() => setExpandedId((prev) => prev === e.id ? '' : e.id)} title="Voir stats"><Icon.Play /></div>
                  <div style={{ ...S.iconBtn, ...S.iconDanger }} onClick={() => handleDelete(e)} title="Supprimer"><Icon.Trash /></div>
                </div>
              </div>

              {isExpanded ? (
                <div style={S.statsBoard}>
                  <div style={S.statsHeader}>BABYFOOT COUNTER</div>
                  <div style={S.statsGrid}>
                    <HistoryTeam side="left" label={teamA} profiles={aProfiles.length ? aProfiles : [fallbackA]} win={winner === 'A'} />
                    <div style={S.scorePanel}>
                      <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 1000, letterSpacing: 0.8 }}>SCORE</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10 }}>
                        <span style={{ fontSize: 40, lineHeight: 1, fontWeight: 1000, color: '#c7ff26' }}>{scoreA}</span>
                        <span style={{ fontSize: 16, fontWeight: 900, opacity: 0.6 }}>—</span>
                        <span style={{ fontSize: 40, lineHeight: 1, fontWeight: 1000, color: '#ff59b0' }}>{scoreB}</span>
                      </div>
                    </div>
                    <HistoryTeam side="right" label={teamB} profiles={bProfiles.length ? bProfiles : [fallbackB]} win={winner === 'B'} />
                  </div>

                  <div style={S.miniRow}>
                    <MiniInfo label="Legs" value={String(rich.totalLegs)} />
                    <MiniInfo label="Buts" value={String(rich.totalGoals)} />
                    <MiniInfo label="Moy/leg" value={((rich.teamA.avgGoalsPerLeg + rich.teamB.avgGoalsPerLeg) / 2).toFixed(1)} />
                    <MiniInfo label="Durée" value={fmtTime(dur)} />
                  </div>

                  <div style={S.tableWrap}>
                    <StatRow label="Sets" left={rich.teamA.sets} right={rich.teamB.sets} />
                    <StatRow label="Legs" left={rich.teamA.legs} right={rich.teamB.legs} />
                    <StatRow label="Buts" left={rich.teamA.goals} right={rich.teamB.goals} />
                    <StatRow label="Moy. buts / leg" left={rich.teamA.avgGoalsPerLeg.toFixed(1)} right={rich.teamB.avgGoalsPerLeg.toFixed(1)} />
                    <StatRow label="Gamelle" left={rich.teamA.gamelle} right={rich.teamB.gamelle} />
                    <StatRow label="Pêche" left={rich.teamA.peche} right={rich.teamB.peche} />
                    <StatRow label="Pêche off." left={rich.teamA.pecheOff} right={rich.teamB.pecheOff} />
                    <StatRow label="Pêche déf." left={rich.teamA.pecheDef} right={rich.teamB.pecheDef} />
                    <StatRow label="Demi" left={rich.teamA.demi} right={rich.teamB.demi} />
                    <StatRow label="Bonus demi" left={rich.teamA.demiBonus} right={rich.teamB.demiBonus} />
                    <StatRow label="Pissette" left={rich.teamA.pissette} right={rich.teamB.pissette} />
                    <StatRow label="Pénalties" left={rich.teamA.penalties} right={rich.teamB.penalties} />
                    <StatRow label="Handicap" left={rich.teamA.handicap} right={rich.teamB.handicap} />
                    <StatRow label="Diff. buts" left={rich.teamA.goalDiff} right={rich.teamB.goalDiff} />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryTeam({ side, label, profiles, win }: { side: 'left' | 'right'; label: string; profiles: any[]; win: boolean }) {
  const main = profiles?.[0] || { name: label };
  const extra = Math.max(0, (profiles?.length || 0) - 1);
  const align = side === 'left' ? 'left' : 'right';
  return (
    <div style={{ display: 'grid', justifyItems: align === 'left' ? 'start' : 'end', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: align === 'left' ? 'row' : 'row-reverse' }}>
        <ProfileAvatar profile={main} size={52} />
        {extra > 0 ? <div style={extraBubble}>{`+${extra}`}</div> : null}
      </div>
      <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: 0.9, opacity: 0.68 }}>{align === 'left' ? 'JOUEUR A' : 'JOUEUR B'}</div>
      <div style={{ fontSize: 16, fontWeight: 1000, color: win ? '#fff' : 'rgba(255,255,255,0.92)', textAlign: align, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.18)', padding: 10 }}>
      <div style={{ fontSize: 11, opacity: 0.68, fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 18, fontWeight: 1000, color: '#fff' }}>{value}</div>
    </div>
  );
}

function StatRow({ label, left, right }: { label: string; left: string | number; right: string | number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '56px minmax(0,1fr) 56px', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 1000, color: '#c7ff26' }}>{left}</div>
      <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 950, color: 'rgba(255,255,255,0.94)' }}>{label}</div>
      <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 1000, color: '#ff59b0' }}>{right}</div>
    </div>
  );
}

const extraBubble: React.CSSProperties = {
  minWidth: 28,
  height: 28,
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.08)',
  display: 'grid',
  placeItems: 'center',
  fontSize: 12,
  fontWeight: 1000,
};

function buildStyles(theme: any) {
  const primary = theme?.primary || '#c7ff26';
  const danger = theme?.danger || '#ff4d4f';
  const card = theme?.card || 'rgba(255,255,255,0.06)';
  const bg = theme?.bg || '#05060a';
  const text = theme?.text || '#fff';
  const border = theme?.borderSoft || theme?.border || 'rgba(255,255,255,0.14)';
  const metalBackground = (color: string) =>
    `linear-gradient(135deg,
      rgba(255,255,255,.14) 0%,
      rgba(255,255,255,.06) 6%,
      ${color}22 14%,
      rgba(10,12,22,.96) 28%,
      rgba(6,8,16,.98) 58%,
      rgba(255,255,255,.05) 78%,
      ${color}18 100%)`;

  return {
    page: {
      minHeight: '100vh',
      padding: '16px 14px 90px',
      color: text,
      background: bg,
    } as React.CSSProperties,
    title: {
      textAlign: 'center',
      fontSize: 40,
      fontWeight: 1000,
      letterSpacing: 1.4,
      color: primary,
      textShadow: `0 0 14px ${primary}66, 0 0 30px ${primary}33`,
      marginBottom: 12,
      textTransform: 'uppercase',
    } as React.CSSProperties,
    kpiRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: 8,
      marginBottom: 10,
    } as React.CSSProperties,
    kpiCard: (active: boolean, color: string) => ({
      borderRadius: 16,
      border: `1px solid ${active ? color : border}`,
      background: active ? metalBackground(color) : card,
      boxShadow: active ? `0 0 16px ${color}40` : '0 8px 18px rgba(0,0,0,0.25)',
      padding: '10px 8px',
      display: 'grid',
      gap: 4,
      justifyItems: 'center',
      cursor: 'pointer',
    }),
    kpiLabel: { fontSize: 11, fontWeight: 900, opacity: 0.82 } as React.CSSProperties,
    kpiValue: { fontSize: 28, fontWeight: 1000, lineHeight: 1 } as React.CSSProperties,
    toolbar: { display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 10 } as React.CSSProperties,
    toolIconBtn: (dangerBtn: boolean, active = false) => ({
      width: 38,
      height: 38,
      borderRadius: 12,
      border: `1px solid ${dangerBtn ? danger : active ? primary : border}`,
      background: active ? `${primary}22` : 'rgba(255,255,255,0.06)',
      color: dangerBtn ? danger : primary,
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer',
      boxShadow: `0 0 10px ${(dangerBtn ? danger : primary)}33`,
    }),
    filterPopoverWrap: { position: 'relative' as const },
    filterPanel: {
      position: 'absolute' as const,
      top: 46,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 290,
      zIndex: 40,
      borderRadius: 16,
      border: `1px solid ${border}`,
      background: 'linear-gradient(180deg, rgba(9,11,24,0.98), rgba(4,6,16,0.98))',
      padding: 10,
      boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
    } as React.CSSProperties,
    filterTabs: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 } as React.CSSProperties,
    filterTabBtn: (active: boolean) => ({
      height: 34,
      borderRadius: 10,
      border: `1px solid ${active ? primary : border}`,
      background: active ? `${primary}22` : 'rgba(255,255,255,0.05)',
      color: active ? primary : text,
      fontWeight: 900,
      cursor: 'pointer',
    }),
    filterDropdown: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
    filterChip: (active: boolean) => ({
      padding: '7px 10px',
      borderRadius: 999,
      border: `1px solid ${active ? primary : border}`,
      background: active ? `${primary}22` : 'rgba(255,255,255,0.05)',
      color: active ? primary : text,
      fontSize: 12,
      fontWeight: 900,
      cursor: 'pointer',
    }),
    filtersRow: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' as const } as React.CSSProperties,
    filterBtn: (active: boolean) => ({
      minWidth: 38,
      height: 30,
      borderRadius: 999,
      border: `1px solid ${active ? primary : border}`,
      background: active ? `${primary}22` : 'rgba(255,255,255,0.05)',
      color: active ? primary : text,
      display: 'grid',
      placeItems: 'center',
      fontSize: 12,
      fontWeight: 1000,
      cursor: 'pointer',
      padding: '0 10px',
    }),
    list: { display: 'grid', gap: 12 } as React.CSSProperties,
    cardShell: {
      position: 'relative' as const,
      overflow: 'hidden' as const,
      borderRadius: 22,
      border: `1px solid ${primary}55`,
      background: metalBackground(primary),
      boxShadow: `0 14px 30px rgba(0,0,0,.45), 0 0 18px ${primary}22`,
      padding: 14,
    } as React.CSSProperties,
    watermarkLogo: { position: 'absolute' as const, inset: 'auto 14px 14px auto', width: 112, opacity: 0.12, pointerEvents: 'none' } as React.CSSProperties,
    rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 } as React.CSSProperties,
    modePill: {
      padding: '4px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 800,
      border: '1px solid rgba(255,255,255,0.18)',
      textShadow: '0 0 4px rgba(0,0,0,0.6)',
    } as React.CSSProperties,
    avatars: { display: 'flex', alignItems: 'center' } as React.CSSProperties,
    avWrap: { position: 'relative' as const },
    actionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12 } as React.CSSProperties,
    primaryAction: {
      height: 38,
      minWidth: 128,
      padding: '0 14px',
      borderRadius: 12,
      border: `1px solid ${primary}`,
      background: `${primary}22`,
      color: primary,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontWeight: 1000,
      cursor: 'pointer',
      boxShadow: `0 0 12px ${primary}33`,
    } as React.CSSProperties,
    iconRow: { display: 'flex', gap: 8 } as React.CSSProperties,
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      border: `1px solid ${border}`,
      background: 'rgba(255,255,255,0.06)',
      color: text,
      display: 'grid',
      placeItems: 'center',
      cursor: 'pointer',
    } as React.CSSProperties,
    iconDanger: { color: danger, border: `1px solid ${danger}aa`, boxShadow: `0 0 12px ${danger}22` } as React.CSSProperties,
    statsBoard: {
      marginTop: 12,
      borderRadius: 18,
      border: '1px solid rgba(255,255,255,0.10)',
      background: 'linear-gradient(180deg, rgba(8,11,26,0.96), rgba(4,7,18,0.98))',
      padding: 12,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    } as React.CSSProperties,
    statsHeader: { textAlign: 'center', fontSize: 11, fontWeight: 1000, letterSpacing: 1, color: 'rgba(255,255,255,0.56)', textTransform: 'uppercase' as const, marginBottom: 10 } as React.CSSProperties,
    statsGrid: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', gap: 10, alignItems: 'center' } as React.CSSProperties,
    scorePanel: {
      minWidth: 124,
      borderRadius: 18,
      padding: '10px 12px',
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'linear-gradient(180deg, rgba(12,16,38,0.96), rgba(6,10,24,0.96))',
      display: 'grid',
      gap: 6,
      justifyItems: 'center',
    } as React.CSSProperties,
    miniRow: { marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8 } as React.CSSProperties,
    tableWrap: { marginTop: 12, borderRadius: 16, padding: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(7,10,24,0.92), rgba(5,8,18,0.98))', display: 'grid', gap: 4 } as React.CSSProperties,
  };
}
