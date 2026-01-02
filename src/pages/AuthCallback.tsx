import React from "react";
import { supabase } from "../lib/supabase";

export default function AuthCallback() {
  const [msg, setMsg] = React.useState("Connexion en cours…");

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // 1) Tente de récupérer la session (si Supabase a déjà consommé l'URL)
        const { data, error } = await supabase.auth.getSession();
        if (!alive) return;

        if (error) {
          console.error("AuthCallback getSession error:", error);
          setMsg("Erreur de connexion. Réessaie avec le DERNIER email reçu.");
          return;
        }

        if (data?.session) {
          // ✅ Session ok -> on renvoie vers Online
          window.location.hash = "#/online";
          return;
        }

        // 2) Parfois la session arrive juste après via l'event auth
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) window.location.hash = "#/online";
        });

        // petit message si ça traîne
        setTimeout(() => {
          if (alive) setMsg("Presque fini… si ça bloque, ouvre le DERNIER mail reçu.");
        }, 800);

        return () => sub.subscription.unsubscribe();
      } catch (e) {
        console.error("AuthCallback fatal:", e);
        if (alive) setMsg("Erreur de connexion. Réessaie avec le DERNIER email reçu.");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Authentification</h2>
      <p>{msg}</p>
    </div>
  );
}
