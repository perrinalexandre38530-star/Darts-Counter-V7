import{R as w,j as t,bC as C}from"./index-Z6AeHU5N.js";import{P as T}from"./AdSlot-BR2ZrrA4.js";import{q as P,u as R}from"./App-CZqksUk0.js";import{P as $}from"./ProfileAvatar-cw4T1VZ2.js";import{P as I}from"./ProfileStarRing-B1WWEHKP.js";import{B as D}from"./BackDot-BBBUz6e9.js";import{n as _,c as E}from"./babyfootStatsAggregate-Cd7Me--w.js";import{b as z}from"./babyFootLevelStarring-BYPl0R1v.js";import"./SamsungTvSharedAppHost-BdYOJD1l.js";import"./x01CanonicalIndexStoreV2-pSUg_S18.js";import"./x01StatsContext-DdLpAOUR.js";import"./statsNormalized-DAsfAier.js";import"./babyfootPlayerStats-6iZG2xgi.js";function X({store:a,go:s}){var u,y,b,f,h,g,v,S,j;const{theme:e}=P(),{t:i}=R(),r=(u=a==null?void 0:a.profiles)!=null?u:[],o=(y=a==null?void 0:a.activeProfileId)!=null?y:null,n=(f=(b=r.find(m=>m.id===o))!=null?b:r[0])!=null?f:null,x=n?((h=i==null?void 0:i("statsShell.players.titleActivePrefix","STATS "))!=null?h:"STATS ")+n.name:(g=i==null?void 0:i("statsShell.players.titleDefault","STATS JOUEURS"))!=null?g:"STATS JOUEURS",d=w.useMemo(()=>{const m=Array.isArray(a==null?void 0:a.history)?a.history:[],A=_(m,{mode:"all",period:"ARV"}),k=E(A,r,String((n==null?void 0:n.id)||""));return z(k)},[a,r,n==null?void 0:n.id]),[p,l]=w.useState(null);return t.jsxs("div",{className:"stats-shell-page container",style:{minHeight:"100vh",display:"flex",flexDirection:"column",paddingTop:16,paddingBottom:0,alignItems:"center",background:e.bg,color:e.text},children:[t.jsx("style",{children:`
        .stats-shell-page {
          --title-min: 26px;
          --title-ideal: 8vw;
          --title-max: 40px;
          --card-pad: 14px;
          --menu-gap: 10px;
          --menu-title: 14px;
          --menu-sub: 12px;
        }
        @media (max-height: 680px), (max-width: 360px) {
          .stats-shell-page {
            --title-min: 24px;
            --title-ideal: 7vw;
            --title-max: 34px;
            --card-pad: 12px;
            --menu-gap: 8px;
            --menu-title: 13.5px;
            --menu-sub: 11px;
          }
        }

        .stats-shell-card { position: relative; }
        .stats-shell-card::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          background:
            radial-gradient(circle at 15% 0%, rgba(255,255,255,.10), transparent 60%);
          opacity: 0.0;
          pointer-events: none;
          animation: statsCardGlow 3.6s ease-in-out infinite;
          mix-blend-mode: screen;
        }
        @keyframes statsCardGlow {
          0%, 100% { opacity: 0.02; }
          50% { opacity: 0.12; }
        }

        .stats-shell-info-btn {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          border: 1px solid ${e.primary}88;
          background: radial-gradient(
            circle at 30% 30%,
            ${e.primary}33,
            rgba(0,0,0,0.85)
          );
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 17px;
          font-weight: 700;
          box-shadow:
            0 0 0 1px ${e.primary}33,
            0 0 10px ${e.primary}55;
          cursor: pointer;
          flex-shrink: 0;
          transition:
            transform .15s ease,
            box-shadow .15s ease,
            background .15s ease,
            opacity .15s ease;
          opacity: 0.9;
          position: relative;
          overflow: hidden;
        }
        .stats-shell-info-btn::before {
          content: "";
          position: absolute;
          inset: -40%;
          background: radial-gradient(
            circle,
            ${e.primary}66,
            transparent 65%
          );
          opacity: 0.0;
          transform: scale(0.8);
          animation: statsInfoGlow 2.6s ease-in-out infinite;
          pointer-events: none;
          mix-blend-mode: screen;
        }
        .stats-shell-info-btn:hover {
          transform: translateY(-1px) scale(1.03);
          box-shadow:
            0 0 0 1px ${e.primary}77,
            0 0 16px ${e.primary}88;
          opacity: 1;
        }
        .stats-shell-info-btn:active {
          transform: translateY(0) scale(0.98);
          box-shadow:
            0 0 0 1px ${e.primary}aa,
            0 0 8px ${e.primary}aa;
        }
        @keyframes statsInfoGlow {
          0%, 100% { opacity: 0.06; transform: scale(0.9); }
          50% { opacity: 0.25; transform: scale(1.05); }
        }
      `}),t.jsxs("div",{style:{width:"100%",maxWidth:"none",paddingInline:0,marginBottom:16},children:[t.jsxs("div",{style:{position:"relative",width:"100%",minWidth:0},children:[t.jsx("img",{src:C,alt:"Statistics Center",draggable:!1,style:{width:"100%",maxWidth:"none",height:"auto",display:"block",filter:`drop-shadow(0 0 14px ${e.primary}55)`}}),t.jsx("div",{style:{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",zIndex:5},children:t.jsx(D,{onClick:()=>s("babyfoot_menu")})})]}),t.jsx(T,{placement:"stats",slotKey:"page-stats-babyfoot-under-header",style:{marginTop:10,marginBottom:10,paddingInline:8}}),t.jsxs("div",{style:{marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,paddingInline:8},children:[t.jsx("div",{style:{fontSize:13,lineHeight:1.35,color:e.textSoft,maxWidth:320},children:"Analyse tes performances, les classements, les équipes et les duels (local)."}),t.jsx("button",{onClick:()=>s("sync_center"),style:{borderRadius:999,border:`1px solid ${e.primary}`,padding:"6px 12px",fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",background:e.card,color:e.primary,boxShadow:`0 0 12px ${e.primary}55`,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0},children:(v=i==null?void 0:i("statsShell.syncButton","Sync & partage"))!=null?v:"Sync & partage"})]})]}),t.jsxs("div",{className:"stats-shell-list",style:{width:"100%",maxWidth:"none",display:"flex",flexDirection:"column",gap:"var(--menu-gap)",paddingInline:12},children:[t.jsx(B,{profile:n,label:x,theme:e,levelScore:d,onClick:()=>s("babyfoot_stats_center",{scope:"active"}),onInfo:()=>l("players")}),t.jsx(c,{title:"PROFILS LOCAUX",subtitle:"Centre de stats multi-profils (mêmes onglets Match/Fun/Training/Défis).",theme:e,onClick:()=>s("babyfoot_stats_center",{scope:"locals"}),onInfo:()=>l("locals")}),t.jsx(c,{title:"CLASSEMENTS",subtitle:"Carte classement façon DartsCounter : points, ratio BP/BC, Win%, diff. et séries.",theme:e,onClick:()=>s("babyfoot_stats_center",{scope:"rankings",tab:"classements",onlyRankings:!0}),onInfo:()=>l("rankings")}),t.jsx(c,{title:"ÉQUIPES",subtitle:"Stats détaillées par équipe, teams par défaut et joueurs ayant participé.",theme:e,onClick:()=>s("babyfoot_stats_teams"),onInfo:()=>l("teams")}),t.jsx(c,{title:"HISTORIQUE",subtitle:"Toutes tes parties baby-foot terminées (filtres période/mode).",theme:e,onClick:()=>s("babyfoot_stats_history",{section:"history"}),onInfo:()=>l("history")}),t.jsx(c,{title:(S=i==null?void 0:i("statsShell.sync.title","SYNC & PARTAGE"))!=null?S:"SYNC & PARTAGE",subtitle:(j=i==null?void 0:i("statsShell.sync.subtitle","Export / import de stats, sync entre appareils et via le cloud."))!=null?j:"Export / import de stats, sync entre appareils et via le cloud.",theme:e,onClick:()=>s("sync_center"),onInfo:()=>l("sync")})]}),t.jsx("div",{style:{height:80}}),p&&t.jsx(F,{mode:p,theme:e,onClose:()=>l(null)})]})}function B({profile:a,label:s,theme:e,onClick:i,onInfo:r,levelScore:o=0}){return t.jsxs("div",{className:"stats-shell-card",style:{position:"relative",borderRadius:16,background:e.card,border:`1px solid ${e.borderSoft}`,boxShadow:`0 16px 32px rgba(0,0,0,.55), 0 0 18px ${e.primary}22`,overflow:"hidden"},children:[t.jsx("button",{onClick:i,style:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"var(--card-pad)",paddingRight:54,background:"transparent",border:"none",cursor:"pointer"},children:t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[t.jsx(W,{profile:a,theme:e,levelScore:o}),t.jsx("div",{style:{fontSize:"var(--menu-title)",fontWeight:900,letterSpacing:.6,textTransform:"uppercase",color:e.primary,textShadow:`0 0 10px ${e.primary}55`,whiteSpace:"normal",overflow:"hidden",textAlign:"left"},children:s})]})}),t.jsx("button",{type:"button",className:"stats-shell-info-btn",onClick:n=>{n.stopPropagation(),r==null||r()},"aria-label":"Informations",style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)"},children:"i"})]})}function W({profile:a,theme:s,levelScore:e=0}){var x,d,p;const n=Math.max(0,Math.min(180,Number(e||0)||0));return t.jsxs("div",{style:{position:"relative",width:44,height:44,flexShrink:0,overflow:"visible"},children:[n>0?t.jsx("div",{"aria-hidden":!0,style:{position:"absolute",left:-11,top:-11,width:44+(6+10/2)*2,height:44+(6+10/2)*2,pointerEvents:"none",overflow:"visible"},children:t.jsx(I,{anchorSize:44,gapPx:-2,starSize:10,stepDeg:10,rotationDeg:0,avg3d:n,animateGlow:!0})}):null,t.jsxs("div",{style:{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid ${s.primary}88`,boxShadow:`0 0 14px ${s.primary}55`,overflow:"hidden",background:"#000"},children:[a&&a.avatarDataUrl?t.jsx("img",{src:a.avatarDataUrl,alt:a.name,style:{width:"100%",height:"100%",objectFit:"cover"},draggable:!1}):t.jsx($,{size:44,dataUrl:void 0,label:((p=(d=(x=a==null?void 0:a.name)==null?void 0:x[0])==null?void 0:d.toUpperCase)==null?void 0:p.call(d))||"?",showStars:!1}),t.jsx("div",{style:{position:"absolute",inset:0,borderRadius:"50%",boxShadow:`inset 0 0 0 2px ${s.primary}40`,pointerEvents:"none"}})]})]})}function c({title:a,subtitle:s,theme:e,onClick:i,onInfo:r}){return t.jsxs("div",{className:"stats-shell-card",style:{position:"relative",borderRadius:16,background:e.card,border:`1px solid ${e.borderSoft}`,boxShadow:`0 16px 32px rgba(0,0,0,.55), 0 0 18px ${e.primary}22`,overflow:"hidden"},children:[t.jsx("button",{onClick:i,style:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"var(--card-pad)",paddingRight:54,background:"transparent",border:"none",cursor:"pointer"},children:t.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:6,textAlign:"left"},children:[t.jsx("div",{style:{fontSize:"var(--menu-title)",fontWeight:900,letterSpacing:.6,textTransform:"uppercase",color:e.primary,textShadow:`0 0 10px ${e.primary}55`},children:a}),t.jsx("div",{style:{fontSize:"var(--menu-sub)",lineHeight:1.35,color:e.textSoft,fontWeight:700},children:s})]})}),t.jsx("button",{type:"button",className:"stats-shell-info-btn",onClick:o=>{o.stopPropagation(),r==null||r()},"aria-label":"Informations",style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)"},children:"i"})]})}function F({mode:a,theme:s,onClose:e}){const i=a==="players"?"Joueurs":a==="locals"?"Profils locaux":a==="rankings"?"Classements":a==="teams"?"Équipes":a==="history"?"Historique":"Sync & partage",r=a==="players"?"Centre de stats du joueur actif (onglets Match / Fun / Training / Défis).":a==="locals"?"Centre de stats multi-profils (mêmes onglets Match / Fun / Training / Défis) — comme Darts Counter.":a==="rankings"?"Classements calculés sur tes matchs baby-foot (points, goal diff, etc.).":a==="teams"?"Stats équipes par composition réelle (Team A / Team B).":a==="history"?"Liste des matchs terminés avec filtres période et mode (1v1 / 2v2 / 2v1).":"Export/import et synchronisation entre appareils (cloud, device-to-device).";return t.jsx("div",{onClick:e,style:{position:"fixed",inset:0,background:"rgba(0,0,0,0.62)",display:"grid",placeItems:"center",padding:16,zIndex:1e3},children:t.jsxs("div",{onClick:o=>o.stopPropagation(),style:{width:"min(520px, 100%)",borderRadius:18,border:`1px solid ${s.borderSoft}`,background:s.card,boxShadow:`0 24px 60px rgba(0,0,0,.70), 0 0 22px ${s.primary}22`,padding:14},children:[t.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10},children:[t.jsx("div",{style:{fontWeight:950,letterSpacing:.6,color:s.primary,textTransform:"uppercase"},children:i}),t.jsx("button",{onClick:e,style:{border:`1px solid ${s.primary}77`,background:"transparent",color:s.text,borderRadius:999,padding:"6px 10px",fontWeight:900,cursor:"pointer"},children:"Fermer"})]}),t.jsx("div",{style:{marginTop:10,color:s.textSoft,fontWeight:800,lineHeight:1.35,fontSize:13},children:r})]})})}export{X as default};
