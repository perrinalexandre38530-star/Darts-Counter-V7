// ============================================
// src/pages/AccountStart.tsx
// Portail Auth PRO : Connexion / Création / Mot de passe oublié
// ============================================
import React from "react";

type Props = {
  onLogin: () => void;
  onCreate: () => void;
  onForgot: () => void;
};

export default function AccountStart({ onLogin, onCreate, onForgot }: Props) {
  return (
    <div
      className="container"
      style={{
        padding: 28,
        minHeight: "70vh",
        display: "grid",
        alignContent: "center",
        justifyItems: "center",
        gap: 12,
        textAlign: "center",
      }}
    >
      <h2 style={{ margin: 0 }}>Bienvenue</h2>
      <p style={{ opacity: 0.85, margin: 0, maxWidth: 480 }}>
        Connecte-toi pour retrouver ton compte, ou crée un compte pour synchroniser
        ton profil et tes stats sur tous tes appareils.
      </p>

      <div style={{ display: "grid", gap: 10, width: "min(420px, 100%)", marginTop: 14 }}>
        <button
          className="btn primary"
          onClick={onLogin}
          style={{
            borderRadius: 999,
            padding: "12px 14px",
            fontWeight: 900,
            background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
            color: "#1b1508",
            border: "none",
            cursor: "pointer",
          }}
        >
          Se connecter
        </button>

        <button
          className="btn"
          onClick={onCreate}
          style={{
            borderRadius: 999,
            padding: "12px 14px",
            fontWeight: 900,
            background: "rgba(255,255,255,.08)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,.12)",
            cursor: "pointer",
          }}
        >
          Créer un compte
        </button>

        <button
          className="btn"
          onClick={onForgot}
          style={{
            borderRadius: 999,
            padding: "10px 14px",
            fontWeight: 800,
            background: "transparent",
            color: "rgba(255,255,255,.85)",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Mot de passe oublié ?
        </button>
      </div>
    </div>
  );
}
