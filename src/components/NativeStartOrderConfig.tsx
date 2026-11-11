import * as React from 'react';

export type NativeStartOrderMode = 'random' | 'alternate' | 'manual' | 'bull';
const options: ReadonlyArray<{ value: NativeStartOrderMode; label: string }> = [
  { value: 'random', label: 'ALÉATOIRE' },
  { value: 'alternate', label: 'ALTERNÉ' },
  { value: 'manual', label: 'MANUEL' },
  { value: 'bull', label: 'BULL' },
];
/** Declared directly by configuration screens. No DOM observers, portals or external overlay. */
export default function NativeStartOrderConfig({ initialMode = "alternate", onModeChange }: { initialMode?: NativeStartOrderMode; onModeChange?: (mode: NativeStartOrderMode) => void } = {}) {
  const [mode, setMode] = React.useState<NativeStartOrderMode>(initialMode);
  React.useEffect(() => {
    // Reset only the host's choice when this native configuration is mounted.
    window.dispatchEvent(new CustomEvent('mss:start-order-changed', { detail: { mode, touched: false } }));
  }, []);
  const change = (next: NativeStartOrderMode) => {
    setMode(next);
    onModeChange?.(next);
    window.dispatchEvent(new CustomEvent('mss:start-order-changed', { detail: { mode: next, touched: true } }));
  };
  return <section data-mss-native-start-order aria-label="Service / ordre de départ" style={{ background: 'rgba(17,29,48,.95)', border: '1px solid rgba(212,182,110,.45)', borderRadius: 16, padding: 14, margin: '14px 0', width: '100%', boxSizing: 'border-box' }}>
    <div style={{ fontWeight: 850, color: '#f6c44d', marginBottom: 10 }}>SERVICE / ORDRE DE DÉPART</div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(o => <button type="button" key={o.value} aria-pressed={mode === o.value} onClick={() => change(o.value)} style={{ borderRadius: 22, padding: '9px 12px', color: '#fff', fontWeight: 800, border: mode === o.value ? '1px solid #f6c44d' : '1px solid #586075', background: mode === o.value ? 'rgba(246,196,77,.2)' : '#111828' }}>{o.label}</button>)}
    </div>
    {mode === 'bull' ? <p style={{ color: '#ced4e0', fontSize: 12, margin: '8px 0 0' }}>Après le lancer physique à la bull, définis l'ordre des participants.</p> : mode === 'manual' ? <p style={{ color: '#ced4e0', fontSize: 12, margin: '8px 0 0' }}>Choisis l'ordre des participants avant de jouer.</p> : null}
  </section>;
}
