import React from 'react';
import { getAppSeason, type AppSeason } from '../lib/seasonalThemes';
import './seasonalDoodle.css';

type Props = { season?: AppSeason; variant?: 'title' | 'cover'; className?: string };
type Motif = { x:number; y:number; s?:number; r?:number; delay?:number; className?: string };

const MapleLeaf = ({ x, y, s = 1, r = 0, delay = 0, className = '' }: Motif & { className?: string }) => (
  <g
    className={`mss-doodle-drifter ${className}`.trim()}
    style={{ animationDelay: `-${delay}s` }}
    transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
  >
    <path d="M0 39l-7-15-18 6 4-17-23-10 16-8-11-17 20 3 4-16L0-22l16-13 4 16 20-3-10 17 16 8-24 10 5 17-19-6Z" fill="url(#mss-maple-fill)" stroke="#ffd27b" strokeWidth="2.4" strokeLinejoin="round"/>
    <path d="M0 39V-24M0 9l-22-20M0 9l22-20M0 23l-17-9M0 23l17-9" stroke="#702b15" strokeWidth="2.2" fill="none" opacity=".7" strokeLinecap="round"/>
    <path d="M0 36l-4-13" stroke="#ffde9e" strokeWidth="1.2"/>
  </g>
);

const Pumpkin = ({ x, y, s = 1 }: Motif) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="7" rx="42" ry="29" fill="#7c290d" opacity=".45"/>
    <path d="M-42 0q-2-35 30-33Q0-44 12-33q32-2 30 33 2 32-42 31Q-44 32-42 0Z" fill="url(#mss-pumpkin-fill)" stroke="#ffb05a" strokeWidth="2.7"/>
    <path d="M-15-30q-20 27-5 58M15-30q20 27 5 58M0-33q-12 28 0 60" fill="none" stroke="#933b18" strokeWidth="3" opacity=".7"/>
    <path d="M0-31q-8-17 10-24" stroke="#739548" strokeWidth="7" fill="none" strokeLinecap="round"/>
    <path d="M8-40q19-12 25 0-13 12-25 0Z" fill="#78a04c" stroke="#b6c76c" strokeWidth="1.5"/>
    <path d="M-30-10q7-15 15-17" stroke="#ffd38b" opacity=".65" strokeWidth="3" fill="none" strokeLinecap="round"/>
  </g>
);

const Flake = ({ x, y, s = 1, delay = 0, className = '' }: Motif & { className?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} className={`mss-doodle-snowflake ${className}`.trim()} style={{ animationDelay: `-${delay}s` }} stroke="#dff9ff" strokeWidth="2.7" strokeLinecap="round" fill="none">
    {[0, 60, 120].map((a) => <g key={a} transform={`rotate(${a})`}><path d="M-25 0H25M-19-6l6 6-6 6M19-6l-6 6 6 6M-10-5l5 5-5 5M10-5l-5 5 5 5"/></g>)}
    <circle r="3" fill="#fff" stroke="none"/>
  </g>
);

const Fir = ({ x, y, s = 1 }: Motif) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-7 0V-115H8V0" fill="#58463a"/>
    <path d="M0-150l-35 54h14l-36 44h16L-65-10H65L41-52h16L21-96h14Z" fill="url(#mss-fir-fill)" stroke="#a9e8ed" strokeWidth="2"/>
    <path d="M-24-107q22 5 24-25 10 27 25 28M-42-55q22-4 42 0t42 0M-55-13q24-8 55 0t55 0" stroke="#f1fcff" strokeWidth="9" fill="none" strokeLinecap="round" opacity=".95"/>
  </g>
);

const Blossom = ({ x, y, s = 1, r = 0, delay = 0 }: Motif) => (
  <g className="mss-doodle-blossom" style={{ animationDelay: `-${delay}s` }} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    {[0,72,144,216,288].map((a) => <path key={a} transform={`rotate(${a})`} d="M0-3Q-24-18-9-35Q1-43 9-35Q24-18 0-3Z" fill="url(#mss-blossom-fill)" stroke="#fff2f3" strokeWidth="1.6"/>)}
    <circle r="9" fill="#ffda71" stroke="#fff1a5" strokeWidth="2"/>
    <circle r="3" fill="#fff7bf"/>
  </g>
);

const SummerLeaf = ({ x, y, s = 1, r = 0, className = '' }: Motif & { className?: string }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} className={className}>
    <path d="M0 47Q-66-13 0-62Q70-9 0 47Z" fill="url(#mss-summer-leaf)" stroke="#c4e794" strokeWidth="2"/>
    <path d="M0 42V-52M0 8l-29-28M0-11l21-22M0 29l24-24" stroke="#b7edb3" strokeWidth="2" fill="none"/>
  </g>
);

const Garland = ({ cover }: { cover: boolean }) => {
  const y = cover ? 50 : 40;
  const bulbs = [90, 170, 250, 330, 410, 500, 590, 670, 750, 830, 910];
  const colors = ['#ff6b6b', '#ffe16b', '#72f0ff', '#98ff7a', '#ff8be5'];
  return (
    <g>
      <path d={`M40 ${y}Q140 ${y+22} 240 ${y}T440 ${y}T640 ${y}T840 ${y}T960 ${y+2}`} fill="none" stroke="#2f4e65" strokeWidth="4" opacity=".75"/>
      {bulbs.map((x, i) => {
        const yy = y + 8 + Math.sin(i / 1.4) * 9;
        return (
          <g key={x} className="mss-doodle-garland-light" style={{ animationDelay: `${i * 0.45}s` }}>
            <path d={`M${x} ${yy-11}v9`} stroke="#f2ffff" strokeWidth="1.5" opacity=".8"/>
            <rect x={x-3} y={yy-4} width="6" height="4" rx="1.5" fill="#d9f4ff" opacity=".75"/>
            <ellipse cx={x} cy={yy+4} rx="7" ry="10" fill={colors[i % colors.length]} opacity=".95"/>
            <ellipse cx={x} cy={yy+4} rx="14" ry="18" fill={colors[i % colors.length]} opacity=".18"/>
          </g>
        );
      })}
    </g>
  );
};

const AutumnDetails = ({ cover }: { cover: boolean }) => (
  <>
    <path d="M-20 40C110 2 205 31 275 95" fill="none" stroke="#452718" strokeWidth={cover ? 18 : 15} strokeLinecap="round"/>
    <path d="M1020 40C890 2 795 31 725 95" fill="none" stroke="#452718" strokeWidth={cover ? 18 : 15} strokeLinecap="round"/>
    <path d="M-20 40C110 2 205 31 275 95" fill="none" stroke="#b3773e" strokeWidth="3" opacity=".85"/>
    <path d="M1020 40C890 2 795 31 725 95" fill="none" stroke="#b3773e" strokeWidth="3" opacity=".85"/>
    {[[70,28,1.25,-25,1],[150,68,.95,18,3],[240,98,.84,-32,5],[930,28,1.2,25,2],[850,68,.95,-18,4],[760,98,.84,32,6]].map(([x,y,s,r,d],i)=><MapleLeaf key={i} x={Number(x)} y={Number(y)} s={Number(s)} r={Number(r)} delay={Number(d)} />)}
    {[[90, cover ? 405 : 292, cover ? 1.15 : .74], [158, cover ? 420 : 304, cover ? .7 : .48], [910, cover ? 405 : 292, cover ? 1.15 : .74], [842, cover ? 420 : 304, cover ? .7 : .48]].map(([x,y,s], i) => <Pumpkin key={`p-${i}`} x={Number(x)} y={Number(y)} s={Number(s)} />)}
    {[[46,145,.56,-10,1],[118,176,.47,18,3],[902,147,.56,10,2],[830,176,.47,-18,4],[118, cover ? 355 : 252, .44,0,6],[882, cover ? 355 : 252, .44,0,7]].map(([x,y,s,r,d],i)=><MapleLeaf key={`m-${i}`} x={Number(x)} y={Number(y)} s={Number(s)} r={Number(r)} delay={Number(d)} className="mss-doodle-soft-drift" />)}
    <g opacity=".45">
      <circle cx="180" cy={cover ? 214 : 176} r="2.8" fill="#ffcb6a"/>
      <circle cx="820" cy={cover ? 224 : 182} r="2.4" fill="#ffb56b"/>
      <circle cx="130" cy={cover ? 245 : 212} r="1.9" fill="#ffd598"/>
      <circle cx="870" cy={cover ? 250 : 215} r="2.1" fill="#ffd598"/>
    </g>
  </>
);

const WinterDetails = ({ cover }: { cover: boolean }) => (
  <>
    <path d="M0 22Q85 7 170 18T340 19T500 17T660 19T830 18T1000 20V0H0Z" fill="url(#mss-snow-fill)" stroke="#bdefff" strokeWidth="2.8"/>
    {[60, 122, 194, 266, 338, 410, 520, 610, 700, 790, 872, 944].map((x, i) => <path key={x} d={`M${x-7} 20Q${x} 28 ${x+6} 20L${x+3} ${40 + (i % 3) * 10}Q${x} ${52 + (i % 3) * 10} ${x-3} ${40 + (i % 3) * 10}Z`} fill="url(#mss-ice-fill)" stroke="#bcefff" strokeWidth="1.2" opacity=".9"/>)}
    <Garland cover={cover} />
    <path d={`M0 ${cover ? 415 : 306}Q95 ${cover ? 388 : 286} 205 ${cover ? 408 : 297}T405 ${cover ? 409 : 300}T600 ${cover ? 405 : 300}T795 ${cover ? 408 : 296}T1000 ${cover ? 406 : 302}V500H0Z`} fill="url(#mss-snow-fill)" stroke="#91dfff" strokeWidth="3"/>
    <Fir x={cover ? 78 : 64} y={cover ? 410 : 302} s={cover ? 1.06 : .7} />
    <Fir x={cover ? 150 : 128} y={cover ? 420 : 308} s={cover ? .63 : .45} />
    <Fir x={cover ? 922 : 938} y={cover ? 410 : 302} s={cover ? 1.06 : .7} />
    <Fir x={cover ? 850 : 872} y={cover ? 420 : 308} s={cover ? .63 : .45} />
    {[[96,90,1.0,1],[190,150,.72,2],[310,88,.56,3],[435,170,.5,4],[582,90,.62,1],[700,160,.7,5],[815,104,.85,2],[910,170,.62,6],[140, cover ? 290 : 240, .42,3],[865, cover ? 290 : 240, .42,4]].map(([x,y,s,d],i)=><Flake key={i} x={Number(x)} y={Number(y)} s={Number(s)} delay={Number(d)} className="mss-doodle-soft-drift" />)}
  </>
);

const SpringDetails = ({ cover }: { cover: boolean }) => (
  <>
    <path d="M-15 34C110 10 210 40 280 102" fill="none" stroke="#46573a" strokeWidth={cover ? 15 : 12} strokeLinecap="round"/>
    <path d="M1015 34C890 10 790 40 720 102" fill="none" stroke="#46573a" strokeWidth={cover ? 15 : 12} strokeLinecap="round"/>
    <path d="M-15 34C110 10 210 40 280 102" fill="none" stroke="#b4cf93" strokeWidth="2.8" opacity=".9"/>
    <path d="M1015 34C890 10 790 40 720 102" fill="none" stroke="#b4cf93" strokeWidth="2.8" opacity=".9"/>
    {[[55,30,1.05,0,1],[150,65,.86,26,2],[244,103,.82,-18,4],[945,30,1.05,0,2],[850,65,.86,-26,3],[756,103,.82,18,5],[120, cover ? 372 : 264, .68,18,2],[880, cover ? 372 : 264, .68,-18,3]].map(([x,y,s,r,d],i)=><Blossom key={i} x={Number(x)} y={Number(y)} s={Number(s)} r={Number(r)} delay={Number(d)} />)}
    {[[82,116,.44,-18],[182,88,.41,28],[916,116,.44,18],[818,88,.41,-28]].map(([x,y,s,r],i)=><SummerLeaf key={i} x={Number(x)} y={Number(y)} s={Number(s)} r={Number(r)} className="mss-doodle-soft-drift" />)}
    <path d={`M0 ${cover ? 423 : 317}Q110 ${cover ? 390 : 290} 220 ${cover ? 417 : 313}T440 ${cover ? 416 : 315}T680 ${cover ? 421 : 318}T1000 ${cover ? 414 : 314}`} stroke="#a5df9c" strokeWidth="5" fill="none" opacity=".9"/>
    <g opacity=".72">
      {[[86, cover ? 404 : 304],[144, cover ? 396 : 300],[864, cover ? 404 : 304],[918, cover ? 396 : 300]].map(([x,y],i)=><circle key={i} cx={Number(x)} cy={Number(y)} r="4.5" fill="#ffd9ec"/>) }
      {[[98, cover ? 398 : 298],[156, cover ? 406 : 307],[852, cover ? 398 : 298],[906, cover ? 406 : 307]].map(([x,y],i)=><circle key={`y-${i}`} cx={Number(x)} cy={Number(y)} r="3.8" fill="#ffe56f"/>) }
    </g>
  </>
);

const SummerDetails = ({ cover }: { cover: boolean }) => (
  <>
    <circle cx={cover ? 858 : 872} cy={cover ? 76 : 66} r={cover ? 54 : 42} fill="url(#mss-sun-halo)"/>
    <circle cx={cover ? 858 : 872} cy={cover ? 76 : 66} r={cover ? 25 : 21} fill="url(#mss-sun-fill)" stroke="#fff0a9" strokeWidth="3"/>
    {Array.from({ length: 12 }, (_, i) => <path key={i} transform={`rotate(${i * 30} ${cover ? 858 : 872} ${cover ? 76 : 66})`} d={`M${cover ? 858 : 872} ${cover ? 42 : 35}v-15`} stroke="#ffdb83" strokeWidth="4" strokeLinecap="round"/>) }
    {[[48,112,1.05,-28],[116,148,.84,16],[182,106,.92,-14],[944,112,1.05,28],[876,148,.84,-16],[810,106,.92,14]].map(([x,y,s,r],i)=><SummerLeaf key={i} x={Number(x)} y={Number(y)} s={Number(s)} r={Number(r)} className="mss-doodle-soft-drift" />)}
    <path d={`M0 ${cover ? 420 : 315}Q135 ${cover ? 385 : 286} 270 ${cover ? 414 : 309}T520 ${cover ? 416 : 314}T760 ${cover ? 411 : 309}T1000 ${cover ? 418 : 314}`} stroke="#58aa84" strokeWidth="8" fill="none" opacity=".8"/>
    <g opacity=".72">
      {[[112, cover ? 387 : 292],[188, cover ? 395 : 298],[828, cover ? 389 : 293],[902, cover ? 396 : 299]].map(([x,y],i)=><circle key={i} cx={Number(x)} cy={Number(y)} r="4.8" fill="#ffe5a1"/>) }
    </g>
  </>
);

const Details = ({ season, cover }: { season: AppSeason; cover: boolean }) => {
  if (season === 'autumn') return <AutumnDetails cover={cover} />;
  if (season === 'winter') return <WinterDetails cover={cover} />;
  if (season === 'spring') return <SpringDetails cover={cover} />;
  return <SummerDetails cover={cover} />;
};

export default function SeasonalDoodle({ season = getAppSeason(), variant = 'title', className = '' }: Props) {
  const cover = variant === 'cover';
  return (
    <div className={`mss-seasonal-doodle mss-seasonal-doodle--${variant} mss-seasonal-doodle--${season} ${className}`.trim()} aria-hidden="true">
      <svg viewBox={cover ? '0 0 1000 450' : '0 0 1000 330'} preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id="mss-maple-fill" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffe19c"/><stop offset=".33" stopColor="#fc9d30"/><stop offset=".7" stopColor="#d65319"/><stop offset="1" stopColor="#8e2a17"/></linearGradient>
          <radialGradient id="mss-pumpkin-fill"><stop stopColor="#ffb859"/><stop offset=".56" stopColor="#f57b22"/><stop offset="1" stopColor="#ab3c12"/></radialGradient>
          <linearGradient id="mss-snow-fill" x2="0" y2="1"><stop stopColor="#fff"/><stop offset=".55" stopColor="#e3faff"/><stop offset="1" stopColor="#89cdf1"/></linearGradient>
          <linearGradient id="mss-ice-fill" x2="1" y2="1"><stop stopColor="#f6ffff"/><stop offset=".55" stopColor="#a9ecff" stopOpacity=".9"/><stop offset="1" stopColor="#69baf0" stopOpacity=".65"/></linearGradient>
          <linearGradient id="mss-fir-fill" x2="1" y2="1"><stop stopColor="#3a9b9f"/><stop offset=".6" stopColor="#13516c"/><stop offset="1" stopColor="#0a344b"/></linearGradient>
          <radialGradient id="mss-blossom-fill"><stop stopColor="#fff5fc"/><stop offset=".65" stopColor="#ffc4db"/><stop offset="1" stopColor="#e68bb5"/></radialGradient>
          <linearGradient id="mss-summer-leaf"><stop stopColor="#a7d96e"/><stop offset=".55" stopColor="#3fa474"/><stop offset="1" stopColor="#1d5e5b"/></linearGradient>
          <radialGradient id="mss-sun-halo"><stop stopColor="#ffdc7a" stopOpacity=".42"/><stop offset="1" stopColor="#ffc85a" stopOpacity="0"/></radialGradient>
          <radialGradient id="mss-sun-fill"><stop stopColor="#fff7c0"/><stop offset="1" stopColor="#ffb64a"/></radialGradient>
        </defs>
        <Details season={season} cover={cover} />
      </svg>
    </div>
  );
}
