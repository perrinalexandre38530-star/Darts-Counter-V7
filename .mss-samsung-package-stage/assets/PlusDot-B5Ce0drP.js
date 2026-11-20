import{R as x,j as a}from"./index-BmtklhE-.js";import{q as b}from"./App-CHAYk0jB.js";function g({onClick:r,color:o,glow:s,title:d="Ajouter / modifier",size:e=42}){const{theme:l}=b(),c=o!=null?o:l.primary,n=s!=null?s:`${c}88`,i=x.useCallback(t=>{var h,u;try{(h=t==null?void 0:t.preventDefault)==null||h.call(t),(u=t==null?void 0:t.stopPropagation)==null||u.call(t)}catch{}r==null||r(t)},[r]),p=Math.max(22,Math.round(e*.62));return a.jsx("div",{role:"button","aria-label":d,title:d,tabIndex:0,onPointerDown:i,onClick:i,onKeyDown:t=>{(t.key==="Enter"||t.key===" ")&&i(t)},style:{width:e,height:e,borderRadius:999,display:"grid",placeItems:"center",cursor:"pointer",userSelect:"none",WebkitTapHighlightColor:"transparent",border:`2px solid ${l.borderSoft}`,background:"rgba(0,0,0,0.48)",boxShadow:`0 0 0 2px rgba(0,0,0,0.22), 0 0 18px ${n}, 0 0 34px ${n}`,color:c,flex:"0 0 auto",pointerEvents:"auto"},children:a.jsx("svg",{width:p,height:p,viewBox:"0 0 1024 1024",xmlns:"http://www.w3.org/2000/svg","aria-hidden":"true",focusable:"false",style:{display:"block",filter:`drop-shadow(0 0 10px ${n}) drop-shadow(0 0 18px ${n})`},children:a.jsx("g",{transform:"translate(0.000000,1024.000000) scale(0.100000,-0.100000)",fill:"currentColor",stroke:"none",children:a.jsx("path",{d:`M4118 8924 c-62 -33 -58 54 -58 -1414 l0 -1340 -1340 0 c-1179 0
-1345 -2 -1370 -15 -63 -33 -60 22 -60 -1050 0 -1072 -3 -1017 60 -1050 25
-13 191 -15 1370 -15 l1340 0 0 -1340 c0 -1179 2 -1345 15 -1370 33 -63 -22
-60 1050 -60 1072 0 1017 -3 1050 60 13 25 15 191 15 1370 l0 1340 1340 0
c1179 0 1345 2 1370 15 63 33 60 -22 60 1050 0 1072 3 1017 -60 1050 -25 13
-191 15 -1370 15 l-1340 0 0 1340 c0 1473 4 1382 -60 1415 -44 22 -1971 22
-2012 -1z m1832 -1564 c0 -1473 -4 -1382 60 -1415 25 -13 191 -15 1370 -15
l1340 0 0 -825 0 -825 -1340 0 c-1473 0 -1382 4 -1415 -60 -13 -25 -15 -191
-15 -1370 l0 -1340 -825 0 -825 0 0 1340 c0 1179 -2 1345 -15 1370 -33 64 58
60 -1415 60 l-1340 0 0 825 0 825 1355 2 1355 3 27 28 28 27 3 1355 2 1355
825 0 825 0 0 -1340z`})})})})}export{g as P};
