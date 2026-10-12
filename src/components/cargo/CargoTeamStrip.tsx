import React from 'react';

const GOLD = '#f6c256';
const GREEN = '#62e6a7';
const SOFT = '#aab1bf';

function profileName(profile: any) {
  return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || 'Joueur';
}

function memberNames(activeTeam: any, profilesById: Map<string, any>) {
  return (activeTeam?.playerIds || []).map((id: string) => profileName(profilesById?.get?.(String(id)))).join(' · ');
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export default function CargoTeamStrip({ activeTeam, activeTeamName, profilesById, scoreUnit, activeColor, activeScore = 0, activePlayerId }: any) {
  if (!activeTeam) return null;
  const share = percent(Number(activeScore || 0), Number(activeTeam?.score || 0));
  const topId = String(activeTeam?.topContributorId || '');
  const topName = topId ? profileName(profilesById?.get?.(topId)) : null;
  const isTop = topId && String(activePlayerId || '') === topId;
  return <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, alignItems: 'center', padding: '6px 8px', borderRadius: 12, background: 'rgba(255,255,255,.045)', border: `1px solid ${activeColor}33` }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ color: GOLD, fontSize: 8.2, fontWeight: 1100, letterSpacing: .5 }}>ÉQUIPE ACTIVE · {String(activeTeamName || activeTeam?.name || '').toUpperCase()}</div>
      <div style={{ marginTop: 3, color: SOFT, fontSize: 7.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{memberNames(activeTeam, profilesById)}</div>
      <div style={{ marginTop: 4, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        <span style={{ color: GREEN, fontSize: 6.8, fontWeight: 1000 }}>CONTRIBUTION {share}%</span>
        {topName ? <span style={{ color: isTop ? GOLD : SOFT, fontSize: 6.8, fontWeight: 1000 }}>{isTop ? '★ TOP CONTRIBUTEUR' : `TOP · ${topName}`}</span> : null}
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ color: GOLD, fontSize: 14, fontWeight: 1100 }}>{activeTeam?.score || 0}</div>
      <div style={{ color: SOFT, fontSize: 6.8 }}>{scoreUnit} équipe</div>
    </div>
  </div>;
}
