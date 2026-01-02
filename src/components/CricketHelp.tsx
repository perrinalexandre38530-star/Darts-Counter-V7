// ============================================
// src/components/CricketHelp.tsx
// Petit popup d’aide pour les règles du Cricket
// Style néon + fond flou + bouton X
// ============================================

import React from "react";

export default function CricketHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "88%",
          maxWidth: 360,
          background: "linear-gradient(135deg,#1c2540,#0b0f1e)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 18,
          padding: "16px 18px 20px",
          boxShadow: "0 0 30px rgba(246,194,86,0.35)",
          color: "white",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#F6C256",
              textShadow: "0 0 12px rgba(246,194,86,0.8)",
            }}
          >
            Règles du Cricket
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#F6C256",
              fontSize: 18,
              fontWeight: 900,
              textShadow: "0 0 8px rgba(246,194,86,0.8)",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 10 }}>
          Le Cricket se joue sur les numéros&nbsp;
          <strong>15, 16, 17, 18, 19, 20</strong> et <strong>Bull</strong>.
        </div>

        <ul style={{ paddingLeft: 16, margin: 0 }}>
          <li>Chaque tir marque : S = 1, D = 2, T = 3.</li>
          <li>Un numéro est <strong>fermé</strong> quand tu atteins 3 marques.</li>
          <li>
            Si tu as <strong>fermé</strong> un numéro et qu'au moins un adversaire ne
            l’a pas fermé, <strong>chaque marque supplémentaire te donne des points</strong>.
          </li>
          <li>
            Points : la valeur du numéro × les marques au-delà de 3 (Bull = 25).
          </li>
          <li>
            Si <strong>tous</strong> les joueurs ont fermé un numéro, il devient
            inactif (plus de points possibles).
          </li>
        </ul>

        <div
          style={{
            marginTop: 14,
            opacity: 0.7,
            textAlign: "center",
            fontSize: 12,
          }}
        >
          Pour gagner : fermer toutes les cases ET avoir le score le plus élevé.
        </div>
      </div>
    </div>
  );
}
