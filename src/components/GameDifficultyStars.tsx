import React from 'react';
import { MSS_DIFFICULTY_COLORS, mssDifficultyLabel, mssGameDifficulty, type MSSDifficulty } from '../lib/mssVisualCharter';

type Props = { game?: string | {id?: string; category?: string; subCategory?: string; label?: string}; level?: MSSDifficulty; compact?: boolean; showValue?: boolean };

/**
 * Compact difficulty indicator.
 * Rules requested by user:
 * - full stars appear first, then the half star on the RIGHT
 * - the left half of the final star is colored, facing the full stars
 * - no grey remainder must be visible on the half star
 * - shared by Arcade, Partie rapide, and every other MSS difficulty display
 */
export default function GameDifficultyStars({ game, level, compact = false, showValue = true }: Props) {
  const rating = level ?? mssGameDifficulty(game || '');
  const clipPrefix = React.useId().replace(/:/g, '');
  const title = `Difficulté MSS : ${rating}/5 · ${mssDifficultyLabel(rating)}`;
  const size = compact ? 13 : 16;
  const starPath = 'M12 2.1 15.05 8.3 21.9 9.3 16.95 14.15 18.12 21 12 17.75 5.88 21 7.05 14.15 2.1 9.3 8.95 8.3Z';
  const fullStars = Math.floor(rating);
  const hasHalf = Math.abs(rating - fullStars - 0.5) < 0.001;
  const colorIndex = Math.max(0, Math.min(MSS_DIFFICULTY_COLORS.length - 1, Math.ceil(rating) - 1));
  const starColor = MSS_DIFFICULTY_COLORS[colorIndex];

  return (
    <span
      data-mss-difficulty={rating}
      title={title}
      role="img"
      aria-label={title}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2, whiteSpace: 'nowrap', flex: '0 0 auto', pointerEvents: 'none' }}
    >
      <span aria-hidden="true" style={{ display: 'inline-flex', gap: 0, alignItems: 'center', paddingRight: 2 }}>
        {Array.from({ length: fullStars }, (_, i) => (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flexShrink: 0, marginRight: -2 }}>
            <path
              d={starPath}
              fill={starColor}
              stroke={starColor}
              strokeWidth="0.8"
              style={{ filter: `drop-shadow(0 0 4px ${starColor}88)` }}
            />
          </svg>
        ))}

        {hasHalf ? (
          <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flexShrink: 0, marginRight: -2 }}>
            <defs>
              <clipPath id={`${clipPrefix}-half-left`}>
                <rect x="0" y="0" width="12" height="24" />
              </clipPath>
            </defs>
            <path
              d={starPath}
              fill={starColor}
              stroke={starColor}
              strokeWidth="0.8"
              clipPath={`url(#${clipPrefix}-half-left)`}
              style={{ filter: `drop-shadow(0 0 4px ${starColor}88)` }}
            />
          </svg>
        ) : null}
      </span>
      {showValue ? <span aria-hidden="true" style={{ marginLeft: 2, fontSize: compact ? 10 : 12, color: '#ffe28a', fontWeight: 900, fontVariantNumeric: 'tabular-nums', textShadow: '0 1px 3px #000' }}>
        {Number.isInteger(rating) ? rating : rating.toFixed(1)}
      </span> : null}
    </span>
  );
}
