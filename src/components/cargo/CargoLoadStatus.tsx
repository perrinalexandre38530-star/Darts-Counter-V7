import React from 'react';
import { buildCargoVisualSnapshot, cargoRecentEvents } from '../../lib/gameEngines/cargoVisuals';
import { getCargoStageBadge, getCargoSupportArt } from './cargoArt';

const ORANGE = '#ff9b42';
const GOLD = '#f6c256';
const GREEN = '#62e6a7';
const BLUE = '#56c9ff';
const SOFT = '#aab1bf';
const RED = '#ef5261';

function tone(stage: string) {
  if (stage === 'FULL') return GOLD;
  if (stage === 'LOADED') return GREEN;
  if (stage === 'PALLET_READY') return BLUE;
  if (stage === 'LOADING') return ORANGE;
  return SOFT;
}

function panelStyle(accent: string): React.CSSProperties {
  return {
    minHeight: 0,
    borderRadius: 18,
    border: `1px solid ${accent}44`,
    background: 'linear-gradient(180deg,rgba(18,20,26,.92),rgba(7,9,13,.96))',
    boxShadow: '0 12px 32px rgba(0,0,0,.22)',
    padding: 10,
    boxSizing: 'border-box',
    overflow: 'hidden',
    position: 'relative',
  };
}

function progressFill(fillPercent: number, color: string): React.CSSProperties {
  return {
    width: `${Math.max(0, Math.min(100, fillPercent))}%`,
    height: '100%',
    borderRadius: 999,
    background: `linear-gradient(90deg, ${color}, ${GOLD})`,
    boxShadow: `0 0 18px ${color}55`,
  };
}

function artTile(src: string, size = 92): React.CSSProperties {
  return {
    width: size,
    height: size,
    objectFit: 'contain',
    display: 'block',
    filter: 'drop-shadow(0 10px 18px rgba(0,0,0,.35))',
  };
}

export default function CargoLoadStatus({ state, stats, playerId, onOpenTruck, onOpenManifest }: any) {
  const snapshot = buildCargoVisualSnapshot(state, stats);
  const accent = tone(snapshot.stage);
  const events = cargoRecentEvents(state, playerId, 3);
  const badgeArt = getCargoStageBadge(snapshot.stage);
  const supportArt = getCargoSupportArt({ parcel: snapshot.unit === 'COLIS', stage: snapshot.stage });

  return <section style={{ minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,.9fr)', gap: 8 }}>
    <button type="button" onClick={onOpenTruck} style={{ ...panelStyle(accent), cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ position: 'absolute', right: -16, top: -8, width: 110, height: 110, opacity: .09, pointerEvents: 'none' }}><img src={supportArt} alt="" style={artTile(supportArt, 110)} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '96px minmax(0,1fr)', gap: 10, alignItems: 'center', height: '100%' }}>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 0 }}>
          <img src={badgeArt} alt="Statut de chargement" style={artTile(badgeArt, 92)} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .7 }}>{snapshot.stageLabel}</div>
              <div style={{ marginTop: 3, color: SOFT, fontSize: 8, lineHeight: 1.35 }}>{snapshot.stageHint}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: accent, fontSize: 20, fontWeight: 1150 }}>{Math.round(snapshot.fillPercent)}%</div>
              <div style={{ color: SOFT, fontSize: 7 }}>{snapshot.current} / {snapshot.target} {snapshot.unit}</div>
            </div>
          </div>
          <div style={{ marginTop: 10, height: 9, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.08)' }}>
            <div style={progressFill(snapshot.fillPercent, accent)} />
          </div>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 6 }}>
            {[
              [snapshot.unit === 'COLIS' ? 'COLIS' : 'PALETTES', snapshot.unit === 'COLIS' ? snapshot.parcelsReady : snapshot.palletsReady, ORANGE],
              ['CONTRATS', snapshot.contractsDone, GOLD],
              ['CARTONS', snapshot.cartonsReady, BLUE],
              ['CAISSES', snapshot.cratesReady, GREEN],
            ].map(([label, value, color]: any) => <div key={label} style={{ borderRadius: 12, padding: '8px 7px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ color: SOFT, fontSize: 6.8 }}>{label}</div>
              <div style={{ marginTop: 4, color, fontSize: 15, fontWeight: 1100 }}>{value}</div>
            </div>)}
          </div>
        </div>
      </div>
    </button>
    <div style={{ ...panelStyle(BLUE), display: 'grid', gridTemplateRows: 'auto minmax(0,1fr)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '52px minmax(0,1fr) auto', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: 14, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
          <img src={supportArt} alt="Élément logistique" style={artTile(supportArt, 46)} />
        </div>
        <div>
          <div style={{ color: BLUE, fontSize: 10, fontWeight: 1100, letterSpacing: .7 }}>FEED OPÉRATIONNEL</div>
          <div style={{ marginTop: 3, color: SOFT, fontSize: 8 }}>{snapshot.lastEventLabel || 'Les prochains chargements apparaîtront ici.'}</div>
        </div>
        <button type="button" onClick={onOpenManifest} style={{ minHeight: 30, borderRadius: 12, padding: '0 10px', border: `1px solid ${GOLD}44`, background: `${GOLD}12`, color: GOLD, fontWeight: 1000, cursor: 'pointer' }}>MANIFESTE</button>
      </div>
      <div style={{ marginTop: 10, display: 'grid', gap: 7, minHeight: 0 }}>
        {events.length ? events.map((event: any, index: number) => {
          const color = event.type === 'miss' || event.type === 'series_lost' ? RED : event.type === 'contract_complete' || event.type === 'parcel_delivery' ? GREEN : event.type === 'overload' ? GOLD : BLUE;
          return <div key={`${event.type}-${index}-${event.label}`} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0,1fr)', gap: 8, alignItems: 'start', padding: '8px 9px', borderRadius: 12, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: color, boxShadow: `0 0 10px ${color}` }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 8.5, fontWeight: 1000, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.label}</div>
              <div style={{ marginTop: 2, color: SOFT, fontSize: 7.2 }}>{event.type.replace(/_/g, ' ')}</div>
            </div>
          </div>;
        }) : <div style={{ minHeight: 0, display: 'grid', placeItems: 'center', color: SOFT, fontSize: 8.2, borderRadius: 14, border: '1px dashed rgba(255,255,255,.10)' }}>Aucun événement marquant pour l’instant.</div>}
      </div>
    </div>
  </section>;
}
