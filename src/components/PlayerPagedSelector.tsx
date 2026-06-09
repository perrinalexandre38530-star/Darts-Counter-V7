// @ts-nocheck
import React from "react";
import ProfileAvatar from "./ProfileAvatar";
import ProfileStarRing from "./ProfileStarRing";

function profileLevel(profile: any): number {
  const raw = profile?.profileStarring ?? profile?.starring ?? profile?.stars ?? profile?.botLevel ?? profile?.level ?? profile?.avg3d ?? profile?.avg3D ?? profile?.score;
  const n = Number(String(raw ?? "").replace(",", ".").match(/\d+(?:\.5)?/)?.[0] ?? raw);
  if (Number.isFinite(n)) {
    if (n > 5) return Math.max(0, Math.min(5, Math.round((n / 20) * 2) / 2));
    return Math.max(0, Math.min(5, Math.round(n * 2) / 2));
  }
  return 0;
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
}: any) {
  const [open, setOpen] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [listOpen, setListOpen] = React.useState(false);
  const [historyUsageById, setHistoryUsageById] = React.useState<Record<string, number>>(() => readX01PlayerUsageCounts());

  React.useEffect(() => {
    const refresh = () => setHistoryUsageById((prev) => ({ ...prev, ...readX01PlayerUsageCounts() }));
    refresh();
    if (typeof window === "undefined") return;
    window.addEventListener("storage", refresh);
    window.addEventListener("dc-x01-player-usage-updated", refresh as any);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("dc-x01-player-usage-updated", refresh as any);
    };
  }, []);

  // Le scan historique est déclenché par la page X01ConfigV3, puis propagé ici
  // via dc-x01-player-usage-updated. On évite ainsi un double History.list()
  // à chaque ouverture du sélecteur, qui ralentissait la pagination.


  const ordered = React.useMemo(() => {
    const usageScore = (p: any): number => {
      const ids = [p?.id, p?.profileId, p?.playerId, p?.localProfileId, p?.uid].map(usageKeyOf).filter(Boolean);
      let best = 0;
      for (const id of ids) best = Math.max(best, Number(historyUsageById[id] || 0));
      const candidates = [
        p?.__x01UsageCount,
        p?.usageCount,
        p?.useCount,
        p?.uses,
        p?.timesUsed,
        p?.matchCount,
        p?.matchesCount,
        p?.matchesPlayed,
        p?.gamesPlayed,
        p?.played,
        p?.stats?.played,
        p?.stats?.matches,
        p?.stats?.totalMatches,
        p?.x01?.played,
        p?.cricket?.played,
        p?.killer?.played,
      ];
      for (const raw of candidates) {
        const n = Number(raw);
        if (Number.isFinite(n)) best = Math.max(best, n);
      }
      return best;
    };
    const nameOf = (p: any) => String(p?.name || p?.label || p?.displayName || "");
    return [...(profiles || [])].sort((a: any, b: any) => {
      const usageDelta = usageScore(b) - usageScore(a);
      if (usageDelta !== 0) return usageDelta;
      return nameOf(a).localeCompare(nameOf(b), undefined, { sensitivity: "base", numeric: true });
    });
  }, [profiles, historyUsageById]);

  const selectedIdSet = React.useMemo(() => new Set((selectedIds || []).map((x: any) => String(x))), [selectedIds]);
  const selected = React.useMemo(() => ordered.filter((p: any) => selectedIdSet.has(String(p.id))), [ordered, selectedIdSet]);
  const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), pages - 1);
  const pageItems = React.useMemo(() => ordered.slice(safePage * pageSize, safePage * pageSize + pageSize), [ordered, safePage, pageSize]);

  React.useEffect(() => {
    if (open) setPage(0);
  }, [open]);

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
              <button key={p.id} type="button" onClick={() => onToggle(p.id)} style={{ width: "100%", border: "none", borderRadius: 12, background: active ? `${accent}18` : "transparent", color: "#fff", padding: "7px 8px", display: "grid", gridTemplateColumns: "26px 38px 1fr", gap: 8, alignItems: "center", textAlign: "left", cursor: "pointer" }}>
                <span style={{ color: active ? accent : "rgba(255,255,255,.45)", fontWeight: 1000 }}>{active ? "☑" : "☐"}</span>
                <ProfileAvatar profile={p} size={34} />
                <span style={{ fontSize: 12.5, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {selected.length ? (
        <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", padding: 10 }}>
          <div style={{ color: accent, fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Profils sélectionnés</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            {selected.map((p: any) => <SelectedCard key={p.id} p={p} accent={accent} renderActions={renderActions} renderAvatarOverlay={renderAvatarOverlay} onRemove={() => onToggle(p.id)} />)}
          </div>
        </div>
      ) : null}

      {open ? (
        <div role="dialog" aria-modal="true" onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 96vw)", maxHeight: "90vh", borderRadius: 18, border: `1px solid ${accent}88`, background: "linear-gradient(180deg, rgba(7,18,35,.98), rgba(3,6,16,.98))", boxShadow: `0 22px 70px rgba(0,0,0,.78), 0 0 28px ${accent}44`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 12px 10px", borderBottom: `1px solid ${accent}44`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 950, color: accent, textTransform: "uppercase", letterSpacing: 1.2, fontSize: 13 }}>{modalTitle}</div>
                <div style={{ color: "#aab0cc", fontSize: 11, fontWeight: 800, marginTop: 4 }}>9 profils/page · page {safePage + 1}/{pages}</div>
              </div>
              <button className="btn sm" type="button" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div style={{ padding: 14, overflowY: "auto" }} className="dc-scroll-thin">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                {pageItems.map((p: any) => {
                  const active = selectedIdSet.has(String(p.id));
                  const lvl = profileLevel(p);
                  return (
                    <button key={p.id} type="button" onClick={() => onToggle(p.id)} style={{ minWidth: 0, borderRadius: 18, padding: "10px 6px", background: active ? `${accent}22` : "rgba(255,255,255,.035)", border: active ? `1px solid ${accent}` : `1px solid ${accent}33`, boxShadow: active ? `0 0 22px ${accent}66` : "inset 0 0 16px rgba(255,255,255,.03)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                      <div style={{ position: "relative", width: 98, height: 98, display: "grid", placeItems: "center", overflow: "visible", marginTop: 4 }}>
                        {lvl > 0 ? <ProfileStarRing botLevel={lvl} anchorSize={88} starSize={12} gapPx={-5} /> : null}
                        <div style={{ width: 82, height: 82, borderRadius: "50%", overflow: "hidden", border: `2px solid ${active ? accent : `${accent}88`}`, boxShadow: `0 0 16px ${accent}55`, background: "rgba(0,0,0,.55)" }}>
                          <ProfileAvatar profile={p} size={82} />
                        </div>
                        {active ? renderAvatarOverlay?.(p) : null}
                      </div>
                      <div style={{ color: active ? "#fff" : "#cbd1e8", fontSize: 12, fontWeight: 950, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", display: "flex", justifyContent: "center" }}>{renderActions?.(p)}</div>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage <= 0} style={nav(accent)}>←</button>
                <div style={{ color: "#aab0cc", fontSize: 12, fontWeight: 900 }}>PAGE {safePage + 1}/{pages}</div>
                <button type="button" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={safePage >= pages - 1} style={nav(accent)}>→</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const SelectedCard = React.memo(function SelectedCard({ p, accent, renderActions, renderAvatarOverlay, onRemove }: any) {
  const lvl = profileLevel(p);
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 6, minWidth: 0 }}>
      <div style={{ position: "relative", width: 82, height: 82, display: "grid", placeItems: "center", overflow: "visible" }}>
        {lvl > 0 ? <ProfileStarRing botLevel={lvl} anchorSize={72} starSize={10} gapPx={-5} /> : null}
        <div style={{ width: 66, height: 66, borderRadius: "50%", overflow: "hidden", border: `2px solid ${accent}88`, boxShadow: `0 0 14px ${accent}55` }}>
          <ProfileAvatar profile={p} size={66} />
        </div>
        {renderAvatarOverlay?.(p)}
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
