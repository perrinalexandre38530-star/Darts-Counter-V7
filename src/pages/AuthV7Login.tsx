// ============================================
// src/pages/AuthV7Login.tsx
// PROFILES V7 — Connexion email + mot de passe (simple, pro)
// ============================================
import React from "react";
import { supabase, __SUPABASE_ENV__ } from "../lib/supabaseClient";
import { mergeNow } from "../lib/cloudSync";

type Props = {
  go: (t: any, p?: any) => void;
};

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} (timeout ${ms}ms)`)), ms)
    ),
  ]);
}

export default function AuthV7Login({ go }: Props) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [canResend, setCanResend] = React.useState(false);

  // Ping simple pour distinguer "mauvais mot de passe" vs "Supabase vraiment injoignable"
  // ✅ FIX: sur mobile / PWA, /auth/v1/health peut répondre 401/404 selon config/headers.
  // => Si on reçoit UNE réponse HTTP, Supabase est joignable.
  const pingSupabase = async () => {
    if (!__SUPABASE_ENV__.url) return false;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000); // ✅ mobile = plus lent que desktop
    try {
      const res = await fetch(`${__SUPABASE_ENV__.url}/auth/v1/health`, {
        headers: { apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "" },
        signal: ac.signal,
      });
      // ✅ Joignable dès qu'on a une réponse HTTP (même si 401/404)
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(t);
    }
  };

  async function resendConfirm() {
    const e = email.trim();
    if (!e || !e.includes("@")) {
      setError("Entre une adresse email valide.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await withTimeout(
        supabase.auth.resend({ type: "signup", email: e }),
        8000,
        "Renvoi de confirmation"
      );
      if (err) {
        setError(err.message || "Impossible de renvoyer l’email.");
      } else {
        setError("Email de confirmation renvoyé. Vérifie ta boîte mail / spam.");
      }
    } catch (e: any) {
      setError(e?.message || "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setCanResend(false);

    const e = email.trim();
    if (!e || !e.includes("@") || !password) {
      setError("Email et mot de passe requis.");
      return;
    }

    setLoading(true);

    const watchdog = setTimeout(() => {
      // fail-safe: évite un spinner infini si une promesse réseau ne répond jamais
      setLoading(false);
      setError((prev) => prev || "Connexion bloquée (timeout). Réessaie ou vérifie ton réseau.");
    }, 12000);

    try {
      // ✅ si Supabase est vraiment injoignable => message clair au lieu de "Failed to fetch"
      const ok = await pingSupabase();
      if (!ok) {
        setError(
          `Impossible de joindre Supabase (réseau / DNS / bloqueur / URL).\nURL: ${__SUPABASE_ENV__.url}`
        );
        return;
      }

      const { error: err } = await withTimeout(
        supabase.auth.signInWithPassword({ email: e, password }),
        8000,
        "Connexion Supabase"
      );

      if (err) {
        const msg = err.message || "Connexion impossible.";
        setError(msg);

        // Cas classique: email pas confirmé
        if (/email not confirmed|not confirmed|confirm/i.test(msg)) {
          setCanResend(true);
        }
        return;
      }

      // ✅ (optionnel) Merge immédiat côté cloud si tu utilises ta sync
      try {
        await mergeNow({ conflict: "newest" });
      } catch {
        // pas bloquant
      }

      go("profiles");
    } catch (e: any) {
      setError(e?.message || "Erreur réseau.");
    } finally {
      clearTimeout(watchdog);
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        background: "#000",
      }}
    >
      <div
        style={{
          width: "min(420px, 96vw)",
          borderRadius: 18,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 20px 80px rgba(0,0,0,0.7)",
          padding: 18,
        }}
      >
        <h2 style={{ margin: 0, color: "#fff", fontSize: 30, fontWeight: 900 }}>
          Se connecter
        </h2>

        <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
            style={{
              height: 46,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(20,30,50,0.65)",
              color: "#fff",
              padding: "0 14px",
              fontSize: 16,
              outline: "none",
            }}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            style={{
              height: 46,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(20,30,50,0.65)",
              color: "#fff",
              padding: "0 14px",
              fontSize: 16,
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 46,
              borderRadius: 16,
              border: "none",
              background: "linear-gradient(90deg,#ffcf4d,#ffb300)",
              color: "#111",
              fontWeight: 900,
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Connexion..." : "Connexion"}
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          <button
            onClick={() => go("signup")}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              textDecoration: "underline",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Créer un compte
          </button>

          <button
            onClick={() => go("reset")}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              textDecoration: "underline",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Mot de passe oublié ?
          </button>
        </div>

        {error && (
          <div
            style={{
              whiteSpace: "pre-wrap",
              marginTop: 12,
              color: "#ffd1d1",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        {canResend && (
          <button
            onClick={resendConfirm}
            disabled={loading}
            style={{
              marginTop: 12,
              height: 40,
              width: "100%",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Renvoyer l’email de confirmation
          </button>
        )}

        <button
          onClick={() => go("home")}
          style={{
            marginTop: 14,
            height: 44,
            width: "100%",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Retour
        </button>
      </div>
    </div>
  );
}
