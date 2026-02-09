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

  // Ping simple pour distinguer "mauvais mot de passe" vs "Supabase injoignable"
  const pingSupabase = async () => {
    if (!__SUPABASE_ENV__.url) return false;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 2500);
    try {
      const res = await fetch(`${__SUPABASE_ENV__.url}/auth/v1/health`, {
        headers: { apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "" },
        signal: ac.signal,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(t);
    }
  };

  async function resendConfirm() {
    const e = email.trim();
    if (!e || !e.includes("@")) {
      setError("Entre une adresse email valide pour renvoyer l’email.");
      return;
    }
    setLoading(true);
    const hardStop = setTimeout(() => {
      // fail-safe: évite un spinner infini si une promesse réseau ne répond jamais
      setLoading(false);
      setError((prev) => prev || "Connexion bloquée (timeout). Réessaie ou vérifie ton réseau.");
    }, 12000);
    try {
      const emailRedirectTo = `${window.location.origin}${window.location.pathname}#/auth/callback`;
      const { error: err } = await supabase.auth.resend({
        type: "signup",
        email: e,
        options: { emailRedirectTo },
      });
      if (err) {
        setError(err.message);
        return;
      }
      setError("Email de confirmation renvoyé ✅ Ouvre le DERNIER email reçu.");
      setCanResend(false);
    } catch (e: any) {
      setError(e?.message || "Impossible de renvoyer l’email.");
    } finally {
      clearTimeout(hardStop);
      setLoading(false);
    }
  }

  const onSubmit = async () => {
    setError(null);
    setCanResend(false);
    const e = email.trim();
    if (!e || !e.includes("@")) return setError("Entre une adresse email valide.");
    if (!password) return setError("Entre ton mot de passe.");

    // ✅ Guard : si env Supabase non injectés, on affiche une erreur explicite
    if (!__SUPABASE_ENV__.hasEnv) {
      setError(
        `Supabase non configuré (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants).\nURL actuelle: ${
          __SUPABASE_ENV__.url || "(vide)"
        }`
      );
      return;
    }

    setLoading(true);
    const hardStop = setTimeout(() => {
      // fail-safe: évite un spinner infini si une promesse réseau ne répond jamais
      setLoading(false);
      setError((prev) => prev || "Connexion bloquée (timeout). Réessaie ou vérifie ton réseau.");
    }, 12000);
    try {
      // ✅ si Supabase est injoignable => message clair au lieu de "Failed to fetch"
      const ok = await pingSupabase();
      if (!ok) {
        setError(
          `Impossible de joindre Supabase (réseau / DNS / bloqueur / URL).\nURL: ${__SUPABASE_ENV__.url}`
        );
        return;
      }

      const { error: err } = await withTimeout(
        supabase.auth.signInWithPassword({ email: e, password }),
        6000,
        "Connexion Supabase"
      );
      if (err) {
        const msg = err.message || "Connexion impossible.";
        setError(msg);
        // Supabase renvoie souvent "Email not confirmed"
        if (/not confirmed/i.test(msg)) setCanResend(true);
        return;
      }
      // ✅ Anti-perte : fusion cloud+local, puis push du merge
      // ⚠️ IMPORTANT: ne JAMAIS bloquer l'UI de connexion si la sync cloud est lente.
      // On lance un merge best-effort avec timeout, puis on entre dans l'app.
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id;
        if (uid) {
          await Promise.race([
            mergeNow(uid, { conflict: "newest" }),
            new Promise((resolve) => setTimeout(resolve, 3500)),
          ]);
        }
      } catch {
        // non bloquant : on laisse l'UI entrer (sync manuel possible)
      }
      go("home");
    } catch (e: any) {
      setError(e?.message || "Connexion impossible.");
    } finally {
      clearTimeout(hardStop);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "calc(100dvh - 88px)",
        display: "grid",
        placeItems: "center",
        padding: "18px 12px",
      }}
    >
      <div
        style={{
          width: "min(420px, 92vw)",
          borderRadius: 22,
          padding: 16,
          background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))",
          border: "1px solid rgba(255,255,255,.10)",
          boxShadow: "0 22px 70px rgba(0,0,0,.62), 0 0 0 1px rgba(0,0,0,.25) inset",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 950, marginBottom: 10 }}>Se connecter</div>

        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Adresse email"
            autoComplete="email"
            style={inputStyle}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            type="password"
            autoComplete="current-password"
            style={inputStyle}
          />

          <button onClick={onSubmit} disabled={loading} style={primaryBtnStyle}>
            {loading ? "Connexion..." : "Connexion"}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <button onClick={() => go("auth_v7_signup")} style={linkBtnStyle}>
              Créer un compte
            </button>
            <button onClick={() => go("auth_forgot")} style={linkBtnStyle}>
              Mot de passe oublié ?
            </button>
          </div>

          {error ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 13, opacity: 0.95, lineHeight: 1.35 }}>{error}</div>
              {canResend ? (
                <button onClick={resendConfirm} disabled={loading} style={secondaryBtnStyle}>
                  Renvoyer l’email de confirmation
                </button>
              ) : null}
            </div>
          ) : null}

          <button onClick={() => go("auth_start")} style={secondaryBtnStyle}>
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(10,10,14,.45)",
  color: "#fff",
  outline: "none",
  fontSize: 13.5,
  boxShadow: "0 0 0 1px rgba(0,0,0,.25) inset",
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 999,
  padding: "11px 12px",
  fontWeight: 950,
  fontSize: 14,
  border: "1px solid rgba(0,0,0,.25)",
  color: "#1b1508",
  background: "linear-gradient(180deg,#ffd25a,#ffaf00)",
  boxShadow: "0 10px 24px rgba(0,0,0,.35), 0 0 22px rgba(255,198,58,.15)",
  cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  padding: "10px 12px",
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.05)",
  color: "rgba(255,255,255,.92)",
  cursor: "pointer",
  fontWeight: 900,
};

const linkBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "rgba(255,255,255,.85)",
  cursor: "pointer",
  textDecoration: "underline",
  padding: 0,
  fontWeight: 800,
  fontSize: 12.8,
};
