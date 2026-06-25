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
import BackDot from "../../components/BackDot";
import { getTeamAvatarUrl } from "../../assets/teamAvatars";
import botTeamEliteLogo from "../../assets/ui/competition_bot_team_elite.webp";
import botTeamProLogo from "../../assets/ui/competition_bot_team_pro.webp";
import botTeamChallengerLogo from "../../assets/ui/competition_bot_team_challenger.webp";
import botTeamMixLogo from "../../assets/ui/competition_bot_team_mix.webp";
import botTeamRisingLogo from "../../assets/ui/competition_bot_team_rising.webp";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { useStore } from "../../contexts/StoreContext";
import {
  loadTeamsBySport,
  upsertTeam,
  fileToDataUrl as fileToCompressedTeamLogoDataUrl,
  makeTeamId,
  type TeamEntity,
} from "../../lib/petanqueTeamsStore";

// ✅ NEW: mêmes flags partout (PNG, pas emojis)
import { getCountryFlagSrc, getRegionFlagSrc } from "../../lib/geoAssets";

type Props = { go: (tab: any, params?: any) => void; params?: any };

type PetanqueTeam = TeamEntity;

function normalizeTeamSport(value: any): string {
  const raw = String(value || "darts").toLowerCase().trim();
  if (raw === "baby-foot" || raw === "baby_foot" || raw === "foosball") return "babyfoot";
  if (raw === "ping-pong" || raw === "tabletennis" || raw === "table_tennis") return "pingpong";
  if (raw === "dice" || raw === "dice_game") return "dicegame";
  return raw || "darts";
}

const TEAM_SPORT_OPTIONS = [
  { id: "darts", label: "Fléchettes" },
  { id: "foot", label: "Foot" },
  { id: "petanque", label: "Pétanque" },
  { id: "babyfoot", label: "Baby-foot" },
  { id: "pingpong", label: "Ping-pong" },
  { id: "molkky", label: "Mölkky" },
  { id: "dicegame", label: "Dés" },
];


type TeamLogoTemplate = { id: string; label: string; category: string; tags: string; src: string };

type TeamLogoCategory = { id: string; label: string };

const TEAM_LOGO_CATEGORIES: TeamLogoCategory[] = [
  { id: "popular", label: "⭐ Populaires" },
  { id: "darts", label: "🎯 Fléchettes" },
  { id: "foot", label: "⚽ Foot" },
  { id: "petanque", label: "🥌 Pétanque" },
  { id: "babyfoot", label: "🎱 Baby-foot" },
  { id: "pingpong", label: "🏓 Ping-pong" },
  { id: "molkky", label: "🪵 Mölkky" },
  { id: "dicegame", label: "🎲 Dés" },
  { id: "multisport", label: "🌍 Multisports" },
];

const TEAM_LOGO_SYMBOLS: Record<string, string> = {
  skull: "☠", wolf: "🐺", eagle: "🦅", dragon: "🐉", crown: "♛", target: "◎", fire: "🔥", lightning: "⚡",
  pirate: "⚓", spartan: "Λ", samurai: "刀", scorpion: "♏", cobra: "🐍", lion: "🦁", bull: "♉", ghost: "👻",
  bomb: "💣", toxic: "☣", ice: "❄", storm: "🌪", boot: "⚽", shield: "🛡", star: "★", comet: "☄",
  jack: "J", king: "K", queen: "Q", ace: "A", dart: "➶", triple: "T", boule: "●", mallet: "T",
  paddle: "◐", dice: "⚂", trophy: "🏆", club: "◆", phoenix: "Φ", viking: "ᚱ", panther: "●", bear: "🐻",
};

const TEAM_LOGO_COLORS: Record<string, [string, string, string]> = {
  cyan: ["#21e8ff", "#09627b", "#d8fbff"],
  gold: ["#ffd86a", "#7b3f00", "#fff1bb"],
  red: ["#ff4f6d", "#6c0718", "#ffe0e6"],
  green: ["#55ffa1", "#08643a", "#ddffec"],
  purple: ["#b884ff", "#3b126c", "#f0e2ff"],
  orange: ["#ff9b37", "#743300", "#ffe7ca"],
  ice: ["#a9f7ff", "#31567a", "#ffffff"],
  pink: ["#ff7adf", "#71145c", "#ffe4f7"],
};

function makeTeamLogoDataUrl(symbolKey: string, colorKey: keyof typeof TEAM_LOGO_COLORS, label: string) {
  const [main, dark, light] = TEAM_LOGO_COLORS[colorKey] || TEAM_LOGO_COLORS.cyan;
  const symbol = TEAM_LOGO_SYMBOLS[symbolKey] || "★";
  const initials = String(label || "TEAM").replace(/[^a-zA-Z0-9À-ÿ]/g, "").slice(0, 2).toUpperCase() || "T";
  const useInitials = symbol.length > 2 || /[\u{1F300}-\u{1FAFF}]/u.test(symbol);
  const center = useInitials ? initials : symbol;
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
    <defs>
      <radialGradient id="bg" cx="50%" cy="36%" r="70%">
        <stop offset="0" stop-color="${main}" stop-opacity="0.95"/>
        <stop offset="0.45" stop-color="${dark}" stop-opacity="0.95"/>
        <stop offset="1" stop-color="#050914" stop-opacity="1"/>
      </radialGradient>
      <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${light}"/>
        <stop offset="0.5" stop-color="${main}"/>
        <stop offset="1" stop-color="${dark}"/>
      </linearGradient>
      <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="shadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity="0.55"/>
      </filter>
    </defs>
    <rect width="256" height="256" fill="none"/>
    <circle cx="128" cy="128" r="114" fill="url(#bg)" stroke="url(#rim)" stroke-width="9" filter="url(#shadow)"/>
    <circle cx="128" cy="128" r="94" fill="none" stroke="${main}" stroke-opacity="0.35" stroke-width="3"/>
    <path d="M53 134c25-34 50-51 75-51s50 17 75 51c-25 32-50 48-75 48s-50-16-75-48Z" fill="#000" opacity="0.20"/>
    <text x="128" y="146" text-anchor="middle" font-family="Arial Black, Impact, system-ui, sans-serif" font-size="${useInitials ? 70 : 102}" font-weight="900" fill="${light}" stroke="#02040a" stroke-width="7" paint-order="stroke" filter="url(#glow)">${center}</text>
    <text x="128" y="216" text-anchor="middle" font-family="Arial Black, system-ui, sans-serif" font-size="18" letter-spacing="2" fill="${light}" opacity="0.9">TEAM</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function logo(id: string, label: string, category: string, symbol: string, color: keyof typeof TEAM_LOGO_COLORS, tags = ""): TeamLogoTemplate {
  return { id, label, category, tags: `${label} ${category} ${symbol} ${tags}`.toLowerCase(), src: makeTeamLogoDataUrl(symbol, color, label) };
}

const GENERATED_TEAM_LOGO_TEMPLATES: TeamLogoTemplate[] = [
  logo("skull-cyan", "Skull Cyan", "darts", "skull", "cyan", "squelette crane fléchettes"),
  logo("target-gold", "Target Gold", "darts", "target", "gold", "cible bull darts"),
  logo("dragon-red", "Dragon Red", "darts", "dragon", "red", "feu"),
  logo("wolf-ice", "Wolf Ice", "darts", "wolf", "ice", "loup"),
  logo("eagle-gold", "Eagle Gold", "darts", "eagle", "gold", "aigle"),
  logo("cobra-green", "Cobra", "darts", "cobra", "green", "serpent"),
  logo("bull-orange", "Bull", "darts", "bull", "orange", "taureau"),
  logo("pirate-purple", "Pirate", "darts", "pirate", "purple", "corsaire"),
  logo("spartan-red", "Spartan", "darts", "spartan", "red", "guerrier"),
  logo("samurai-pink", "Samurai", "darts", "samurai", "pink", "katana"),
  logo("fire-orange", "Fire", "darts", "fire", "orange", "flamme"),
  logo("lightning-cyan", "Lightning", "darts", "lightning", "cyan", "éclair"),

  logo("foot-boot", "Boot", "foot", "boot", "green", "football ballon crampons"),
  logo("foot-crown", "Royal Foot", "foot", "crown", "gold", "club"),
  logo("foot-shield", "Shield FC", "foot", "shield", "cyan", "ecusson"),
  logo("foot-lion", "Lion FC", "foot", "lion", "orange", "football"),
  logo("foot-eagle", "Eagles FC", "foot", "eagle", "ice", "football"),
  logo("foot-star", "All Stars", "foot", "star", "gold", "football"),

  logo("petanque-boule", "Boule Club", "petanque", "boule", "cyan", "pétanque cochonnet"),
  logo("petanque-crown", "Crown Boules", "petanque", "crown", "gold", "pétanque"),
  logo("petanque-fire", "Fire Boules", "petanque", "fire", "orange", "pétanque"),
  logo("petanque-ice", "Ice Boules", "petanque", "ice", "ice", "pétanque"),
  logo("petanque-wolf", "Loups Boules", "petanque", "wolf", "purple", "pétanque"),
  logo("petanque-trophy", "Trophée", "petanque", "trophy", "gold", "pétanque"),

  logo("baby-ace", "Ace Baby", "babyfoot", "ace", "red", "baby-foot babyfoot"),
  logo("baby-king", "King Baby", "babyfoot", "king", "gold", "baby-foot babyfoot"),
  logo("baby-queen", "Queen Baby", "babyfoot", "queen", "pink", "baby-foot babyfoot"),
  logo("baby-jack", "Jack Baby", "babyfoot", "jack", "cyan", "baby-foot babyfoot"),
  logo("baby-trophy", "Baby Trophy", "babyfoot", "trophy", "orange", "baby-foot babyfoot"),
  logo("baby-club", "Club Baby", "babyfoot", "club", "purple", "baby-foot babyfoot"),

  logo("ping-paddle", "Paddle", "pingpong", "paddle", "cyan", "ping-pong raquette"),
  logo("ping-fire", "Smash Fire", "pingpong", "fire", "orange", "ping-pong"),
  logo("ping-ice", "Ice Smash", "pingpong", "ice", "ice", "ping-pong"),
  logo("ping-lightning", "Fast Spin", "pingpong", "lightning", "gold", "ping-pong"),

  logo("molkky-mallet", "Mallet", "molkky", "mallet", "gold", "mölkky quilles bois"),
  logo("molkky-viking", "Viking", "molkky", "viking", "purple", "mölkky"),
  logo("molkky-bear", "Bear", "molkky", "bear", "orange", "mölkky"),
  logo("molkky-storm", "Storm", "molkky", "storm", "ice", "mölkky"),

  logo("dice-ace", "Dice Ace", "dicegame", "ace", "red", "dés dice"),
  logo("dice-dice", "Dice", "dicegame", "dice", "cyan", "dés dice"),
  logo("dice-king", "Dice King", "dicegame", "king", "gold", "dés dice"),
  logo("dice-toxic", "Toxic Dice", "dicegame", "toxic", "green", "dés dice"),

  logo("multi-trophy", "Trophy", "multisport", "trophy", "gold", "multisports"),
  logo("multi-phoenix", "Phoenix", "multisport", "phoenix", "orange", "multisports"),
  logo("multi-comet", "Comet", "multisport", "comet", "purple", "multisports"),
  logo("multi-crown", "Crown", "multisport", "crown", "gold", "multisports"),
  logo("multi-ghost", "Ghost", "multisport", "ghost", "ice", "multisports"),
  logo("multi-bomb", "Bomb", "multisport", "bomb", "red", "multisports"),
];

const TEAM_LOGO_TEMPLATES: TeamLogoTemplate[] = [
  ...GENERATED_TEAM_LOGO_TEMPLATES,
  { id: "frame-gold", label: "Cadre Gold", category: "popular", tags: "gold cadre populaire", src: getTeamAvatarUrl("gold") },
  { id: "frame-pink", label: "Cadre Pink", category: "popular", tags: "pink cadre populaire", src: getTeamAvatarUrl("pink") },
  { id: "frame-blue", label: "Cadre Blue", category: "popular", tags: "blue cadre populaire", src: getTeamAvatarUrl("blue") },
  { id: "frame-green", label: "Cadre Green", category: "popular", tags: "green cadre populaire", src: getTeamAvatarUrl("green") },
  { id: "bot-elite", label: "BOT Élite", category: "popular", tags: "bot elite ia", src: botTeamEliteLogo },
  { id: "bot-pro", label: "BOT Pro", category: "popular", tags: "bot pro ia", src: botTeamProLogo },
  { id: "bot-challenger", label: "BOT Challenger", category: "popular", tags: "bot challenger ia", src: botTeamChallengerLogo },
  { id: "bot-mix", label: "BOT Mixte", category: "popular", tags: "bot mixte ia", src: botTeamMixLogo },
  { id: "bot-rising", label: "BOT Rising", category: "popular", tags: "bot rising ia", src: botTeamRisingLogo },
];

function LogoCarouselModal({ theme, onClose, onPick }: { theme: any; onClose: () => void; onPick: (src: string) => void }) {
  const [category, setCategory] = React.useState("popular");
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEAM_LOGO_TEMPLATES.filter((item) => {
      const catOk = category === "popular"
        ? item.category === "popular" || ["skull-cyan", "target-gold", "dragon-red", "foot-boot", "petanque-boule", "baby-ace", "multi-trophy"].includes(item.id)
        : item.category === category;
      const qOk = !q || item.tags.includes(q) || item.label.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [category, query]);

  const randomPick = () => {
    const list = filtered.length ? filtered : TEAM_LOGO_TEMPLATES;
    const item = list[Math.floor(Math.random() * list.length)];
    if (item?.src) onPick(item.src);
  };

  return (
    <div style={modalOverlay} onMouseDown={onClose}>
      <div style={{ ...modalCard(theme), maxHeight: "82dvh", overflow: "hidden", display: "flex", flexDirection: "column" }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 1000, letterSpacing: 0.8, color: theme?.primary || "#28eaff" }}>LOGOS D’ÉQUIPE</div>
            <div style={{ fontSize: 12, opacity: 0.68, marginTop: 3 }}>Bibliothèque intégrée : choisis, recherche ou prends un logo aléatoire.</div>
          </div>
          <button type="button" style={btnGhost(theme)} onClick={onClose}>Fermer</button>
        </div>
        <div style={{ height: 12 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher : skull, foot, dragon..."
            style={{ ...input(theme), height: 42, flex: 1, fontSize: 14 }}
          />
          <button type="button" onClick={randomPick} style={{ ...btnGhost(theme), height: 42, whiteSpace: "nowrap" }}>🎲</button>
        </div>
        <div style={{ height: 10 }} />
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 2px 10px", flex: "0 0 auto" }}>
          {TEAM_LOGO_CATEGORIES.map((cat) => {
            const active = cat.id === category;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                style={{
                  border: `1px solid ${active ? (theme?.primary || "#28eaff") : (theme?.borderSoft || "rgba(255,255,255,.14)")}`,
                  background: active ? `linear-gradient(135deg, ${theme?.primary || "#28eaff"}33, rgba(255,255,255,.06))` : "rgba(255,255,255,.045)",
                  color: theme?.text || "#fff",
                  borderRadius: 999,
                  padding: "9px 12px",
                  fontWeight: 950,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
        <div style={{ overflowY: "auto", paddingRight: 2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item.src)}
                style={{
                  borderRadius: 18,
                  border: `1px solid ${theme?.borderSoft || "rgba(255,255,255,.14)"}`,
                  background: "rgba(255,255,255,.055)",
                  color: theme?.text || "#fff",
                  padding: 9,
                  cursor: "pointer",
                  display: "grid",
                  gap: 7,
                  justifyItems: "center",
                  minWidth: 0,
                }}
              >
                <span style={{ width: 74, height: 74, borderRadius: 20, overflow: "hidden", display: "grid", placeItems: "center", border: `1px solid ${theme?.primary || "#28eaff"}55`, background: "rgba(0,0,0,.22)" }}>
                  <img src={item.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 950, opacity: 0.9, textAlign: "center", lineHeight: 1.1 }}>{item.label}</span>
              </button>
            ))}
          </div>
          {!filtered.length ? <div style={{ opacity: 0.7, padding: 18, textAlign: "center" }}>Aucun logo trouvé.</div> : null}
        </div>
      </div>
    </div>
  );
}

function normalizeTeamSportIds(value: any, fallbackSport: string): string[] {
  const raw = Array.isArray(value) ? value : [];
  const out = raw.map(normalizeTeamSport).filter(Boolean);
  const fallback = normalizeTeamSport(fallbackSport);
  if (out.length === 0 && fallback) out.push(fallback);
  return Array.from(new Set(out));
}

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

  const activeSport = normalizeTeamSport(params?.sport || params?.forceMode || "petanque");
  const returnTo = normalizeReturnTarget(params?.returnTo, activeSport);
  const teamId = params?.teamId as string | undefined;
  const existing = React.useMemo(() => {
    if (!teamId) return null;
    return loadTeamsBySport(activeSport).find((x) => x.id === teamId) ?? null;
  }, [teamId, activeSport]);

  const [team, setTeam] = React.useState<PetanqueTeam>(() =>
    existing ?? createDraftTeam(activeSport)
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
  const [logoLibraryOpen, setLogoLibraryOpen] = React.useState(false);
  const teamKind = String((team as any).teamKind || "leisure") === "club" ? "club" : "leisure";

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

  function buildCleanTeam(next: PetanqueTeam, opts?: { final?: boolean }) {
    const selectedSports = normalizeTeamSportIds((next as any).sportIds, activeSport);
    const finalName = String(next.name || "").trim();
    const fixed: PetanqueTeam = {
      sport: selectedSports[0] || activeSport,
      ...next,
      allSports: (next as any).allSports === true,
      sportIds: selectedSports,
      name: opts?.final ? (finalName || "Équipe") : String(next.name ?? ""),
      logoDataUrl: normalizeDisplayLogo(next),
      countryCode: String(next.countryCode || "FR").toUpperCase().slice(0, 2),
      countryName: String(next.countryName || country.label || ""),
      regionCode: String(next.countryCode || "FR").toUpperCase() === "FR" ? next.regionCode || "FR-IDF" : "",
      regionName: String(next.countryCode || "FR").toUpperCase() === "FR" ? next.regionName || region?.label || "" : next.regionName || "",
      slogan: clamp50(next.slogan || ""),
      description: next.description || "",
      playerIds: Array.isArray(next.playerIds) ? next.playerIds : [],
      teamKind: String((next as any).teamKind || "leisure") === "club" ? "club" : "leisure",
      clubId: typeof (next as any).clubId === "string" ? (next as any).clubId : null,
      clubName: typeof (next as any).clubName === "string" ? (next as any).clubName.trim() : "",
      clubRole: typeof (next as any).clubRole === "string" ? (next as any).clubRole : "player",
      clubVisibility: typeof (next as any).clubVisibility === "string" ? (next as any).clubVisibility : "members",
      syncedClubTeamId: typeof (next as any).syncedClubTeamId === "string" ? (next as any).syncedClubTeamId : null,
      updatedAt: Date.now(),
    };
    return fixed;
  }

  function save(next: PetanqueTeam) {
    const fixed = buildCleanTeam(next);
    setTeam(fixed);
    upsertTeam(fixed as any);
  }

  function saveAndReturn() {
    const finalName = String(team.name || "").trim();
    if (!finalName) {
      alert("Nom d’équipe requis.");
      return;
    }
    const fixed = buildCleanTeam({ ...team, name: finalName } as any, { final: true });
    setTeam(fixed);
    upsertTeam(fixed as any);
    go(returnTo as any, { sport: activeSport, returnTo: "profiles" });
  }

  function pickLibraryLogo(src: string) {
    const logo = String(src || "").trim();
    if (!logo) return;
    save({ ...team, logoDataUrl: logo, logoUrl: logo } as any);
    setLogoLibraryOpen(false);
  }

  async function onPickTeamLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // IMPORTANT : même logique que la création de ligue/tournoi.
      // On ne persiste jamais l'image originale en base64, sinon sanitizeStoredImage
      // la refuse ou localStorage explose son quota et le logo disparaît après sauvegarde.
      const dataUrl = await fileToCompressedTeamLogoDataUrl(file);
      save({ ...team, logoDataUrl: dataUrl });
    } catch (err) {
      console.warn("[TeamEdit] logo compression failed, fallback FileReader", err);
      const dataUrl = await readFileAsDataUrl(file);
      save({ ...team, logoDataUrl: dataUrl });
    } finally {
      e.target.value = "";
    }
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

  function setAllSports(enabled: boolean) {
    save({
      ...team,
      allSports: enabled,
      sportIds: enabled ? TEAM_SPORT_OPTIONS.map((s) => s.id) : normalizeTeamSportIds((team as any).sportIds, activeSport),
    } as any);
  }

  function toggleTeamSport(sportId: string) {
    const s = normalizeTeamSport(sportId);
    const ids = normalizeTeamSportIds((team as any).sportIds, activeSport);
    const has = ids.includes(s);
    const nextIds = has ? ids.filter((x) => x !== s) : [...ids, s];

    // On garde toujours au moins un sport associé.
    save({
      ...team,
      allSports: false,
      sportIds: nextIds.length ? nextIds : [activeSport],
    } as any);
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
  const selectedSportIds = normalizeTeamSportIds((team as any).sportIds, activeSport);
  const teamAllSports = (team as any).allSports === true;

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
        <BackDot
          size={44}
          title={t("common.back", "Retour")}
          color={theme?.primary || "#28eaff"}
          onClick={() => go(returnTo as any, { sport: activeSport, returnTo: "profiles" })}
        />

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
          type="button"
          onClick={saveAndReturn}
          title={t("common.save", "Enregistrer")}
          aria-label={t("common.save", "Enregistrer")}
          style={saveDot(theme)}
        >
          <SaveDiskIcon color={theme?.primary || "#28eaff"} />
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
                <div style={{ ...logoWrap(theme), cursor: "pointer" }} onClick={() => logoInputRef.current?.click()} title={t("teams.logo.import", "Importer un logo")}>
                  {normalizeDisplayLogo(team) ? (
                    <img
                      src={normalizeDisplayLogo(team) || ""}
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
                  onClick={() => setLogoLibraryOpen(true)}
                  title={t("teams.logo.library", "Choisir un logo prêt à intégrer")}
                  style={logoPlusBtn(theme)}
                >
                  +
                </button>

                {/* remove */}
                {normalizeDisplayLogo(team) ? (
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

            {/* Type d’équipe */}
            <div>
              <label style={label(theme)}>Type d’équipe</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { id: "leisure", title: "Équipe loisir", sub: "Locale / privée" },
                  { id: "club", title: "Équipe club", sub: "Online / membres" },
                ].map((opt) => {
                  const active = teamKind === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => save({ ...(team as any), teamKind: opt.id, clubVisibility: opt.id === "club" ? ((team as any).clubVisibility || "members") : "private" } as any)}
                      style={{
                        borderRadius: 16,
                        padding: "12px 10px",
                        border: `1px solid ${active ? theme?.primary || "#28eaff" : theme?.borderSoft || "rgba(255,255,255,.14)"}`,
                        background: active ? "rgba(40,234,255,.14)" : "rgba(255,255,255,.045)",
                        color: theme?.text || "#fff",
                        textAlign: "left",
                        boxShadow: active ? `0 0 18px ${theme?.primary || "#28eaff"}33` : "none",
                      }}
                    >
                      <div style={{ fontWeight: 1000, fontSize: 13 }}>{opt.title}</div>
                      <div style={{ marginTop: 3, fontSize: 11, opacity: 0.68 }}>{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
              {teamKind === "club" ? (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <input
                    value={(team as any).clubName || ""}
                    onChange={(e) => save({ ...(team as any), clubName: e.target.value, teamKind: "club" } as any)}
                    style={input(theme)}
                    placeholder="Nom du club (ex : CHAPAFOOT)"
                  />
                  <select
                    value={(team as any).clubVisibility || "members"}
                    onChange={(e) => save({ ...(team as any), clubVisibility: e.target.value, teamKind: "club" } as any)}
                    style={select(theme) as any}
                  >
                    <option value="members">Visible aux membres du club</option>
                    <option value="private">Club privé</option>
                    <option value="public">Club public</option>
                  </select>
                  <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>
                    Une équipe club est destinée à être synchronisée Online : effectif partagé, invitations, matchs, convocations et actualités.
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 11, opacity: 0.68 }}>
                  Une équipe loisir reste locale et privée, comme les teams actuelles.
                </div>
              )}
            </div>

            <div style={{ height: 14 }} />

            {/* Sports associés */}
            <div>
              <label style={label(theme)}>{t("teams.edit.sports", "Sports associés")}</label>

              <button
                type="button"
                onClick={() => setAllSports(!teamAllSports)}
                style={{
                  ...input(theme),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontWeight: 900,
                  marginBottom: 10,
                }}
                title={t("teams.edit.sports_all_hint", "Afficher cette équipe dans tous les sports")}
              >
                <span>{t("teams.edit.sports_all", "Tous les sports")}</span>
                <span
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 999,
                    border: `1px solid ${teamAllSports ? theme?.primary || "#28eaff" : theme?.borderSoft || "rgba(255,255,255,.16)"}`,
                    background: teamAllSports ? "rgba(40,234,255,.22)" : "rgba(255,255,255,.06)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: teamAllSports ? "flex-end" : "flex-start",
                    padding: 3,
                    boxSizing: "border-box",
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      background: teamAllSports ? theme?.primary || "#28eaff" : "rgba(255,255,255,.45)",
                      boxShadow: teamAllSports ? `0 0 12px ${theme?.primary || "#28eaff"}` : "none",
                    }}
                  />
                </span>
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, opacity: teamAllSports ? 0.55 : 1 }}>
                {TEAM_SPORT_OPTIONS.map((sport) => {
                  const checked = teamAllSports || selectedSportIds.includes(sport.id);
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      disabled={teamAllSports}
                      onClick={() => toggleTeamSport(sport.id)}
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${checked ? theme?.primary || "#28eaff" : theme?.borderSoft || "rgba(255,255,255,.14)"}`,
                        background: checked ? "rgba(40,234,255,.12)" : "rgba(255,255,255,.04)",
                        color: theme?.text || "#fff",
                        padding: "10px 10px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        textAlign: "left",
                        cursor: teamAllSports ? "default" : "pointer",
                        fontWeight: 850,
                      }}
                    >
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 6,
                          border: `1px solid ${checked ? theme?.primary || "#28eaff" : "rgba(255,255,255,.28)"}`,
                          background: checked ? theme?.primary || "#28eaff" : "rgba(0,0,0,.18)",
                          color: "#001018",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 1000,
                          flex: "0 0 auto",
                        }}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      <span>{sport.label}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 8, fontSize: 11, opacity: 0.68 }}>
                {t("teams.edit.sports_hint", "L’équipe apparaîtra uniquement dans les sports cochés, sauf si “Tous les sports” est activé.")}
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
              {t("teams.edit.hint", "Cette équipe apparaît dans les sports sélectionnés ci-dessus.")}
            </div>
          </div>
        </div>
      </div>

      {logoLibraryOpen ? (
        <LogoCarouselModal theme={theme} onClose={() => setLogoLibraryOpen(false)} onPick={pickLibraryLogo} />
      ) : null}

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

function saveDot(theme: any): React.CSSProperties {
  const primary = theme?.primary || "#28eaff";
  return {
    width: 46,
    height: 46,
    borderRadius: 999,
    border: `2px solid ${theme?.borderSoft || "rgba(255,255,255,.18)"}`,
    background: "rgba(0,0,0,0.48)",
    color: primary,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    boxShadow: `0 0 0 2px rgba(0,0,0,0.22), 0 0 22px ${primary}77, 0 0 44px ${primary}55`,
    flex: "0 0 auto",
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
