// @ts-nocheck
// =============================================================
// src/pages/petanque/PetanqueTeamEdit.tsx
// Équipe Pétanque — EDIT (UI refacto MOBILE SAFE)
// ✅ Plus de dépassement écran (scroll interne + card responsive)
// ✅ Upload logo via "+" sur le logo (input file caché)
// ✅ Pays (select) + Région (FR) / fallback (autres pays)
// ✅ Affiche drapeau + logo région côte à côte (remplace "FR-France")
// ✅ Sous le nom: mini-avatars des joueurs de l’équipe
// ✅ Slogan (50 max) + Description
// ✅ Joueurs : ajouter profils locaux existants + créer profil local (inline modal)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { useStore } from "../../contexts/StoreContext";
import {
  loadPetanqueTeams,
  upsertPetanqueTeam,
  createPetanqueTeam,
  type PetanqueTeam,
} from "../../lib/petanqueTeamsStore";

// ✅ NEW: mêmes flags partout (PNG, pas emojis)
import { getCountryFlagSrc, getRegionFlagSrc } from "../../lib/geoAssets";

type Props = { go: (tab: any, params?: any) => void; params?: any };

// -----------------------------
// Data pays + régions (FR)
// -----------------------------
const COUNTRIES: Array<{ code: string; label: string; flag?: string }> = [
  { code: "FR", label: "France", flag: "🇫🇷" },
  { code: "BE", label: "Belgique", flag: "🇧🇪" },
  { code: "CH", label: "Suisse", flag: "🇨🇭" },
  { code: "ES", label: "Espagne", flag: "🇪🇸" },
  { code: "IT", label: "Italie", flag: "🇮🇹" },
  { code: "DE", label: "Allemagne", flag: "🇩🇪" },
  { code: "PT", label: "Portugal", flag: "🇵🇹" },
  { code: "GB", label: "Royaume-Uni", flag: "🇬🇧" },
  { code: "US", label: "États-Unis", flag: "🇺🇸" },
];

type RegionOpt = { code: string; label: string; logoDataUrl?: string | null };

// Logos région : optionnels (tu pourras les remplir plus tard)
const FR_REGIONS: RegionOpt[] = [
  { code: "FR-ARA", label: "Auvergne-Rhône-Alpes" },
  { code: "FR-BFC", label: "Bourgogne-Franche-Comté" },
  { code: "FR-BRE", label: "Bretagne" },
  { code: "FR-CVL", label: "Centre-Val de Loire" },
  { code: "FR-COR", label: "Corse" },
  { code: "FR-GES", label: "Grand Est" },
  { code: "FR-HDF", label: "Hauts-de-France" },
  { code: "FR-IDF", label: "Île-de-France" },
  { code: "FR-NOR", label: "Normandie" },
  { code: "FR-NAQ", label: "Nouvelle-Aquitaine" },
  { code: "FR-OCC", label: "Occitanie" },
  { code: "FR-PDL", label: "Pays de la Loire" },
  { code: "FR-PAC", label: "Provence-Alpes-Côte d’Azur" },
  { code: "FR-GP", label: "Guadeloupe" },
  { code: "FR-MQ", label: "Martinique" },
  { code: "FR-GF", label: "Guyane" },
  { code: "FR-RE", label: "La Réunion" },
  { code: "FR-YT", label: "Mayotte" },
];

function clamp50(s: string) {
  return (s ?? "").slice(0, 50);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function resolveAvatar(p: any): string | null {
  return p?.avatarDataUrl || p?.avatarUrl || p?.avatar || null;
}

function normalizeProfilesForTeams(
  storeProfiles: any[]
): Array<{ id: string; name: string; avatarDataUrl?: string | null }> {
  const list = Array.isArray(storeProfiles) ? storeProfiles : [];
  // On garde uniquement les profils non-bot par défaut
  return list
    .filter((p) => !!p?.id && !!p?.name)
    .filter((p) => !p?.isBot)
    .map((p) => ({
      id: String(p.id),
      name: String(p.name),
      avatarDataUrl: resolveAvatar(p),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function makeId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    String(Date.now()) + "-" + Math.random().toString(16).slice(2)
  );
}

// (fallback legacy) on garde si jamais tu stockais déjà un logo custom dans l'équipe
function resolveRegionLogo(team: any): string | null {
  if (team?.regionLogoDataUrl) return team.regionLogoDataUrl;
  const opt = FR_REGIONS.find((r) => r.code === team?.regionCode);
  return opt?.logoDataUrl ?? null;
}

export default function PetanqueTeamEdit({ go, params }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;
  const { store, update } = useStore() as any;

  const teamId = params?.teamId as string | undefined;
  const existing = React.useMemo(() => {
    if (!teamId) return null;
    return loadPetanqueTeams().find((x) => x.id === teamId) ?? null;
  }, [teamId]);

  const [team, setTeam] = React.useState<PetanqueTeam>(() =>
    existing ?? createPetanqueTeam({ id: teamId })
  );

  React.useEffect(() => {
    if (existing) setTeam(existing);
  }, [existing?.id]);

  // profils locaux (depuis store global)
  const allProfiles = React.useMemo(
    () => normalizeProfilesForTeams(store?.profiles ?? []),
    [store?.profiles]
  );

  const profilesById = React.useMemo(() => {
    const map: Record<string, any> = {};
    for (const p of allProfiles) map[p.id] = p;
    return map;
  }, [allProfiles]);

  // UI state
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);
  const [playerSearch, setPlayerSearch] = React.useState("");

  // modal création profil
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [newProfileName, setNewProfileName] = React.useState("");
  const [newProfileAvatar, setNewProfileAvatar] = React.useState<string | null>(
    null
  );
  const newProfileAvatarInputRef = React.useRef<HTMLInputElement | null>(null);

  const country = React.useMemo(() => {
    const code = String(team.countryCode || "FR")
      .toUpperCase()
      .slice(0, 2);
    return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
  }, [team.countryCode]);

  const region = React.useMemo(() => {
    const code = team.regionCode || "";
    return FR_REGIONS.find((r) => r.code === code) || null;
  }, [team.regionCode]);

  const filteredProfiles = React.useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    if (!q) return allProfiles;
    return allProfiles.filter((p) =>
      (p.name || "").toLowerCase().includes(q)
    );
  }, [allProfiles, playerSearch]);

  // ✅ NEW: masquer les profils déjà sélectionnés (au lieu de les cocher)
const availableProfiles = React.useMemo(() => {
  const picked = new Set((team.playerIds || []).map((x: any) => String(x)));
  return filteredProfiles.filter((p) => !picked.has(String(p.id)));
}, [filteredProfiles, team.playerIds]);

  function save(next: PetanqueTeam) {
    const fixed: PetanqueTeam = {
      ...next,
      name: (next.name || "").trim() || "Équipe",
      countryCode: String(next.countryCode || "FR")
        .toUpperCase()
        .slice(0, 2),
      countryName: String(next.countryName || country.label || ""),
      regionCode:
        String(next.countryCode || "FR").toUpperCase() === "FR"
          ? next.regionCode || "FR-IDF"
          : "",
      regionName:
        String(next.countryCode || "FR").toUpperCase() === "FR"
          ? next.regionName || region?.label || ""
          : next.regionName || "",
      slogan: clamp50(next.slogan || ""),
      description: next.description || "",
      playerIds: Array.isArray(next.playerIds) ? next.playerIds : [],
      updatedAt: Date.now(),
    };
    setTeam(fixed);
    upsertPetanqueTeam(fixed);
  }

  async function onPickTeamLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    save({ ...team, logoDataUrl: dataUrl });
    e.target.value = "";
  }

  function removeLogo() {
    save({ ...team, logoDataUrl: null });
  }

  function setCountry(code: string) {
    const c = COUNTRIES.find((x) => x.code === code) || COUNTRIES[0];
    const next: PetanqueTeam = {
      ...team,
      countryCode: c.code,
      countryName: c.label,
    };
    if (c.code !== "FR") {
      next.regionCode = "";
      next.regionName = "";
      next.regionLogoDataUrl = null;
    } else {
      next.regionCode = next.regionCode || "FR-IDF";
      next.regionName = next.regionName || "Île-de-France";
    }
    save(next);
  }

  function setRegion(code: string) {
    const r = FR_REGIONS.find((x) => x.code === code);
    save({
      ...team,
      regionCode: code,
      regionName: r?.label || "",
      regionLogoDataUrl: r?.logoDataUrl ?? null,
    });
  }

  function togglePlayer(pid: string) {
    const ids = Array.isArray(team.playerIds) ? team.playerIds : [];
    const has = ids.includes(pid);
    save({
      ...team,
      playerIds: has ? ids.filter((x) => x !== pid) : [...ids, pid],
    });
  }

  function openCreateProfile() {
    setNewProfileName("");
    setNewProfileAvatar(null);
    setProfileModalOpen(true);
  }

  async function onPickNewProfileAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setNewProfileAvatar(dataUrl);
    e.target.value = "";
  }

  function createProfile() {
    const name = (newProfileName || "").trim();
    if (!name)
      return alert(t("profiles.name_required", "Nom de profil requis."));

    const p = {
      id: makeId(),
      name,
      avatarDataUrl: newProfileAvatar || undefined,
    };

    // 1) Ajoute au store global (persisté par App.update)
    if (typeof update === "function") {
      update((s: any) => {
        const prev = Array.isArray(s?.profiles) ? s.profiles : [];
        const exists = prev.some(
          (x: any) => String(x?.id) === String(p.id)
        );
        const nextProfiles = exists ? prev : [p, ...prev];
        return { ...s, profiles: nextProfiles };
      });
    }

    // 2) Sélectionne directement dans l'équipe
    const ids = Array.isArray(team.playerIds) ? team.playerIds : [];
    save({
      ...team,
      playerIds: ids.includes(p.id) ? ids : [...ids, p.id],
    });

    setProfileModalOpen(false);
  }

  const headerH = 56;
  const bottomNavH = 64;

  const isFR = String(team.countryCode || "").toUpperCase() === "FR";

  // ✅ NEW: sources PNG (fiable partout)
  const countryFlagSrc = getCountryFlagSrc(team.countryCode || "FR");
  const regionFlagSrc = isFR
    ? getRegionFlagSrc(team.regionCode || "FR-IDF")
    : null;

  // (legacy) si tu avais déjà un logo stocké dans team.regionLogoDataUrl
  const legacyRegionLogo = isFR ? resolveRegionLogo(team) : null;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: theme?.bg || "#07070c",
        color: theme?.text || "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: headerH,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          position: "sticky",
          top: 0,
          zIndex: 5,
          background:
            "linear-gradient(180deg, rgba(10,10,18,.92), rgba(10,10,18,.75))",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${
            theme?.borderSoft || "rgba(255,255,255,.08)"
          }`,
        }}
      >
        <button
          onClick={() => go("petanque_teams" as any)}
          style={btnGhost(theme)}
        >
          ← {t("common.back", "Retour")}
        </button>

        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontWeight: 900,
            letterSpacing: 1,
            color: theme?.primary || "#ffd86a",
          }}
        >
          {t("teams.edit.title", "ÉQUIPE")}
        </div>

        <button
          onClick={() => (save(team), alert(t("common.saved", "Équipe enregistrée.")))}
          style={btnPrimary(theme)}
        >
          {t("common.save", "Enregistrer")}
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: 12,
          paddingBottom: bottomNavH + 14,
          overflow: "auto",
        }}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={card(theme)}>
            {/* Top */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* Logo picker */}
              <div
                style={{
                  position: "relative",
                  width: 88,
                  height: 88,
                  flex: "0 0 auto",
                }}
              >
                <div style={logoWrap(theme)}>
                  {team.logoDataUrl ? (
                    <img
                      src={team.logoDataUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        opacity: 0.85,
                        fontWeight: 900,
                        textAlign: "center",
                        padding: 10,
                        fontSize: 12,
                        color: theme?.primary || "#ffd86a",
                      }}
                    >
                      {(team.name || "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* + */}
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  title={t("teams.logo.add", "Ajouter / changer le logo")}
                  style={logoPlusBtn(theme)}
                >
                  +
                </button>

                {/* remove */}
                {team.logoDataUrl ? (
                  <button
                    type="button"
                    onClick={removeLogo}
                    title={t("common.remove", "Retirer")}
                    style={logoRemoveBtn(theme)}
                  >
                    ×
                  </button>
                ) : null}

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onPickTeamLogo}
                  style={{ display: "none" }}
                />
              </div>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={label(theme)}>{t("teams.edit.name", "Nom")}</label>
                <input
                  value={team.name}
                  onChange={(e) => save({ ...team, name: e.target.value })}
                  style={input(theme)}
                  placeholder={t("teams.edit.name_ph", "Nom de l'équipe")}
                />

                {/* ✅ Sous le nom: mini-avatars */}
                {(team.playerIds || []).length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 8,
                    }}
                  >
                    {(team.playerIds || [])
                      .map((id: string) => profilesById[id])
                      .filter(Boolean)
                      .slice(0, 12)
                      .map((p: any) => (
                        <div
                          key={p.id}
                          title={p.name}
                          style={miniAvatarWrap(theme)}
                        >
                          {p.avatarDataUrl ? (
                            <img
                              src={p.avatarDataUrl}
                              alt=""
                              style={miniAvatarImg}
                            />
                          ) : (
                            <span style={{ fontWeight: 900, fontSize: 11 }}>
                              {(p.name || "?").slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                      ))}
                    {(team.playerIds || []).length > 12 ? (
                      <div
                        style={{
                          ...miniAvatarWrap(theme),
                          width: 28,
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 900,
                          opacity: 0.9,
                        }}
                        title={t("common.more", "Plus")}
                      >
                        +{(team.playerIds || []).length - 12}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div style={{ height: 10 }} />

                {/* ✅ Flags PNG (pays + région) */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    opacity: 0.92,
                    fontSize: 12,
                  }}
                >
                  {/* Pays */}
                  <img
                    src={countryFlagSrc}
                    alt={String(team.countryCode || "FR")}
                    title={team.countryName || country.label || "Pays"}
                    style={{
                      width: 22,
                      height: 16,
                      objectFit: "cover",
                      borderRadius: 4,
                      border: `1px solid ${
                        theme?.borderSoft || "rgba(255,255,255,.20)"
                      }`,
                      background: "rgba(0,0,0,.20)",
                      flex: "0 0 auto",
                    }}
                  />

                  {/* Région FR */}
                  {isFR ? (
                    <img
                      src={regionFlagSrc || legacyRegionLogo || ""}
                      alt={String(team.regionCode || "FR-IDF")}
                      title={team.regionName || "Région"}
                      style={{
                        width: 22,
                        height: 22,
                        objectFit: "cover",
                        borderRadius: 6,
                        border: `1px solid ${
                          theme?.borderSoft || "rgba(255,255,255,.20)"
                        }`,
                        background: "rgba(0,0,0,.20)",
                        flex: "0 0 auto",
                      }}
                    />
                  ) : null}

                  {/* Labels (si tu veux vraiment garder le texte, sinon supprime ce bloc) */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      alignItems: "center",
                      opacity: 0.85,
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>
                      {team.countryName || country.label}
                    </span>
                    {isFR && team.regionName ? (
                      <>
                        <span style={{ opacity: 0.5 }}>•</span>
                        <span>{team.regionName}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ height: 14 }} />

            {/* Pays + Région */}
            <div style={grid2}>
              <div style={{ minWidth: 0 }}>
                <label style={label(theme)}>{t("teams.edit.country", "Pays")}</label>
                <select
                  value={String(team.countryCode || "FR")
                    .toUpperCase()
                    .slice(0, 2)}
                  onChange={(e) => setCountry(e.target.value)}
                  style={select(theme)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ minWidth: 0 }}>
                <label style={label(theme)}>
                  {String(team.countryCode || "").toUpperCase() === "FR"
                    ? t("teams.edit.region", "Région")
                    : t("teams.edit.region_generic", "Région / Département")}
                </label>

                {String(team.countryCode || "").toUpperCase() === "FR" ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={regionBadge(theme)}>
                      {/* ✅ montre le PNG région (priorité assets), sinon fallback legacy */}
                      {regionFlagSrc || team.regionLogoDataUrl ? (
                        <img
                          src={regionFlagSrc || team.regionLogoDataUrl}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 900,
                            opacity: 0.85,
                            color: theme?.primary || "#ffd86a",
                          }}
                        >
                          R
                        </div>
                      )}
                    </div>
                    <select
                      value={team.regionCode || "FR-IDF"}
                      onChange={(e) => setRegion(e.target.value)}
                      style={{ ...select(theme), flex: 1 } as any}
                    >
                      {FR_REGIONS.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    value={team.regionName || ""}
                    onChange={(e) =>
                      save({ ...team, regionName: e.target.value })
                    }
                    style={input(theme)}
                    placeholder={t("teams.edit.region_ph", "Optionnel")}
                  />
                )}
              </div>
            </div>

            <div style={{ height: 14 }} />

            {/* Slogan */}
            <div>
              <label style={label(theme)}>
                {t("teams.edit.slogan", "Slogan")}{" "}
                <span style={{ opacity: 0.6 }}>
                  ({(team.slogan || "").length}/50)
                </span>
              </label>
              <input
                value={team.slogan || ""}
                onChange={(e) => save({ ...team, slogan: clamp50(e.target.value) })}
                style={input(theme)}
                placeholder={t("teams.edit.slogan_ph", "Phrase courte (50 caractères max)")}
                maxLength={50}
              />
            </div>

            <div style={{ height: 14 }} />

            {/* Description */}
            <div>
              <label style={label(theme)}>{t("teams.edit.description", "Description")}</label>
              <textarea
                value={team.description || ""}
                onChange={(e) => save({ ...team, description: e.target.value })}
                style={textarea(theme)}
                placeholder={t("teams.edit.description_ph", "Décris l’équipe (club, niveau, objectifs...)")}
              />
            </div>

            <div style={{ height: 16 }} />

            {/* Joueurs */}
            <div style={sectionTitleRow}>
              <div style={{ fontWeight: 900, letterSpacing: 0.5 }}>
                {t("teams.edit.players", "Joueurs")}
              </div>
              <button style={btnSmall(theme)} onClick={openCreateProfile}>
                + {t("profiles.create", "Créer un profil")}
              </button>
            </div>

            <div style={{ height: 10 }} />

            <input
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              style={input(theme)}
              placeholder={t("profiles.search", "Rechercher un profil local...")}
            />

            <div style={{ height: 10 }} />

            {/* Selected chips */}
            {(team.playerIds || []).length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {(team.playerIds || []).map((pid: string) => {
                  const p = allProfiles.find((x) => x.id === pid);
                  if (!p) return null;
                  return (
                    <button
                      key={pid}
                      onClick={() => togglePlayer(pid)}
                      style={chipSelected(theme)}
                      title={t("common.remove", "Retirer")}
                    >
                      <span style={chipAvatarWrap(theme)}>
                        {p.avatarDataUrl ? (
                          <img src={p.avatarDataUrl} alt="" style={chipAvatarImg} />
                        ) : (
                          <span style={{ fontWeight: 900 }}>
                            {(p.name || "?").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </span>
                      <span style={{ opacity: 0.8, marginLeft: 6 }}>×</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 10 }}>
                {t("teams.edit.players_empty", "Aucun joueur sélectionné.")}
              </div>
            )}

            {/* Profiles list (✅ masque les déjà sélectionnés) */}
<div style={listBox(theme)}>
  {allProfiles.length === 0 ? (
    <div style={{ opacity: 0.7, padding: 10, fontSize: 13 }}>{t("profiles.empty", "Aucun profil local trouvé.")}</div>
  ) : availableProfiles.length === 0 ? (
    <div style={{ opacity: 0.7, padding: 10, fontSize: 13 }}>
      {playerSearch.trim()
        ? t("profiles.none_available_search", "Aucun profil disponible (ils sont déjà ajoutés ou ne matchent pas la recherche).")
        : t("profiles.none_available", "Tous les profils sont déjà ajoutés à l’équipe.")}
    </div>
  ) : (
    availableProfiles.map((p) => {
      return (
        <button key={p.id} onClick={() => togglePlayer(p.id)} style={listItem(theme)}>
          <span style={avatar32Wrap(theme)}>
            {p.avatarDataUrl ? (
              <img src={p.avatarDataUrl} alt="" style={avatar32Img} />
            ) : (
              <span style={{ fontWeight: 900 }}>{(p.name || "?").slice(0, 1).toUpperCase()}</span>
            )}
          </span>

          <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
            <div style={{ opacity: 0.65, fontSize: 12 }}>{t("common.tap_to_add", "Appuyer pour ajouter")}</div>
          </span>

          <span style={pill(theme)}>+</span>
        </button>
      );
    })
  )}
</div>

            <div style={{ marginTop: 14, fontSize: 11, opacity: 0.7 }}>
              {t("teams.edit.hint", "Ces équipes sont utilisées uniquement en Pétanque.")}
            </div>
          </div>
        </div>
      </div>

      {/* Modal création profil */}
      {profileModalOpen ? (
        <div style={modalOverlay} onMouseDown={() => setProfileModalOpen(false)}>
          <div style={modalCard(theme)} onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>
                {t("profiles.create", "Créer un profil local")}
              </div>
              <button style={btnGhost(theme)} onClick={() => setProfileModalOpen(false)}>
                {t("common.close", "Fermer")}
              </button>
            </div>

            <div style={{ height: 12 }} />

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ position: "relative", width: 72, height: 72, flex: "0 0 auto" }}>
                <div style={{ ...logoWrap(theme), width: 72, height: 72 } as any}>
                  {newProfileAvatar ? (
                    <img src={newProfileAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ opacity: 0.85, fontWeight: 800, textAlign: "center", padding: 10, fontSize: 12, color: theme?.primary || "#ffd86a" }}>
                      AVATAR
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => newProfileAvatarInputRef.current?.click()} title={t("profiles.avatar.add", "Ajouter un avatar")} style={logoPlusBtn(theme)}>
                  +
                </button>

                {newProfileAvatar ? (
                  <button type="button" onClick={() => setNewProfileAvatar(null)} title={t("common.remove", "Retirer")} style={logoRemoveBtn(theme)}>
                    ×
                  </button>
                ) : null}

                <input ref={newProfileAvatarInputRef} type="file" accept="image/*" onChange={onPickNewProfileAvatar} style={{ display: "none" }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={label(theme)}>{t("profiles.name", "Nom")}</label>
                <input
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  style={input(theme)}
                  placeholder={t("profiles.name_ph", "Nom du joueur")}
                />
              </div>
            </div>

            <div style={{ height: 14 }} />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={btnGhost(theme)} onClick={() => setProfileModalOpen(false)}>
                {t("common.cancel", "Annuler")}
              </button>
              <button style={btnPrimary(theme)} onClick={createProfile}>
                {t("common.create", "Créer")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// -----------------------------
// Styles (inline, mobile safe)
// -----------------------------
const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const sectionTitleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.60)",
  backdropFilter: "blur(8px)",
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 14,
};

const avatar32Img: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};
const chipAvatarImg: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

function card(theme: any): React.CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.10)"}`,
    background:
      theme?.card ||
      "linear-gradient(180deg, rgba(18,18,30,.82), rgba(10,10,16,.72))",
    boxShadow: "0 10px 30px rgba(0,0,0,.35)",
    padding: 14,
  };
}

function label(theme: any): React.CSSProperties {
  return {
    display: "block",
    fontSize: 12,
    opacity: 0.78,
    marginBottom: 6,
    color: theme?.text || "#fff",
  };
}

function input(theme: any): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.12)"}`,
    background: "rgba(0,0,0,.25)",
    color: theme?.text || "#fff",
    outline: "none",
  };
}

function select(theme: any): React.CSSProperties {
  return {
    ...input(theme),
    appearance: "none",
  };
}

function textarea(theme: any): React.CSSProperties {
  return {
    ...input(theme),
    minHeight: 92,
    resize: "vertical",
  };
}

function logoWrap(theme: any): React.CSSProperties {
  return {
    width: 88,
    height: 88,
    borderRadius: 16,
    overflow: "hidden",
    background: "rgba(255,255,255,.06)",
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.10)"}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function logoPlusBtn(theme: any): React.CSSProperties {
  return {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 30,
    height: 30,
    borderRadius: 999,
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.18)"}`,
    background: "rgba(0,0,0,.55)",
    color: theme?.primary || "#ffd86a",
    fontWeight: 900,
    cursor: "pointer",
    backdropFilter: "blur(8px)",
  };
}

function logoRemoveBtn(theme: any): React.CSSProperties {
  return {
    position: "absolute",
    left: -6,
    bottom: -6,
    width: 30,
    height: 30,
    borderRadius: 999,
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.18)"}`,
    background: "rgba(0,0,0,.55)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    backdropFilter: "blur(8px)",
  };
}

function btnGhost(theme: any): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 12,
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.14)"}`,
    background: "rgba(255,255,255,.06)",
    color: theme?.text || "#fff",
    cursor: "pointer",
  };
}

function btnPrimary(theme: any): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 12,
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.18)"}`,
    background: "rgba(255,215,90,.14)",
    color: theme?.text || "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: `0 0 18px ${(theme?.primary || "#ffd86a")}33`,
  };
}

function btnSmall(theme: any): React.CSSProperties {
  return {
    padding: "8px 10px",
    borderRadius: 12,
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.14)"}`,
    background: "rgba(255,255,255,.06)",
    color: theme?.text || "#fff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
  };
}

function regionBadge(theme: any): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    borderRadius: 10,
    overflow: "hidden",
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.12)"}`,
    background: "rgba(255,255,255,.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
  };
}

function listBox(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.10)"}`,
    overflow: "hidden",
    background: "rgba(0,0,0,.20)",
  };
}

function listItem(theme: any): React.CSSProperties {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 10px",
    border: "none",
    background: "transparent",
    color: theme?.text || "#fff",
    cursor: "pointer",
    borderBottom: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.08)"}`,
  };
}

function listItemSelected(theme: any): React.CSSProperties {
  return {
    background: "rgba(255,215,90,.08)",
  };
}

function pill(theme: any): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.14)"}`,
    background: "rgba(255,255,255,.06)",
    fontWeight: 900,
    color: theme?.text || "#fff",
  };
}

function avatar32Wrap(theme: any): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 999,
    overflow: "hidden",
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.12)"}`,
    background: "rgba(255,255,255,.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
  };
}

function chipSelected(theme: any): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px 6px 6px",
    borderRadius: 999,
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.14)"}`,
    background: "rgba(255,215,90,.10)",
    color: theme?.text || "#fff",
    cursor: "pointer",
    maxWidth: "100%",
  };
}

function chipAvatarWrap(theme: any): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    borderRadius: 999,
    overflow: "hidden",
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.12)"}`,
    background: "rgba(255,255,255,.08)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
  };
}

function modalCard(theme: any): React.CSSProperties {
  return {
    width: "min(520px, 100%)",
    borderRadius: 16,
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.12)"}`,
    background:
      "linear-gradient(180deg, rgba(18,18,30,.92), rgba(10,10,16,.86))",
    boxShadow: "0 20px 60px rgba(0,0,0,.55)",
    padding: 14,
    color: theme?.text || "#fff",
  };
}

// --- NEW: mini avatars ---
function miniAvatarWrap(theme: any): React.CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: 999,
    overflow: "hidden",
    border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.14)"}`,
    background: "rgba(255,255,255,.06)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
  };
}

const miniAvatarImg: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};
