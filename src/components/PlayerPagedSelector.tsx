// @ts-nocheck
import React from "react";
import ProfileAvatar from "./ProfileAvatar";
import ProfileStarRing from "./ProfileStarRing";
import { StatsBridge } from "../lib/statsBridge";
import { getX01ProfileStarData, loadX01ProfileStatsForStarring, x01ProfileIdentityKeys as sharedX01ProfileIdentityKeys } from "../lib/x01ProfileStarring";
import { COUNTRY_NAME_TO_CODE, getCountryFlag } from "../lib/countryNames";
import { getCountryFlagSrc } from "../lib/geoAssets";
import {
  PROFILE_USAGE_UPDATED_EVENT,
  mergeProfileUsageFromHistory,
  normalizeProfileUsageMode,
  profileUsageScore,
  readProfileUsageCounts,
} from "../lib/profileUsage";

type ProfileStarData = { kind: "avg3d"; value: number } | { kind: "level"; value: number };

function profileLevelValue(raw: any): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const normalized = raw > 5 ? raw / 20 : raw;
    return Math.max(0, Math.min(5, Math.round(normalized * 2) / 2));
  }
  const text = String(raw ?? "").trim().toLowerCase().replace(",", ".");
  if (!text) return 0;
  const fraction = text.match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
  if (fraction) {
    const n = Number(fraction[1]);
    if (Number.isFinite(n) && n > 0) return Math.max(0, Math.min(5, Math.round(n * 2) / 2));
  }
  const n = Number((text.match(/\d+(?:\.5)?/) || [""])[0]);
  if (Number.isFinite(n) && n > 0) {
    const normalized = n > 5 ? n / 20 : n;
    return Math.max(0, Math.min(5, Math.round(normalized * 2) / 2));
  }
  if (text.includes("legend") || text.includes("légende") || text.includes("legende") || text.includes("elite")) return 5;
  if (text.includes("pro")) return 4.5;
  if (text.includes("challenger")) return 4;
  if (text.includes("mixte") || text.includes("mix")) return 3.5;
  if (text.includes("strong") || text.includes("fort") || text.includes("hard") || text.includes("difficile")) return 3;
  if (text.includes("medium") || text.includes("standard") || text.includes("normal") || text.includes("moyen")) return 2;
  if (text.includes("easy") || text.includes("facile") || text.includes("beginner") || text.includes("debutant") || text.includes("débutant") || text.includes("rookie")) return 1;
  return 0;
}

function profileIdentityKeys(profile: any): string[] {
  return sharedX01ProfileIdentityKeys(profile);
}

function profileStatsQuality(stats: any): number {
  if (!stats || typeof stats !== "object") return 0;
  return (
    Number(stats.avg3 ?? stats.avg3d ?? stats.avg3D ?? 0) +
    Number(stats.games ?? stats.matches ?? stats.sessions ?? 0) * 3 +
    Number(stats.darts ?? stats.totalDarts ?? 0) / 20 +
    Number(stats.bestVisit ?? stats.best_visit ?? 0) / 10 +
    Number(stats.bestCheckout ?? stats.bestCO ?? stats.best_checkout ?? 0) / 10
  );
}

function pickBestProfileStats(...items: any[]) {
  let best: any = null;
  let bestQuality = -1;
  for (const item of items) {
    const q = profileStatsQuality(item);
    if (q > bestQuality) {
      best = item;
      bestQuality = q;
    }
  }
  return bestQuality > 0 ? best : null;
}

function readQuickStatsFromLocalStorage(profile: any): any | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage?.getItem("dc-quick-stats");
    if (!raw) return null;
    const bag = JSON.parse(raw);
    const ids = profileIdentityKeys(profile);
    for (const id of ids) {
      if (bag?.[id]) return bag[id];
    }
    return null;
  } catch {
    return null;
  }
}

async function loadBestProfileStatsForStars(id: string, profile?: any) {
  return loadX01ProfileStatsForStarring(id, profile);
}

function profileCountryRaw(profile: any): string {
  const candidates = [
    profile?.countryCode,
    profile?.country_code,
    profile?.country,
    profile?.countryName,
    profile?.nation,
    profile?.nationality,
    profile?.privateInfo?.countryCode,
    profile?.privateInfo?.country_code,
    profile?.privateInfo?.country,
    profile?.privateInfo?.countryName,
    profile?.private_info?.countryCode,
    profile?.private_info?.country_code,
    profile?.private_info?.country,
    profile?.private_info?.countryName,
    profile?.preferences?.countryCode,
    profile?.preferences?.country_code,
    profile?.preferences?.country,
    profile?.profile?.countryCode,
    profile?.profile?.country_code,
    profile?.profile?.country,
    profile?.profile?.privateInfo?.country,
    profile?.profile?.private_info?.country,
  ];
  for (const value of candidates) {
    const raw = String(value || "").trim();
    if (raw) return raw;
  }
  return "";
}

function profileCountryCode(profile: any): string {
  const raw = profileCountryRaw(profile);
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper === "UK" ? "GB" : upper;

  const chars = Array.from(raw);
  if (chars.length === 2) {
    const a = chars[0].codePointAt(0) || 0;
    const b = chars[1].codePointAt(0) || 0;
    if (a >= 0x1f1e6 && a <= 0x1f1ff && b >= 0x1f1e6 && b <= 0x1f1ff) {
      return String.fromCharCode(65 + a - 0x1f1e6, 65 + b - 0x1f1e6);
    }
  }

  const key = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  const mapped = (COUNTRY_NAME_TO_CODE as any)?.[key];
  if (mapped) return String(mapped).toUpperCase().slice(0, 2);

  try {
    const emoji = getCountryFlag(raw);
    if (emoji && emoji !== raw) {
      const parts = Array.from(emoji);
      if (parts.length === 2) {
        const a = parts[0].codePointAt(0) || 0;
        const b = parts[1].codePointAt(0) || 0;
        if (a >= 0x1f1e6 && a <= 0x1f1ff && b >= 0x1f1e6 && b <= 0x1f1ff) {
          return String.fromCharCode(65 + a - 0x1f1e6, 65 + b - 0x1f1e6);
        }
      }
    }
  } catch {}

  return "";
}

function profileCountryFlag(profile: any): string {
  const raw = profileCountryRaw(profile);
  try {
    return getCountryFlag(String(raw || ""));
  } catch {
    return "";
  }
}

function profileCountryFlagSrc(profile: any): string {
  const code = profileCountryCode(profile);
  try {
    return code ? (getCountryFlagSrc(code) || "") : "";
  } catch {
    return "";
  }
}

function CountryFlagBadge({ profile, accent, size = 30, style = {} }: { profile: any; accent: string; size?: number; style?: React.CSSProperties }) {
  const raw = profileCountryRaw(profile);
  const src = profileCountryFlagSrc(profile);
  const fallback = profileCountryFlag(profile);
  if (!src && !fallback) return null;
  return (
    <span
      title={raw || undefined}
      aria-label="Pays du joueur"
      style={{
        position: "absolute",
        right: 8,
        bottom: 6,
        zIndex: 7,
        width: size,
        height: size,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "rgba(3,8,18,.96)",
        border: `1px solid ${accent}`,
        boxShadow: `0 0 10px ${accent}66, 0 8px 18px rgba(0,0,0,.42)`,
        overflow: "hidden",
        color: "#fff",
        fontSize: Math.max(10, Math.round(size * 0.42)),
        fontWeight: 950,
        lineHeight: 1,
        ...style,
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <span style={{ lineHeight: 1 }}>{fallback}</span>
      )}
    </span>
  );
}

function profileStarData(profile: any, statsById: Record<string, any> = {}): ProfileStarData | null {
  const sharedStar = getX01ProfileStarData(profile, statsById);
  if (sharedStar) return sharedStar as ProfileStarData;
  const statCandidates: any[] = [
    profile?.stats?.x01?.avg3d,
    profile?.stats?.x01?.avg3D,
    profile?.x01?.avg3d,
    profile?.x01?.avg3D,
    profile?.x01Stats?.avg3,
    profile?.x01Stats?.avg3d,
    profile?.x01Stats?.avg3D,
    profile?.darts?.avg3,
    profile?.darts?.avg3d,
    profile?.darts?.avg3D,
    profile?.stats?.darts?.avg3,
    profile?.stats?.darts?.avg3d,
    profile?.stats?.darts?.avg3D,
  ];
  const quickStats = readQuickStatsFromLocalStorage(profile);
  if (quickStats) {
    statCandidates.push(quickStats?.avg3, quickStats?.avg3d, quickStats?.avg3D, quickStats?.average3Darts);
  }
  for (const id of profileIdentityKeys(profile)) {
    const s = statsById[id] || {};
    statCandidates.push(
      s?.avg3,
      s?.avg3d,
      s?.avg3D,
      s?.average3Darts,
      s?.average3D,
      s?.x01?.avg3,
      s?.x01?.avg3d,
      s?.x01?.avg3D,
      s?.summary?.avg3,
      s?.summary?.avg3d,
      s?.stats?.avg3,
      s?.stats?.avg3d,
    );
  }
  const avgValues = statCandidates
    .map((raw) => Number(String(raw ?? "").replace(",", ".")))
    .filter((avg3d) => Number.isFinite(avg3d) && avg3d > 0 && avg3d <= 180);
  if (avgValues.length) return { kind: "avg3d", value: Math.max(...avgValues) };

  const levelCandidates = [
    profile?.profileStarring,
    profile?.profileStars,
    profile?.profileStarRating,
    profile?.starring,
    profile?.stars,
    profile?.levelStars,
    profile?.botLevel,
    profile?.stats?.profileStarring,
    profile?.stats?.profileStars,
    profile?.stats?.stars,
    profile?.stats?.levelStars,
    profile?.stats?.x01?.profileStarring,
    profile?.stats?.x01?.stars,
    profile?.x01?.profileStarring,
    profile?.x01?.stars,
    profile?.privateInfo?.profileStarring,
    profile?.privateInfo?.profileStars,
    profile?.privateInfo?.stars,
    profile?.privateInfo?.levelStars,
    profile?.private_info?.profileStarring,
    profile?.private_info?.profileStars,
    profile?.private_info?.stars,
    profile?.private_info?.levelStars,
    profile?.preferences?.profileStarring,
    profile?.preferences?.profileStars,
    profile?.preferences?.stars,
    profile?.profile?.profileStarring,
    profile?.profile?.profileStars,
    profile?.profile?.stars,
    profile?.profile?.stats?.profileStarring,
    profile?.profile?.stats?.stars,
    profile?.profile?.privateInfo?.profileStarring,
    profile?.profile?.private_info?.profileStarring,
    profile?.x01ProfileStarring,
    profile?.dartsProfileStarring,
    profile?.stats?.darts?.profileStarring,
    profile?.stats?.darts?.stars,
    profile?.x01Stats?.profileStarring,
    profile?.x01Stats?.stars,
    profile?.privateInfo?.x01ProfileStarring,
    profile?.privateInfo?.dartsProfileStarring,
    profile?.private_info?.x01ProfileStarring,
    profile?.preferences?.x01ProfileStarring,
  ];
  for (const raw of levelCandidates) {
    const level = profileLevelValue(raw);
    if (level > 0) return { kind: "level", value: level };
  }
  return null;
}


function isDartsSportContextForProfileStarring(): boolean {
  if (typeof window === "undefined") return true;
  const normalize = (v: any) => String(v ?? "").trim().toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

  // SPORT = fléchettes. Les jeux Cricket/Killer/Golf/Shanghai/etc. restent dans ce sport.
  // Les sports séparés (pétanque, ping-pong, mölkky, baby-foot, foot, dés, etc.) ne doivent jamais
  // afficher le niveau darts dans leurs sélecteurs de joueurs.
  const keys = [
    "dc-start-game",
    "dc-active-sport",
    "dc:sport",
    "activeSport",
    "selectedSport",
    "sport",
  ];
  for (const key of keys) {
    try {
      const raw = window.localStorage?.getItem(key);
      const val = normalize(raw);
      if (!val) continue;
      if (val === "darts" || val === "dart" || val === "flechettes" || val === "flechette") return true;
      return false;
    } catch {}
  }
  return true;
}

function renderProfileStars(star: ProfileStarData | null, anchorSize: number, starSize: number, gapPx = -6) {
  if (!star) return null;
  if (star.kind === "avg3d") return <ProfileStarRing avg3d={star.value} anchorSize={anchorSize} starSize={starSize} gapPx={gapPx} />;
  return <ProfileStarRing botLevel={star.value} anchorSize={anchorSize} starSize={starSize} gapPx={gapPx} />;
}

function usageKeyOf(value: any): string {
  return String(value ?? "").trim();
}

function bumpUsage(map: Record<string, number>, value: any, weight = 1) {
  const key = usageKeyOf(value);
  if (!key) return;
  map[key] = (map[key] || 0) + weight;
}

function nameKey(value: any): string {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildProfileLookup(profiles: any[] = []) {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const p of Array.isArray(profiles) ? profiles : []) {
    const canonical = String(p?.id || p?.profileId || p?.localProfileId || p?.playerId || p?.uid || "").trim();
    if (!canonical) continue;
    [p?.id, p?.profileId, p?.localProfileId, p?.playerId, p?.uid, p?.uuid].forEach((v) => {
      const id = String(v || "").trim();
      if (id) byId.set(id, canonical);
    });
    const nk = nameKey(p?.name || p?.displayName || p?.label);
    if (nk) byName.set(nk, canonical);
  }
  return { byId, byName };
}

function resolvePlayerId(raw: any, lookup: { byId: Map<string, string>; byName: Map<string, string> }): string {
  const id = String(raw || "").trim();
  if (!id) return "";
  return lookup.byId.get(id) || lookup.byName.get(nameKey(id)) || id;
}

function collectPlayerUsageFromRows(rows: any[], profiles: any[] = []): Record<string, number> {
  const out: Record<string, number> = {};
  const lookup = buildProfileLookup(profiles);
  const add = (value: any, weight = 1) => {
    const id = resolvePlayerId(value, lookup);
    if (!id) return;
    out[id] = (out[id] || 0) + weight;
  };
  const visit = (value: any, depth = 0) => {
    if (!value || depth > 4) return;
    if (typeof value === "string" || typeof value === "number") {
      add(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((x) => visit(x, depth + 1));
      return;
    }
    if (typeof value !== "object") return;
    [
      value.id, value.profileId, value.playerId, value.localProfileId, value.uid,
      value.uuid, value.pid, value.userProfileId, value.name, value.displayName, value.label,
    ].forEach(add);
    [
      "player", "profile", "participant", "players", "profiles", "participants",
      "teamPlayers", "lineup", "members", "scores", "scoreByPlayer", "statsByPlayer",
      "avg3ByPlayer", "config", "state", "summary", "payload", "resume", "game",
    ].forEach((key) => {
      if (value[key] != null) visit(value[key], depth + 1);
    });
  };

  for (const row of Array.isArray(rows) ? rows : []) {
    [
      row?.players, row?.participants, row?.profiles, row?.playerIds, row?.profileIds,
      row?.summary?.players, row?.summary?.participants, row?.summary?.playerIds, row?.summary?.profileIds,
      row?.payload?.players, row?.payload?.participants, row?.payload?.playerIds, row?.payload?.profileIds,
      row?.payload?.config?.players, row?.payload?.config?.participants, row?.payload?.config?.playerIds, row?.payload?.config?.profileIds,
      row?.payload?.state?.players, row?.payload?.state?.participants,
      row?.resume?.players, row?.resume?.participants, row?.resume?.config?.players, row?.resume?.config?.participants,
      row?.game?.players, row?.game?.participants,
    ].forEach((bucket) => visit(bucket));

    [
      row?.summary?.avg3ByPlayer,
      row?.summary?.statsByPlayer,
      row?.summary?.scoreByPlayer,
      row?.payload?.summary?.avg3ByPlayer,
      row?.payload?.summary?.statsByPlayer,
      row?.payload?.statsByPlayer,
      row?.payload?.scoreByPlayer,
      row?.resume?.statsByPlayer,
      row?.resume?.scoreByPlayer,
    ].forEach((map) => {
      if (map && typeof map === "object" && !Array.isArray(map)) Object.keys(map).forEach((id) => add(id));
    });

    const winnerId = row?.winnerId ?? row?.summary?.winnerId ?? row?.payload?.winnerId ?? row?.payload?.summary?.winnerId;
    add(winnerId, 0.25);
  }
  return out;
}


function readX01PlayerUsageCounts(): Record<string, number> {
  try {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem("dc_x01_v3_player_usage_counts");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed || {})) {
      const id = String(k || "").trim();
      const n = Number(v);
      if (id && Number.isFinite(n) && n > 0) out[id] = n;
    }
    return out;
  } catch {
    return {};
  }
}

export default function PlayerPagedSelector({
  profiles,
  selectedIds,
  onToggle,
  accent = "#22dfff",
  pageSize = 9,
  modalTitle = "Choisir des joueurs",
  renderActions,
  renderAvatarOverlay,
  closeOnSelect = false,
  onAfterToggle,
  onClose,
  showProfileStarring,
  showSelectedSummary = true,
  usageMode = "global",
}: any) {
  const [open, setOpen] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [listOpen, setListOpen] = React.useState(false);
  const normalizedUsageMode = React.useMemo(() => normalizeProfileUsageMode(usageMode || "global"), [usageMode]);
  const [historyUsageById, setHistoryUsageById] = React.useState<Record<string, number>>(() => readProfileUsageCounts(normalizedUsageMode));
  const [statsById, setStatsById] = React.useState<Record<string, any>>({});
  const effectiveShowProfileStarring = showProfileStarring === undefined ? isDartsSportContextForProfileStarring() : Boolean(showProfileStarring);

  React.useEffect(() => {
    const refresh = () => setHistoryUsageById(readProfileUsageCounts(normalizedUsageMode));
    refresh();
    if (typeof window === "undefined") return;
    window.addEventListener("storage", refresh);
    window.addEventListener(PROFILE_USAGE_UPDATED_EVENT, refresh as any);
    window.addEventListener("dc-x01-player-usage-updated", refresh as any);
    window.addEventListener("dc-history-updated", refresh as any);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(PROFILE_USAGE_UPDATED_EVENT, refresh as any);
      window.removeEventListener("dc-x01-player-usage-updated", refresh as any);
      window.removeEventListener("dc-history-updated", refresh as any);
    };
  }, [normalizedUsageMode]);

  React.useEffect(() => {
    let cancelled = false;
    if (typeof window === "undefined" || !normalizedUsageMode || normalizedUsageMode === "global") return;
    const run = async () => {
      try {
        const mod = await import("../lib/history");
        const rows = await mod.History.list().catch(() => []);
        if (cancelled) return;
        const merged = mergeProfileUsageFromHistory(rows as any[], normalizedUsageMode, profiles || []);
        if (!cancelled) setHistoryUsageById(merged);
      } catch {}
    };
    const id = window.setTimeout(run, 0);
    return () => {
      cancelled = true;
      try { window.clearTimeout(id); } catch {}
    };
  }, [normalizedUsageMode, profiles]);

  React.useEffect(() => {
    let cancelled = false;
    if (!effectiveShowProfileStarring) {
      setStatsById({});
      return;
    }
    const ids = Array.from(new Set((profiles || []).flatMap((p: any) => profileIdentityKeys(p))));
    if (!ids.length) {
      setStatsById({});
      return;
    }
    const profileByKey = new Map<string, any>();
    for (const p of profiles || []) {
      for (const key of profileIdentityKeys(p)) profileByKey.set(key, p);
    }
    Promise.all(ids.map(async (id) => {
      const stats = await loadBestProfileStatsForStars(id, profileByKey.get(id));
      return [id, stats] as const;
    })).then((entries) => {
      if (cancelled) return;
      const next: Record<string, any> = {};
      for (const [id, stats] of entries) {
        if (stats && (Number(stats.avg3) > 0 || Number(stats.avg3d) > 0 || Number(stats.games) > 0 || Number(stats.darts) > 0)) next[id] = stats;
      }
      setStatsById(next);
    }).catch(() => {
      if (!cancelled) setStatsById({});
    });
    return () => { cancelled = true; };
  }, [profiles, effectiveShowProfileStarring]);

  const ordered = React.useMemo(() => {
    const nameOf = (p: any) => String(p?.name || p?.label || p?.displayName || "");
    return [...(profiles || [])].sort((a: any, b: any) => {
      const usageDelta = profileUsageScore(b, historyUsageById, normalizedUsageMode) - profileUsageScore(a, historyUsageById, normalizedUsageMode);
      if (usageDelta !== 0) return usageDelta;
      return nameOf(a).localeCompare(nameOf(b), "fr", { sensitivity: "base", numeric: true });
    });
  }, [profiles, historyUsageById, normalizedUsageMode]);

  const selectedIdSet = React.useMemo(() => new Set((selectedIds || []).map((x: any) => String(x))), [selectedIds]);
  const selected = React.useMemo(() => ordered.filter((p: any) => selectedIdSet.has(String(p.id))), [ordered, selectedIdSet]);
  const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), pages - 1);
  const pageItems = React.useMemo(() => ordered.slice(safePage * pageSize, safePage * pageSize + pageSize), [ordered, safePage, pageSize]);

  React.useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  const closePicker = React.useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);

  const handlePick = React.useCallback((id: any) => {
    onToggle?.(id);
    onAfterToggle?.(id);
    if (closeOnSelect) {
      closePicker();
      setListOpen(false);
    }
  }, [onToggle, onAfterToggle, closeOnSelect, closePicker]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setOpen(true)} style={pill(accent, true)}>Choisir joueurs {selected.length ? `(${selected.length})` : ""}</button>
        <button type="button" onClick={() => setListOpen((v) => !v)} style={pill(accent, listOpen)}>Liste profils</button>
      </div>

      {listOpen ? (
        <div className="dc-scroll-thin" style={{ maxHeight: 220, overflowY: "auto", borderRadius: 16, border: `1px solid ${accent}44`, background: "rgba(0,0,0,.24)", padding: 8 }}>
          {ordered.map((p: any) => {
            const active = selectedIdSet.has(String(p.id));
            return (
              <button key={p.id} type="button" onClick={() => handlePick(p.id)} style={{ width: "100%", border: "none", borderRadius: 12, background: active ? `${accent}18` : "transparent", color: "#fff", padding: "7px 8px", display: "grid", gridTemplateColumns: "26px 38px 1fr", gap: 8, alignItems: "center", textAlign: "left", cursor: "pointer" }}>
                <span style={{ color: active ? accent : "rgba(255,255,255,.45)", fontWeight: 1000 }}>{active ? "☑" : "☐"}</span>
                <ProfileAvatar profile={p} size={34} showStars={effectiveShowProfileStarring} />
                <span style={{ fontSize: 12.5, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {showSelectedSummary && selected.length ? (
        <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", padding: 10 }}>
          <div style={{ color: accent, fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Profils sélectionnés</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            {selected.map((p: any) => <SelectedCard key={p.id} p={p} statsById={statsById} showProfileStarring={effectiveShowProfileStarring} accent={accent} renderActions={renderActions} renderAvatarOverlay={renderAvatarOverlay} onRemove={() => onToggle(p.id)} />)}
          </div>
        </div>
      ) : null}

      {open ? (
        <div role="dialog" aria-modal="true" onClick={closePicker} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 96vw)", maxHeight: "90vh", borderRadius: 18, border: `1px solid ${accent}88`, background: "linear-gradient(180deg, rgba(7,18,35,.98), rgba(3,6,16,.98))", boxShadow: `0 22px 70px rgba(0,0,0,.78), 0 0 28px ${accent}44`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 12px 10px", borderBottom: `1px solid ${accent}44`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 950, color: accent, textTransform: "uppercase", letterSpacing: 1.2, fontSize: 13 }}>{modalTitle}</div>
                <div style={{ color: "#aab0cc", fontSize: 11, fontWeight: 800, marginTop: 4 }}>9 profils/page · page {safePage + 1}/{pages}</div>
              </div>
              <button className="btn sm" type="button" onClick={closePicker}>✕</button>
            </div>
            <div style={{ padding: 14, overflowY: "auto" }} className="dc-scroll-thin">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                {pageItems.map((p: any) => {
                  const active = selectedIdSet.has(String(p.id));
                  const star = effectiveShowProfileStarring ? profileStarData(p, statsById) : null;
                  return (
                    <button key={p.id} type="button" onClick={() => handlePick(p.id)} style={{ minWidth: 0, borderRadius: 18, padding: "10px 6px", background: active ? `${accent}22` : "rgba(255,255,255,.035)", border: active ? `1px solid ${accent}` : `1px solid ${accent}33`, boxShadow: active ? `0 0 22px ${accent}66` : "inset 0 0 16px rgba(255,255,255,.03)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                      <div style={{ position: "relative", width: 98, height: 98, display: "grid", placeItems: "center", overflow: "visible", marginTop: 4 }}>
                        {renderProfileStars(star, 88, 12, -2)}
                        <div style={{ width: 82, height: 82, borderRadius: "50%", overflow: "hidden", border: `2px solid ${active ? accent : `${accent}88`}`, boxShadow: `0 0 16px ${accent}55`, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center" }}>
                          <div style={{ width: 76, height: 76, borderRadius: "50%", overflow: "hidden", display: "grid", placeItems: "center" }}>
                            <ProfileAvatar profile={p} size={76} noFrame showStars={false} />
                          </div>
                        </div>
                        {active ? renderAvatarOverlay?.(p) : null}
                        <CountryFlagBadge profile={p} accent={accent} size={30} />
                      </div>
                      <div style={{ color: active ? "#fff" : "#cbd1e8", fontSize: 12, fontWeight: 950, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", display: "flex", justifyContent: "center" }}>{renderActions?.(p)}</div>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "84px 1fr 84px", alignItems: "center", gap: 10 }}>
                <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage <= 0} style={nav(accent)}>←</button>
                <div style={{ color: "#aab0cc", fontSize: 12, fontWeight: 900, textAlign: "center" }}>PAGE {safePage + 1}/{pages}</div>
                <button type="button" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={safePage >= pages - 1} style={nav(accent)}>→</button>
              </div>
              <button
                type="button"
                onClick={closePicker}
                style={{
                  width: "100%",
                  marginTop: 12,
                  minHeight: 42,
                  borderRadius: 999,
                  border: `1px solid ${accent}`,
                  background: `linear-gradient(135deg, ${accent}33, rgba(255,255,255,.05))`,
                  color: accent,
                  fontSize: 13,
                  fontWeight: 1000,
                  textTransform: "uppercase",
                  letterSpacing: 1.1,
                  boxShadow: `0 0 18px ${accent}33`,
                  cursor: "pointer",
                }}
              >
                Valider la sélection
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const SelectedCard = React.memo(function SelectedCard({ p, statsById, showProfileStarring, accent, renderActions, renderAvatarOverlay, onRemove }: any) {
  const star = showProfileStarring ? profileStarData(p, statsById) : null;
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 6, minWidth: 0 }}>
      <div style={{ position: "relative", width: 82, height: 82, display: "grid", placeItems: "center", overflow: "visible" }}>
        {renderProfileStars(star, 72, 10, -2)}
        <div style={{ width: 66, height: 66, borderRadius: "50%", overflow: "hidden", border: `2px solid ${accent}88`, boxShadow: `0 0 14px ${accent}55`, display: "grid", placeItems: "center", background: "rgba(0,0,0,.55)" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", overflow: "hidden", display: "grid", placeItems: "center" }}>
            <ProfileAvatar profile={p} size={60} noFrame showStars={false} />
          </div>
        </div>
        {renderAvatarOverlay?.(p)}
        <CountryFlagBadge profile={p} accent={accent} size={28} style={{ right: -6, bottom: 2 }} />
        <button type="button" onClick={onRemove} title="Retirer" style={{ position: "absolute", top: -2, right: -2, width: 22, height: 22, borderRadius: "50%", border: `1px solid ${accent}`, background: "rgba(0,0,0,.75)", color: accent, fontWeight: 1000, lineHeight: 1, cursor: "pointer" }}>×</button>
      </div>
      <div style={{ color: "#fff", fontSize: 12, fontWeight: 950, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>{renderActions?.(p)}</div>
    </div>
  );
});

function pill(accent: string, active: boolean): React.CSSProperties {
  return { padding: "8px 12px", borderRadius: 999, border: `1px solid ${accent}88`, background: active ? `${accent}18` : "rgba(255,255,255,.04)", color: accent, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: .7, boxShadow: active ? `0 0 14px ${accent}44` : "none", cursor: "pointer" };
}
function nav(accent: string): React.CSSProperties {
  return { minWidth: 84, height: 34, borderRadius: 999, border: `1px solid ${accent}88`, background: "rgba(255,255,255,.04)", color: accent, fontWeight: 950, cursor: "pointer" };
}
