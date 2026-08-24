// ============================================
// src/pages/AuthV7Login.tsx
// Connexion unifiée : compte public Supabase OU compte NAS invité/fondateur existant.
// Le code d’invitation sert uniquement à la création d’un compte privé.
// ============================================
import React from "react";
import { onlineApi } from "../lib/onlineApi";
import { maybeAutoRestoreCloudForSignedInUser } from "../lib/cloudAutoRestore";
import {
  SOCIAL_AUTH_LABELS,
  SOCIAL_AUTH_PRIMARY_PROVIDERS,
  SOCIAL_AUTH_SECONDARY_PROVIDERS,
  startSocialSignIn,
  type SocialAuthProvider,
} from "../lib/socialAuth";

type Props = {
  go: (t: any, p?: any) => void;
};

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
  const [socialBusy, setSocialBusy] = React.useState<SocialAuthProvider | null>(null);
  const [showMoreSocial, setShowMoreSocial] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [canResend, setCanResend] = React.useState(false);

  const lastNetErrAtRef = React.useRef<number>(0);

  const showBackendUnreachable = (details?: string) => {
    const now = Date.now();
    if (now - lastNetErrAtRef.current < 30_000) return;
    lastNetErrAtRef.current = now;
    setError(`Impossible de joindre le service de connexion.${details ? `\n\n${details}` : ""}`);
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
        showBackendUnreachable("Teste en 4G/navigation privée si un bloqueur réseau gêne Supabase ou le backend NAS/R2.");
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
    if (!e || !e.includes("@")) return setError("Entre une adresse email valide.");
    if (!password) return setError("Entre ton mot de passe.");

    setLoading(true);
    const hardStop = setTimeout(() => {
      setLoading(false);
      setError((prev) => prev || "Connexion bloquée (timeout). Réessaie ou vérifie ton réseau.");
    }, 20000);

    try {
      const session = await withTimeout(
        onlineApi.loginPublic({ email: e, password }),
        20000,
        "Connexion"
      );
      const uid = String((session as any)?.user?.id || "").trim();

      if (uid) {
        // Connexion publique = Supabase Auth + données Cloudflare R2.
        // Ne jamais exiger de token NAS ici : le QNAP privé peut être hors ligne.
        const remote = await withTimeout(
          maybeAutoRestoreCloudForSignedInUser(uid, { force: true }),
          15000,
          "Restauration Cloud R2"
        ).catch(() => false);

        // Une restauration effective déclenche son propre reload après import.
        if (remote) return;

        const linked = hasLinkedLocalProfile(uid);
        if (!linked) {
          armNasProfileOnboarding(uid);
          go("profiles", {
            view: "locals",
            nasProfileOnboarding: true,
            autoCreate: true,
            returnTo: { tab: "profiles", params: { view: "me" } },
          });
          return;
        }
      }

      go("gameSelect");
    } catch (err: any) {
      const msg = String(err?.message || err || "Connexion impossible.");
      if (looksLikeNetworkError(err)) {
        showBackendUnreachable("Vérifie Supabase, le backend NAS/R2, le proxy Cloudflare et la connexion réseau.");
        return;
      }
      setError(msg);
      if (/not confirmed|non confirmé|email non confirmé/i.test(msg)) setCanResend(true);
    } finally {
      clearTimeout(hardStop);
      setLoading(false);
    }
  };

  const onSocial = async (provider: SocialAuthProvider) => {
    setError(null);
    setCanResend(false);
    setSocialBusy(provider);
    try {
      await startSocialSignIn(provider);
      // Sur Android, le navigateur système est maintenant ouvert. Le retour
      // dans l'app sera finalisé par #/auth/callback. Sur le web la page quitte
      // normalement l'écran immédiatement par redirection OAuth.
    } catch (err: any) {
      setError(String(err?.message || err || `Connexion ${SOCIAL_AUTH_LABELS[provider]} impossible.`));
      setSocialBusy(null);
    }
  };

  const openInvitationSignup = () => {
    try { localStorage.setItem("dc_auth_signup_invite_mode", "1"); } catch {}
    go("auth_v7_signup");
  };

  return (
    <div style={{ minHeight: "calc(100dvh - 88px)", display: "grid", placeItems: "center", padding: "18px 12px" }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 22, fontWeight: 950, marginBottom: 6 }}>Connexion</div>
        <div style={subtitleStyle}>
          Connecte-toi avec ton compte Multisports. Les comptes publics passent par Supabase/R2 ; les comptes invités NAS déjà créés se reconnectent ici sans retaper le code.
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={socialPanelStyle}>
            <div style={{ fontSize: 11.5, fontWeight: 950, letterSpacing: 0.5, opacity: 0.78, textTransform: "uppercase" }}>
              Connexion rapide
            </div>
            <div style={socialGridStyle}>
              {SOCIAL_AUTH_PRIMARY_PROVIDERS.map((provider) => (
                <SocialButton
                  key={provider}
                  provider={provider}
                  busy={socialBusy === provider}
                  disabled={loading || !!socialBusy}
                  onClick={() => void onSocial(provider)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowMoreSocial((v) => !v)}
              disabled={loading || !!socialBusy}
              style={moreSocialBtnStyle}
              aria-expanded={showMoreSocial}
            >
              <span>{showMoreSocial ? "−" : "+"}</span>
              <span>{showMoreSocial ? "Masquer les autres connexions" : `Plus de connexions (${SOCIAL_AUTH_SECONDARY_PROVIDERS.length})`}</span>
            </button>

            {showMoreSocial ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={socialGridStyle}>
                  {SOCIAL_AUTH_SECONDARY_PROVIDERS.map((provider) => (
                    <SocialButton
                      key={provider}
                      provider={provider}
                      busy={socialBusy === provider}
                      disabled={loading || !!socialBusy}
                      onClick={() => void onSocial(provider)}
                    />
                  ))}
                </div>
                <div style={socialInfoStyle}>
                  Instagram utilise un accès OAuth personnalisé réservé aux comptes professionnels Business/Creator. Les autres connexions restent indépendantes de tes données MULTISPORTS SCORING.
                </div>
              </div>
            ) : null}
          </div>

          <div style={dividerStyle}>
            <span style={dividerLineStyle} />
            <span style={{ fontSize: 11, opacity: 0.62, fontWeight: 850 }}>OU AVEC EMAIL</span>
            <span style={dividerLineStyle} />
          </div>

          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse email" autoComplete="email" style={inputStyle} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" type="password" autoComplete="current-password" style={inputStyle} />

          <button onClick={onSubmit} disabled={loading || !!socialBusy} style={primaryBtnStyle}>
            {loading ? "Connexion..." : "Connexion"}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <button onClick={() => go("auth_v7_signup")} style={linkBtnStyle}>Créer un compte public</button>
            <button onClick={() => go("auth_forgot")} style={linkBtnStyle}>Mot de passe oublié ?</button>
          </div>

          <button onClick={openInvitationSignup} disabled={loading || !!socialBusy} style={inviteBtnStyle}>J’ai un code d’invitation</button>

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

type SocialButtonProps = {
  provider: SocialAuthProvider;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
};

function SocialButton({ provider, busy, disabled, onClick }: SocialButtonProps) {
  const meta = SOCIAL_BUTTON_META[provider];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Continuer avec ${SOCIAL_AUTH_LABELS[provider]}`}
      style={{
        ...socialBtnBaseStyle,
        background: meta.background,
        border: meta.border,
        color: meta.color,
        opacity: disabled && !busy ? 0.55 : 1,
      }}
    >
      <span style={{ ...socialIconStyle, background: meta.iconBackground, color: meta.iconColor }}>{meta.icon}</span>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {busy ? "Ouverture…" : SOCIAL_AUTH_LABELS[provider]}
      </span>
    </button>
  );
}

const SOCIAL_BUTTON_META: Record<SocialAuthProvider, {
  icon: string; background: string; border: string; color: string; iconBackground: string; iconColor: string;
}> = {
  google: {
    icon: "G", background: "#ffffff", border: "1px solid rgba(255,255,255,.92)", color: "#202124",
    iconBackground: "#ffffff", iconColor: "#4285f4",
  },
  apple: {
    icon: "●", background: "#050505", border: "1px solid rgba(255,255,255,.24)", color: "#ffffff",
    iconBackground: "#ffffff", iconColor: "#050505",
  },
  facebook: {
    icon: "f", background: "#1877f2", border: "1px solid rgba(24,119,242,.95)", color: "#ffffff",
    iconBackground: "rgba(255,255,255,.98)", iconColor: "#1877f2",
  },
  azure: {
    icon: "M", background: "#ffffff", border: "1px solid rgba(255,255,255,.92)", color: "#242424",
    iconBackground: "#f3f3f3", iconColor: "#0f6cbd",
  },
  x: {
    icon: "𝕏", background: "#050505", border: "1px solid rgba(255,255,255,.22)", color: "#ffffff",
    iconBackground: "#ffffff", iconColor: "#050505",
  },
  discord: {
    icon: "D", background: "#5865f2", border: "1px solid rgba(88,101,242,.95)", color: "#ffffff",
    iconBackground: "rgba(255,255,255,.98)", iconColor: "#5865f2",
  },
  instagram: {
    icon: "◎", background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)", border: "1px solid rgba(255,255,255,.22)", color: "#ffffff",
    iconBackground: "rgba(255,255,255,.96)", iconColor: "#c13584",
  },
  snapchat: {
    icon: "S", background: "#fffc00", border: "1px solid rgba(255,252,0,.92)", color: "#111111",
    iconBackground: "#ffffff", iconColor: "#111111",
  },
  tiktok: {
    icon: "♪", background: "#050505", border: "1px solid rgba(255,255,255,.22)", color: "#ffffff",
    iconBackground: "#ffffff", iconColor: "#111111",
  },
  linkedin: {
    icon: "in", background: "#0a66c2", border: "1px solid rgba(10,102,194,.95)", color: "#ffffff",
    iconBackground: "#ffffff", iconColor: "#0a66c2",
  },
  github: {
    icon: "GH", background: "#161b22", border: "1px solid rgba(255,255,255,.18)", color: "#ffffff",
    iconBackground: "#ffffff", iconColor: "#161b22",
  },
  spotify: {
    icon: "♫", background: "#1db954", border: "1px solid rgba(29,185,84,.95)", color: "#07180d",
    iconBackground: "#07180d", iconColor: "#1db954",
  },
  twitch: {
    icon: "T", background: "#9146ff", border: "1px solid rgba(145,70,255,.95)", color: "#ffffff",
    iconBackground: "#ffffff", iconColor: "#9146ff",
  },
  kakao: {
    icon: "K", background: "#fee500", border: "1px solid rgba(254,229,0,.95)", color: "#191919",
    iconBackground: "#191919", iconColor: "#fee500",
  },
};

const cardStyle: React.CSSProperties = {
  width: "min(420px, 92vw)",
  borderRadius: 22,
  padding: 16,
  background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))",
  border: "1px solid rgba(255,255,255,.10)",
  boxShadow: "0 22px 70px rgba(0,0,0,.62), 0 0 0 1px rgba(0,0,0,.25) inset",
};

const subtitleStyle: React.CSSProperties = { fontSize: 12.5, opacity: 0.82, marginBottom: 12, lineHeight: 1.35 };

const socialPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 10,
  borderRadius: 17,
  border: "1px solid rgba(54,241,255,.13)",
  background: "linear-gradient(180deg, rgba(54,241,255,.045), rgba(255,255,255,.025))",
  boxShadow: "0 12px 28px rgba(0,0,0,.20) inset",
};

const socialGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const socialBtnBaseStyle: React.CSSProperties = {
  minWidth: 0,
  minHeight: 44,
  borderRadius: 13,
  padding: "7px 9px",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 8,
  fontSize: 12.2,
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(0,0,0,.24)",
};

const socialIconStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  flex: "0 0 26px",
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  fontSize: 15,
  fontWeight: 1000,
  lineHeight: 1,
};

const moreSocialBtnStyle: React.CSSProperties = {
  minHeight: 34,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.10)",
  background: "rgba(255,255,255,.035)",
  color: "rgba(255,255,255,.84)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "6px 10px",
  fontSize: 11.5,
  fontWeight: 900,
  cursor: "pointer",
};

const socialInfoStyle: React.CSSProperties = {
  padding: "7px 9px",
  borderRadius: 11,
  border: "1px solid rgba(255,255,255,.075)",
  background: "rgba(0,0,0,.18)",
  fontSize: 10.5,
  lineHeight: 1.35,
  opacity: 0.72,
};

const dividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "2px 1px",
};

const dividerLineStyle: React.CSSProperties = {
  height: 1,
  flex: 1,
  background: "rgba(255,255,255,.10)",
};

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
