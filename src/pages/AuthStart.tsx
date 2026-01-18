// src/pages/AuthStart.tsx
import React from "react";
import { supabase } from "../lib/supabase";

type Props = {
  go: (t: any, p?: any) => void;
};

export default function AuthStart({ go }: Props) {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<string>("");

  async function sendReset() {
    setStatus("");
    const e = email.trim();
    if (!e || !e.includes("@")) return setStatus("Entre une adresse email valide.");

    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}#/auth/reset`;
      const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo });
      if (error) {
        console.error("[AuthStart] resetPasswordForEmail:", error);
        setStatus("Erreur : " + error.message);
        return;
      }
      setStatus("Email envoyé ✅ Ouvre le DERNIER email reçu pour réinitialiser.");
    } catch (err: any) {
      console.error("[AuthStart] reset fatal:", err);
      setStatus("Erreur : impossible d’envoyer l’email.");
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100dvh - 88px)",
        display: "grid",
        placeItems: "center",
        padding: "18px 12px",
        background:
          "radial-gradient(900px 520px at 50% 18%, rgba(255,198,58,.10), transparent 55%)," +
          "radial-gradient(700px 520px at 50% 85%, rgba(255,79,216,.06), transparent 60%)",
      }}
    >
      <div
        style={{
          width: "min(380px, 92vw)",
          borderRadius: 22,
          padding: 14,
          background:
            "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))",
          border: "1px solid rgba(255,255,255,.10)",
          boxShadow:
            "0 22px 70px rgba(0,0,0,.62), 0 0 0 1px rgba(0,0,0,.25) inset",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* glow top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg,#ffc63a, #ff4fd8)",
            opacity: 0.9,
          }}
        />
        {/* subtle corner glow */}
        <div
          style={{
            position: "absolute",
            inset: -120,
            background:
              "radial-gradient(circle at 30% 10%, rgba(255,198,58,.16), transparent 45%)," +
              "radial-gradient(circle at 85% 30%, rgba(255,79,216,.10), transparent 45%)",
            pointerEvents: "none",
          }}
        />
  
        <div style={{ position: "relative", display: "grid", gap: 12 }}>
          {/* Header */}
          <div style={{ textAlign: "center", display: "grid", gap: 6 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 950,
                letterSpacing: 0.3,
                color: "rgba(255,255,255,.96)",
                textShadow: "0 0 18px rgba(255,198,58,.14)",
              }}
            >
              Compte
            </div>
            <div
              style={{
                fontSize: 12.8,
                opacity: 0.82,
                lineHeight: 1.35,
                padding: "0 8px",
              }}
            >
              Connecte-toi pour synchroniser ton profil et tes stats sur tous tes
              appareils.
            </div>
          </div>
  
          {/* Primary action */}
          <button
            onClick={() => go("auth_v7_login")}
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "11px 12px",
              fontWeight: 950,
              fontSize: 14,
              border: "1px solid rgba(0,0,0,.25)",
              color: "#1b1508",
              background: "linear-gradient(180deg,#ffd25a,#ffaf00)",
              boxShadow:
                "0 10px 24px rgba(0,0,0,.35), 0 0 22px rgba(255,198,58,.15)",
              cursor: "pointer",
            }}
          >
            Se connecter
          </button>
  
          {/* Secondary action */}
          <button
            onClick={() => go("auth_v7_signup")}
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "10px 12px",
              fontWeight: 900,
              fontSize: 13.5,
              background: "rgba(255,255,255,.05)",
              color: "rgba(255,255,255,.92)",
              border: "1px solid rgba(255,255,255,.12)",
              boxShadow: "0 10px 22px rgba(0,0,0,.25)",
              cursor: "pointer",
            }}
          >
            Créer un compte
          </button>
  
          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity: 0.7,
              marginTop: 2,
            }}
          >
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,.10)" }} />
            <div style={{ fontSize: 12, letterSpacing: 0.2 }}>Mot de passe</div>
            <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,.10)" }} />
          </div>
  
          {/* Forgot block */}
          <div
            style={{
              padding: 12,
              borderRadius: 18,
              background: "rgba(0,0,0,.20)",
              border: "1px solid rgba(255,255,255,.10)",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 13.5, opacity: 0.95 }}>
              Mot de passe oublié
            </div>
  
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse email"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(10,10,14,.45)",
                color: "#fff",
                outline: "none",
                fontSize: 13.5,
                boxShadow: "0 0 0 1px rgba(0,0,0,.25) inset",
              }}
            />
  
            <button
              onClick={sendReset}
              style={{
                width: "100%",
                borderRadius: 14,
                padding: "10px 12px",
                border: "1px solid rgba(0,0,0,.25)",
                fontWeight: 950,
                fontSize: 13.2,
                background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
                color: "#1b1508",
                cursor: "pointer",
                boxShadow: "0 10px 22px rgba(0,0,0,.30)",
              }}
            >
              Envoyer le lien de réinitialisation
            </button>
  
            {status ? (
              <div style={{ fontSize: 12.8, opacity: 0.9, lineHeight: 1.35 }}>
                {status}
              </div>
            ) : null}
          </div>
  
          {/* Back */}
          <button
            onClick={() => go("home")}
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "9px 12px",
              fontSize: 13,
              fontWeight: 850,
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.10)",
              color: "rgba(255,255,255,.88)",
              cursor: "pointer",
            }}
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}
