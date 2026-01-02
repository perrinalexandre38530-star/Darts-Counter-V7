// ============================================
// src/pages/AuthCallback.tsx
// Supabase Auth Callback
// - Finalise la session après clic mail (signup confirm / magic link / etc.)
// - Redirige ensuite vers l’app (Home ou Profils)
// ============================================

import React from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const [status, setStatus] = React.useState<
    "init" | "ok" | "error"
  >("init");
  const [msg, setMsg] = React.useState<string>("");

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // ✅ Récupère la session depuis l'URL si Supabase l'a mise (code, token, etc.)
        // Même si detectSessionInUrl=false dans le client, on peut la finaliser ici manuellement.
        const { data, error } = await supabase.auth.getSessionFromUrl({
          storeSession: true,
        });

        if (error) throw error;

        // data.session peut être null selon le flow, mais l'opération peut quand même être OK.
        if (!mounted) return;

        setStatus("ok");
        setMsg(data?.session ? "Session créée ✅" : "Lien confirmé ✅");

        // Petit délai visuel puis retour app
        setTimeout(() => {
          // 🔁 choisis où tu veux rediriger
          window.location.hash = "#/home";
        }, 450);
      } catch (e: any) {
        if (!mounted) return;
        setStatus("error");
        setMsg(e?.message || "Erreur de confirmation.");
        // fallback: renvoie vers login
        setTimeout(() => {
          window.location.hash = "#/profiles";
        }, 900);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "radial-gradient(1200px 600px at 50% 10%, rgba(255,215,0,0.18), rgba(0,0,0,0.85))",
        color: "#f5f5f7",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div
        style={{
          width: "min(520px, 92vw)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0.55)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
          padding: 18,
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 10 }}>
          Darts Counter • Auth
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 0.4,
            marginBottom: 10,
            color: status === "error" ? "#ff6b6b" : "#ffd84a",
          }}
        >
          {status === "init"
            ? "Confirmation en cours…"
            : status === "ok"
            ? "Confirmation OK"
            : "Erreur"}
        </div>

        <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.45 }}>
          {status === "init"
            ? "On finalise ta connexion…"
            : msg || "OK"}
        </div>

        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>
          Tu peux fermer cette page si tu es redirigé automatiquement.
        </div>
      </div>
    </div>
  );
}
