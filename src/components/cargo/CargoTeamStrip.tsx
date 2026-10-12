import React from 'react';

const GOLD = '#f6c256';
const SOFT = '#aab1bf';

function memberNames(activeTeam: any, profilesById: Map<string, any>) {
  return (activeTeam?.playerIds || []).map((id: string) => {
    const profile = profilesById?.get?.(String(id));
    return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || 'Joueur';
  }).join(' · ');
}

export default function CargoTeamStrip({ activeTeam, activeTeamName, profilesById, scoreUnit, activeColor }: any) {
  if (!activeTeam) return null;
  return <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, alignItems: 'center', padding: '6px 8px', borderRadius: 12, background: 'rgba(255,255,255,.045)', border: `1px solid ${activeColor}33` }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ color: GOLD, fontSize: 8.2, fontWeight: 1100, letterSpacing: .5 }}>ÉQUIPE ACTIVE · {String(activeTeamName || activeTeam?.name || '').toUpperCase()}</div>
      <div style={{ marginTop: 3, color: SOFT, fontSize: 7.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{memberNames(activeTeam, profilesById)}</div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ color: GOLD, fontSize: 14, fontWeight: 1100 }}>{activeTeam?.score || 0}</div>
      <div style={{ color: SOFT, fontSize: 6.8 }}>{scoreUnit} équipe</div>
    </div>
  </div>;
}
