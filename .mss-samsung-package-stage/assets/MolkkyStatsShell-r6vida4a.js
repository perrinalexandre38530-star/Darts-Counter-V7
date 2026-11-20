import{R as m,j as e,bC as f}from"./index-C6GCE95y.js";import{q as g,u as S}from"./App-DafIjiM-.js";import{P as v}from"./ProfileAvatar-DQI1Q9h8.js";import{P as k,r as j}from"./ProfileStarRing-C1918wej.js";import{B as w}from"./BackDot-Dqp6cxu3.js";import{c as A}from"./molkkyStats-D7yGhDQB.js";import"./SamsungTvSharedAppHost-BW2JOhwM.js";import"./x01CanonicalIndexStoreV2-DVXxIObW.js";import"./x01StatsContext-DdLpAOUR.js";import"./statsNormalized-Bse6eNmV.js";function L({store:s,go:a}){var x,h,y,u;const{theme:t}=g(),{t:i}=S(),r=(x=s==null?void 0:s.profiles)!=null?x:[],o=(h=s==null?void 0:s.activeProfileId)!=null?h:null,l=(u=(y=r.find(b=>b.id===o))!=null?y:r[0])!=null?u:null;m.useMemo(()=>A((s==null?void 0:s.history)||[]),[s==null?void 0:s.history]);const c=l?i("statsShell.players.titleActivePrefix","MÖLKKY — STATS ")+l.name:i("statsShell.players.titleDefault","MÖLKKY — STATS"),[d,n]=m.useState(null);return e.jsxs("div",{className:"stats-shell-page container",style:{minHeight:"100vh",display:"flex",flexDirection:"column",paddingTop:16,paddingBottom:0,alignItems:"center",background:t.bg,color:t.text},children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{style:{width:"100%",maxWidth:"none",paddingInline:0,marginBottom:16},children:[e.jsxs("div",{style:{position:"relative",width:"100%",minWidth:0},children:[e.jsx("img",{src:f,alt:"Statistics Center",draggable:!1,style:{width:"100%",maxWidth:"none",height:"auto",display:"block",filter:`drop-shadow(0 0 14px ${t.primary}55)`}}),e.jsx("div",{style:{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",zIndex:5},children:e.jsx(w,{onClick:()=>a("games")})})]}),e.jsxs("div",{style:{marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,paddingInline:8},children:[e.jsx("div",{style:{fontSize:13,lineHeight:1.35,color:t.textSoft,maxWidth:320},children:i("statsShell.subtitle","Analyse tes performances, ton historique et synchronise tes stats.")}),e.jsx("button",{onClick:()=>a("sync_center"),style:{borderRadius:999,border:`1px solid ${t.primary}`,padding:"6px 12px",fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",background:t.card,color:t.primary,boxShadow:`0 0 12px ${t.primary}55`,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0},children:i("statsShell.syncButton","Sync & partage")})]})]}),e.jsxs("div",{className:"stats-shell-list",style:{width:"100%",maxWidth:"none",display:"flex",flexDirection:"column",gap:"var(--menu-gap)",paddingInline:12},children:[e.jsx(C,{profile:l,label:c,theme:t,onClick:()=>{l&&a("molkky_stats_players",{playerId:l.id,initialPlayerId:l.id})},onInfo:()=>n("active")}),e.jsx(p,{title:i("statsShell.locals.title","PROFILS LOCAUX"),subtitle:i("statsShell.locals.subtitle","Accède aux mêmes vues de stats pour tous les profils locaux."),theme:t,onClick:()=>{a("molkky_stats_locals")},onInfo:()=>n("locals")}),e.jsx(p,{title:"CLASSEMENTS",subtitle:"Classements globaux Mölkky (records, victoires, moyennes, etc.).",theme:t,onClick:()=>a("molkky_stats_leaderboards"),onInfo:()=>n("leaderboards")}),e.jsx(p,{title:i("statsShell.history.title","HISTORIQUE"),subtitle:i("statsShell.history.subtitle","Toutes tes parties Mölkky et reprise des parties en cours."),theme:t,onClick:()=>a("molkky_stats_history"),onInfo:()=>n("history")}),e.jsx(p,{title:i("statsShell.sync.title","SYNC & PARTAGE"),subtitle:i("statsShell.sync.subtitle","Export / import de stats, sync entre appareils et via le cloud."),theme:t,onClick:()=>a("sync_center"),onInfo:()=>n("sync")})]}),e.jsx("div",{style:{height:80}}),d&&e.jsx(I,{mode:d,theme:t,t:i,onClose:()=>n(null)})]})}function C({profile:s,label:a,theme:t,onClick:i,onInfo:r}){return e.jsxs("div",{className:"stats-shell-card",style:{position:"relative",borderRadius:16,background:t.card,border:`1px solid ${t.borderSoft}`,boxShadow:`0 16px 32px rgba(0,0,0,.55), 0 0 18px ${t.primary}22`,overflow:"hidden"},children:[e.jsx("button",{onClick:i,style:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"var(--card-pad)",paddingRight:54,background:"transparent",border:"none",cursor:"pointer"},children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[e.jsx(T,{profile:s,theme:t}),e.jsx("div",{style:{fontSize:"var(--menu-title)",fontWeight:900,letterSpacing:.6,textTransform:"uppercase",color:t.primary,textShadow:`0 0 10px ${t.primary}55`,whiteSpace:"normal",overflow:"hidden",textAlign:"left"},children:a})]})}),e.jsx("button",{type:"button",className:"stats-shell-info-btn",onClick:o=>{o.stopPropagation(),r==null||r()},"aria-label":"Informations",style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)"},children:"i"})]})}function T({profile:s,theme:a}){var c,d;const o=(s==null?void 0:s.stats)||{},l=typeof o.avg3=="number"&&!Number.isNaN(o.avg3)?o.avg3:0;return e.jsxs("div",{style:{position:"relative",width:44,height:44,flexShrink:0},children:[e.jsx("div",{"aria-hidden":!0,style:{position:"absolute",left:-11,top:-11,width:44+(6+10/2)*2,height:44+(6+10/2)*2,pointerEvents:"none"},children:e.jsx(k,{profile:s,anchorSize:44,gapPx:-2,starSize:10,stepDeg:10,rotationDeg:0,avg3d:j(s)||l,animateGlow:!0})}),e.jsxs("div",{style:{position:"absolute",inset:0,borderRadius:"50%",border:`2px solid ${a.primary}88`,boxShadow:`0 0 14px ${a.primary}55`,overflow:"hidden",background:"#000"},children:[s&&s.avatarDataUrl?e.jsx("img",{src:s.avatarDataUrl,alt:s.name,style:{width:"100%",height:"100%",objectFit:"cover"},draggable:!1}):e.jsx(v,{size:44,dataUrl:void 0,label:((d=(c=s==null?void 0:s.name)==null?void 0:c[0])==null?void 0:d.toUpperCase())||"?",showStars:!1}),e.jsx("div",{style:{position:"absolute",inset:0,borderRadius:"50%",boxShadow:`inset 0 0 0 2px ${a.primary}40`,pointerEvents:"none"}})]})]})}function p({title:s,subtitle:a,theme:t,onClick:i,onInfo:r}){return e.jsxs("div",{className:"stats-shell-card",style:{position:"relative",borderRadius:16,background:t.card,border:`1px solid ${t.borderSoft}`,boxShadow:`0 16px 32px rgba(0,0,0,.55), 0 0 18px ${t.primary}22`,overflow:"hidden"},children:[e.jsx("button",{onClick:i,style:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"var(--card-pad)",paddingRight:54,background:"transparent",border:"none",cursor:"pointer"},children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:3,textAlign:"left"},children:[e.jsx("div",{style:{fontSize:"var(--menu-title)",fontWeight:900,letterSpacing:.6,textTransform:"uppercase",color:t.primary,textShadow:`0 0 10px ${t.primary}55`,whiteSpace:"normal",overflow:"hidden"},children:s}),e.jsx("div",{style:{fontSize:"var(--menu-sub)",color:t.textSoft,lineHeight:1.3,maxWidth:360,whiteSpace:"normal",overflow:"hidden"},children:a})]})}),e.jsx("button",{type:"button",className:"stats-shell-info-btn",onClick:o=>{o.stopPropagation(),r==null||r()},"aria-label":"Informations",style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)"},children:"i"})]})}function I({mode:s,theme:a,t,onClose:i}){let r="",o="";switch(s){case"active":r=t("statsShell.info.active.title","STATS — Joueur actif (Mölkky)"),o=t("statsShell.info.active.body","Accède aux statistiques Mölkky du joueur actif : records, moyennes, victoires, historique.");break;case"locals":r=t("statsShell.info.locals.title","STATS — Profils locaux (Mölkky)"),o=t("statsShell.info.locals.body","Retrouve les mêmes vues de statistiques Mölkky pour tous les profils locaux et compare leurs performances.");break;case"leaderboards":r=t("statsShell.info.leaderboards.title","CLASSEMENTS (Mölkky)"),o=t("statsShell.info.leaderboards.body","Classements globaux Mölkky : records, top vainqueurs, top moyennes, winrate, etc.");break;case"history":r=t("statsShell.info.history.title","HISTORIQUE (Mölkky)"),o=t("statsShell.info.history.body","Liste complète de l'historique des parties Mölkky avec accès au détail de chaque match.");break;case"sync":r=t("statsShell.info.sync.title","SYNC & PARTAGE"),o=t("statsShell.info.sync.body","Centralise toutes les options d’export / import : fichiers, JSON, sync directe entre appareils et synchronisation via le cloud.");break}return e.jsx("div",{style:{position:"fixed",left:0,right:0,top:0,bottom:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",zIndex:999},children:e.jsxs("div",{style:{maxWidth:420,marginInline:16,borderRadius:18,background:a.card,border:`1px solid ${a.borderSoft}`,boxShadow:"0 18px 40px rgba(0,0,0,.85)",padding:14,pointerEvents:"auto"},children:[e.jsx("div",{style:{fontSize:14,fontWeight:800,color:a.primary,marginBottom:6,textTransform:"uppercase",letterSpacing:.6},children:r}),e.jsx("div",{style:{fontSize:12.5,lineHeight:1.4,color:a.textSoft,marginBottom:10},children:o}),e.jsx("div",{style:{textAlign:"right"},children:e.jsx("button",{onClick:i,style:{borderRadius:999,border:"none",padding:"6px 16px",fontSize:12.5,fontWeight:700,background:a.primary,color:"#000",cursor:"pointer",boxShadow:`0 0 14px ${a.primary}55`},children:t("statsShell.info.close","Fermer")})})]})})}export{L as default};
