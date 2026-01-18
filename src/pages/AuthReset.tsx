import * as React from "react";

export default function AuthReset() {
  return (
    <div style={{ padding: 16, color: "#fff" }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Réinitialisation du mot de passe</h2>
      <p style={{ opacity: 0.8, marginTop: 8 }}>
        Cette page sert de landing pour le flow Supabase “reset password”.
      </p>
    </div>
  );
}