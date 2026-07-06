// ============================================
// src/pages/AuthV7Login.tsx
// Auth V7 — Connexion publique Supabase par défaut
// Accès NAS privé uniquement via code d’invitation.
// ============================================
import React from "react";
import { __SUPABASE_ENV__ } from "../lib/supabaseClient";
import { onlineApi } from "../lib/onlineApi";
import { hasMeaningfulRemoteSnapshotPayload, restoreRemoteSnapshotIntoLocalApp } from "../lib/remoteSnapshotRestore";

type Props = {
  go: (t: any, p?: any) => void;
};

type AccessMode = "public" | "invite";

function hasLinkedLocalProfile(userId?: string | null): boolean {
  try {
    const uid = String(userId || "").trim();
    if (!uid) return false;
    const store = (window as any)?.__appStore?.store ?? null;
    const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
    return profiles.some((p: any) => String((p?.privateInfo || {})?.onlineUserId || "") === uid);
  } catch {
    return false;
  }
}

function armNasProfileOnboarding(userId?: string | null) {
  try {
    const uid = String(userId || "").trim();
    if (!uid) return;
    localStorage.setItem("dc_nas_profile_onboarding_uid", uid);
  } catch {}
}

async function hasRemoteSnapshot(): Promise<boolean> {
  try {
    const res: any = await onlineApi.pullStoreSnapshot();
    if (res?.status !== "ok") return false;
    return hasMeaningfulRemoteSnapshotPayload(res?.payload ?? null);
  } catch {
    return false;
  }
}

async function restoreRemoteSnapshotIntoLocalStore(): Promise<boolean> {
  try {
    const res: any = await onlineApi.pullStoreSnapshot();
    if (res?.status !== "ok") return false;
    return await restoreRemoteSnapshotIntoLocalApp(res?.payload ?? null);
  } catch (e) {
    console.warn("[AuthV7Login] restoreRemoteSnapshotIntoLocalStore failed", e);
    return false;
  }
}

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
  const [invitationCode, setInvitationCode] = React.useState("");
  const [accessMode, setAccessMode] = React.useState<AccessMode>("public");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [canResend, setCanResend] = React.useState(false);

  const lastNetErrAtRef = React.useRef<number>(0);
  const isInviteMode = accessMode === "invite";

  const showBackendUnreachable = (details?: string) => {
    const now = Date.now();
    if (now - lastNetErrAtRef.current < 30_000) return;
    lastNetErrAtRef.current = now;
    setError(
      isInviteMode
        ? `Impossible de joindre le backend privé NAS (réseau / DNS / proxy / URL).${details ? `\n\n${details}` : ""}`
        : `Impossible de joindre Supabase / le bridge NAS-R2.${details ? `\n\n${details}` : ""}`
    );
  };

  const looksLikeNetworkError = (x: any) => {
    const msg = String(x?.message || x || "");
    return (
      x?.name === "AbortError" ||
      /Failed to fetch/i.test(msg) ||
      /NetworkError/i.test(msg) ||
      (/fetch/i.test(msg) && /failed/i.test(msg)) ||
      /timeout/i.test(msg)
    );
  };

  async function resendConfirm() {
    const e = email.trim();
    if (!e || !e.includes("@")) {
      setError("Entre une adresse email valide pour renvoyer l’email.");
      return;
    }
    if (isInviteMode) {
      setError("Les accès privés sur invitation NAS ne passent pas par la confirmation email Supabase.");
      setCanResend(false);
      return;
    }

    setLoading(true);
    const hardStop = setTimeout(() => {
      setLoading(false);
      setError((prev) => prev || "Connexion bloquée (timeout). Réessaie ou vérifie ton réseau.");
    }, 12000);

    try {
      await onlineApi.resendSignupConfirmation(e);
      setError("Email de confirmation renvoyé ✅ Ouvre le DERNIER email reçu.");
      setCanResend(false);
    } catch (e: any) {
      if (looksLikeNetworkError(e)) {
        showBackendUnreachable("Teste en 4G/navigation privée si un bloqueur réseau gêne Supabase.");
      } else {
        setError(e?.message || "Impossible de renvoyer l’email.");
      }
    } finally {
      clearTimeout(hardStop);
      setLoading(false);
    }
  }

  const onSubmit = async () => {
    setError(null);
    setCanResend(false);
    const e = email.trim();
    const invite = invitationCode.trim();
    if (!e || !e.includes("@")) return setError("Entre une adresse email valide.");
    if (!password) return setError("Entre ton mot de passe.");
    if (isInviteMode && !invite) return setError("Entre le code d’invitation privé que tu as reçu.");

    if (!isInviteMode && !__SUPABASE_ENV__.hasEnv) {
      setError(
        `Compte public Supabase non configuré côté application (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants).\nURL actuelle: ${
          __SUPABASE_ENV__.url || "(vide)"
        }`
      );
      return;
    }

    setLoading(true);
    const hardStop = setTimeout(() => {
      setLoading(false);
      setError((prev) => prev || "Connexion bloquée (timeout). Réessaie ou vérifie ton réseau.");
    }, 15000);

    try {
      const session = await withTimeout(
        isInviteMode
          ? onlineApi.loginWithInvitation({ email: e, password, invitationCode: invite })
          : onlineApi.loginPublic({ email: e, password }),
        15000,
        isInviteMode ? "Connexion invitation NAS" : "Connexion compte public"
      );
      const uid = String((session as any)?.user?.id || "").trim();

      if (isInviteMode && uid) {
        const restored = await restoreRemoteSnapshotIntoLocalStore();
        const linked = hasLinkedLocalProfile(uid);
        const remote = restored || await hasRemoteSnapshot();
        if (!linked && !remote) {
          armNasProfileOnboarding(uid);
          go("profiles", {
            view: "locals",
            nasProfileOnboarding: true,
            autoCreate: true,
            returnTo: { tab: "gameSelect" },
          });
          return;
        }
      }

      go("gameSelect");
    } catch (err: any) {
      const msg = String(err?.message || err || "Connexion impossible.");
      if (looksLikeNetworkError(err)) {
        showBackendUnreachable(
          isInviteMode
            ? "Vérifie le backend NAS, le proxy et le code d’invitation."
            : "Vérifie Supabase, le bridge NAS/R2 et la connexion réseau."
        );
        return;
      }
      setError(msg);
      if (!isInviteMode && /not confirmed|non confirmé|email non confirmé/i.test(msg)) setCanResend(true);
    } finally {
      clearTimeout(hardStop);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100dvh - 88px)", display: "grid", placeItems: "center", padding: "18px 12px" }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 22, fontWeight: 950, marginBottom: 6 }}>
          {isInviteMode ? "Connexion invitation privée" : "Connexion compte public"}
        </div>
        <div style={subtitleStyle}>
          {isInviteMode
            ? "Accès privé réservé aux personnes invitées. Le code est obligatoire."
            : "Compte public Multisports : authentification Supabase, stockage cloud contrôlé par quota R2."}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {isInviteMode ? (
            <input
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              placeholder="Code d’invitation privé"
              autoComplete="one-time-code"
              style={inputStyle}
            />
          ) : null}
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse email" autoComplete="email" style={inputStyle} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" type="password" autoComplete="current-password" style={inputStyle} />

          <button onClick={onSubmit} disabled={loading} style={primaryBtnStyle}>
            {loading ? "Connexion..." : isInviteMode ? "Connexion avec invitation" : "Connexion compte public"}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <button onClick={() => go("auth_v7_signup")} style={linkBtnStyle}>Créer un compte public</button>
            <button onClick={() => go("auth_forgot")} style={linkBtnStyle}>Mot de passe oublié ?</button>
          </div>

          <button
            onClick={() => { setError(null); setCanResend(false); setAccessMode(isInviteMode ? "public" : "invite"); }}
            style={inviteBtnStyle}
          >
            {isInviteMode ? "← Revenir au compte public" : "J’ai un code d’invitation"}
          </button>

          {error ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 13, opacity: 0.95, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>{error}</div>
              {canResend ? <button onClick={resendConfirm} disabled={loading} style={secondaryBtnStyle}>Renvoyer l’email de confirmation</button> : null}
            </div>
          ) : null}

          <button onClick={() => go("auth_start")} style={secondaryBtnStyle}>Retour</button>
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  width: "min(420px, 92vw)",
  borderRadius: 22,
  padding: 16,
  background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))",
  border: "1px solid rgba(255,255,255,.10)",
  boxShadow: "0 22px 70px rgba(0,0,0,.62), 0 0 0 1px rgba(0,0,0,.25) inset",
};

const subtitleStyle: React.CSSProperties = { fontSize: 12.5, opacity: 0.82, marginBottom: 12, lineHeight: 1.35 };

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

const inviteBtnStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  padding: "10px 12px",
  border: "1px dashed rgba(54,241,255,.35)",
  background: "rgba(54,241,255,.06)",
  color: "rgba(210,250,255,.95)",
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
