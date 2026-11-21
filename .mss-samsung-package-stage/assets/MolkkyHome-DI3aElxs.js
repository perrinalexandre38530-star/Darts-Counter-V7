import{r as c,j as o}from"./index-Z6AeHU5N.js";import{q as D,u as K}from"./App-CZqksUk0.js";import{A as q}from"./ActiveProfileCard-DQShWJ3v.js";import{A as U}from"./ArcadeTicker-GO0ktR08.js";import{L as $}from"./LiveSportsHomeCard-B3uEaphZ.js";import{P as F}from"./AdSlot-BR2ZrrA4.js";import{u as O}from"./useHistory-DOv-94hZ.js";import{S as V}from"./SportHomeWelcomeHeader-wSHmO_Z0.js";import"./SamsungTvSharedAppHost-BdYOJD1l.js";import"./ProfileAvatar-cw4T1VZ2.js";import"./ProfileStarRing-B1WWEHKP.js";import"./x01CanonicalIndexStoreV2-pSUg_S18.js";import"./x01StatsContext-DdLpAOUR.js";import"./statsNormalized-DAsfAier.js";import"./SportWelcomeWatermark-BYzhb3XV.js";import"./SeasonalDoodle-BybXjGSX.js";import"./seasonalDecorationPreference-B6huo0Ob.js";const X=620,Y=10,y={width:"100%",maxWidth:X,paddingInline:Y};function J(h){var e,n,a;const s=h,i=(e=s==null?void 0:s.profiles)!=null?e:[],l=(n=s==null?void 0:s.activeProfileId)!=null?n:null;return i.length?l&&(a=i.find(d=>d.id===l))!=null?a:i[0]:null}function Q(h=[]){const s=c.useRef(null),i=c.useRef(null),[l,e]=c.useState(1);return c.useLayoutEffect(()=>{const n=()=>{const d=s.current,x=i.current;if(!d||!x)return;x.style.transform="scale(1)",x.offsetHeight;const m=d.getBoundingClientRect().width,g=x.getBoundingClientRect().width;if(!m||!g)return;const k=g>m?Math.max(.75,Math.min(1,m/g)):1;e(k)};n();const a=()=>n();return window.addEventListener("resize",a),()=>window.removeEventListener("resize",a)},h),{wrapRef:s,textRef:i,scale:l}}const v=h=>`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(h)}`,Z=v(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="350" viewBox="0 0 1200 350">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="80%">
      <stop offset="0%" stop-color="#1a2233"/>
      <stop offset="55%" stop-color="#0b0f18"/>
      <stop offset="100%" stop-color="#050710"/>
    </radialGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9cff6a"/>
      <stop offset="0.5" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#9cff6a"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.45  0 0 0 0 1  0 0 0 0 0.55  0 0 0 0.9 0" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="350" fill="url(#bg)"/>
  <g opacity="0.18" filter="url(#glow)">
    <circle cx="240" cy="175" r="140" fill="#9cff6a"/>
    <circle cx="980" cy="175" r="180" fill="#9cff6a"/>
  </g>
  <g transform="translate(650 78)">
    <rect x="0" y="0" width="420" height="200" rx="26" fill="rgba(0,0,0,0.40)" stroke="rgba(255,255,255,0.14)"/>
    <text x="210" y="92" text-anchor="middle" font-family="Arial" font-size="56" font-weight="900" fill="url(#g)">MÖLKKY</text>
    <text x="210" y="138" text-anchor="middle" font-family="Arial" font-size="22" font-weight="800" fill="rgba(255,255,255,0.86)">PREMIUM MODE</text>
  </g>
  <!-- quilles stylisées -->
  <g transform="translate(150 65)">
    <g fill="rgba(255,255,255,0.18)">
      <rect x="0" y="60" width="64" height="170" rx="18"/>
      <rect x="78" y="35" width="64" height="195" rx="18"/>
      <rect x="156" y="20" width="64" height="210" rx="18"/>
      <rect x="234" y="45" width="64" height="185" rx="18"/>
      <rect x="312" y="75" width="64" height="155" rx="18"/>
    </g>
    <g fill="rgba(0,0,0,0.35)">
      <text x="32" y="170" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900">1</text>
      <text x="110" y="170" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900">2</text>
      <text x="188" y="170" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900">3</text>
      <text x="266" y="170" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900">4</text>
      <text x="344" y="170" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900">5</text>
    </g>
  </g>
</svg>
`),tt=v(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="350" viewBox="0 0 1200 350">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#08101c"/>
      <stop offset="1" stop-color="#060812"/>
    </linearGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9cff6a"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="350" fill="url(#bg)"/>
  <text x="70" y="95" font-family="Arial" font-size="36" font-weight="900" fill="url(#g)">ASTUCE</text>
  <text x="70" y="150" font-family="Arial" font-size="26" font-weight="800" fill="rgba(255,255,255,0.88)">Vise la quille "1" ou "2"</text>
  <text x="70" y="190" font-family="Arial" font-size="22" font-weight="800" fill="rgba(255,255,255,0.75)">pour temporiser quand tu es proche de 50.</text>
  <g transform="translate(860 70)" opacity="0.22">
    <rect x="0" y="60" width="70" height="180" rx="18" fill="#ffffff"/>
    <rect x="85" y="30" width="70" height="210" rx="18" fill="#ffffff"/>
    <rect x="170" y="10" width="70" height="230" rx="18" fill="#ffffff"/>
  </g>
</svg>
`),et=v(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="350" viewBox="0 0 1200 350">
  <defs>
    <radialGradient id="bg" cx="45%" cy="40%" r="85%">
      <stop offset="0" stop-color="#111a2b"/>
      <stop offset="70%" stop-color="#070b14"/>
      <stop offset="100%" stop-color="#050710"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="350" fill="url(#bg)"/>
  <text x="70" y="92" font-family="Arial" font-size="36" font-weight="900" fill="#9cff6a">RÈGLE CLÉ</text>
  <text x="70" y="150" font-family="Arial" font-size="26" font-weight="900" fill="#ffffff">50 EXACT</text>
  <text x="70" y="190" font-family="Arial" font-size="22" font-weight="800" fill="rgba(255,255,255,0.75)">Au-delà → retour à 25 (option classique).</text>
</svg>
`);function wt({store:h,go:s}){var M,I,j,C,N;const{theme:i}=D(),l=K(),e=(M=l==null?void 0:l.t)!=null?M:((p,t)=>t),n=c.useMemo(()=>J(h),[h]),{rows:a,loading:d}=O(),x=c.useMemo(()=>(a!=null?a:[]).filter(t=>((t==null?void 0:t.kind)||(t==null?void 0:t.sport))==="molkky").sort((t,f)=>(Number((f==null?void 0:f.updatedAt)||(f==null?void 0:f.createdAt))||0)-(Number((t==null?void 0:t.updatedAt)||(t==null?void 0:t.createdAt))||0)),[a]),m=c.useMemo(()=>{var z,T,G,S,_,W;const p=x.length;let t=0,f=0,R="",E=0;const b=n==null?void 0:n.id;for(const r of x){const w=(T=(z=r==null?void 0:r.payload)!=null?z:r==null?void 0:r.data)!=null?T:{},u=(S=(G=w==null?void 0:w.summary)!=null?G:w)!=null?S:{},B=(_=u==null?void 0:u.winnerId)!=null?_:r==null?void 0:r.winnerId,H=(W=u==null?void 0:u.winnerName)!=null?W:"",P=Number((r==null?void 0:r.updatedAt)||(r==null?void 0:r.createdAt))||0;P>E&&(E=P,R=H||""),b&&B&&(B===b?t++:f++)}const L=p&&b?t/Math.max(1,t+f):0;return{played:p,wins:t,losses:f,winrate:L,lastWinner:R}},[x,n]);Q([i==null?void 0:i.primary,l==null?void 0:l.lang]);const g=c.useMemo(()=>[{title:e("molkky.ticker.hero","Mölkky"),subtitle:e("molkky.ticker.hero.sub","Mode Premium"),image:Z},{title:e("molkky.ticker.tip","Astuce"),subtitle:e("molkky.ticker.tip.sub","Temporise près de 50"),image:tt},{title:e("molkky.ticker.rule","Règle clé"),subtitle:e("molkky.ticker.rule.sub","50 exact + retour à 25"),image:et}],[e]),[k,A]=c.useState(0);return c.useEffect(()=>{const p=window.setInterval(()=>{A(t=>(t+1)%g.length)},7e3);return()=>window.clearInterval(p)},[g.length]),o.jsx("div",{className:"msc-home-page msc-sport-home-page molkky-home",style:{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center"},children:o.jsxs("div",{className:"msc-landscape-page-shell msc-home-layout msc-sport-home-layout",children:[o.jsx("div",{className:"msc-landscape-header msc-sport-home-header",children:o.jsx("div",{className:"msc-sport-home-header-inner",style:{...y,boxSizing:"border-box"},children:o.jsx(V,{sport:"molkky",title:e("molkky.title","Mölkky"),welcome:e("home.welcome","Bienvenue"),accent:(I=i.primary)!=null?I:"#F6C256",borderSoft:(j=i.borderSoft)!=null?j:"rgba(255,255,255,0.10)"})})}),o.jsxs("section",{className:"msc-landscape-primary msc-home-primary msc-sport-home-primary",children:[o.jsx("div",{className:"msc-home-ad msc-home-ad--top",style:{...y,marginBottom:0},children:o.jsx(F,{placement:"home",slotKey:"page-home-molkky-under-header"})}),o.jsx("div",{style:y,children:o.jsx($,{sport:"molkky",onClick:()=>s("live")})}),o.jsx("div",{className:"msc-home-profile-slot msc-sport-home-profile",style:{...y},children:o.jsx(q,{hideStatus:!0,profile:n,stats:{},globalTitle:e("molkky.home.global.title","Vue globale"),globalKpis:[{label:e("molkky.home.global.played","Parties"),value:d?"…":m.played},{label:e("molkky.home.global.wl","V / D"),value:d?"…":`${m.wins} / ${m.losses}`},{label:e("molkky.home.global.winrate","Winrate"),value:d?"…":`${Math.round(m.winrate*100)}%`},{label:e("molkky.home.global.last","Dernier vainqueur"),value:d?"…":m.lastWinner||"—"}]})})]}),o.jsxs("aside",{className:"msc-landscape-secondary msc-home-secondary msc-sport-home-secondary",children:[o.jsx("div",{className:"msc-sport-home-right-card",style:{...y,marginBottom:12},children:o.jsx(U,{items:g,activeIndex:k,onChangeIndex:A})}),o.jsxs("div",{className:"msc-sport-home-actions",style:{...y,display:"flex",justifyContent:"center",gap:10,marginTop:6,marginBottom:16},children:[o.jsx("button",{onClick:()=>s("molkky_config"),style:{borderRadius:999,padding:"10px 14px",border:`1px solid ${(C=i.cardSoft)!=null?C:"rgba(255,255,255,0.14)"}`,background:"rgba(255,255,255,0.08)",color:i.text,fontWeight:950,cursor:"pointer",boxShadow:"0 12px 28px rgba(0,0,0,0.28)"},children:e("molkky.cta.new","Nouvelle partie")}),o.jsx("button",{onClick:()=>s("molkky_menu"),style:{borderRadius:999,padding:"10px 14px",border:`1px solid ${(N=i.cardSoft)!=null?N:"rgba(255,255,255,0.14)"}`,background:"rgba(255,255,255,0.04)",color:i.text,fontWeight:900,cursor:"pointer",opacity:.96},children:e("molkky.cta.menu","Menu Mölkky")})]})]})]})})}export{wt as default};
