import{r as d,j as e}from"./index-sg9Ny8PV.js";import{q as u,u as x}from"./App-DjgcQYNa.js";import{A as b}from"./ActiveProfileCard-CK_NEuTI.js";import{A as y}from"./ArcadeTicker-15ppsCmd.js";import{P as w}from"./AdSlot-DmUrd6qE.js";import{S as v}from"./SportHomeWelcomeHeader-O9mBnVpo.js";import"./SamsungTvSharedAppHost-C1F8S8mq.js";import"./ProfileAvatar-COD0dnlA.js";import"./ProfileStarRing-B5dPITr9.js";import"./x01CanonicalIndexStoreV2-BMNDP-jA.js";import"./x01StatsContext-DdLpAOUR.js";import"./statsNormalized-AOSoTCG1.js";import"./SportWelcomeWatermark-B7pA-DLx.js";import"./SeasonalDoodle-CmWWnL7M.js";import"./seasonalDecorationPreference-B6huo0Ob.js";const j=620,N=10,f={width:"100%",maxWidth:j,paddingInline:N};function C(i){var o,c,l;const s=i,t=(o=s==null?void 0:s.profiles)!=null?o:[],r=(c=s==null?void 0:s.activeProfileId)!=null?c:null;return t.length?r&&(l=t.find(a=>a.id===r))!=null?l:t[0]:null}function R(i=[]){const s=d.useRef(null),t=d.useRef(null),[r,o]=d.useState(1);return d.useLayoutEffect(()=>{const c=()=>{const a=s.current,n=t.current;if(!a||!n)return;n.style.transform="scale(1)",n.offsetHeight;const m=a.getBoundingClientRect().width,p=n.getBoundingClientRect().width;if(!m||!p)return;const g=p>m?Math.max(.75,Math.min(1,m/p)):1;o(g)};c();const l=()=>c();return window.addEventListener("resize",l),()=>window.removeEventListener("resize",l)},i),{wrapRef:s,textRef:t,scale:r}}const A=i=>`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(i)}`,h=A(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="350" viewBox="0 0 1200 350">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="80%">
      <stop offset="0%" stop-color="#1b1630"/>
      <stop offset="55%" stop-color="#0b0f18"/>
      <stop offset="100%" stop-color="#050710"/>
    </radialGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8b5cf6"/>
      <stop offset="0.5" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.35  0 0 0 0 1  0 0 0 0.9 0" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="350" fill="url(#bg)"/>
  <g opacity="0.18" filter="url(#glow)">
    <circle cx="240" cy="175" r="140" fill="#8b5cf6"/>
    <circle cx="980" cy="175" r="180" fill="#8b5cf6"/>
  </g>
  <g transform="translate(620 78)">
    <rect x="0" y="0" width="500" height="200" rx="26" fill="rgba(0,0,0,0.40)" stroke="rgba(255,255,255,0.14)"/>
    <text x="250" y="92" text-anchor="middle" font-family="Arial" font-size="56" font-weight="900" fill="url(#g)" filter="url(#glow)">DICE</text>
    <text x="250" y="138" text-anchor="middle" font-family="Arial" font-size="22" font-weight="800" fill="rgba(255,255,255,0.86)">SCORING</text>
  </g>
  <g transform="translate(160 85)">
    <rect x="0" y="0" width="180" height="180" rx="30" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.14)"/>
    <circle cx="55" cy="55" r="12" fill="rgba(255,255,255,0.55)"/>
    <circle cx="125" cy="55" r="12" fill="rgba(255,255,255,0.55)"/>
    <circle cx="55" cy="125" r="12" fill="rgba(255,255,255,0.55)"/>
    <circle cx="125" cy="125" r="12" fill="rgba(255,255,255,0.55)"/>
    <circle cx="90" cy="90" r="12" fill="rgba(255,255,255,0.55)"/>
  </g>
</svg>
`);function O({store:i,update:s,go:t}){var a,n,m;const{theme:r}=u(),{t:o}=x(),c=d.useMemo(()=>C(i),[i]);R([o,r]);const l=d.useMemo(()=>[{id:"dice_duel",title:"Dice Duel",subtitle:"2 joueurs • Score = somme",img:h,onClick:()=>t("dice_menu")},{id:"dice_stats",title:"Stats",subtitle:"(à venir) Historique & classements",img:h,onClick:()=>t("dice_menu")}],[t]);return e.jsx("div",{className:"msc-home-page msc-sport-home-page dice-home",style:{minHeight:"100vh",paddingTop:18,paddingBottom:96,background:r.bg,color:r.text,display:"flex",flexDirection:"column",alignItems:"center",gap:14},children:e.jsxs("div",{className:"msc-landscape-page-shell msc-home-layout msc-sport-home-layout",children:[e.jsx("div",{className:"msc-landscape-header msc-sport-home-header",children:e.jsx("div",{className:"msc-sport-home-header-inner",style:{...f,boxSizing:"border-box"},children:e.jsx(v,{sport:"dicegame",title:"DICE SCORING",welcome:o==null?void 0:o("home.welcome","Bienvenue"),accent:(a=r.primary)!=null?a:"#8b5cf6",borderSoft:(n=r.borderSoft)!=null?n:"rgba(255,255,255,0.10)"})})}),e.jsxs("section",{className:"msc-landscape-primary msc-home-primary msc-sport-home-primary",children:[e.jsx("div",{className:"msc-home-ad msc-home-ad--top",style:{...f,marginBottom:0},children:e.jsx(w,{placement:"home",slotKey:"page-home-dice-under-header"})}),e.jsx("div",{className:"msc-home-profile-slot msc-sport-home-profile",style:f,children:e.jsx(b,{theme:r,profile:c,onEdit:()=>t("profiles",{view:"me"}),onPick:()=>t("profiles",{view:"locals"})})})]}),e.jsxs("aside",{className:"msc-landscape-secondary msc-home-secondary msc-sport-home-secondary",children:[e.jsx("div",{className:"msc-sport-home-right-card",style:f,children:e.jsx(y,{items:l,theme:r})}),e.jsx("div",{className:"msc-sport-home-actions",style:f,children:e.jsx("button",{onClick:()=>t("games"),style:{width:"100%",borderRadius:16,padding:"14px 14px",border:`1px solid ${(m=r.borderSoft)!=null?m:"rgba(255,255,255,0.18)"}`,background:"rgba(255,255,255,0.08)",color:r.text,fontWeight:1e3,letterSpacing:.8,textTransform:"uppercase",cursor:"pointer"},children:"Aller aux jeux"})})]})]})})}export{O as default};
