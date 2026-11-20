import{R as k,j as e,bz as T}from"./index-BmtklhE-.js";import{q as A,u as C,v as E,p as P}from"./App-CHAYk0jB.js";import{P as F}from"./AdSlot-DX8i8cJv.js";import{P as N}from"./ProfileAvatar-Bk9e3nBV.js";import{P as O,r as $}from"./ProfileStarRing-DogXMtGn.js";import{B as H}from"./BackDot-L3njBYGO.js";import"./SamsungTvSharedAppHost-DTV7wUqv.js";import"./x01CanonicalIndexStoreV2-p-6UVmEa.js";import"./x01StatsContext-DdLpAOUR.js";import"./statsNormalized-Q_dRm9_h.js";function K({store:r,go:i,sportOverride:a}){var g,f,S,v;const{theme:t}=A(),{t:s,lang:l}=C(),{sport:h}=E(),o=k.useCallback((x,I,w)=>P(l,x,I,w),[l]),u=String(a||h||"").toLowerCase(),m=u==="molkky",n=u==="fit",b=(g=r==null?void 0:r.profiles)!=null?g:[],R=(f=r==null?void 0:r.activeProfileId)!=null?f:null,c=(v=(S=b.find(x=>x.id===R))!=null?S:b[0])!=null?v:null,j=c?s("statsShell.players.titleActivePrefix","STATS ")+c.name:s("statsShell.players.titleDefault","STATS JOUEURS"),[y,d]=k.useState(null);return e.jsxs("div",{className:"stats-shell-page container msc-landscape-page-shell msc-stats-layout",style:{minHeight:"100vh",display:"flex",flexDirection:"column",paddingTop:16,paddingBottom:0,alignItems:"center",background:t.pageBackground||t.bg,backgroundAttachment:t.pageBackground?"fixed":void 0,backgroundPosition:"center top",backgroundSize:"cover",color:t.text},children:[e.jsx("style",{children:`
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
          border: 1px solid ${t.primary}88;
          background: radial-gradient(
            circle at 30% 30%,
            ${t.primary}33,
            rgba(0,0,0,0.85)
          );
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 17px;
          font-weight: 700;
          box-shadow:
            0 0 0 1px ${t.primary}33,
            0 0 10px ${t.primary}55;
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
            ${t.primary}66,
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
            0 0 0 1px ${t.primary}77,
            0 0 16px ${t.primary}88;
          opacity: 1;
        }
        .stats-shell-info-btn:active {
          transform: translateY(0) scale(0.98);
          box-shadow:
            0 0 0 1px ${t.primary}aa,
            0 0 8px ${t.primary}aa;
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
      `}),e.jsx("div",{className:"msc-landscape-header msc-stats-header",style:{width:"100%",maxWidth:"none",paddingInline:0,marginBottom:16},children:e.jsxs("div",{className:"msc-stats-ticker",style:{position:"relative",width:"100%",minWidth:0},children:[e.jsx("img",{src:T,alt:"Statistics Center",draggable:!1,style:{width:"100%",maxWidth:"none",height:"auto",display:"block",filter:`drop-shadow(0 0 14px ${t.primary}55)`}}),e.jsx("div",{style:{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",zIndex:5},children:e.jsx(H,{onClick:()=>i("games")})})]})}),e.jsxs("section",{className:"msc-landscape-primary msc-stats-primary",children:[e.jsx(F,{placement:"stats",slotKey:"page-stats-under-header",style:{marginTop:10,marginBottom:10,paddingInline:8}}),e.jsxs("div",{className:"msc-stats-summary",style:{marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,paddingInline:8},children:[e.jsx("div",{style:{fontSize:13,lineHeight:1.35,color:t.textSoft,maxWidth:320},children:m?o("Centre de statistiques Mölkky : joueur actif, profils locaux, classements et historique.","Mölkky statistics center: active player, local profiles, rankings and history.","Centro de estadísticas Mölkky: jugador activo, perfiles locales, clasificaciones e historial."):n?o("Centre de statistiques FIT PERF : volume, séries, 1RM, records, progression et historique.","FIT PERF statistics center: volume, sets, 1RM, records, progress and history.","Centro de estadísticas FIT PERF: volumen, series, 1RM, récords, progreso e historial."):s("statsShell.subtitle","Analyse tes performances, ton training, ton historique et synchronise tes stats.")}),e.jsx("button",{onClick:()=>i("sync_center"),style:{borderRadius:999,border:`1px solid ${t.primary}`,padding:"6px 12px",fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",background:t.card,color:t.primary,boxShadow:`0 0 12px ${t.primary}55`,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0},children:s("statsShell.syncButton","Sync & partage")})]}),e.jsxs("div",{className:"stats-shell-list msc-stats-primary-list",style:{width:"100%",display:"flex",flexDirection:"column",gap:"var(--menu-gap)",paddingInline:12},children:[e.jsx(D,{profile:c,label:j,theme:t,onClick:()=>{c&&i("statsHub",{tab:"stats",mode:"active",initialPlayerId:c.id,playerId:c.id,initialStatsSubTab:"dashboard"})},onInfo:()=>d("active")}),e.jsx(p,{title:n?o("PROFILS FIT PERF","FIT PERF PROFILES","PERFILES FIT PERF"):s("statsShell.locals.title","PROFILS LOCAUX"),subtitle:n?o("Retrouve les profils existants et leurs performances FIT PERF individuelles.","Open existing profiles and their individual FIT PERF performance.","Consulta los perfiles existentes y su rendimiento FIT PERF individual."):s("statsShell.locals.subtitle","Accède aux mêmes vues de stats pour tous les profils locaux."),theme:t,onClick:()=>{if(n){i("profiles",{view:"locals",sport:"fit"});return}i("statsHub",{tab:"stats",mode:"locals",initialPlayerId:null})},onInfo:()=>d("locals")})]})]}),e.jsxs("div",{className:"stats-shell-list msc-landscape-secondary msc-stats-secondary",style:{width:"100%",maxWidth:"none",display:"flex",flexDirection:"column",gap:"var(--menu-gap)",paddingInline:12},children:[e.jsx(p,{title:n?o("PROGRESSION & RECORDS","PROGRESS & RECORDS","PROGRESO Y RÉCORDS"):o("CLASSEMENTS","RANKINGS","CLASIFICACIONES"),subtitle:n?o("Volume, évolution hebdomadaire, records personnels et estimation 1RM.","Volume, weekly progress, personal records and estimated 1RM.","Volumen, evolución semanal, récords personales y 1RM estimado."):o("Classements globaux par mode de jeu (X01 multi, Cricket, Killer, etc.).","Global rankings by game mode (X01 multi, Cricket, Killer, etc.).","Clasificaciones globales por modo de juego (X01 multi, Cricket, Killer, etc.)."),theme:t,onClick:()=>{if(n){i("statsHub",{tab:"stats",mode:"active",fitView:"progress"});return}if(m){i("statsHub",{tab:"stats",mode:"locals",initialStatsSubTab:"leaderboards"});return}i("stats_leaderboards")},onInfo:()=>d("leaderboards")}),!m&&!n&&e.jsxs(e.Fragment,{children:[e.jsx(p,{title:s("statsShell.training.title","TRAINING"),subtitle:s("statsShell.training.subtitle","Stats complètes de tes sessions Training X01 et Tour de l’horloge."),theme:t,onClick:()=>i("statsHub",{tab:"training"}),onInfo:()=>d("training")}),e.jsx(p,{title:s("statsShell.online.title","ONLINE"),subtitle:s("statsShell.online.subtitle",'Stats de tes parties Online (quand tu joues en mode "Online").'),theme:t,onClick:()=>i("stats_online"),onInfo:()=>d("online")})]}),e.jsx(p,{title:n?o("HISTORIQUE DES SÉANCES","WORKOUT HISTORY","HISTORIAL DE SESIONES"):s("statsShell.history.title","HISTORIQUE"),subtitle:n?o("Toutes les séances FIT PERF enregistrées, avec volume, durée et séries réalisées.","All saved FIT PERF workouts with volume, duration and completed sets.","Todas las sesiones FIT PERF guardadas con volumen, duración y series completadas."):m?o("Historique des parties Mölkky locales et reprises en cours.","History of local Mölkky games and games currently in progress.","Historial de partidas locales de Mölkky y partidas en curso."):s("statsShell.history.subtitle","Toutes tes parties et reprise des parties en cours."),theme:t,onClick:()=>n?i("statsHub",{tab:"history",fitView:"history"}):m?i("statsHub",{tab:"stats",mode:"locals",initialPlayerId:null,initialStatsSubTab:"history"}):i("statsHub",{tab:"history"}),onInfo:()=>d("history")}),e.jsx(p,{title:s("statsShell.sync.title","SYNC & PARTAGE"),subtitle:s("statsShell.sync.subtitle","Export / import de stats, sync entre appareils et via le cloud."),theme:t,onClick:()=>i("sync_center"),onInfo:()=>d("sync")})]}),y&&e.jsx(z,{mode:y,theme:t,t:s,onClose:()=>d(null)})]})}function D({profile:r,label:i,theme:a,onClick:t,onInfo:s}){return e.jsxs("div",{className:"stats-shell-card",style:{position:"relative",borderRadius:16,background:a.card,border:`1px solid ${a.borderSoft}`,boxShadow:`0 16px 32px rgba(0,0,0,.55), 0 0 18px ${a.primary}22`,overflow:"hidden"},children:[e.jsx("button",{onClick:t,style:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"var(--card-pad)",paddingRight:54,background:"transparent",border:"none",cursor:"pointer"},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[e.jsx(L,{profile:r,theme:a}),e.jsx("div",{style:{fontSize:"var(--menu-title)",fontWeight:900,letterSpacing:.6,textTransform:"uppercase",color:a.primary,textShadow:`0 0 10px ${a.primary}55`,whiteSpace:"normal",overflow:"hidden",textAlign:"left"},children:i})]})}),e.jsx("button",{type:"button",className:"stats-shell-info-btn",onClick:l=>{l.stopPropagation(),s==null||s()},"aria-label":"Informations",style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)"},children:"i"})]})}function L({profile:r,theme:i}){var o,u;const l=(r==null?void 0:r.stats)||{},h=typeof l.avg3=="number"&&!Number.isNaN(l.avg3)?l.avg3:0;return e.jsxs("div",{style:{position:"relative",width:44,height:44,flexShrink:0},children:[e.jsx("div",{"aria-hidden":!0,style:{position:"absolute",left:-11,top:-11,width:44+(6+10/2)*2,height:44+(6+10/2)*2,pointerEvents:"none"},children:e.jsx(O,{profile:r,anchorSize:44,gapPx:-2,starSize:10,stepDeg:10,rotationDeg:0,avg3d:$(r)||h,animateGlow:!0})}),e.jsxs("div",{style:{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid ${i.primary}88`,boxShadow:`0 0 14px ${i.primary}55`,overflow:"hidden",background:"#000"},children:[r&&r.avatarDataUrl?e.jsx("img",{src:r.avatarDataUrl,alt:r.name,style:{width:"100%",height:"100%",objectFit:"cover"},draggable:!1}):e.jsx(N,{size:44,dataUrl:void 0,label:((u=(o=r==null?void 0:r.name)==null?void 0:o[0])==null?void 0:u.toUpperCase())||"?",showStars:!1}),e.jsx("div",{style:{position:"absolute",inset:0,borderRadius:"50%",boxShadow:`inset 0 0 0 2px ${i.primary}40`,pointerEvents:"none"}})]})]})}function p({title:r,subtitle:i,theme:a,onClick:t,onInfo:s}){return e.jsxs("div",{className:"stats-shell-card",style:{position:"relative",borderRadius:16,background:a.card,border:`1px solid ${a.borderSoft}`,boxShadow:`0 16px 32px rgba(0,0,0,.55), 0 0 18px ${a.primary}22`,overflow:"hidden"},children:[e.jsx("button",{onClick:t,style:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"var(--card-pad)",paddingRight:54,background:"transparent",border:"none",cursor:"pointer"},children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:3,textAlign:"left"},children:[e.jsx("div",{style:{fontSize:"var(--menu-title)",fontWeight:900,letterSpacing:.6,textTransform:"uppercase",color:a.primary,textShadow:`0 0 10px ${a.primary}55`,whiteSpace:"normal",overflow:"hidden"},children:r}),e.jsx("div",{style:{fontSize:"var(--menu-sub)",color:a.textSoft,lineHeight:1.3,maxWidth:360,whiteSpace:"normal",overflow:"hidden"},children:i})]})}),e.jsx("button",{type:"button",className:"stats-shell-info-btn",onClick:l=>{l.stopPropagation(),s==null||s()},"aria-label":"Informations",style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)"},children:"i"})]})}function z({mode:r,theme:i,t:a,onClose:t}){let s="",l="";switch(r){case"active":s=a("statsShell.info.active.title","STATS — Joueur actif"),l=a("statsShell.info.active.body","Accède aux statistiques complètes du joueur sélectionné : vue générale, stats locales, online et training pour tous les modes (X01, Cricket, etc.).");break;case"locals":s=a("statsShell.info.locals.title","STATS — Profils locaux"),l=a("statsShell.info.locals.body","Retrouve les mêmes vues de statistiques pour tous les profils enregistrés sur cet appareil et compare leurs performances.");break;case"leaderboards":s=a("statsShell.info.leaderboards.title","CLASSEMENTS"),l=a("statsShell.info.leaderboards.body","Vue dédiée aux classements globaux : tous les profils sont comparés pour chaque mode de jeu (X01 multi, Cricket, Killer, etc.).");break;case"training":s=a("statsShell.info.training.title","TRAINING"),l=a("statsShell.info.training.body","Analyse détaillée de tes séances d'entraînement : Training X01, Tour de l’horloge, progression globale et par segment.");break;case"online":s=a("statsShell.info.online.title","ONLINE"),l=a("statsShell.info.online.body","Analyse complète de tes matchs joués en mode Online : sessions, moyennes, gros scores, classement et progression.");break;case"history":s=a("statsShell.info.history.title","HISTORIQUE"),l=a("statsShell.info.history.body","Liste complète de l'historique de tes parties locales avec reprise des parties en cours et accès au détail de chaque match.");break;case"sync":s=a("statsShell.info.sync.title","SYNC & PARTAGE"),l=a("statsShell.info.sync.body","Centralise toutes les options d’export / import : fichiers, JSON, sync directe entre appareils et synchronisation via le cloud.");break}return e.jsx("div",{style:{position:"fixed",left:0,right:0,top:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",zIndex:999},children:e.jsxs("div",{style:{maxWidth:420,marginInline:16,borderRadius:18,background:i.card,border:`1px solid ${i.borderSoft}`,boxShadow:"0 18px 40px rgba(0,0,0,.85)",padding:14,pointerEvents:"auto"},children:[e.jsx("div",{style:{fontSize:14,fontWeight:800,color:i.primary,marginBottom:6,textTransform:"uppercase",letterSpacing:.6},children:s}),e.jsx("div",{style:{fontSize:12.5,lineHeight:1.4,color:i.textSoft,marginBottom:10},children:l}),e.jsx("div",{style:{textAlign:"right"},children:e.jsx("button",{onClick:t,style:{borderRadius:999,border:"none",padding:"6px 16px",fontSize:12.5,fontWeight:700,background:i.primary,color:"#000",cursor:"pointer",boxShadow:`0 0 14px ${i.primary}55`},children:a("statsShell.info.close","Fermer")})})]})})}export{K as default};
