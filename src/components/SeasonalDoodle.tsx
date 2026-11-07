import React from 'react';
import { getAppSeason, type AppSeason } from '../lib/seasonalThemes';
import './seasonalDoodle.css';

type Props = { season?: AppSeason; variant?: 'title' | 'cover'; className?: string };
type Motif = { x:number; y:number; s?:number; r?:number; delay?:number; className?: string };

type VarStyle = React.CSSProperties & Record<string, string | number>;

const MapleLeafShape = () => (
  <>
    <path d="M0 39l-7-15-18 6 4-17-23-10 16-8-11-17 20 3 4-16L0-22l16-13 4 16 20-3-10 17 16 8-24 10 5 17-19-6Z" fill="url(#mss-maple-fill)" stroke="#ffd27b" strokeWidth="2.4" strokeLinejoin="round"/>
    <path d="M0 39V-24M0 9l-22-20M0 9l22-20M0 23l-17-9M0 23l17-9" stroke="#702b15" strokeWidth="2.2" fill="none" opacity=".7" strokeLinecap="round"/>
    <path d="M0 36l-4-13" stroke="#ffde9e" strokeWidth="1.2"/>
  </>
);

const MapleLeaf = ({ x, y, s = 1, r = 0, delay = 0, className = '', shade = 0 }: Motif & { className?: string; shade?: number }) => (
  <g className={className} style={{ animationDelay: `-${delay}s`, filter: `hue-rotate(${shade}deg)` }} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <MapleLeafShape />
  </g>
);

/** Trajectoire SVG en coordonnées du viewBox : départ branche -> sol -> disparition -> reprise. */
const FallingLeaf = ({ x, y, s = 1, r = 0, delay = 0, drift = 50, drop = 190, duration = 9 }: Motif & { drift?: number; drop?: number; duration?: number }) => {
  const start = `-${delay}s`;
  const endY = y + drop;
  const nearGround = drop * .92;
  return <g className="mss-falling-leaf" aria-hidden="true">
    <g>
      <animateTransform attributeName="transform" type="translate"
        values={`${x} ${y};${x + drift*.16} ${y + drop*.24};${x+drift*.7} ${y+drop*.58};${x+drift} ${y+nearGround};${x+drift*.92} ${endY}`}
        keyTimes="0;.24;.58;.91;1" dur={`${duration}s`} begin={start} repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;1;1;1;0" keyTimes="0;.08;.8;.94;1" dur={`${duration}s`} begin={start} repeatCount="indefinite"/>
      <g transform={`scale(${s})`}>
        <g>
          <animateTransform attributeName="transform" type="rotate" values={`${r};${r+26};${r-21};${r+80};${r+108}`} keyTimes="0;.24;.58;.91;1" dur={`${duration}s`} begin={start} repeatCount="indefinite"/>
          <MapleLeafShape />
        </g>
      </g>
    </g>
  </g>;
};

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

const FlakeShape = () => (
  <>
    {[0, 60, 120].map((a) => <g key={a} transform={`rotate(${a})`}><path d="M-25 0H25M-19-6l6 6-6 6M19-6l-6 6 6 6M-10-5l5 5-5 5M10-5l-5 5 5 5"/></g>)}
    <circle r="3" fill="#fff" stroke="none"/>
  </>
);

const Flake = ({ x, y, s = 1, delay = 0, className = '' }: Motif & { className?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} className={`mss-doodle-snowflake ${className}`.trim()} style={{ animationDelay: `-${delay}s` }} stroke="#dff9ff" strokeWidth="2.7" strokeLinecap="round" fill="none">
    <FlakeShape />
  </g>
);

const FallingFlake = ({ x, y, s = 1, delay = 0, drift = 26, drop = 240, duration = 10 }: Motif & { drift?: number; drop?: number; duration?: number }) => {
  const style: VarStyle = {
    '--mss-x': `${x}px`,
    '--mss-y': `${y}px`,
    '--mss-drift-1': `${drift * 0.45}px`,
    '--mss-drift-2': `${drift}px`,
    '--mss-drop': `${drop}px`,
    '--mss-duration': `${duration}s`,
    animationDelay: `-${delay}s`,
  };
  return (
    <g className="mss-fall-snow" style={style} stroke="#dff9ff" strokeWidth="2.5" strokeLinecap="round" fill="none">
      <g transform={`scale(${s})`} className="mss-fall-snow-spin">
        <FlakeShape />
      </g>
    </g>
  );
};

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

const Bee = ({ x, y, s = 1, delay = 0, range = 42 }: Motif & { range?: number }) => {
  const style: VarStyle = {
    '--mss-x': `${x}px`,
    '--mss-y': `${y}px`,
    '--mss-range': `${range}px`,
    animationDelay: `-${delay}s`,
  };
  return (
    <g className="mss-bee-flight" style={style}>
      <g transform={`scale(${s})`} className="mss-bee-wingbeat">
        <ellipse cx="0" cy="0" rx="10" ry="7" fill="#f4b11e" stroke="#603b06" strokeWidth="1.4"/>
        <path d="M-3-6h2M1-6h2M5-6h2" stroke="#5d3b09" strokeWidth="1.6"/>
        <ellipse cx="-10" cy="0" rx="4.5" ry="4.1" fill="#4f2d08"/>
        <ellipse cx="2" cy="-7" rx="5" ry="3" fill="#eefbff" opacity=".82" className="mss-bee-wing-left"/>
        <ellipse cx="8" cy="-7" rx="5" ry="3" fill="#eefbff" opacity=".82" className="mss-bee-wing-right"/>
        <path d="M-11-3q-3-4-7-5M-9 3q-4 3-6 6" stroke="#4f2d08" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
      </g>
    </g>
  );
};

const SummerLeaf = ({ x, y, s = 1, r = 0, className = '' }: Motif & { className?: string }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} className={className}>
    <path d="M0 47Q-66-13 0-62Q70-9 0 47Z" fill="url(#mss-summer-leaf)" stroke="#c4e794" strokeWidth="2"/>
    <path d="M0 42V-52M0 8l-29-28M0-11l21-22M0 29l24-24" stroke="#b7edb3" strokeWidth="2" fill="none"/>
  </g>
);

const HeatWave = ({ x, y, width = 110, delay = 0 }: { x: number; y: number; width?: number; delay?: number }) => {
  const style: VarStyle = { '--mss-wave-shift': `${width * 0.12}px`, animationDelay: `-${delay}s` };
  return (
    <path className="mss-heat-wave" style={style} d={`M${x} ${y}q${width*0.16} -12 ${width*0.32} 0t${width*0.32} 0t${width*0.32} 0`} stroke="#ffe6a5" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".7"/>
  );
};

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

const AutumnDetails = ({ cover }: { cover: boolean }) => {
  const ground = cover ? 402 : 296;
  // Branches denses, déployées en haut et sur les côtés. Centre dégagé pour le texte HTML.
  const attached: Array<[number,number,number,number]> = [
    [8,30,1.22,-31],[49,4,.94,32],[94,47,1.03,-18],[137,17,.83,47],
    [183,54,.92,-26],[227,27,.73,31],[265,85,.64,-20],[44,103,.77,17],
    [96,124,.62,-30],[184,111,.68,40],[292,40,.57,12],
    [992,26,1.15,28],[950,6,.9,-32],[908,48,1.02,23],[864,18,.86,-40],
    [815,58,.9,22],[767,28,.75,-34],[727,85,.64,25],[953,106,.76,-20],
    [903,126,.62,32],[812,108,.67,-35],[704,40,.57,-12]
  ];
  const pile: Array<[number,number,number,number]> = [
    [10,ground-12,.68,-39],[48,ground-3,.82,38],[83,ground-23,.65,-14],
    [125,ground-7,.82,41],[162,ground-29,.62,13],[199,ground-4,.73,-37],
    [236,ground-14,.57,39],[271,ground+4,.55,-21],[305,ground+11,.44,11],
    [690,ground+12,.46,-28],[727,ground+6,.52,30],[763,ground-13,.65,-24],
    [801,ground-5,.74,43],[840,ground-28,.65,-12],[875,ground-9,.82,-42],
    [913,ground-22,.7,22],[956,ground-5,.8,-19],[994,ground-14,.66,34],
    [38,ground-42,.43,-8],[115,ground-46,.46,28],[214,ground-35,.48,-12],
    [783,ground-38,.46,22],[891,ground-47,.47,-17],[968,ground-38,.46,13]
  ];
  // Des trajectoires distinctes, attachées à un point précis de la ramure.
  const falling: Array<[number,number,number,number,number,number,number,number]> = [
    [84,66,.46,-17,0,38,ground-66,8.6],
    [166,72,.38,29,2.6,25,ground-72,9.4],
    [236,57,.43,-24,5.1,51,ground-57,11.2],
    [39,109,.34,13,6.8,30,ground-109,10.3],
    [923,68,.47,17,1.3,-41,ground-68,9.1],
    [840,65,.39,-25,4.2,-35,ground-65,10.8],
    [765,69,.42,23,6.1,-48,ground-69,11.7],
    [961,109,.35,-19,7.4,-29,ground-109,10.1],
  ];
  return <>
    <path d="M-30 27C71-32 156-1 229 50C273 80 300 74 330 52M1030 27C929-32 844-1 771 50C727 80 700 74 670 52"
      fill="none" stroke="#271409" strokeWidth="24" strokeLinecap="round" opacity=".77"/>
    <path d="M-30 27C71-32 156-1 229 50C273 80 300 74 330 52M1030 27C929-32 844-1 771 50C727 80 700 74 670 52"
      fill="none" stroke="url(#mss-bark)" strokeWidth="17" strokeLinecap="round"/>
    <path d="M-9 32Q102-10 220 54M1009 32Q898-10 780 54" fill="none" stroke="#d99a62" strokeWidth="2.4" opacity=".6"/>
    <path d="M54 34Q27 89 9 126M151 13Q188 88 213 118M255 58Q291 99 302 132M946 34Q974 89 991 126M849 13Q812 88 787 118M745 58Q709 99 698 132"
      fill="none" stroke="#58311c" strokeWidth="6.5" strokeLinecap="round"/>
    <path d="M54 34Q27 89 9 126M151 13Q188 88 213 118M255 58Q291 99 302 132M946 34Q974 89 991 126M849 13Q812 88 787 118M745 58Q709 99 698 132"
      fill="none" stroke="#bb7745" strokeWidth="1.5" opacity=".7"/>
    {attached.map(([x,y,z,r],i)=><MapleLeaf key={`branch-${i}`} x={x} y={y} s={z} r={r} shade={[-11,0,7,15,-5][i%5]} />)}
    {falling.map(([x,y,z,r,delay,drift,drop,duration],i)=><FallingLeaf key={`fall-${i}`} x={x} y={y} s={z} r={r} delay={delay} drift={drift} drop={drop} duration={duration}/>)}
    <path d={`M-30 ${ground+9}Q35 ${ground-20} 112 ${ground-3}Q207 ${ground-23} 315 ${ground+14}L315 470H-30Z`}
      fill="url(#mss-leaf-bed)" opacity=".73"/>
    <path d={`M1030 ${ground+9}Q965 ${ground-20} 888 ${ground-3}Q793 ${ground-23} 685 ${ground+14}L685 470H1030Z`}
      fill="url(#mss-leaf-bed)" opacity=".73"/>
    {pile.map(([x,y,z,r],i)=><MapleLeaf key={`pile-${i}`} x={x} y={y} s={z} r={r} shade={[-14,0,10,18,-7][i%5]}/>)}
    {/* Le sol reste fixe, les feuilles mobiles s'effacent juste avant de le toucher. */}
  </>;
};

const WinterDetails = ({ cover }: { cover: boolean }) => {
  const snowY = cover ? 415 : 306;
  const drop = cover ? 360 : 250;
  return (
    <>
      <path d="M0 22Q85 7 170 18T340 19T500 17T660 19T830 18T1000 20V0H0Z" fill="url(#mss-snow-fill)" stroke="#bdefff" strokeWidth="2.8"/>
      {[60, 122, 194, 266, 338, 410, 520, 610, 700, 790, 872, 944].map((x, i) => <path key={x} d={`M${x-7} 20Q${x} 28 ${x+6} 20L${x+3} ${40 + (i % 3) * 10}Q${x} ${52 + (i % 3) * 10} ${x-3} ${40 + (i % 3) * 10}Z`} fill="url(#mss-ice-fill)" stroke="#bcefff" strokeWidth="1.2" opacity=".9"/>)}
      <Garland cover={cover} />

      {[ [85,24,.38,0,20,drop,10],[168,54,.28,1.2,-16,drop,11],[248,12,.34,2.4,18,drop,9.5],[330,44,.26,3.5,-22,drop,11.5],[432,26,.31,4.2,16,drop,10.2],[520,10,.36,1.6,-14,drop,12],[612,46,.24,2.8,20,drop,10.6],[708,18,.32,3.2,-18,drop,11.2],[810,36,.3,0.7,12,drop,9.8],[902,16,.34,2.2,-15,drop,10.8] ].map(([x,y,s,d,drift,dropV,dur],i)=><FallingFlake key={`ws-${i}`} x={x as number} y={y as number} s={s as number} delay={d as number} drift={drift as number} drop={dropV as number} duration={dur as number} />)}

      <path d={`M0 ${snowY}Q95 ${snowY-27} 205 ${snowY-7}T405 ${snowY-6}T600 ${snowY-10}T795 ${snowY-7}T1000 ${snowY-9}V500H0Z`} fill="url(#mss-snow-fill)" stroke="#91dfff" strokeWidth="3"/>
      <Fir x={cover ? 78 : 64} y={cover ? 410 : 302} s={cover ? 1.06 : .7} />
      <Fir x={cover ? 150 : 128} y={cover ? 420 : 308} s={cover ? .63 : .45} />
      <Fir x={cover ? 922 : 938} y={cover ? 410 : 302} s={cover ? 1.06 : .7} />
      <Fir x={cover ? 850 : 872} y={cover ? 420 : 308} s={cover ? .63 : .45} />
      {[[96,90,1.0,1],[190,150,.72,2],[310,88,.56,3],[435,170,.5,4],[582,90,.62,1],[700,160,.7,5],[815,104,.85,2],[910,170,.62,6],[140, cover ? 290 : 240, .42,3],[865, cover ? 290 : 240, .42,4]].map(([x,y,s,d],i)=><Flake key={i} x={x as number} y={y as number} s={s as number} delay={d as number} className="mss-doodle-soft-drift" />)}
    </>
  );
};

const SpringDetails = ({ cover }: { cover: boolean }) => {
  const groundY = cover ? 420 : 314;
  return (
    <>
      <path d="M-15 34C110 10 210 40 280 102" fill="none" stroke="#46573a" strokeWidth={cover ? 15 : 12} strokeLinecap="round"/>
      <path d="M1015 34C890 10 790 40 720 102" fill="none" stroke="#46573a" strokeWidth={cover ? 15 : 12} strokeLinecap="round"/>
      <path d="M-15 34C110 10 210 40 280 102" fill="none" stroke="#b4cf93" strokeWidth="2.8" opacity=".9"/>
      <path d="M1015 34C890 10 790 40 720 102" fill="none" stroke="#b4cf93" strokeWidth="2.8" opacity=".9"/>
      {[[55,30,1.05,0,1],[150,65,.86,26,2],[244,103,.82,-18,4],[945,30,1.05,0,2],[850,65,.86,-26,3],[756,103,.82,18,5],[120, cover ? 372 : 264, .68,18,2],[880, cover ? 372 : 264, .68,-18,3]].map(([x,y,s,r,d],i)=><Blossom key={i} x={x as number} y={y as number} s={s as number} r={r as number} delay={d as number} />)}
      {[[82,116,.44,-18],[182,88,.41,28],[916,116,.44,18],[818,88,.41,-28]].map(([x,y,s,r],i)=><SummerLeaf key={i} x={x as number} y={y as number} s={s as number} r={r as number} className="mss-branch-sway" />)}
      {[ [205,95,.82,0,0,44],[788,90,.82,1.3,0,40],[140,132,.7,2.4,0,28],[856,136,.7,3.1,0,28] ].map(([x,y,s,d,_,range],i)=><Bee key={i} x={x as number} y={y as number} s={s as number} delay={d as number} range={range as number} />)}
      <path d={`M0 ${groundY+6}Q110 ${groundY-24} 220 ${groundY}T440 ${groundY-2}T680 ${groundY+2}T1000 ${groundY-3}`} stroke="#a5df9c" strokeWidth="5" fill="none" opacity=".9"/>
      <g opacity=".72">
        {[[86, groundY-12],[144, groundY-20],[864, groundY-12],[918, groundY-20],[210,groundY-2],[792,groundY-2]].map(([x,y],i)=><circle key={i} cx={x as number} cy={y as number} r="4.5" fill="#ffd9ec"/>)}
        {[[98, groundY-18],[156, groundY-10],[852, groundY-18],[906, groundY-10],[226,groundY+3],[774,groundY+3]].map(([x,y],i)=><circle key={`y-${i}`} cx={x as number} cy={y as number} r="3.8" fill="#ffe56f"/>)}
      </g>
    </>
  );
};

const SummerDetails = ({ cover }: { cover: boolean }) => {
  const sunX = cover ? 858 : 872;
  const sunY = cover ? 76 : 66;
  const shoreY = cover ? 420 : 316;
  return (
    <>
      <g className="mss-sun-pulse">
        <circle cx={sunX} cy={sunY} r={cover ? 54 : 42} fill="url(#mss-sun-halo)"/>
        <circle cx={sunX} cy={sunY} r={cover ? 25 : 21} fill="url(#mss-sun-fill)" stroke="#fff0a9" strokeWidth="3"/>
        {Array.from({ length: 12 }, (_, i) => <path key={i} transform={`rotate(${i * 30} ${sunX} ${sunY})`} d={`M${sunX} ${cover ? 42 : 35}v-15`} stroke="#ffdb83" strokeWidth="4" strokeLinecap="round"/>) }
      </g>
      {[[48,112,1.05,-28],[116,148,.84,16],[182,106,.92,-14],[944,112,1.05,28],[876,148,.84,-16],[810,106,.92,14]].map(([x,y,s,r],i)=><SummerLeaf key={i} x={x as number} y={y as number} s={s as number} r={r as number} className="mss-branch-sway" />)}
      <HeatWave x={260} y={cover ? 136 : 122} width={128} delay={0} />
      <HeatWave x={438} y={cover ? 122 : 109} width={142} delay={1.6} />
      <HeatWave x={605} y={cover ? 144 : 130} width={128} delay={.8} />
      <path className="mss-summer-wave" d={`M0 ${shoreY}Q85 ${shoreY-14} 170 ${shoreY}T340 ${shoreY}T510 ${shoreY}T680 ${shoreY}T850 ${shoreY}T1000 ${shoreY}`} stroke="#81d8d0" strokeWidth="6" fill="none" opacity=".85"/>
      <path className="mss-summer-wave" style={{ animationDelay: '-1.2s' }} d={`M0 ${shoreY+14}Q105 ${shoreY+2} 210 ${shoreY+14}T420 ${shoreY+14}T630 ${shoreY+14}T840 ${shoreY+14}T1000 ${shoreY+14}`} stroke="#f4f2ba" strokeWidth="5" fill="none" opacity=".75"/>
      <g opacity=".72">
        {[[112, shoreY-24],[188, shoreY-18],[828, shoreY-22],[902, shoreY-16]].map(([x,y],i)=><circle key={i} cx={x as number} cy={y as number} r="4.8" fill="#ffe5a1"/>) }
      </g>
    </>
  );
};

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
          <linearGradient id="mss-bark" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#4a2818"/><stop offset=".48" stopColor="#9c5932"/><stop offset="1" stopColor="#321b12"/></linearGradient>
          <linearGradient id="mss-leaf-bed" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffae39" stopOpacity=".6"/><stop offset="1" stopColor="#6c270d" stopOpacity=".15"/></linearGradient>
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
