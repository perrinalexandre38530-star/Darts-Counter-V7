import * as React from 'react';
import type { StartParticipant } from '../lib/choiceStartOrder';
import { getTeamAvatarUrl, type TeamSkin } from '../assets/teamAvatars';

type TeamLogo = { id?: string; teamId?: string; name?: string; color?: string; logoDataUrl?: string; logoUrl?: string; avatarUrl?: string; avatar?: string; imageUrl?: string; logo?: string; playerIds?: string[]; memberIds?: string[]; players?: Array<string | { id?: string; playerId?: string; profileId?: string }>; members?: Array<string | { id?: string; playerId?: string; profileId?: string }> };
type Props = { mode?: 'manual' | 'bull'; participants: StartParticipant[]; teams?: TeamLogo[]; tickerHints?: string[]; onConfirm: (ids: string[]) => void; onCancel: () => void };

const TICKERS = import.meta.glob([
  '../assets/tickers/*.png',
  '../assets/tickers/*.webp',
  '../assets/tickers/*.jpg',
  '../assets/tickers/*.jpeg',
], { eager: true, import: 'default' }) as Record<string, string>;

// Same default team emblems as X01 gameplay (Gold, Pink, Blue, Green).
function defaultTeamSkin(team: TeamLogo): TeamSkin | undefined {
  const label = `${team.name || ''} ${team.id || team.teamId || ''}`.toLowerCase();
  const color = String(team.color || '').toLowerCase();
  if (/pink|rose/.test(label) || /ff4f|ff2|magenta/.test(color)) return 'pink';
  if (/gold|yellow|jaune|(^|[^a-z])or([^a-z]|$)/.test(label) || /ffb|ffc|d3/.test(color)) return 'gold';
  if (/blue|bleu/.test(label) || /18a0|00f|2d|4f/.test(color)) return 'blue';
  if (/green|vert/.test(label) || /00e|0e|76|2ecc/.test(color)) return 'green';
  return undefined;
}
function memberId(member: string | { id?: string; playerId?: string; profileId?: string }): string {
  return String(typeof member === 'string' ? member : (member?.playerId || member?.profileId || member?.id || ''));
}
function assignedTeamLogo(participant: StartParticipant, teams: TeamLogo[]): string | undefined {
  const matched = teams.find(team => {
    if (participant.teamId && String(team.id || team.teamId) === String(participant.teamId)) return true;
    const members = [...(team.playerIds || []), ...(team.memberIds || []), ...(team.players || []), ...(team.members || [])];
    return members.some(member => memberId(member) === String(participant.id));
  });
  if (matched) {
    const explicit = matched.logoDataUrl || matched.avatarUrl || matched.logoUrl || matched.avatar || matched.imageUrl || matched.logo;
    if (explicit) return explicit;
    const skin = defaultTeamSkin(matched);
    if (skin) return getTeamAvatarUrl(skin);
  }
  if (participant.teamLogoDataUrl || participant.teamLogo) return participant.teamLogoDataUrl || participant.teamLogo;
  if (participant.teamId) {
    const skin = defaultTeamSkin({ id: participant.teamId });
    if (skin) return getTeamAvatarUrl(skin);
  }
  return undefined;
}

const challengeBull50 = Object.values(import.meta.glob('../assets/challenge_targets/target_bull50.webp', { eager: true, query: '?url', import: 'default' }))[0] as string | undefined;

function BullHeaderMark() {
  return <span aria-label="Bull 50" title="Bull 50" style={{ display: 'inline-grid', placeItems: 'center', width: 30, height: 30, flex: '0 0 30px' }}>
    {challengeBull50 ? <img src={challengeBull50} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} /> : <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" style={{ overflow: 'visible' }}>
      <circle cx="15" cy="15" r="13" fill="#141b21" stroke="#e9dcb7" strokeWidth="1.2" />
      <circle cx="15" cy="15" r="10" fill="#c91f30" stroke="#e9dcb7" strokeWidth=".7" />
      <circle cx="15" cy="15" r="6.2" fill="#197047" stroke="#e9dcb7" strokeWidth=".7" />
      <circle cx="15" cy="15" r="3.8" fill="#d52527" stroke="#fff0b4" strokeWidth=".8" />
      <circle cx="15" cy="15" r="1.4" fill="#ffce58" />
    </svg>}
  </span>;
}

function findTickerByHints(hints: string[]): string | undefined {
  const alias: Record<string, string> = {
    x01setup: 'x01',
    x01_config_v3: 'x01',
    x01_online_setup: 'x01',
    fifty_one_by_five: '51_by_5',
    ptit_hun: 'ptit_1',
    killer_progressive: 'killer',
    mario_kart: 'darts_racer',
  };
  const exts = ['png', 'webp', 'jpg', 'jpeg'];
  const expanded = new Set<string>();
  for (const rawHint of hints || []) {
    const raw = String(rawHint || '').trim().toLowerCase();
    if (!raw) continue;
    const base = alias[raw] || raw;
    const variants = [
      base,
      base.replace(/_(config|play|game|setup|home|menu|v\d+)$/g, ''),
      base.replace(/-(config|play|game|setup|home|menu|v\d+)$/g, ''),
      base.replace(/^training_/, ''),
      base.replace(/_config$/g, ''),
      base.replace(/_play$/g, ''),
      base.replace(/_game$/g, ''),
      base.replace(/_setup$/g, ''),
      base.replace(/\s+/g, '_'),
      base.replace(/\s+/g, '-'),
      base.replace(/-/g, '_'),
      base.replace(/_/g, '-'),
      base.replace(/[^a-z0-9_\-]/g, ''),
    ].filter(Boolean);
    for (const v of variants) expanded.add(alias[v] || v);
  }
  for (const candidate of expanded) {
    const suffixes = exts.flatMap((ext) => [`/ticker_${candidate}.${ext}`, `/ticker-${candidate}.${ext}`]);
    for (const key of Object.keys(TICKERS)) {
      if (suffixes.some((suffix) => key.endsWith(suffix))) return TICKERS[key];
    }
  }
  return undefined;
}

export default function ChoiceStartOrderModal({ participants, teams = [], tickerHints = [], onConfirm, onCancel }: Props) {
  const [ordered, setOrdered] = React.useState(() => [...participants]);
  const tickerSrc = React.useMemo(() => findTickerByHints(tickerHints), [tickerHints]);
  const move = (from: number, to: number) => setOrdered(previous => {
    if (to < 0 || to >= previous.length) return previous;
    const result = [...previous];
    result.splice(to, 0, ...result.splice(from, 1));
    return result;
  });
  return <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 2147482000, background: 'rgba(3,9,19,.84)', display: 'grid', placeItems: 'center', padding: 12 }}>
    <section role="dialog" aria-modal="true" aria-labelledby="mss-choice-order-title" style={{ width: 'min(100%, 480px)', maxHeight: 'min(90dvh, 760px)', overflowY: 'auto', border: '1px solid #d4b66e', borderRadius: 20, padding: 18, color: '#fff', background: 'linear-gradient(150deg,#17263a,#090f19)', boxShadow: '0 12px 50px #000a' }}>
      <div style={{ position: 'relative', height: 106, margin: '0 0 14px', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(212,182,110,.36)', display: 'grid', placeItems: 'center', isolation: 'isolate', background: '#142235' }}>
        {tickerSrc && <img src={tickerSrc} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .30, filter: 'grayscale(1) brightness(.9)', pointerEvents: 'none' }} />}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(90deg,rgba(7,14,25,.50),rgba(7,14,25,.35),rgba(7,14,25,.50))', pointerEvents: 'none' }} />
        <h2 id="mss-choice-order-title" style={{ position: 'relative', zIndex: 2, margin: 0, padding: '0 8px', fontSize: 'clamp(15px, 4.7vw, 23px)', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap', color: '#f8d78b', whiteSpace: 'nowrap', textShadow: '0 2px 5px #000, 0 0 15px #000' }}><BullHeaderMark /><span>ORDRE DE DÉPART</span><BullHeaderMark /></h2>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {ordered.map((p, i) => { const logo = assignedTeamLogo(p, teams); return <div key={p.id} style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12, background: '#ffffff12', border: '1px solid #ffffff26', padding: 10 }}>
          {logo ? <img aria-hidden="true" alt="" src={logo} style={{ position: 'absolute', zIndex: 0, width: 160, height: 160, objectFit: 'cover', top: '50%', left: -45, transform: 'translateY(-50%)', opacity: .22, filter: 'saturate(.8)', pointerEvents: 'none' }} /> : null}
          <strong style={{ position: 'relative', zIndex: 1, minWidth: 30, fontSize: 19, color: '#f8d78b' }}>{i + 1}.</strong>
          {p.avatar ? <img src={p.avatar} alt="" style={{ position: 'relative', zIndex: 1, height: 34, width: 34, borderRadius: '50%', objectFit: 'cover' }} /> : null}
          <span style={{ position: 'relative', zIndex: 1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          <button type="button" aria-label={`Monter ${p.name}`} disabled={i === 0} onClick={() => move(i, i - 1)} style={{ ...smallButton, position: 'relative', zIndex: 1 }}>↑</button>
          <button type="button" aria-label={`Descendre ${p.name}`} disabled={i === ordered.length - 1} onClick={() => move(i, i + 1)} style={{ ...smallButton, position: 'relative', zIndex: 1 }}>↓</button>
        </div>; })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <button type="button" onClick={onCancel} style={{ ...actionButton, background: '#344154' }}>ANNULER</button>
        <button type="button" onClick={() => onConfirm(ordered.map(p => p.id))} style={{ ...actionButton, background: '#b99135', color: '#111' }}>VALIDER</button>
      </div>
    </section>
  </div>;
}
const smallButton: React.CSSProperties = { borderRadius: 8, border: '1px solid #d4b66e', background: '#152a40', color: 'white', padding: '7px 12px', fontSize: 17, cursor: 'pointer' };
const actionButton: React.CSSProperties = { flex: 1, border: 0, borderRadius: 10, padding: '12px 7px', fontWeight: 800, cursor: 'pointer', fontSize: 12 };
