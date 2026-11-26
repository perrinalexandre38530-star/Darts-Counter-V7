import React from "react";

/** MSS — choix de vies de départ : contour cœur de KILLER, sans médaille + (réservée aux soins). */
export default function MssLivesHeartChoice({value,active,onClick,accent}:{value:number;active:boolean;onClick:()=>void;accent:string}) {
  const stroke=active?accent:`${accent}99`;
  return <button type="button" aria-label={`${value} vie${value>1?"s":""} de départ`} aria-pressed={active} onClick={onClick} style={{width:"100%",maxWidth:58,aspectRatio:"60 / 52",border:0,padding:0,background:"transparent",cursor:"pointer",display:"grid",placeItems:"center",filter:active?`drop-shadow(0 0 6px ${accent}44)`:"none",minWidth:0}}>
    <svg aria-hidden="true" viewBox="0 0 60 52" width="100%" fill="none">
      <path d="M30 46 25.8 42.2C14.5 32.4 6 25.5 6 16.7 6 10.5 11 6 17.1 6c5.4 0 9.5 2.4 12.9 6.4C33.4 8.4 37.5 6 42.9 6 49 6 54 10.5 54 16.7c0 8.8-8.5 15.7-19.8 25.5L30 46Z" stroke={stroke} strokeWidth={active?2.5:2.1} strokeLinejoin="round" fill={active?accent:"#0b101f"}/>
      <text x="30" y="29" fontSize="18" textAnchor="middle" fontWeight="900" fill={active?"#231806":"#f4f1ea"}>{value}</text>
    </svg>
  </button>;
}
