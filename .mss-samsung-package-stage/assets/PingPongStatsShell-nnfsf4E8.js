import{R as g,j as e,bC as y}from"./index-Z6AeHU5N.js";import{P as f}from"./AdSlot-BR2ZrrA4.js";import{q as S,u as v}from"./App-CZqksUk0.js";import{P as j}from"./ProfileAvatar-cw4T1VZ2.js";import{P as w,r as A}from"./ProfileStarRing-B1WWEHKP.js";import{B as k}from"./BackDot-BBBUz6e9.js";import"./SamsungTvSharedAppHost-BdYOJD1l.js";import"./x01CanonicalIndexStoreV2-pSUg_S18.js";import"./x01StatsContext-DdLpAOUR.js";import"./statsNormalized-DAsfAier.js";function B({store:s,go:a}){var u,x,h,m;const{theme:t}=S(),{t:i}=v(),n=(u=s==null?void 0:s.profiles)!=null?u:[],r=(x=s==null?void 0:s.activeProfileId)!=null?x:null,l=(m=(h=n.find(b=>b.id===r))!=null?h:n[0])!=null?m:null,p=l?i("statsShell.players.titleActivePrefix","STATS ")+l.name:i("statsShell.players.titleDefault","STATS JOUEURS"),[c,o]=g.useState(null);return e.jsxs("div",{className:"stats-shell-page container",style:{minHeight:"100vh",display:"flex",flexDirection:"column",paddingTop:16,paddingBottom:0,alignItems:"center",background:t.bg,color:t.text},children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{style:{width:"100%",maxWidth:"none",paddingInline:0,marginBottom:16},children:[e.jsxs("div",{style:{position:"relative",width:"100%",minWidth:0},children:[e.jsx("img",{src:y,alt:"Statistics Center",draggable:!1,style:{width:"100%",maxWidth:"none",height:"auto",display:"block",filter:`drop-shadow(0 0 14px ${t.primary}55)`}}),e.jsx("div",{style:{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",zIndex:5},children:e.jsx(k,{onClick:()=>a("pingpong_menu")})})]}),e.jsx(f,{placement:"stats",slotKey:"page-stats-pingpong-under-header",style:{marginTop:10,marginBottom:10,paddingInline:8}}),e.jsxs("div",{style:{marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,paddingInline:8},children:[e.jsx("div",{style:{fontSize:13,lineHeight:1.35,color:t.textSoft,maxWidth:320},children:i("statsShell.subtitle","Analyse tes performances, ton training, ton historique et synchronise tes stats.")}),e.jsx("button",{onClick:()=>a("sync_center"),style:{borderRadius:999,border:`1px solid ${t.primary}`,padding:"6px 12px",fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",background:t.card,color:t.primary,boxShadow:`0 0 12px ${t.primary}55`,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0},children:i("statsShell.syncButton","Sync & partage")})]})]}),e.jsxs("div",{className:"stats-shell-list",style:{width:"100%",maxWidth:"none",display:"flex",flexDirection:"column",gap:"var(--menu-gap)",paddingInline:12},children:[e.jsx(C,{profile:l,label:p,theme:t,onClick:()=>{l&&a("statsHub",{tab:"stats",mode:"active",initialPlayerId:l.id,playerId:l.id,initialStatsSubTab:"dashboard"})},onInfo:()=>o("active")}),e.jsx(d,{title:i("statsShell.locals.title","PROFILS LOCAUX"),subtitle:i("statsShell.locals.subtitle","Accède aux mêmes vues de stats pour tous les profils locaux."),theme:t,onClick:()=>{a("statsHub",{tab:"stats",mode:"locals",initialPlayerId:null})},onInfo:()=>o("locals")}),e.jsx(d,{title:"CLASSEMENTS",subtitle:"Classements globaux par mode de jeu (X01 multi, Cricket, Killer, etc.).",theme:t,onClick:()=>a("stats_leaderboards"),onInfo:()=>o("leaderboards")}),e.jsx(d,{title:i("statsShell.training.title","TRAINING"),subtitle:i("statsShell.training.subtitle","Stats complètes de tes sessions Training X01 et Tour de l’horloge."),theme:t,onClick:()=>a("statsHub",{tab:"training"}),onInfo:()=>o("training")}),e.jsx(d,{title:i("statsShell.online.title","ONLINE"),subtitle:i("statsShell.online.subtitle",'Stats de tes parties Online (quand tu joues en mode "Online").'),theme:t,onClick:()=>a("stats_online"),onInfo:()=>o("online")}),e.jsx(d,{title:i("statsShell.history.title","HISTORIQUE"),subtitle:i("statsShell.history.subtitle","Toutes tes parties et reprise des parties en cours."),theme:t,onClick:()=>a("pingpong_stats_history"),onInfo:()=>o("history")}),e.jsx(d,{title:i("statsShell.sync.title","SYNC & PARTAGE"),subtitle:i("statsShell.sync.subtitle","Export / import de stats, sync entre appareils et via le cloud."),theme:t,onClick:()=>a("sync_center"),onInfo:()=>o("sync")})]}),e.jsx("div",{style:{height:80}}),c&&e.jsx(T,{mode:c,theme:t,t:i,onClose:()=>o(null)})]})}function C({profile:s,label:a,theme:t,onClick:i,onInfo:n}){return e.jsxs("div",{className:"stats-shell-card",style:{position:"relative",borderRadius:16,background:t.card,border:`1px solid ${t.borderSoft}`,boxShadow:`0 16px 32px rgba(0,0,0,.55), 0 0 18px ${t.primary}22`,overflow:"hidden"},children:[e.jsx("button",{onClick:i,style:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"var(--card-pad)",paddingRight:54,background:"transparent",border:"none",cursor:"pointer"},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[e.jsx(I,{profile:s,theme:t}),e.jsx("div",{style:{fontSize:"var(--menu-title)",fontWeight:900,letterSpacing:.6,textTransform:"uppercase",color:t.primary,textShadow:`0 0 10px ${t.primary}55`,whiteSpace:"normal",overflow:"hidden",textAlign:"left"},children:a})]})}),e.jsx("button",{type:"button",className:"stats-shell-info-btn",onClick:r=>{r.stopPropagation(),n==null||n()},"aria-label":"Informations",style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)"},children:"i"})]})}function I({profile:s,theme:a}){var p,c;const r=(s==null?void 0:s.stats)||{},l=typeof r.avg3=="number"&&!Number.isNaN(r.avg3)?r.avg3:0;return e.jsxs("div",{style:{position:"relative",width:44,height:44,flexShrink:0},children:[e.jsx("div",{"aria-hidden":!0,style:{position:"absolute",left:-11,top:-11,width:44+(6+10/2)*2,height:44+(6+10/2)*2,pointerEvents:"none"},children:e.jsx(w,{profile:s,anchorSize:44,gapPx:-2,starSize:10,stepDeg:10,rotationDeg:0,avg3d:A(s)||l,animateGlow:!0})}),e.jsxs("div",{style:{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid ${a.primary}88`,boxShadow:`0 0 14px ${a.primary}55`,overflow:"hidden",background:"#000"},children:[s&&s.avatarDataUrl?e.jsx("img",{src:s.avatarDataUrl,alt:s.name,style:{width:"100%",height:"100%",objectFit:"cover"},draggable:!1}):e.jsx(j,{size:44,dataUrl:void 0,label:((c=(p=s==null?void 0:s.name)==null?void 0:p[0])==null?void 0:c.toUpperCase())||"?",showStars:!1}),e.jsx("div",{style:{position:"absolute",inset:0,borderRadius:"50%",boxShadow:`inset 0 0 0 2px ${a.primary}40`,pointerEvents:"none"}})]})]})}function d({title:s,subtitle:a,theme:t,onClick:i,onInfo:n}){return e.jsxs("div",{className:"stats-shell-card",style:{position:"relative",borderRadius:16,background:t.card,border:`1px solid ${t.borderSoft}`,boxShadow:`0 16px 32px rgba(0,0,0,.55), 0 0 18px ${t.primary}22`,overflow:"hidden"},children:[e.jsx("button",{onClick:i,style:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"var(--card-pad)",paddingRight:54,background:"transparent",border:"none",cursor:"pointer"},children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:3,textAlign:"left"},children:[e.jsx("div",{style:{fontSize:"var(--menu-title)",fontWeight:900,letterSpacing:.6,textTransform:"uppercase",color:t.primary,textShadow:`0 0 10px ${t.primary}55`,whiteSpace:"normal",overflow:"hidden"},children:s}),e.jsx("div",{style:{fontSize:"var(--menu-sub)",color:t.textSoft,lineHeight:1.3,maxWidth:360,whiteSpace:"normal",overflow:"hidden"},children:a})]})}),e.jsx("button",{type:"button",className:"stats-shell-info-btn",onClick:r=>{r.stopPropagation(),n==null||n()},"aria-label":"Informations",style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)"},children:"i"})]})}function T({mode:s,theme:a,t,onClose:i}){let n="",r="";switch(s){case"active":n=t("statsShell.info.active.title","STATS — Joueur actif"),r=t("statsShell.info.active.body","Accède aux statistiques complètes du joueur sélectionné : vue générale, stats locales, online et training pour tous les modes (X01, Cricket, etc.).");break;case"locals":n=t("statsShell.info.locals.title","STATS — Profils locaux"),r=t("statsShell.info.locals.body","Retrouve les mêmes vues de statistiques pour tous les profils enregistrés sur cet appareil et compare leurs performances.");break;case"leaderboards":n=t("statsShell.info.leaderboards.title","CLASSEMENTS"),r=t("statsShell.info.leaderboards.body","Vue dédiée aux classements globaux : tous les profils sont comparés pour chaque mode de jeu (X01 multi, Cricket, Killer, etc.).");break;case"training":n=t("statsShell.info.training.title","TRAINING"),r=t("statsShell.info.training.body","Analyse détaillée de tes séances d'entraînement : Training X01, Tour de l’horloge, progression globale et par segment.");break;case"online":n=t("statsShell.info.online.title","ONLINE"),r=t("statsShell.info.online.body","Analyse complète de tes matchs joués en mode Online : sessions, moyennes, gros scores, classement et progression.");break;case"history":n=t("statsShell.info.history.title","HISTORIQUE"),r=t("statsShell.info.history.body","Liste complète de l'historique de tes parties locales avec reprise des parties en cours et accès au détail de chaque match.");break;case"sync":n=t("statsShell.info.sync.title","SYNC & PARTAGE"),r=t("statsShell.info.sync.body","Centralise toutes les options d’export / import : fichiers, JSON, sync directe entre appareils et synchronisation via le cloud.");break}return e.jsx("div",{style:{position:"fixed",left:0,right:0,top:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",zIndex:999},children:e.jsxs("div",{style:{maxWidth:420,marginInline:16,borderRadius:18,background:a.card,border:`1px solid ${a.borderSoft}`,boxShadow:"0 18px 40px rgba(0,0,0,.85)",padding:14,pointerEvents:"auto"},children:[e.jsx("div",{style:{fontSize:14,fontWeight:800,color:a.primary,marginBottom:6,textTransform:"uppercase",letterSpacing:.6},children:n}),e.jsx("div",{style:{fontSize:12.5,lineHeight:1.4,color:a.textSoft,marginBottom:10},children:r}),e.jsx("div",{style:{textAlign:"right"},children:e.jsx("button",{onClick:i,style:{borderRadius:999,border:"none",padding:"6px 16px",fontSize:12.5,fontWeight:700,background:a.primary,color:"#000",cursor:"pointer",boxShadow:`0 0 14px ${a.primary}55`},children:t("statsShell.info.close","Fermer")})})]})})}export{B as default};
