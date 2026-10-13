import React from 'react';
import { buildCargoLastVisitFeedback, buildCargoMissionCue, buildCargoRiskCue, buildCargoVisualSnapshot } from '../../lib/gameEngines/cargoVisuals';
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
function cueColor(toneName: string) {
  if (toneName === 'good' || toneName === 'safe') return GREEN;
  if (toneName === 'warning' || toneName === 'watch') return GOLD;
  if (toneName === 'danger') return RED;
  return BLUE;
}
function panelStyle(accent: string): React.CSSProperties {
  return {
    minHeight: 0,
    borderRadius: 17,
    border: `1px solid ${accent}44`,
    background: 'linear-gradient(180deg,rgba(18,20,26,.94),rgba(7,9,13,.97))',
    boxShadow: '0 12px 28px rgba(0,0,0,.22)',
    padding: 9,
    boxSizing: 'border-box',
    overflow: 'hidden',
    position: 'relative',
  };
}
function labelStyle(color: string): React.CSSProperties {
  return { color, fontSize: 8.4, fontWeight: 1100, letterSpacing: .65 };
}

export default function CargoLoadStatus({ state, stats, playerId, onOpenTruck, onOpenManifest }: any) {
  const snapshot = buildCargoVisualSnapshot(state, stats);
  const mission = buildCargoMissionCue(state, stats);
  const result = buildCargoLastVisitFeedback(state, playerId);
  const risk = buildCargoRiskCue(state, stats);
  const accent = tone(snapshot.stage);
  const missionColor = cueColor(mission.tone);
  const resultColor = cueColor(result.tone);
  const riskColor = cueColor(risk.level);
  const badgeArt = getCargoStageBadge(snapshot.stage);
  const supportArt = getCargoSupportArt({ parcel: snapshot.unit === 'COLIS', stage: snapshot.stage });

  return <section className="cargo-load-status cargo-gameplay-hud" style={{ minHeight: 0, display: 'grid', gridTemplateColumns: '1.05fr 1.05fr .9fr', gap: 8 }}>
    <button type="button" onClick={onOpenManifest} style={{ ...panelStyle(missionColor), cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ position: 'absolute', right: -18, bottom: -24, width: 92, height: 92, opacity: .09, pointerEvents: 'none' }}><img src={supportArt} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
      <div style={labelStyle(missionColor)}>1 · OBJECTIF ACTUEL</div>
      <div style={{ marginTop: 6, color: '#fff', fontSize: 13, fontWeight: 1150, lineHeight: 1.05 }}>{mission.label}</div>
      <div style={{ marginTop: 6, color: SOFT, fontSize: 8.1, lineHeight: 1.35 }}>{mission.detail}</div>
      <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ color: missionColor, fontSize: 7.2, fontWeight: 1000 }}>TOUCHE POUR VOIR LE MANIFESTE</span>
        <span style={{ color: missionColor, fontSize: 15 }}>›</span>
      </div>
    </button>

    <div style={{ ...panelStyle(resultColor), textAlign: 'left' }}>
      <div style={labelStyle(resultColor)}>2 · DERNIÈRE VOLÉE</div>
      <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '32px minmax(0,1fr)', gap: 8, alignItems: 'center' }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, display: 'grid', placeItems: 'center', color: resultColor, background: `${resultColor}12`, border: `1px solid ${resultColor}44`, fontSize: 16, fontWeight: 1100 }}>{result.icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 11.5, fontWeight: 1100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.title}</div>
          <div style={{ marginTop: 2, color: resultColor, fontSize: 12, fontWeight: 1150 }}>{result.value}</div>
        </div>
      </div>
      <div style={{ marginTop: 7, color: SOFT, fontSize: 7.8, lineHeight: 1.35, minHeight: 21 }}>{result.detail}</div>
    </div>

    <button type="button" onClick={onOpenTruck} style={{ ...panelStyle(accent), cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ position: 'absolute', right: -6, top: -7, width: 62, height: 62, opacity: .24 }}><img src={badgeArt} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
      <div style={labelStyle(accent)}>3 · CHARGEMENT</div>
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <div style={{ color: accent, fontSize: 22, lineHeight: 1, fontWeight: 1200 }}>{Math.round(snapshot.fillPercent)}%</div>
        <div style={{ color: SOFT, fontSize: 7.2 }}>{snapshot.current}/{snapshot.target} {snapshot.unit}</div>
      </div>
      <div style={{ marginTop: 7, height: 7, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.08)' }}><div style={{ width: `${snapshot.fillPercent}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg,${accent},${GOLD})`, boxShadow: `0 0 12px ${accent}55` }} /></div>
      <div style={{ marginTop: 7, color: riskColor, fontSize: 7.5, fontWeight: 1100 }}>{risk.label}</div>
      <div style={{ marginTop: 3, color: SOFT, fontSize: 7.2, lineHeight: 1.25 }}>{risk.detail}</div>
    </button>
  </section>;
}
