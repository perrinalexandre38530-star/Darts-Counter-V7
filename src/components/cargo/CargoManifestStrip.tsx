import React from 'react';

const ORANGE = '#ff9b42';
const GOLD = '#f6c256';
const GREEN = '#62e6a7';
const SOFT = '#aab1bf';

export default function CargoManifestStrip({ objectiveNow, activeContract, activeSeries, throwCount, isParcel, onOpenManifest }: any) {
  const progress = activeSeries?.count || 0;
  const target = Math.max(1, Number(activeContract?.targetCount || (isParcel ? 5 : 4)));
  const fill = Math.max(0, Math.min(100, (progress / target) * 100));
  return <div style={{ minWidth: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, alignItems: 'center', padding: '7px 10px', background: 'rgba(0,0,0,.28)', borderTop: '1px solid rgba(255,255,255,.05)' }}>
    <button type="button" onClick={onOpenManifest} style={{ minWidth: 0, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ flex: '0 0 auto', width: 6, height: 6, borderRadius: 999, background: activeContract ? GREEN : GOLD, boxShadow: `0 0 8px ${activeContract ? GREEN : GOLD}88` }} />
        <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 8.3, fontWeight: 1020, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{objectiveNow}</span>
      </div>
      <div style={{ marginTop: 6, height: 6, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.08)' }}>
        <div style={{ width: `${fill}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${ORANGE}, ${GOLD})` }} />
      </div>
    </button>
    <div style={{ textAlign: 'right' }}>
      <div style={{ color: activeContract ? GOLD : SOFT, fontSize: 8.2, fontWeight: 1000 }}>{progress}/{target}</div>
      <div style={{ marginTop: 2, color: throwCount === 3 ? GOLD : SOFT, fontSize: 7.1, fontWeight: 950 }}>{throwCount}/3 volée</div>
    </div>
  </div>;
}
