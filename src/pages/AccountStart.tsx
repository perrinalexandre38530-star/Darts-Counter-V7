// ============================================
// src/pages/AccountStart.tsx
// Portail Auth PRO : social OAuth + Connexion / Création / Mot de passe oublié
// ============================================
import React from "react";
import SocialLoginPanel from "../components/auth/SocialLoginPanel";
import { SOCIAL_AUTH_LABELS, startSocialSignIn, type SocialAuthProvider } from "../lib/socialAuth";

type Props = {
  onLogin: () => void;
  onCreate: () => void;
  onForgot: () => void;
};

export default function AccountStart({ onLogin, onCreate, onForgot }: Props) {
  const [socialBusy, setSocialBusy] = React.useState<SocialAuthProvider | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onSocial = async (provider: SocialAuthProvider) => {
    setError(null);
    setSocialBusy(provider);
    try {
      await startSocialSignIn(provider);
    } catch (err: any) {
      setError(String(err?.message || err || `Connexion ${SOCIAL_AUTH_LABELS[provider]} impossible.`));
      setSocialBusy(null);
    }
  };

  return (
    <div
      className="container"
      style={{
        padding: "24px 18px 34px",
        minHeight: "100dvh",
        display: "grid",
        alignContent: "center",
        justifyItems: "center",
        textAlign: "center",
        background: "radial-gradient(circle at 50% 12%, rgba(35,230,255,.10), transparent 34%), #000",
      }}
    >
      <div style={cardStyle}>
        <div style={eyebrowStyle}>MULTISPORTS SCORING</div>
        <h2 style={{ margin: "4px 0 0", fontSize: 31, lineHeight: 1.05 }}>Bienvenue</h2>
        <p style={{ opacity: 0.82, margin: "10px auto 2px", maxWidth: 480, lineHeight: 1.4, fontSize: 14 }}>
          Connecte-toi pour retrouver automatiquement ton compte, ton profil, ton avatar et tes statistiques sur tous tes appareils.
        </p>

        <SocialLoginPanel busyProvider={socialBusy} onProvider={(provider) => void onSocial(provider)} />

        <div style={dividerStyle}>
          <span style={dividerLineStyle} />
          <span style={{ fontSize: 11, opacity: 0.62, fontWeight: 850 }}>OU</span>
          <span style={dividerLineStyle} />
        </div>

        <div style={{ display: "grid", gap: 10, width: "100%" }}>
          <button className="btn primary" onClick={onLogin} style={primaryBtnStyle}>
            Se connecter avec email
          </button>

          <button className="btn" onClick={onCreate} style={secondaryBtnStyle}>
            Créer un compte
          </button>

          <button className="btn" onClick={onForgot} style={forgotBtnStyle}>
            Mot de passe oublié ?
          </button>
        </div>

        {error ? <div style={errorStyle}>{error}</div> : null}

        <div style={securityStyle}>
          🔒 Une connexion est obligatoire pour accéder à MULTISPORTS SCORING.
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  width: "min(520px, 100%)",
  display: "grid",
  gap: 14,
  padding: "22px 18px",
  borderRadius: 26,
  border: "1px solid rgba(35,230,255,.14)",
  background: "linear-gradient(180deg, rgba(9,18,28,.94), rgba(2,5,9,.98))",
  boxShadow: "0 26px 80px rgba(0,0,0,.72), 0 0 34px rgba(35,230,255,.08)",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#ffd45a",
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: 1.7,
  textTransform: "uppercase",
};

const dividerStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 9 };
const dividerLineStyle: React.CSSProperties = { height: 1, flex: 1, background: "rgba(255,255,255,.11)" };

const primaryBtnStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "13px 14px",
  fontWeight: 950,
  background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
  color: "#1b1508",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(0,0,0,.35), 0 0 20px rgba(255,198,58,.12)",
};

const secondaryBtnStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "12px 14px",
  fontWeight: 900,
  background: "rgba(255,255,255,.07)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,.13)",
  cursor: "pointer",
};

const forgotBtnStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "9px 14px",
  fontWeight: 800,
  background: "transparent",
  color: "rgba(255,255,255,.85)",
  border: "none",
  cursor: "pointer",
  textDecoration: "underline",
};

const errorStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 13,
  background: "rgba(255,80,80,.09)",
  border: "1px solid rgba(255,100,100,.24)",
  color: "#ffd7d7",
  fontSize: 12.5,
  lineHeight: 1.35,
};

const securityStyle: React.CSSProperties = {
  marginTop: 2,
  fontSize: 10.8,
  opacity: 0.62,
  lineHeight: 1.35,
};
