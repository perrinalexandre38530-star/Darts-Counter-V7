import React from 'react';
import { buildCargoGameplayBrief, buildCargoVisualSnapshot } from '../../lib/gameEngines/cargoVisuals';
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

function resultTone(toneValue: string) {
  if (toneValue === 'good') return GREEN;
  if (toneValue === 'warning') return GOLD;
  if (toneValue === 'danger') return RED;
  return BLUE;
}

function panelStyle(accent: string): React.CSSProperties {
  return {
    minHeight: 0,
    borderRadius: 18,
    border: `1px solid ${accent}44`,
    background: 'linear-gradient(180deg,rgba(18,20,26,.94),rgba(7,9,13,.97))',
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
    transition: 'width .24s ease',
  };
}

function artTile(src: string, size = 82): React.CSSProperties {
  return {
    width: size,
    height: size,
    objectFit: 'contain',
    display: 'block',
    filter: 'drop-shadow(0 10px 18px rgba(0,0,0,.35))',
  };
}

function MiniBrief({ label, value, detail, color }: any) {
  return <div className="cargo-gameplay-mini" style={{ minWidth: 0, borderRadius: 11, padding: '6px 7px', background: `${color}0b`, border: `1px solid ${color}35` }}>
    <div style={{ color, fontSize: 6.4, fontWeight: 1050, letterSpacing: .45 }}>{label}</div>
    <div style={{ marginTop: 2, color: '#fff', fontSize: 8.3, lineHeight: 1.15, fontWeight: 1050, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    {detail ? <div className="cargo-gameplay-mini-detail" style={{ marginTop: 2, color: SOFT, fontSize: 6.6, lineHeight: 1.18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail}</div> : null}
  </div>;
}

export default function CargoLoadStatus({ state, stats, playerId, onOpenTruck, onOpenManifest }: any) {
  const snapshot = buildCargoVisualSnapshot(state, stats);
  const brief = buildCargoGameplayBrief(state, stats, playerId);
  const accent = tone(snapshot.stage);
  const resultColor = resultTone(brief.resultTone);
  const badgeArt = getCargoStageBadge(snapshot.stage);
  const supportArt = getCargoSupportArt({ parcel: snapshot.unit === 'COLIS', stage: snapshot.stage });

  return <section className="cargo-load-status" style={{ minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1.12fr) minmax(0,.98fr)', gap: 8 }}>
    <button type="button" onClick={onOpenTruck} className="cargo-live-panel" style={{ ...panelStyle(accent), cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ position: 'absolute', right: -18, top: -12, width: 112, height: 112, opacity: .075, pointerEvents: 'none' }}><img src={supportArt} alt="" style={artTile(supportArt, 112)} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '82px minmax(0,1fr)', gap: 9, alignItems: 'center', height: '100%' }}>
        <div className="cargo-status-art" style={{ display: 'grid', placeItems: 'center', minHeight: 0 }}>
          <img className="cargo-load-badge" src={badgeArt} alt="Statut de chargement" style={artTile(badgeArt, 80)} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 7 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: accent, fontSize: 9.4, fontWeight: 1100, letterSpacing: .62, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{snapshot.stageLabel}</div>
              <div style={{ marginTop: 2, color: SOFT, fontSize: 7.3, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{snapshot.stageHint}</div>
            </div>
            <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
              <div style={{ color: accent, fontSize: 18, lineHeight: 1, fontWeight: 1150 }}>{Math.round(snapshot.fillPercent)}%</div>
              <div style={{ marginTop: 3, color: SOFT, fontSize: 6.4 }}>{snapshot.current}/{snapshot.target} {snapshot.unit}</div>
            </div>
          </div>
          <div style={{ marginTop: 7, height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.08)' }}>
            <div style={progressFill(snapshot.fillPercent, accent)} />
          </div>
          <div style={{ marginTop: 7, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 5 }}>
            {[
              [snapshot.unit === 'COLIS' ? 'COLIS' : 'PALETTES', snapshot.unit === 'COLIS' ? snapshot.parcelsReady : snapshot.palletsReady, ORANGE],
              ['CONTRATS', snapshot.contractsDone, GOLD],
              ['SÉRIE', `${snapshot.activeSeriesCount}/${snapshot.activeSeriesTarget}`, GREEN],
            ].map(([label, value, color]: any) => <div key={label} style={{ borderRadius: 10, padding: '5px 6px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.055)' }}>
              <div style={{ color: SOFT, fontSize: 5.9 }}>{label}</div>
              <div style={{ marginTop: 2, color, fontSize: 12.5, lineHeight: 1, fontWeight: 1100 }}>{value}</div>
            </div>)}
          </div>
        </div>
      </div>
    </button>

    <div className="cargo-gameplay-brief" style={{ ...panelStyle(ORANGE), display: 'grid', gridTemplateRows: 'auto auto minmax(0,1fr)', gap: 6 }}>
      <button type="button" onClick={onOpenManifest} style={{ minWidth: 0, padding: 0, border: 'none', background: 'transparent', color: '#fff', textAlign: 'left', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <div style={{ color: ORANGE, fontSize: 6.5, fontWeight: 1100, letterSpacing: .72 }}>À FAIRE MAINTENANT</div>
          <div style={{ color: GOLD, fontSize: 6.1, fontWeight: 1000 }}>MANIFESTE ›</div>
        </div>
        <div style={{ marginTop: 2, color: '#fff', fontSize: 10.2, lineHeight: 1.1, fontWeight: 1150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brief.targetLabel}</div>
        <div style={{ marginTop: 2, color: SOFT, fontSize: 6.9, lineHeight: 1.23, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brief.actionDetail}</div>
      </button>

      <div className="cargo-gameplay-risk-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 5 }}>
        <MiniBrief label="GAIN / BONUS" value={brief.rewardLabel} detail={brief.rewardDetail} color={GREEN} />
        <MiniBrief label="ATTENTION" value={brief.riskLabel} detail={brief.riskDetail} color={brief.riskLabel.includes('SURCHARGE') || brief.riskLabel.includes('CASSE') || brief.riskLabel.includes('EXPIRATION') ? RED : GOLD} />
      </div>

      {brief.onboarding ? <div className="cargo-onboarding" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 4, alignSelf: 'end' }}>
        {[['1', 'VISE'], ['2', 'LANCE ×3'], ['3', 'VALIDE']].map(([step, label]) => <div key={step} style={{ minWidth: 0, borderRadius: 9, padding: '5px 3px', textAlign: 'center', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)' }}><span style={{ color: ORANGE, fontSize: 6.2, fontWeight: 1100 }}>{step}</span><span style={{ marginLeft: 3, color: '#fff', fontSize: 6.5, fontWeight: 1000 }}>{label}</span></div>)}
      </div> : <div className="cargo-last-result" style={{ alignSelf: 'end', display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: 6, alignItems: 'center', minWidth: 0, borderRadius: 10, padding: '5px 6px', background: `${resultColor}0b`, border: `1px solid ${resultColor}32` }}>
        <div style={{ color: resultColor, fontSize: 8.4, fontWeight: 1150, whiteSpace: 'nowrap' }}>{brief.resultLabel}</div>
        <div style={{ minWidth: 0, color: SOFT, fontSize: 6.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brief.resultDetail}</div>
      </div>}
    </div>
  </section>;
}
