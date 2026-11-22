import{R as y,j as t,bC as f}from"./index-sg9Ny8PV.js";import{P as S}from"./AdSlot-DmUrd6qE.js";import{q as g,u as v}from"./App-DjgcQYNa.js";import{P as j}from"./ProfileAvatar-COD0dnlA.js";import{P as w}from"./ProfileStarRing-B5dPITr9.js";import{B as A}from"./BackDot-MDRaQVpE.js";import"./SamsungTvSharedAppHost-C1F8S8mq.js";import"./x01CanonicalIndexStoreV2-BMNDP-jA.js";import"./x01StatsContext-DdLpAOUR.js";import"./statsNormalized-AOSoTCG1.js";function D({store:s,go:a}){var h,x,m,b;const{theme:e}=g(),{t:i}=v(),r=(h=s==null?void 0:s.profiles)!=null?h:[],l=(x=s==null?void 0:s.activeProfileId)!=null?x:null,n=(b=(m=r.find(o=>o.id===l))!=null?m:r[0])!=null?b:null,u=n?i("statsShell.players.titleActivePrefix","STATS ")+n.name:i("petanqueStatsShell.players.titleDefault","STATS JOUEURS"),[c,d]=y.useState(null);return t.jsxs("div",{className:"stats-shell-page container",style:{minHeight:"100vh",display:"flex",flexDirection:"column",paddingTop:16,paddingBottom:0,alignItems:"center",background:e.bg,color:e.text},children:[t.jsx("style",{children:`
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

        .stats-shell-card {
          position: relative;
        }
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
          0%, 100% {
            opacity: 0.06;
            transform: scale(0.9);
          }
          50% {
            opacity: 0.25;
            transform: scale(1.05);
          }
        }
      `}),t.jsxs("div",{style:{width:"100%",maxWidth:"none",paddingInline:0,marginBottom:16},children:[t.jsxs("div",{style:{position:"relative",width:"100%",minWidth:0},children:[t.jsx("img",{src:f,alt:"Statistics Center",draggable:!1,style:{width:"100%",maxWidth:"none",height:"auto",display:"block",filter:`drop-shadow(0 0 14px ${e.primary}55)`}}),t.jsx("div",{style:{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",zIndex:5},children:t.jsx(A,{onClick:()=>a("games")})})]}),t.jsx(S,{placement:"stats",slotKey:"page-stats-petanque-under-header",style:{marginTop:10,marginBottom:10,paddingInline:8}}),t.jsxs("div",{style:{marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,paddingInline:8},children:[t.jsx("div",{style:{fontSize:13,lineHeight:1.35,color:e.textSoft,maxWidth:320},children:i("statsShell.subtitle","Analyse tes performances, ton historique et synchronise tes stats.")}),t.jsx("button",{onClick:()=>a("sync_center"),style:{borderRadius:999,border:`1px solid ${e.primary}`,padding:"6px 12px",fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",background:e.card,color:e.primary,boxShadow:`0 0 12px ${e.primary}55`,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0},children:i("statsShell.syncButton","Sync & partage")})]})]}),t.jsxs("div",{className:"stats-shell-list",style:{width:"100%",maxWidth:"none",display:"flex",flexDirection:"column",gap:"var(--menu-gap)",paddingInline:12},children:[t.jsx(k,{profile:n,label:u,theme:e,onClick:()=>{var o;a("petanque_stats_players",{profileId:(o=n==null?void 0:n.id)!=null?o:null,mode:"active"})},onInfo:()=>d("players")}),t.jsx(p,{title:i("statsShell.locals.title","PROFILS LOCAUX"),subtitle:i("statsShell.locals.subtitle","Accède aux mêmes vues de stats pour tous les profils locaux."),theme:e,onClick:()=>{a("petanque_stats_players",{profileId:null,mode:"locals"})},onInfo:()=>d("locals")}),t.jsx(p,{title:i("petanqueStatsShell.teams.title","STATS ÉQUIPES"),subtitle:i("petanqueStatsShell.teams.subtitle","Bilan par équipe (victoires/défaites, points, régularité)."),theme:e,onClick:()=>{var o;a("petanque_stats_teams",{profileId:(o=n==null?void 0:n.id)!=null?o:null})},onInfo:()=>d("teams")}),t.jsx(p,{title:i("petanqueStatsShell.leaderboards.title","CLASSEMENTS"),subtitle:i("petanqueStatsShell.leaderboards.subtitle","Leaderboards joueurs/équipes selon la période."),theme:e,onClick:()=>{var o;return a("petanque_stats_leaderboards",{profileId:(o=n==null?void 0:n.id)!=null?o:null})},onInfo:()=>d("leaderboards")}),t.jsx(p,{title:i("petanqueStatsShell.matches.title","MATCHS"),subtitle:i("petanqueStatsShell.matches.subtitle","Liste des parties + détail d’un match."),theme:e,onClick:()=>{var o;return a("petanque_stats_matches",{profileId:(o=n==null?void 0:n.id)!=null?o:null})},onInfo:()=>d("matches")}),t.jsx(p,{title:i("petanqueStatsShell.history.title","HISTORIQUE"),subtitle:i("petanqueStatsShell.history.subtitle","Historique complet : filtres, recherche, reprise."),theme:e,onClick:()=>{var o;return a("petanque_stats_history",{profileId:(o=n==null?void 0:n.id)!=null?o:null})},onInfo:()=>d("history")}),t.jsx(p,{title:i("statsShell.sync.title","SYNC & PARTAGE"),subtitle:i("statsShell.sync.subtitle","Export / import de stats, sync entre appareils et via le cloud."),theme:e,onClick:()=>a("sync_center"),onInfo:()=>d("sync")})]}),t.jsx("div",{style:{height:80}}),c&&t.jsx(C,{mode:c,theme:e,t:i,onClose:()=>d(null)})]})}function k({profile:s,label:a,theme:e,onClick:i,onInfo:r}){return t.jsxs("div",{className:"stats-shell-card",style:{position:"relative",borderRadius:16,background:e.card,border:`1px solid ${e.borderSoft}`,boxShadow:`0 16px 32px rgba(0,0,0,.55), 0 0 18px ${e.primary}22`,overflow:"hidden"},children:[t.jsx("button",{onClick:i,style:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"var(--card-pad)",paddingRight:54,background:"transparent",border:"none",cursor:"pointer"},children:t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[t.jsx(q,{profile:s,theme:e}),t.jsx("div",{style:{fontSize:"var(--menu-title)",fontWeight:900,letterSpacing:.6,textTransform:"uppercase",color:e.primary,textShadow:`0 0 10px ${e.primary}55`,whiteSpace:"normal",overflow:"hidden",textAlign:"left"},children:a})]})}),t.jsx("button",{type:"button",className:"stats-shell-info-btn",onClick:l=>{l.stopPropagation(),r==null||r()},"aria-label":"Informations",style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)"},children:"i"})]})}function q({profile:s,theme:a}){var u,c;const l=(s==null?void 0:s.stats)||{},n=typeof l.avg3=="number"&&!Number.isNaN(l.avg3)?l.avg3:0;return t.jsxs("div",{style:{position:"relative",width:44,height:44,flexShrink:0},children:[t.jsx("div",{"aria-hidden":!0,style:{position:"absolute",left:-11,top:-11,width:44+(6+10/2)*2,height:44+(6+10/2)*2,pointerEvents:"none"},children:t.jsx(w,{profile:s,anchorSize:44,gapPx:-2,starSize:10,stepDeg:12,rotationDeg:0,avg3d:n})}),t.jsxs("div",{style:{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid ${a.primary}88`,boxShadow:`0 0 14px ${a.primary}55`,overflow:"hidden",background:"#000"},children:[s&&s.avatarDataUrl?t.jsx("img",{src:s.avatarDataUrl,alt:s.name,style:{width:"100%",height:"100%",objectFit:"cover"},draggable:!1}):t.jsx(j,{size:44,dataUrl:void 0,label:((c=(u=s==null?void 0:s.name)==null?void 0:u[0])==null?void 0:c.toUpperCase())||"?",showStars:!1}),t.jsx("div",{style:{position:"absolute",inset:0,borderRadius:"50%",boxShadow:`inset 0 0 0 2px ${a.primary}40`,pointerEvents:"none"}})]})]})}function p({title:s,subtitle:a,theme:e,onClick:i,onInfo:r}){return t.jsxs("div",{className:"stats-shell-card",style:{position:"relative",borderRadius:16,background:e.card,border:`1px solid ${e.borderSoft}`,boxShadow:`0 16px 32px rgba(0,0,0,.55), 0 0 18px ${e.primary}22`,overflow:"hidden"},children:[t.jsx("button",{onClick:i,style:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"var(--card-pad)",paddingRight:54,background:"transparent",border:"none",cursor:"pointer"},children:t.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:3,textAlign:"left"},children:[t.jsx("div",{style:{fontSize:"var(--menu-title)",fontWeight:900,letterSpacing:.6,textTransform:"uppercase",color:e.primary,textShadow:`0 0 10px ${e.primary}55`,whiteSpace:"normal",overflow:"hidden"},children:s}),t.jsx("div",{style:{fontSize:"var(--menu-sub)",color:e.textSoft,lineHeight:1.3,maxWidth:360,whiteSpace:"normal",overflow:"hidden"},children:a})]})}),t.jsx("button",{type:"button",className:"stats-shell-info-btn",onClick:l=>{l.stopPropagation(),r==null||r()},"aria-label":"Informations",style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)"},children:"i"})]})}function C({mode:s,theme:a,t:e,onClose:i}){let r="",l="";switch(s){case"players":r=e("petanqueStatsShell.info.players.title","STATS — Joueurs"),l=e("petanqueStatsShell.info.players.body","Bilan par joueur : points marqués/encaissés, +/- et séries. (Écran à créer ensuite.)");break;case"locals":r=e("statsShell.info.locals.title","PROFILS LOCAUX"),l=e("statsShell.info.locals.body","Accède aux mêmes vues de stats pour tous les profils locaux. (Écran à créer ensuite.)");break;case"teams":r=e("petanqueStatsShell.info.teams.title","STATS — Équipes"),l=e("petanqueStatsShell.info.teams.body","Bilan par équipe : victoires/défaites, points, régularité. (Écran à créer ensuite.)");break;case"leaderboards":r=e("petanqueStatsShell.info.leaderboards.title","CLASSEMENTS"),l=e("petanqueStatsShell.info.leaderboards.body","Classements joueurs/équipes selon la période. (Écran à créer ensuite.)");break;case"matches":r=e("petanqueStatsShell.info.matches.title","MATCHS"),l=e("petanqueStatsShell.info.matches.body","Liste des parties + ouverture du détail d’un match. (Écran à créer ensuite.)");break;case"history":r=e("petanqueStatsShell.info.history.title","HISTORIQUE"),l=e("petanqueStatsShell.info.history.body","Historique complet : filtres, recherche, reprise. (Écran à créer ensuite.)");break;case"sync":r=e("statsShell.info.sync.title","SYNC & PARTAGE"),l=e("statsShell.info.sync.body","Centralise toutes les options d’export / import : fichiers, JSON, sync directe entre appareils et synchronisation via le cloud.");break}return t.jsx("div",{style:{position:"fixed",left:0,right:0,top:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",zIndex:999},children:t.jsxs("div",{style:{maxWidth:420,marginInline:16,borderRadius:18,background:a.card,border:`1px solid ${a.borderSoft}`,boxShadow:"0 18px 40px rgba(0,0,0,.85)",padding:14,pointerEvents:"auto"},children:[t.jsx("div",{style:{fontSize:14,fontWeight:800,color:a.primary,marginBottom:6,textTransform:"uppercase",letterSpacing:.6},children:r}),t.jsx("div",{style:{fontSize:12.5,lineHeight:1.4,color:a.textSoft,marginBottom:10},children:l}),t.jsx("div",{style:{textAlign:"right"},children:t.jsx("button",{onClick:i,style:{borderRadius:999,border:"none",padding:"6px 16px",fontSize:12.5,fontWeight:700,background:a.primary,color:"#000",cursor:"pointer",boxShadow:`0 0 14px ${a.primary}55`},children:e("statsShell.info.close","Fermer")})})]})})}export{D as default};
