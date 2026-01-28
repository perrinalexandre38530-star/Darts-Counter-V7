import React from "react";

export default function RulesModal({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:React.ReactNode}){
  if(!open) return null;
  return (
    <div style={{
      position:"fixed",
      inset:0,
      background:"rgba(0,0,0,.6)",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      padding:"16px",
      zIndex:9999,
    }} onClick={onClose}>
      <div className="card" style={{maxWidth:720, width:"92%", maxHeight:"80vh", overflow:"auto", position:"relative"}} onClick={e=>e.stopPropagation()}>
        <div className="row-between" style={{marginBottom:8, paddingRight:42}}>
          <h2>{title}</h2>
        </div>
        <button
          className="btn"
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 34,
            height: 34,
            borderRadius: 12,
            padding: 0,
            display: "grid",
            placeItems: "center",
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.25)",
            color: "#fff",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <div className="subtitle" style={{lineHeight:1.6}}>{children}</div>
      </div>
    </div>
  );
}
