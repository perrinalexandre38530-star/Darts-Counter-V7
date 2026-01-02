// ============================================
// src/pages/AccountSettings.tsx
// Réglages → Compte & sécurité
// - Affiche le compte online actuel (email / pseudo / pays)
// - Rappel du profil local lié
// - Bouton "réinitialiser mot de passe" (via onlineApi.requestPasswordReset)
// - Bouton "changer d’email" (via onlineApi.updateEmail)
// - Déconnexion globale
// ============================================

import React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { onlineApi } from "../lib/onlineApi";

type Props = {
  store: Store;
  update: (mut: (s: Store) => Store) => void;
  setProfiles: (fn: (p: Profile[]) => Profile[]) => void;
  go?: (tab: any, params?: any) => void;
};

type PrivateInfo = {
  nickname?: string;
  lastName?: string;
  firstName?: string;
  birthDate?: string;
  country?: string;
  city?: string;
  email?: string;
  phone?: string;
  password?: string;
};

export default function AccountSettings({
  store,
  update,
  setProfiles,
  go,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const auth = useAuthOnline();
  const primary = theme.primary as string;

  const { profiles = [], activeProfileId = null } = store;

  const active =
    profiles.find((p) => p.id === activeProfileId) || null;

  const privateInfo: PrivateInfo = React.useMemo(() => {
    if (!active) return {};
    return (((active as any).privateInfo || {}) as PrivateInfo) || {};
  }, [active]);

  const [sessionEmail, setSessionEmail] = React.useState<string | null>(
    null
  );
  const [sessionNickname, setSessionNickname] =
    React.useState<string | null>(null);

  // Champs "changer email"
  const [newEmail, setNewEmail] = React.useState("");
  const [updateEmailStatus, setUpdateEmailStatus] = React.useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [updateEmailError, setUpdateEmailError] =
    React.useState<string | null>(null);

  // Reset mot de passe
  const [resetStatus, setResetStatus] = React.useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [resetError, setResetError] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await onlineApi.getCurrentSession();
        if (cancelled) return;
        const u = session?.user;
        setSessionEmail(u?.email || null);
        setSessionNickname(u?.nickname || null);

        // preload champ "nouvel email" avec l’email actuel
        if (u?.email) setNewEmail(u.email);
      } catch (err) {
        if (cancelled) return;
        console.warn("[AccountSettings] getCurrentSession error:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentEmail =
    sessionEmail ||
    (privateInfo.email && privateInfo.email.trim()) ||
    "";

  const linkedProfileName = active?.name || "—";

  async function handleResetPassword() {
    if (!currentEmail) {
      setResetStatus("error");
      setResetError(
        t(
          "account.reset.noEmail",
          "Aucune adresse mail n’est disponible pour ce compte."
        )
      );
      return;
    }

    setResetStatus("loading");
    setResetError(null);

    try {
      // Nécessite que onlineApi.requestPasswordReset(email) existe
      await (onlineApi as any).requestPasswordReset(currentEmail);
      setResetStatus("ok");
    } catch (err) {
      console.warn("[AccountSettings] reset password error:", err);
      setResetStatus("error");
      setResetError(
        t(
          "account.reset.error",
          "Impossible d’envoyer l’email de réinitialisation. Réessaie plus tard."
        )
      );
    }
  }

  async function handleUpdateEmail() {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;

    setUpdateEmailStatus("loading");
    setUpdateEmailError(null);

    try {
      // Nécessite que onlineApi.updateEmail(email) existe
      await (onlineApi as any).updateEmail(trimmed);

      // On sync aussi l’email côté profil local
      if (active) {
        const id = active.id;
        setProfiles((arr) =>
          arr.map((p) => {
            if (p.id !== id) return p;
            const pi = ((p as any).privateInfo || {}) as PrivateInfo;
            return {
              ...p,
              privateInfo: {
                ...pi,
                email: trimmed,
              },
            } as any;
          })
        );
      }

      setSessionEmail(trimmed);
      setUpdateEmailStatus("ok");
    } catch (err) {
      console.warn("[AccountSettings] updateEmail error:", err);
      setUpdateEmailStatus("error");
      setUpdateEmailError(
        t(
          "account.email.error",
          "Impossible de mettre à jour l’adresse mail."
        )
      );
    }
  }

  async function handleLogoutEverywhere() {
    try {
      await auth.logout();
    } catch (err) {
      console.warn("[AccountSettings] logout error:", err);
    }
    // On garde le profil local actif mais on passe l’état online → offline
    update((s) => ({
      ...s,
      selfStatus: "offline",
    }));
  }

  function handleBack() {
    // Retour vers Réglages ou Profils selon ton routing
    // Ici : retour vers la page Réglages
    go?.("settings");
  }

  // Si pas connecté online → info + CTA
  if (auth.status !== "signed_in") {
    return (
      <div
        className="container"
        style={{ maxWidth: 760, background: theme.bg, color: theme.text }}
      >
        <button
          className="btn sm"
          onClick={handleBack}
          style={{
            marginBottom: 10,
            borderRadius: 999,
            paddingInline: 14,
            background: "transparent",
            border: `1px solid ${theme.borderSoft}`,
            fontSize: 12,
          }}
        >
          ← {t("settings.back", "Retour aux réglages")}
        </button>

        <section
          style={{
            padding: 16,
            borderRadius: 18,
            background: theme.card,
            border: `1px solid ${theme.borderSoft}`,
            boxShadow: "0 18px 36px rgba(0,0,0,.35)",
          }}
        >
          <h1
            style={{
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: 1.3,
              textTransform: "uppercase",
              color: primary,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            {t("account.title", "Compte & sécurité")}
          </h1>
          <p
            className="subtitle"
            style={{
              fontSize: 12,
              color: theme.textSoft,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {t(
              "account.requireLogin",
              "Pour gérer ton compte en ligne (email, mot de passe), connecte-toi d’abord."
            )}
          </p>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              className="btn primary"
              onClick={() => go?.("profiles", { view: "me" })}
            >
              {t("account.goToProfiles", "Aller à MON PROFIL")}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{ maxWidth: 760, background: theme.bg, color: theme.text }}
    >
      <button
        className="btn sm"
        onClick={handleBack}
        style={{
          marginBottom: 10,
          borderRadius: 999,
          paddingInline: 14,
          background: "transparent",
          border: `1px solid ${theme.borderSoft}`,
          fontSize: 12,
        }}
      >
        ← {t("settings.back", "Retour aux réglages")}
      </button>

      {/* Bloc en-tête */}
      <section
        style={{
          padding: 16,
          marginBottom: 14,
          borderRadius: 18,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 18px 36px rgba(0,0,0,.35)",
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: 1.3,
            textTransform: "uppercase",
            color: primary,
            textAlign: "center",
            marginBottom: 4,
          }}
        >
          {t("account.title", "Compte & sécurité")}
        </h1>
        <p
          className="subtitle"
          style={{
            fontSize: 12,
            color: theme.textSoft,
            textAlign: "center",
          }}
        >
          {t(
            "account.subtitle",
            "Gère ton email de connexion, ton mot de passe et la sécurité de ton compte."
          )}
        </p>
      </section>

      {/* Infos compte + profil lié */}
      <section
        style={{
          padding: 16,
          marginBottom: 14,
          borderRadius: 18,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 18px 36px rgba(0,0,0,.35)",
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: primary,
            marginBottom: 8,
          }}
        >
          {t("account.section.accountInfo", "Compte en ligne")}
        </h2>

        <div
          className="subtitle"
          style={{ fontSize: 12, color: theme.textSoft, marginBottom: 8 }}
        >
          {t(
            "account.linkedProfile",
            "Ce compte est lié à ton profil local : {profile}"
          ).replace("{profile}", linkedProfileName)}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <AccountField
            label={t("profiles.private.email", "Adresse mail")}
            value={currentEmail || "—"}
          />
          <AccountField
            label={t("account.nickname", "Pseudo en ligne")}
            value={sessionNickname || privateInfo.nickname || linkedProfileName}
          />
          <AccountField
            label={t("profiles.private.country", "Pays")}
            value={privateInfo.country || "—"}
          />
        </div>
      </section>

      {/* Changer d’email */}
      <section
        style={{
          padding: 16,
          marginBottom: 14,
          borderRadius: 18,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 18px 36px rgba(0,0,0,.35)",
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: primary,
            marginBottom: 8,
          }}
        >
          {t("account.section.email", "Adresse mail de connexion")}
        </h2>
        <div
          className="subtitle"
          style={{ fontSize: 12, color: theme.textSoft, marginBottom: 8 }}
        >
          {t(
            "account.email.hint",
            "Tu peux mettre à jour ton email de connexion. Un email de confirmation pourra être envoyé."
          )}
        </div>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 12,
          }}
        >
          <span style={{ color: theme.textSoft }}>
            {t("account.email.new", "Nouvelle adresse mail")}
          </span>
          <input
            className="input"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </label>

        <div
          className="row"
          style={{
            marginTop: 8,
            justifyContent: "flex-end",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn primary sm"
            onClick={handleUpdateEmail}
            disabled={updateEmailStatus === "loading"}
            style={{
              background: `linear-gradient(180deg, ${primary}, ${primary}AA)`,
              color: "#000",
              fontWeight: 800,
            }}
          >
            {updateEmailStatus === "loading"
              ? t("account.email.btn.loading", "Mise à jour…")
              : t("account.email.btn.update", "Mettre à jour l’email")}
          </button>
        </div>

        {updateEmailStatus === "ok" && (
          <div
            className="subtitle"
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "#66ff99",
            }}
          >
            {t(
              "account.email.success",
              "Adresse mail mise à jour avec succès."
            )}
          </div>
        )}
        {updateEmailStatus === "error" && (
          <div
            className="subtitle"
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "#ff6666",
            }}
          >
            {updateEmailError ||
              t(
                "account.email.error",
                "Erreur lors de la mise à jour de l’email."
              )}
          </div>
        )}
      </section>

      {/* Reset mot de passe */}
      <section
        style={{
          padding: 16,
          marginBottom: 14,
          borderRadius: 18,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 18px 36px rgba(0,0,0,.35)",
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: primary,
            marginBottom: 8,
          }}
        >
          {t("account.section.password", "Mot de passe")}
        </h2>
        <div
          className="subtitle"
          style={{ fontSize: 12, color: theme.textSoft, marginBottom: 8 }}
        >
          {t(
            "account.password.hint",
            "Un email de réinitialisation sera envoyé à l’adresse de connexion."
          )}
        </div>

        <button
          className="btn primary sm"
          onClick={handleResetPassword}
          disabled={resetStatus === "loading"}
          style={{
            background: `linear-gradient(180deg, ${primary}, ${primary}AA)`,
            color: "#000",
            fontWeight: 800,
          }}
        >
          {resetStatus === "loading"
            ? t("account.password.btn.loading", "Envoi en cours…")
            : t(
                "account.password.btn.reset",
                "Envoyer un email de réinitialisation"
              )}
        </button>

        {resetStatus === "ok" && (
          <div
            className="subtitle"
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "#66ff99",
            }}
          >
            {t(
              "account.password.success",
              "Email de réinitialisation envoyé (pense à vérifier tes spams)."
            )}
          </div>
        )}
        {resetStatus === "error" && (
          <div
            className="subtitle"
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "#ff6666",
            }}
          >
            {resetError ||
              t(
                "account.password.error",
                "Impossible d’envoyer l’email de réinitialisation."
              )}
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section
        style={{
          padding: 16,
          marginBottom: 14,
          borderRadius: 18,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 18px 36px rgba(0,0,0,.35)",
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#ff6666",
            marginBottom: 6,
          }}
        >
          {t("account.section.danger", "Sécurité / déconnexion")}
        </h2>
        <p
          className="subtitle"
          style={{ fontSize: 12, color: theme.textSoft, marginBottom: 8 }}
        >
          {t(
            "account.danger.hint",
            "Tu peux te déconnecter de cet appareil. Les profils locaux et les stats restent sauvegardés."
          )}
        </p>

        <button
          className="btn danger sm"
          onClick={handleLogoutEverywhere}
        >
          {t(
            "account.danger.logout",
            "Se déconnecter de ce compte sur cet appareil"
          )}
        </button>
      </section>
    </div>
  );
}

function AccountField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        fontSize: 12,
      }}
    >
      <span
        className="subtitle"
        style={{ color: theme.textSoft, fontSize: 11 }}
      >
        {label}
      </span>
      <div
        style={{
          padding: "6px 8px",
          borderRadius: 10,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.bg,
          fontSize: 13,
        }}
      >
        {value}
      </div>
    </div>
  );
}
