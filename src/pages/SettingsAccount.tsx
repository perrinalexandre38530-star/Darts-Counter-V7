// ============================================
// src/pages/SettingsAccount.tsx
// Gestion du compte online & préférences
// - Etat connexion / email
// - Reset mot de passe (email)
// - Changement d'email
// - Préférences notifications / emails
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { onlineApi } from "../lib/onlineApi";
import type { Store } from "../lib/types";

type Props = {
  store: Store;
  update: (mut: (s: Store) => Store) => void;
};

export default function SettingsAccount({ store, update }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const auth = useAuthOnline();

  const email = auth.session?.user.email || "";

  // Préférences "douces" stockées dans store.accountPrefs (clé générique)
  const accountPrefs = (store as any).accountPrefs || {
    notificationsEnabled: true,
    marketingEmails: false,
  };

  const [notifEnabled, setNotifEnabled] = React.useState(
    !!accountPrefs.notificationsEnabled
  );
  const [marketingEmails, setMarketingEmails] = React.useState(
    !!accountPrefs.marketingEmails
  );

  const [resetEmail, setResetEmail] = React.useState(email);
  const [newEmail, setNewEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function persistPrefs() {
    update((s) => {
      const next: any = { ...(s as any) };
      next.accountPrefs = {
        ...(next.accountPrefs || {}),
        notificationsEnabled: notifEnabled,
        marketingEmails,
      };
      return next as Store;
    });
    setMessage(
      t("settings.account.prefsSaved", "Préférences enregistrées.")
    );
  }

  async function handleResetPassword() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await onlineApi.requestPasswordReset(resetEmail);
      setMessage(
        t(
          "settings.account.reset.ok",
          "Un email de réinitialisation a été envoyé (si l’adresse est connue)."
        )
      );
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la demande.");
    } finally {
      setBusy(false);
    }
  }

  async function handleChangeEmail() {
    if (!newEmail.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await onlineApi.updateEmail(newEmail);
      setMessage(
        t(
          "settings.account.email.ok",
          "Email mis à jour (vérifie ta boite mail si une validation est requise)."
        )
      );
      setNewEmail("");
      // On rafraîchit la session pour récupérer le nouvel email
      await auth.refresh();
    } catch (err: any) {
      setError(err?.message || "Erreur lors du changement d’email.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await auth.logout();
      setMessage(
        t("settings.account.logout.ok", "Tu es maintenant déconnecté.")
      );
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la déconnexion.");
    } finally {
      setBusy(false);
    }
  }

  const primary = theme.primary;

  return (
    <div
      className="container"
      style={{
        maxWidth: 760,
        background: theme.bg,
        color: theme.text,
        paddingBottom: 20,
        padding: 16,
      }}
    >
      <section
        style={{
          padding: 16,
          borderRadius: 18,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 18px 36px rgba(0,0,0,.35)",
          marginBottom: 14,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: primary,
            marginBottom: 4,
          }}
        >
          {t("settings.account.title", "Compte & sécurité")}
        </h1>
        <p
          className="subtitle"
          style={{ fontSize: 12, color: theme.textSoft }}
        >
          {t(
            "settings.account.subtitle",
            "Gère ton compte Darts Counter, ton email, ton mot de passe et tes préférences."
          )}
        </p>
      </section>

      {/* Etat connexion */}
      <section
        style={{
          padding: 16,
          borderRadius: 18,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 18px 36px rgba(0,0,0,.35)",
          marginBottom: 14,
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: primary,
            marginBottom: 6,
          }}
        >
          {t("settings.account.section.status", "Etat du compte")}
        </h2>
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          {auth.status === "signed_in" ? (
            <>
              {t("settings.account.signedInAs", "Connecté en tant que")}{" "}
              <strong>{email || "—"}</strong>
            </>
          ) : auth.status === "checking" ? (
            t("settings.account.checking", "Vérification de la session…")
          ) : (
            t("settings.account.signedOut", "Non connecté.")
          )}
        </div>
        {auth.status === "signed_in" && (
          <button
            className="btn sm"
            onClick={handleLogout}
            disabled={busy}
            style={{ marginTop: 4 }}
          >
            {t("settings.account.btn.logout", "Se déconnecter")}
          </button>
        )}
      </section>

      {/* Mot de passe oublié */}
      <section
        style={{
          padding: 16,
          borderRadius: 18,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 18px 36px rgba(0,0,0,.35)",
          marginBottom: 14,
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: primary,
            marginBottom: 6,
          }}
        >
          {t(
            "settings.account.section.reset",
            "Réinitialiser le mot de passe"
          )}
        </h2>
        <p
          className="subtitle"
          style={{ fontSize: 12, color: theme.textSoft, marginBottom: 8 }}
        >
          {t(
            "settings.account.reset.help",
            "Entre l’adresse mail de ton compte pour recevoir un lien de réinitialisation."
          )}
        </p>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <button
            className="btn sm"
            onClick={handleResetPassword}
            disabled={busy}
          >
            {t("settings.account.reset.btn", "Envoyer le lien")}
          </button>
        </div>
      </section>

      {/* Changement d'email */}
      <section
        style={{
          padding: 16,
          borderRadius: 18,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 18px 36px rgba(0,0,0,.35)",
          marginBottom: 14,
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: primary,
            marginBottom: 6,
          }}
        >
          {t(
            "settings.account.section.email",
            "Changer d’adresse mail"
          )}
        </h2>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            type="email"
            placeholder={t(
              "settings.account.email.placeholder",
              "Nouvelle adresse mail"
            )}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <button
            className="btn sm"
            onClick={handleChangeEmail}
            disabled={busy || !newEmail.trim()}
          >
            {t("settings.account.email.btn", "Mettre à jour")}
          </button>
        </div>
      </section>

      {/* Préférences */}
      <section
        style={{
          padding: 16,
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
            marginBottom: 6,
          }}
        >
          {t("settings.account.section.prefs", "Préférences")}
        </h2>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          <input
            type="checkbox"
            checked={notifEnabled}
            onChange={(e) => setNotifEnabled(e.target.checked)}
          />
          <span>
            {t(
              "settings.account.prefs.notifications",
              "Activer les notifications (appareil / mail)."
            )}
          </span>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            marginBottom: 10,
          }}
        >
          <input
            type="checkbox"
            checked={marketingEmails}
            onChange={(e) => setMarketingEmails(e.target.checked)}
          />
          <span>
            {t(
              "settings.account.prefs.marketing",
              "Recevoir des infos et astuces par email."
            )}
          </span>
        </label>

        <button
          className="btn sm"
          onClick={persistPrefs}
          disabled={busy}
        >
          {t(
            "settings.account.prefs.btnSave",
            "Enregistrer les préférences"
          )}
        </button>
      </section>

      {message && (
        <div
          className="subtitle"
          style={{
            marginTop: 10,
            color: "#4cd964",
            fontSize: 11,
          }}
        >
          {message}
        </div>
      )}
      {error && (
        <div
          className="subtitle"
          style={{
            marginTop: 10,
            color: "#ff4d4f",
            fontSize: 11,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
