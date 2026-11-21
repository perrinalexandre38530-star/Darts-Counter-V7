import{j as t}from"./index-Z6AeHU5N.js";const d=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5,25],y={gold:"#F6C256"};function v({darts:m}){const l={};for(const r of m||[]){const s=Number(r==null?void 0:r.v)||0,a=Number(r==null?void 0:r.mult)||0;if(!s||!a)continue;const i=s===25?25:s;l[i]||(l[i]=0),l[i]+=1}let c=0;for(const r of d){const s=l[r]||0;s>c&&(c=s)}c<=0&&(c=1);const n=320,o=n/2,e=n/2,x=132,k=140,C=60,b=96,f=26,F=126,p=x+6,M=d.length;function h(r){const s=Math.PI*2/M;return-Math.PI/2+r*s}function u(r,s){return{x:o+r*Math.cos(s),y:e+r*Math.sin(s)}}const j=[];d.forEach((r,s)=>{const a=h(s),w=(l[r]||0)/c,O=f+(F-f)*w;j.push(u(O,a))});const g=j.length>0?j.map((r,s)=>s===0?`M ${r.x.toFixed(1)} ${r.y.toFixed(1)}`:`L ${r.x.toFixed(1)} ${r.y.toFixed(1)}`).join(" ")+" Z":"";return t.jsx("div",{style:{width:"100%",display:"flex",justifyContent:"center"},children:t.jsxs("svg",{width:n,height:n,viewBox:`0 0 ${n} ${n}`,style:{maxWidth:"100%"},children:[t.jsx("style",{children:`
          @keyframes radarPulse {
            0% {
              r: ${p};
              opacity: 0.35;
            }
            50% {
              r: ${p+14};
              opacity: 0;
            }
            100% {
              r: ${p};
              opacity: 0.35;
            }
          }

          @keyframes radarBreathe {
            0% {
              transform: scale(0.97);
            }
            50% {
              transform: scale(1.03);
            }
            100% {
              transform: scale(0.97);
            }
          }

          @keyframes radarEnter {
            0% {
              opacity: 0;
              transform: scale(0.85);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}),t.jsxs("defs",{children:[t.jsxs("radialGradient",{id:"radar-bg",cx:"50%",cy:"45%",r:"60%",children:[t.jsx("stop",{offset:"0%",stopColor:"#20222A"}),t.jsx("stop",{offset:"40%",stopColor:"#14151B"}),t.jsx("stop",{offset:"100%",stopColor:"#05060A"})]}),t.jsxs("linearGradient",{id:"radar-poly",x1:"0%",y1:"0%",x2:"0%",y2:"100%",children:[t.jsx("stop",{offset:"0%",stopColor:"#FFEFAF",stopOpacity:.95}),t.jsx("stop",{offset:"100%",stopColor:"#F6C256",stopOpacity:.6})]}),t.jsxs("radialGradient",{id:"radar-halo",cx:"50%",cy:"50%",r:"50%",children:[t.jsx("stop",{offset:"0%",stopColor:"#F6C256",stopOpacity:.4}),t.jsx("stop",{offset:"60%",stopColor:"#F6C256",stopOpacity:.15}),t.jsx("stop",{offset:"100%",stopColor:"#F6C256",stopOpacity:0})]}),t.jsxs("filter",{id:"radar-glow",x:"-30%",y:"-30%",width:"160%",height:"160%",children:[t.jsx("feGaussianBlur",{in:"SourceGraphic",stdDeviation:"3",result:"blur"}),t.jsxs("feMerge",{children:[t.jsx("feMergeNode",{in:"blur"}),t.jsx("feMergeNode",{in:"SourceGraphic"})]})]}),t.jsxs("radialGradient",{id:"radar-center-glow",cx:"50%",cy:"50%",r:"50%",children:[t.jsx("stop",{offset:"0%",stopColor:"#F6C256",stopOpacity:.8}),t.jsx("stop",{offset:"40%",stopColor:"#F6C256",stopOpacity:0}),t.jsx("stop",{offset:"100%",stopColor:"#000000",stopOpacity:0})]}),t.jsxs("filter",{id:"radar-text-glow",x:"-50%",y:"-50%",width:"200%",height:"200%",children:[t.jsx("feGaussianBlur",{stdDeviation:"1.4",result:"blur"}),t.jsx("feColorMatrix",{in:"blur",type:"matrix",values:`
                1 0 0 0 0
                0.85 0.7 0 0 0
                0 0 0 0 0
                0 0 0 1 0
              `,result:"glow"}),t.jsxs("feMerge",{children:[t.jsx("feMergeNode",{in:"glow"}),t.jsx("feMergeNode",{in:"SourceGraphic"})]})]})]}),t.jsxs("g",{style:{transformOrigin:"50% 50%",animation:"radarEnter 0.6s ease-out"},children:[t.jsx("circle",{cx:o,cy:e,r:p,fill:"url(#radar-halo)",style:{transformOrigin:"50% 50%",animation:"radarPulse 3.2s ease-out infinite"}}),t.jsx("circle",{cx:o,cy:e,r:x,fill:"url(#radar-bg)"}),t.jsx("circle",{cx:o,cy:e,r:C,fill:"none",stroke:"rgba(255,255,255,0.10)",strokeWidth:1}),t.jsx("circle",{cx:o,cy:e,r:b,fill:"none",stroke:"rgba(255,255,255,0.10)",strokeWidth:1}),t.jsx("circle",{cx:o,cy:e,r:x,fill:"none",stroke:"rgba(255,255,255,0.18)",strokeWidth:1}),d.map((r,s)=>{const a=h(s),i=u(x,a);return t.jsx("line",{x1:o,y1:e,x2:i.x,y2:i.y,stroke:"rgba(255,255,255,0.08)",strokeWidth:1},`ray-${s}`)}),g&&t.jsx("g",{filter:"url(#radar-glow)",style:{transformOrigin:"50% 50%",animation:"radarBreathe 4.2s ease-in-out infinite"},children:t.jsx("path",{d:g,fill:"url(#radar-poly)",stroke:y.gold,strokeWidth:2,fillOpacity:.8})}),t.jsx("circle",{cx:o,cy:e,r:f+12,fill:"url(#radar-center-glow)"}),t.jsx("circle",{cx:o,cy:e,r:f-4,fill:"rgba(0,0,0,0.75)",stroke:y.gold,strokeWidth:1,opacity:.95}),t.jsx("circle",{cx:o,cy:e,r:2.8,fill:y.gold,opacity:.95}),t.jsx("line",{x1:o-8,y1:e,x2:o+8,y2:e,stroke:"rgba(246,194,86,0.45)",strokeWidth:.8}),t.jsx("line",{x1:o,y1:e-8,x2:o,y2:e+8,stroke:"rgba(246,194,86,0.45)",strokeWidth:.8}),d.map((r,s)=>{const a=h(s),i=u(k+4,a);return t.jsx("text",{x:i.x,y:i.y,textAnchor:"middle",dominantBaseline:"middle",fontSize:14,fontWeight:600,fill:y.gold,style:{paintOrder:"stroke",strokeWidth:.6,stroke:"rgba(0,0,0,0.35)"},filter:"url(#radar-text-glow)",children:r===25?"25":r},`label-${r}-${s}`)})]})]})})}export{v as default};
