// ============================================================
// src/components/OnlineProfileForm.tsx
// Formulaire d'Informations personnelles ONLINE
// - Lit onlineProfile (supabase)
// - Remplit automatiquement les champs au chargement
// - Sauvegarde via onlineApi.updateProfile()
// ============================================================

import * as React from "react";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { onlineApi } from "../lib/onlineApi";

export default function OnlineProfileForm() {
  const { user, profile, loading, refresh } = useAuthOnline();

  const [form, setForm] = React.useState({
    nickname: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    country: "",
    city: "",
    phone: "",
  });

  const [saving, setSaving] = React.useState(false);

  // ============================
  // Hydrate les champs quand le profil arrive
  // ============================
  React.useEffect(() => {
    if (!profile) return;

    setForm({
      // ⚠️ "Surnom" = nickname/displayName (PAS surname)
      nickname: (profile.nickname || profile.displayName || "") as any,
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      birthDate: profile.birthDate || "",
      country: profile.country || "",
      city: profile.city || "",
      phone: profile.phone || "",
    });
  }, [profile, user]);

  // ============================
  // Handle inputs
  // ============================
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ============================
  // Sauvegarder dans Supabase
  // ============================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);

      await onlineApi.updateProfile({
        // ✅ important: "Surnom" doit mettre à jour nickname/display_name
        nickname: form.nickname,
        displayName: form.nickname,
        firstName: form.firstName,
        lastName: form.lastName,
        birthDate: form.birthDate,
        country: form.country,
        city: form.city,
        phone: form.phone,
      });

      // ✅ Force refresh du profile en mémoire (sinon l'autre device ne verra le changement
      // qu'au prochain boot) + réhydratation locale via bridge App.tsx
      try {
        await refresh?.();
      } catch {}

      alert("Profil online mis à jour !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement du profil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !profile) {
    return <p>Chargement du profil...</p>;
  }

  if (!user) {
    return <p>Connecte-toi pour éditer ton profil online.</p>;
  }

  // ============================
  // RENDER FORMULAIRE
  // ============================
  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      <label>Surnom</label>
      <input
        name="nickname"
        value={form.nickname}
        onChange={handleChange}
        placeholder="Surnom"
      />

      <label>Prénom</label>
      <input
        name="firstName"
        value={form.firstName}
        onChange={handleChange}
        placeholder="Prénom"
      />

      <label>Nom</label>
      <input
        name="lastName"
        value={form.lastName}
        onChange={handleChange}
        placeholder="Nom"
      />

      <label>Date de naissance</label>
      <input
        type="date"
        name="birthDate"
        value={form.birthDate}
        onChange={handleChange}
      />

      <label>Pays</label>
      <input
        name="country"
        value={form.country}
        onChange={handleChange}
        placeholder="Pays"
      />

      <label>Ville</label>
      <input
        name="city"
        value={form.city}
        onChange={handleChange}
        placeholder="Ville"
      />

      <label>Email</label>
      <input
        type="email"
        value={user?.email || ""}
        readOnly
        placeholder="Email"
      />

      <label>Téléphone</label>
      <input
        name="phone"
        value={form.phone}
        onChange={handleChange}
        placeholder="Téléphone"
      />

      <button
        type="submit"
        disabled={saving}
        style={{ marginTop: 12 }}
      >
        {saving ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
