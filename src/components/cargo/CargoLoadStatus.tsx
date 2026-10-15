import React from 'react';
import {
  buildCargoAimCue,
  buildCargoLastVisitFeedback,
  buildCargoMissionCue,
  buildCargoRiskCue,
  buildCargoVisualSnapshot,
  cargoPreviewDartLabel,
  cargoPreviewDartMatches,
} from '../../lib/gameEngines/cargoVisuals';
import { cargoContractTargetLabel } from '../../lib/gameEngines/cargoEngine';
import { getCargoContractArt, getCargoStageBadge, getCargoSupportArt } from './cargoArt';
import CargoVariantDashboard from './CargoVariantDashboard';

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
    background: 'linear-gradient(180deg,rgba(18,20,26,.95),rgba(7,9,13,.98))',
    boxShadow: '0 12px 28px rgba(0,0,0,.22)',
    padding: 8,
    boxSizing: 'border-box',
    overflow: 'hidden',
    position: 'relative',
  };
}
function labelStyle(color: string): React.CSSProperties {
  return { color, fontSize: 7.8, fontWeight: 1100, letterSpacing: .62 };
}
function statusColor(match: boolean | null | undefined) {
  if (match === true) return GREEN;
  if (match === false) return RED;
  return GOLD;
}

// V13 compatibility markers: 1 · OBJECTIF ACTUEL · 2 · DERNIÈRE VOLÉE · 3 · CHARGEMENT
export default function CargoLoadStatus({ state, stats, playerId, currentThrow = [], onOpenTruck, onOpenManifest }: any) {
  const snapshot = buildCargoVisualSnapshot(state, stats);
  const mission = buildCargoMissionCue(state, stats);
  const result = buildCargoLastVisitFeedback(state, playerId);
  const risk = buildCargoRiskCue(state, stats);
  const aim = buildCargoAimCue(state, stats);
  const accent = tone(snapshot.stage);
  const missionColor = cueColor(mission.tone);
  const resultColor = cueColor(result.tone);
  const riskColor = cueColor(risk.level);
  const badgeArt = getCargoStageBadge(snapshot.stage);
  const supportArt = getCargoSupportArt({ parcel: snapshot.unit === 'COLIS', stage: snapshot.stage });
  const suggestedContract = aim.suggestedContractId ? state.contracts?.find((contract: any) => String(contract.id) === String(aim.suggestedContractId)) : null;
  const activeContract = aim.contractId ? state.contracts?.find((contract: any) => String(contract.id) === String(aim.contractId)) : null;
  const contractForArt = activeContract || suggestedContract || null;
  const cardArt = contractForArt ? getCargoContractArt(contractForArt) : supportArt;
  const preview = (Array.isArray(currentThrow) ? currentThrow : []).slice(0, 3).map((dart: any, index: number) => ({
    dart,
    label: cargoPreviewDartLabel(dart),
    match: cargoPreviewDartMatches(state, stats, dart, currentThrow.slice(0, index)),
  }));
  const goodPreview = preview.filter((item: any) => item.match === true).length;
  const provisionalProgress = Math.min(aim.targetCount, aim.progress + goodPreview);
  const visualSlots = Math.max(2, Math.min(5, Number(aim.targetCount || 5)));
  const candidateContracts = !stats?.currentSeries && Array.isArray(state?.contracts) ? state.contracts.slice(0, 3) : [];

  return <section className="cargo-load-status cargo-gameplay-hud cargo-gameplay-board" style={{ minHeight: 0, display: 'grid', gridTemplateColumns: '1.02fr 1.18fr .92fr', gap: 8 }}>
    <button type="button" onClick={onOpenManifest} className="cargo-live-card" style={{ ...panelStyle(missionColor), cursor: 'pointer', textAlign: 'left' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: contractForArt ? .18 : .1, pointerEvents: 'none' }}><img src={cardArt} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(.9)' }} /></div>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(6,8,12,.98),rgba(6,8,12,.88) 58%,rgba(6,8,12,.58))' }} />
      <div style={{ position: 'relative', zIndex: 1, minHeight: 0 }}>
        <div style={labelStyle(missionColor)}>{aim.mode === 'choice' ? '1 · OBJECTIF CONSEILLÉ' : '1 · CIBLE LIVE'}</div>
        <div style={{ marginTop: 5, display: 'grid', gridTemplateColumns: '54px minmax(0,1fr)', gap: 7, alignItems: 'center' }}>
          <div className="cargo-live-target" style={{ width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', background: `${missionColor}13`, border: `1px solid ${missionColor}55`, boxShadow: `0 0 18px ${missionColor}16`, color: '#fff', fontSize: aim.label.length > 7 ? 12 : 18, lineHeight: 1, fontWeight: 1200, textAlign: 'center' }}>{aim.label}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 9.3, fontWeight: 1100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mission.label}</div>
            <div style={{ marginTop: 3, color: SOFT, fontSize: 7.2, lineHeight: 1.27, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{aim.detail}</div>
          </div>
        </div>
        {candidateContracts.length > 1 ? <div className="cargo-contract-candidates" style={{ marginTop: 7, display: 'flex', gap: 4, minWidth: 0, overflow: 'hidden' }}>{candidateContracts.map((contract: any) => <span key={contract.id} style={{ flex: '1 1 0', minWidth: 0, padding: '3px 4px', borderRadius: 8, background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.07)', color: contract.urgent ? GOLD : contract.fragile ? RED : '#dfe5ed', fontSize: 6.2, fontWeight: 1000, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{cargoContractTargetLabel(contract)}</span>)}</div> : null}
      </div>
    </button>

    <div className="cargo-live-load" style={{ ...panelStyle(accent), textAlign: 'left' }}>
      <div aria-hidden style={{ position: 'absolute', right: -12, bottom: -28, width: 108, height: 108, opacity: .085, pointerEvents: 'none' }}><img src={supportArt} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <div style={labelStyle(accent)}>2 · CHARGEMENT PHYSIQUE</div>
          <div style={{ color: accent, fontSize: 8, fontWeight: 1100 }}>{provisionalProgress}/{aim.targetCount}{goodPreview ? ` · +${goodPreview} aperçu` : ''}</div>
        </div>
        <div className="cargo-physical-load" style={{ marginTop: 7, display: 'grid', gridTemplateColumns: `repeat(${visualSlots},minmax(0,1fr))`, gap: 5, alignItems: 'end' }}>
          {Array.from({ length: visualSlots }).map((_, index) => {
            const reached = index < Math.min(visualSlots, provisionalProgress);
            const committed = index < Math.min(visualSlots, aim.progress);
            return <div key={index} className={reached ? `cargo-load-unit is-filled${committed ? ' is-committed' : ' is-preview'}` : 'cargo-load-unit'} style={{ minWidth: 0, height: 32, borderRadius: 9, border: `1px solid ${reached ? (committed ? GREEN : GOLD) : 'rgba(255,255,255,.08)'}`, background: reached ? `${committed ? GREEN : GOLD}10` : 'rgba(255,255,255,.025)', display: 'grid', placeItems: 'center', overflow: 'hidden', position: 'relative' }}>
              {reached ? <img src={snapshot.unit === 'COLIS' ? supportArt : (index >= 2 ? supportArt : cardArt)} alt="" style={{ width: 28, height: 28, objectFit: 'contain', filter: `drop-shadow(0 5px 8px ${committed ? GREEN : GOLD}22)` }} /> : <span style={{ color: 'rgba(255,255,255,.18)', fontSize: 15, fontWeight: 1200 }}>{index + 1}</span>}
              {reached ? <span style={{ position: 'absolute', right: 3, top: 2, color: committed ? GREEN : GOLD, fontSize: 7, fontWeight: 1200 }}>{committed ? '✓' : '+'}</span> : null}
            </div>;
          })}
        </div>
        <div style={{ marginTop: 5, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 6, alignItems: 'center' }}>
          <CargoVariantDashboard state={state} stats={stats} playerId={playerId} />
          <button type="button" onClick={onOpenTruck} title={`${risk.label} · ${risk.detail}`} style={{ width: 30, height: 30, padding: 0, borderRadius: 10, border: `1px solid ${riskColor}55`, background: `${riskColor}0e`, cursor: 'pointer', display: 'grid', placeItems: 'center' }}><img className="cargo-load-badge" src={badgeArt} alt="Ouvrir le chargement" style={{ width: 26, height: 26, objectFit: 'contain' }} /></button>
        </div>
      </div>
    </div>

    <div className="cargo-live-throw" style={{ ...panelStyle(resultColor), textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}><div style={labelStyle(resultColor)}>3 · VOLÉE LIVE</div><div style={{ color: SOFT, fontSize: 6.8 }}>{preview.length}/3</div></div>
      <div style={{ marginTop: 7, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 5 }}>
        {[0,1,2].map((index) => {
          const item = preview[index];
          const color = statusColor(item?.match);
          return <div key={index} className={item ? (item.match === false ? 'cargo-dart-slot is-bad' : item.match === true ? 'cargo-dart-slot is-good' : 'cargo-dart-slot is-special') : 'cargo-dart-slot'} style={{ height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 1, border: `1px solid ${item ? color + '66' : 'rgba(255,255,255,.08)'}`, background: item ? `${color}0d` : 'rgba(255,255,255,.025)' }}>
            <span style={{ color: item ? '#fff' : 'rgba(255,255,255,.18)', fontSize: item ? 10 : 12, fontWeight: 1150 }}>{item ? item.label : '—'}</span>
            {item ? <span style={{ color, fontSize: 6.2, fontWeight: 1100 }}>{item.match === true ? 'OK' : item.match === false ? 'HORS CIBLE' : 'SPÉCIAL'}</span> : null}
          </div>;
        })}
      </div>
      <div className={`cargo-last-result cargo-result-${result.tone}`} style={{ marginTop: 7, display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', gap: 6, alignItems: 'center', minWidth: 0 }}>
        <div style={{ width: 23, height: 23, borderRadius: 8, display: 'grid', placeItems: 'center', color: resultColor, background: `${resultColor}12`, border: `1px solid ${resultColor}44`, fontSize: 12, fontWeight: 1100 }}>{result.icon}</div>
        <div style={{ minWidth: 0 }}><div style={{ color: resultColor, fontSize: 6.7, fontWeight: 1100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.title}</div><div style={{ marginTop: 1, color: '#fff', fontSize: 8.2, fontWeight: 1050, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{result.value}</div></div>
      </div>
    </div>
  </section>;
}
