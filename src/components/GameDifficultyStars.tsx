import React from 'react';
import { MSS_DIFFICULTY_COLORS, MSS_DIFFICULTY_LABELS, mssGameDifficulty, type MSSDifficulty } from '../lib/mssVisualCharter';

type Props = { game?: string | {id?: string; category?: string; subCategory?: string; label?: string}; level?: MSSDifficulty; compact?: boolean; };
/** Presentational only. Does not intercept game-card navigation or InfoDot. */
export default function GameDifficultyStars({game, level, compact=false}: Props) {
  const rating = level ?? mssGameDifficulty(game || "");
  const title = `Difficulté MSS estimée : ${rating}/5 · ${MSS_DIFFICULTY_LABELS[rating-1]}`;
  return <span data-mss-difficulty={rating} title={title} role="img" aria-label={title}
    style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:compact?1:2,whiteSpace:'nowrap',flex:'0 0 auto',pointerEvents:'none'}}>
    {Array.from({length:rating},(_,i)=><span key={i} aria-hidden="true" style={{fontSize:compact?11:13,lineHeight:1,color:MSS_DIFFICULTY_COLORS[i],textShadow:`0 0 6px ${MSS_DIFFICULTY_COLORS[i]}55`}}>★</span>)}
  </span>;
}
