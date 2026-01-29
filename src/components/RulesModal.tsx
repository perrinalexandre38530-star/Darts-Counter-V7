import React from "react";
import { createPortal } from "react-dom";

export default function RulesModal({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:React.ReactNode}){
  if(!open) return null;
  const node = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.6)",
        // iOS/Android: évite que le "center" paraisse collé en haut (barre d'adresse / 100vh buggy)
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 12px",
        zIndex: 99999,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 720,
          width: "92%",
          maxHeight: "80vh",
          overflow: "auto",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
        <div className="subtitle" style={{ lineHeight: 1.6 }}>{children}</div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <button
            className="btn"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(0,0,0,0.25)",
              color: "#fff",
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );

  // Portal to <body> to avoid "fixed" being trapped by transformed parents on mobile.
  return createPortal(node, document.body);
}
