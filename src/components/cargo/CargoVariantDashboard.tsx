import React from 'react';
import { buildCargoVariantDashboard } from '../../lib/gameEngines/cargoVisuals';

const COLORS: Record<string, string> = {
  cargo_classic: '#ff9b42',
  free_load: '#62e6a7',
  full_pallet: '#f6c256',
  exact_load: '#56c9ff',
  fragile_cargo: '#ef5261',
  cargo_rush: '#ffb547',
  convoy: '#d98cff',
  long_haul: '#56c9ff',
  parcel_delivery: '#62e6d8',
};

const ICONS: Record<string, string> = {
  cargo_classic: '▣',
  free_load: '▤',
  full_pallet: '▥',
  exact_load: '◎',
  fragile_cargo: '◆',
  cargo_rush: '⚡',
  convoy: '⇄',
  long_haul: '➜',
  parcel_delivery: '⌂',
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export default function CargoVariantDashboard({ state, stats, playerId }: any) {
  const data = buildCargoVariantDashboard(state, stats, playerId);
  const accent = COLORS[data.variant] || '#ff9b42';
  const icon = ICONS[data.variant] || '▣';

  return <div className={`cargo-variant-mini cargo-variant-${data.variant}`} title={data.detail} style={{ minWidth: 0 }}>
    <div className="cargo-variant-mini-head" style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) auto', gap: 6, alignItems: 'center' }}>
      <div aria-hidden style={{ width: 23, height: 23, borderRadius: 8, display: 'grid', placeItems: 'center', color: accent, background: `${accent}12`, border: `1px solid ${accent}44`, fontSize: 12, fontWeight: 1200 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: accent, fontSize: 6.6, fontWeight: 1150, letterSpacing: .55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.title}</div>
        <div style={{ marginTop: 1, color: '#fff', fontSize: 7.6, fontWeight: 1050, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.status}</div>
      </div>
      <div style={{ color: accent, fontSize: 8.4, fontWeight: 1150 }}>{Math.round(clamp(data.progress))}%</div>
    </div>

    <div className="cargo-variant-mini-progress" style={{ marginTop: 5, height: 5, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ width: `${clamp(data.progress)}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg,${accent},#f6c256)`, boxShadow: `0 0 10px ${accent}44`, transition: 'width .2s ease' }} />
    </div>

    <div className="cargo-variant-mini-metrics" style={{ marginTop: 5, display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, data.metrics.length)},minmax(0,1fr))`, gap: 4 }}>
      {data.metrics.map((metric: any) => <div key={metric.label} style={{ minWidth: 0, padding: '4px 4px 3px', borderRadius: 8, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.055)', textAlign: 'center' }}>
        <div style={{ color: '#8f98a8', fontSize: 5.6, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{metric.label}</div>
        <div style={{ marginTop: 1, color: metric.label === 'CASSÉS' ? '#ef5261' : accent, fontSize: 7.2, fontWeight: 1100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{metric.value}</div>
      </div>)}
    </div>
  </div>;
}
