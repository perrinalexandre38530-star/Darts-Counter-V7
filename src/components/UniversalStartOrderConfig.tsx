import * as React from 'react';
import { createPortal } from 'react-dom';

export type UniversalOrderMode = 'random' | 'alternate' | 'manual' | 'bull';
const OPTIONS: { id: UniversalOrderMode; label: string }[] = [
  { id: 'random', label: 'ALÉATOIRE' },
  { id: 'alternate', label: 'ALTERNÉ' },
  { id: 'manual', label: 'MANUEL' },
  { id: 'bull', label: 'BULL' },
];

/**
 * Mount inside the actual game configuration rather than in App's route shell.
 * This also handles legacy configurations that lack a dedicated start-order row.
 * The portal host is outside React's reconciled children and is cleaned on unmount.
 */
export default function UniversalStartOrderConfig({ route, mode, onChange }: {
  route: string;
  mode: UniversalOrderMode;
  onChange: (mode: UniversalOrderMode) => void;
}) {
  const [host, setHost] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    let holder: HTMLElement | null = null;
    let frame = 0;
    const root = document.querySelector<HTMLElement>('[data-msc-game-screen="config"]');
    if (!root) return;
    const place = () => {
      frame = 0;
      if (!root.isConnected) return;
      // Never insert into a mode-selection landing page (Partie rapide / Arcade).
      const entry = root.querySelector('[data-mss-entry-choice], [data-mss-game-entry-choice]');
      if (entry) { if (holder) { holder.remove(); holder = null; setHost(null); } return; }
      const launchButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
        .filter(b => !b.closest('[data-mss-universal-start-order]'))
        .find(b => /^(?:\s*(?:🚀|▶|🎯)\s*)?(?:LANCER|DÉMARRER|COMMENCER|JOUER|START|PLAY)(?:\s|$)/i.test((b.textContent || '').trim()));
      if (!launchButton) return;
      if (!holder) {
        holder = document.createElement('div');
        holder.setAttribute('data-mss-universal-start-order', '');
        holder.setAttribute('data-mss-config-route', route);
      }
      // Avoid mounting inside a fixed/sticky footer: it would obscure the start button.
      let anchor: HTMLElement = launchButton;
      let scan: HTMLElement | null = launchButton.parentElement;
      while (scan && scan !== root) {
        const position = window.getComputedStyle(scan).position;
        if (position === 'fixed' || position === 'sticky') {
          anchor = scan;
          break;
        }
        scan = scan.parentElement;
      }
      const target = anchor.parentElement;
      if (target && (holder.parentElement !== target || holder.nextSibling !== anchor)) {
        target.insertBefore(holder, anchor);
        setHost(holder);
      }
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(place); };
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    schedule();
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      holder?.remove();
    };
  }, [route]);
  if (!host) return null;
  return createPortal(
    <section aria-label="Service / ordre de départ" style={{ width: '100%', boxSizing: 'border-box', margin: '12px 0', padding: '14px', border: '1px solid rgba(212,182,110,.5)', borderRadius: 16, background: 'rgba(17,29,48,.95)', color: '#fff', textAlign: 'left' }}>
      <div style={{ fontSize: 14, fontWeight: 850, color: '#f6c44d', marginBottom: 10 }}>SERVICE / ORDRE DE DÉPART</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {OPTIONS.map(option => <button type="button" key={option.id} aria-pressed={mode === option.id} onClick={() => onChange(option.id)} style={{ padding: '9px 13px', borderRadius: 22, border: mode === option.id ? '1px solid #f6c44d' : '1px solid #586075', background: mode === option.id ? 'rgba(246,196,77,.2)' : '#111828', color: '#fff', fontWeight: 750 }}>{option.label}</button>)}
      </div>
      {(mode === 'manual' || mode === 'bull') && <div style={{ fontSize: 12, color: '#c9d2e5', marginTop: 8 }}>{mode === 'bull' ? 'Après le lancer physique à la bull, classe les participants avant de jouer.' : 'Classe manuellement les participants au lancement.'}</div>}
    </section>, host);
}
