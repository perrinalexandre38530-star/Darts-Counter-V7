// ============================================
// src/pages/AccountStart.tsx
// Portail Auth PRO : social OAuth + Connexion / Création / Mot de passe oublié
// ============================================
import React from "react";
import {
  SOCIAL_AUTH_LABELS,
  SOCIAL_AUTH_PRIMARY_PROVIDERS,
  SOCIAL_AUTH_SECONDARY_PROVIDERS,
  startSocialSignIn,
  type SocialAuthProvider,
} from "../lib/socialAuth";

type Props = {
  onLogin: () => void;
  onCreate: () => void;
  onForgot: () => void;
};

export default function AccountStart({ onLogin, onCreate, onForgot }: Props) {
  const [socialBusy, setSocialBusy] = React.useState<SocialAuthProvider | null>(null);
  const [showMoreSocial, setShowMoreSocial] = React.useState(false);
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

        <div style={socialPanelStyle}>
          <div style={{ fontSize: 11.5, fontWeight: 950, letterSpacing: 0.8, opacity: 0.78, textTransform: "uppercase" }}>
            Connexion rapide
          </div>

          <div style={socialGridStyle}>
            {SOCIAL_AUTH_PRIMARY_PROVIDERS.map((provider) => (
              <SocialButton
                key={provider}
                provider={provider}
                busy={socialBusy === provider}
                disabled={!!socialBusy}
                onClick={() => void onSocial(provider)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowMoreSocial((v) => !v)}
            disabled={!!socialBusy}
            style={moreSocialBtnStyle}
            aria-expanded={showMoreSocial}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{showMoreSocial ? "−" : "+"}</span>
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
                    disabled={!!socialBusy}
                    onClick={() => void onSocial(provider)}
                  />
                ))}
              </div>
              <div style={socialInfoStyle}>
                Instagram utilise l’accès professionnel Business/Creator. Les autres fournisseurs restent reliés au même compte MULTISPORTS SCORING.
              </div>
            </div>
          ) : null}
        </div>

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
        opacity: disabled && !busy ? 0.5 : 1,
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
  icon: string;
  background: string;
  border: string;
  color: string;
  iconBackground: string;
  iconColor: string;
}> = {
  google: { icon: "G", background: "#fff", border: "1px solid #fff", color: "#202124", iconBackground: "#fff", iconColor: "#4285f4" },
  apple: { icon: "A", background: "#050505", border: "1px solid rgba(255,255,255,.28)", color: "#fff", iconBackground: "#fff", iconColor: "#050505" },
  facebook: { icon: "f", background: "#1877f2", border: "1px solid #1877f2", color: "#fff", iconBackground: "#fff", iconColor: "#1877f2" },
  azure: { icon: "M", background: "#fff", border: "1px solid #fff", color: "#242424", iconBackground: "#f2f2f2", iconColor: "#0f6cbd" },
  x: { icon: "𝕏", background: "#050505", border: "1px solid rgba(255,255,255,.24)", color: "#fff", iconBackground: "#fff", iconColor: "#050505" },
  discord: { icon: "D", background: "#5865f2", border: "1px solid #5865f2", color: "#fff", iconBackground: "#fff", iconColor: "#5865f2" },
  instagram: { icon: "◎", background: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)", border: "1px solid rgba(255,255,255,.22)", color: "#fff", iconBackground: "#fff", iconColor: "#c13584" },
  snapchat: { icon: "S", background: "#fffc00", border: "1px solid #fffc00", color: "#111", iconBackground: "#fff", iconColor: "#111" },
  tiktok: { icon: "♪", background: "#050505", border: "1px solid rgba(255,255,255,.24)", color: "#fff", iconBackground: "#fff", iconColor: "#111" },
  linkedin: { icon: "in", background: "#0a66c2", border: "1px solid #0a66c2", color: "#fff", iconBackground: "#fff", iconColor: "#0a66c2" },
  github: { icon: "GH", background: "#161b22", border: "1px solid rgba(255,255,255,.20)", color: "#fff", iconBackground: "#fff", iconColor: "#161b22" },
  spotify: { icon: "♫", background: "#1db954", border: "1px solid #1db954", color: "#07180d", iconBackground: "#07180d", iconColor: "#1db954" },
  twitch: { icon: "T", background: "#9146ff", border: "1px solid #9146ff", color: "#fff", iconBackground: "#fff", iconColor: "#9146ff" },
  kakao: { icon: "K", background: "#fee500", border: "1px solid #fee500", color: "#191919", iconBackground: "#191919", iconColor: "#fee500" },
};

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

const socialPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 9,
  padding: 11,
  borderRadius: 18,
  border: "1px solid rgba(54,241,255,.13)",
  background: "linear-gradient(180deg, rgba(54,241,255,.055), rgba(255,255,255,.025))",
};

const socialGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const socialBtnBaseStyle: React.CSSProperties = {
  minWidth: 0,
  minHeight: 46,
  borderRadius: 14,
  padding: "8px 10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 9,
  fontSize: 12.4,
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(0,0,0,.25)",
};

const socialIconStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  flex: "0 0 28px",
  borderRadius: 8,
  display: "grid",
  placeItems: "center",
  fontSize: 15,
  fontWeight: 1000,
  lineHeight: 1,
};

const moreSocialBtnStyle: React.CSSProperties = {
  minHeight: 36,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.11)",
  background: "rgba(255,255,255,.04)",
  color: "rgba(255,255,255,.88)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "7px 10px",
  fontSize: 11.5,
  fontWeight: 900,
  cursor: "pointer",
};

const socialInfoStyle: React.CSSProperties = {
  padding: "8px 9px",
  borderRadius: 11,
  border: "1px solid rgba(255,255,255,.075)",
  background: "rgba(0,0,0,.18)",
  fontSize: 10.5,
  lineHeight: 1.35,
  opacity: 0.72,
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
