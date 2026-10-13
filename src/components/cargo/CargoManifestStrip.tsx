import React from 'react';
import { getCargoContractArt, getCargoSupportArt } from './cargoArt';

const ORANGE = '#ff9b42';
const GOLD = '#f6c256';
const GREEN = '#62e6a7';
const RED = '#ef5261';
const SOFT = '#aab1bf';

export default function CargoManifestStrip({ objectiveNow, activeContract, activeSeries, throwCount, isParcel, onOpenManifest }: any) {
  const progress = activeSeries?.count || 0;
  const target = Math.max(1, Number(activeContract?.targetCount || (isParcel ? 5 : 4)));
  const fill = Math.max(0, Math.min(100, (progress / target) * 100));
  const art = activeContract ? getCargoContractArt(activeContract) : getCargoSupportArt({ parcel: isParcel, stage: progress ? 'LOADING' : 'EMPTY' });
  const accent = activeContract?.fragile ? RED : activeContract?.urgent ? GOLD : activeContract ? GREEN : ORANGE;
  const stateLabel = activeContract?.fragile ? 'FRAGILE' : activeContract?.urgent ? 'EXPRESS' : activeContract ? 'CONTRAT ACTIF' : isParcel ? 'ADRESSE ACTIVE' : 'OBJECTIF ACTUEL';

  return <div className="cargo-manifest-strip" style={{ minWidth: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, alignItems: 'center', padding: '6px 10px', background: 'linear-gradient(90deg,rgba(0,0,0,.36),rgba(255,155,66,.035))', borderTop: '1px solid rgba(255,255,255,.055)' }}>
    <button type="button" onClick={onOpenManifest} style={{ minWidth: 0, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '42px minmax(0,1fr)', gap: 8, alignItems: 'center' }}>
        <div className="cargo-manifest-art" style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 11, background: `${accent}0d`, border: `1px solid ${accent}33`, overflow: 'hidden' }}>
          <img src={art} alt="Visuel de l’objectif" style={{ width: 40, height: 40, objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,.35))' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ flex: '0 0 auto', color: accent, fontSize: 6.2, fontWeight: 1100, letterSpacing: .65 }}>{stateLabel}</span>
            <span style={{ flex: '0 0 auto', width: 5, height: 5, borderRadius: 999, background: accent, boxShadow: `0 0 7px ${accent}` }} />
            <span style={{ minWidth: 0, color: GOLD, fontSize: 6.1, fontWeight: 1000, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>TOUCHE POUR LE MANIFESTE</span>
          </div>
          <div style={{ marginTop: 2, color: '#fff', fontSize: 9.1, lineHeight: 1.12, fontWeight: 1120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{objectiveNow}</div>
          <div style={{ marginTop: 4, height: 5, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.08)' }}>
            <div style={{ width: `${fill}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${accent}, ${GOLD})`, transition: 'width .2s ease' }} />
          </div>
        </div>
      </div>
    </button>

    <div className="cargo-manifest-progress" style={{ minWidth: 58, textAlign: 'right' }}>
      <div style={{ color: accent, fontSize: 10.2, lineHeight: 1, fontWeight: 1150 }}>{progress}/{target}</div>
      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end', gap: 3 }} aria-label={`${throwCount} fléchettes saisies sur 3`}>
        {[0, 1, 2].map((index) => <span key={index} style={{ width: 7, height: 7, borderRadius: 999, background: index < throwCount ? GOLD : 'rgba(255,255,255,.10)', border: `1px solid ${index < throwCount ? GOLD : 'rgba(255,255,255,.12)'}`, boxShadow: index < throwCount ? `0 0 6px ${GOLD}66` : 'none' }} />)}
      </div>
      <div style={{ marginTop: 3, color: throwCount === 3 ? GOLD : SOFT, fontSize: 6.2, fontWeight: 950 }}>{throwCount === 3 ? 'PRÊT À VALIDER' : `${3 - throwCount} flèche${3 - throwCount > 1 ? 's' : ''}`}</div>
    </div>
  </div>;
}
