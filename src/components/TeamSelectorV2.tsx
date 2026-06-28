import React from "react";
import ProfileAvatar from "./ProfileAvatar";
import ProfileStarRing from "./ProfileStarRing";
import {
  getTeamPlayerIds,
  nextTeamInstanceId,
  teamBaseId,
} from "../lib/teamSelectionInstances";

type TeamSelectorV2Props = {
  title?: string;
  teams: any[];
  selectedTeamIds: string[];
  selectedTeamPlayerIds: Record<string, string[]>;
  profilesById: Map<string, any> | Record<string, any>;
  onAdd: (baseTeamId: string, playerIds: string[]) => void;
  onRemove: (instanceId: string) => void;
  maxPlayers?: number;
  maxSelections?: number;
  primary?: string;
  primarySoft?: string;
  emptyLabel?: string;
  botMode?: boolean;
  validatedTitle?: string;
  selectorTitle?: string;
};

function mapGet(map: any, id: string) {
  if (!map) return null;
  if (typeof map.get === "function") return map.get(id) || map.get(String(id));
  return map[id] || map[String(id)] || null;
}

function teamLogo(team: any) {
  return team?.logoDataUrl || team?.logoUrl || team?.avatarDataUrl || team?.avatarUrl || team?.imageUrl || null;
}

function pickName(p: any) {
  return String(p?.name || p?.displayName || p?.nickname || p?.label || "Joueur");
}

export function getUsedPlayersByBase(selectedTeamIds: string[], selectedTeamPlayerIds: Record<string, string[]>) {
  const out: Record<string, Set<string>> = {};
  for (const rawId of selectedTeamIds || []) {
    const instanceId = String(rawId || "");
    const base = teamBaseId(instanceId);
    if (!base) continue;
    if (!out[base]) out[base] = new Set<string>();
    const chosen = Array.isArray(selectedTeamPlayerIds?.[instanceId]) ? selectedTeamPlayerIds[instanceId] : [];
    chosen.map(String).filter(Boolean).forEach((pid) => out[base].add(pid));
  }
  return out;
}

export default function TeamSelectorV2({
  title,
  teams = [],
  selectedTeamIds = [],
  selectedTeamPlayerIds = {},
  profilesById,
  onAdd,
  onRemove,
  maxPlayers = 1,
  maxSelections,
  primary = "#22e6ff",
  primarySoft = "rgba(34,230,255,.13)",
  emptyLabel = "Aucune équipe disponible.",
  botMode = false,
  validatedTitle = "Équipes validées",
  selectorTitle = "Équipes enregistrées",
}: TeamSelectorV2Props) {
  const [pickerTeam, setPickerTeam] = React.useState<any | null>(null);
  const [pickerIds, setPickerIds] = React.useState<string[]>([]);

  const usedByBase = React.useMemo(() => getUsedPlayersByBase(selectedTeamIds, selectedTeamPlayerIds), [selectedTeamIds, selectedTeamPlayerIds]);

  const selectedItems = React.useMemo(() => {
    return (selectedTeamIds || []).map((instanceIdRaw) => {
      const instanceId = String(instanceIdRaw || "");
      const base = teamBaseId(instanceId);
      const team = (teams || []).find((t) => teamBaseId(t) === base);
      if (!team) return null;
      const chosen = Array.isArray(selectedTeamPlayerIds?.[instanceId]) ? selectedTeamPlayerIds[instanceId].map(String) : [];
      return { instanceId, base, team, chosen };
    }).filter(Boolean) as any[];
  }, [selectedTeamIds, selectedTeamPlayerIds, teams]);

  function openPicker(team: any) {
    const base = teamBaseId(team);
    const allIds = getTeamPlayerIds(team);
    const used = usedByBase[base] || new Set<string>();
    const available = allIds.filter((id) => !used.has(id));
    if (!available.length) return;
    const defaultCount = Math.min(Math.max(1, Number(maxPlayers || 1)), available.length);
    setPickerTeam(team);
    setPickerIds(available.slice(0, defaultCount));
  }

  function validate() {
    if (!pickerTeam || !pickerIds.length) return;
    onAdd(teamBaseId(pickerTeam), Array.from(new Set(pickerIds.map(String).filter(Boolean))));
    setPickerTeam(null);
    setPickerIds([]);
  }

  const reachedMax = Number.isFinite(Number(maxSelections)) && Number(maxSelections) > 0 && selectedTeamIds.length >= Number(maxSelections);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {title ? <div style={{ color: primary, fontSize: 13, fontWeight: 950, textTransform: "uppercase", letterSpacing: .9 }}>{title}</div> : null}

      <section style={{ borderRadius: 22, padding: 12, border: `1px solid ${primary}33`, background: "rgba(6,9,20,.72)" }}>
        <div style={{ color: primary, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>{validatedTitle}</div>
        {selectedItems.length ? (
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollSnapType: "x mandatory" }}>
            {selectedItems.map((item) => {
              const names = (item.chosen || []).map((id: string) => pickName(mapGet(profilesById, id))).filter(Boolean).join(", ");
              const logo = teamLogo(item.team);
              return (
                <article key={item.instanceId} style={{ flex: "0 0 min(70vw, 250px)", minHeight: 126, borderRadius: 22, padding: 12, border: `1px solid ${primary}77`, background: `linear-gradient(180deg, ${primarySoft}, rgba(7,10,22,.94))`, color: "#fff", scrollSnapAlign: "start", position: "relative", display: "grid", justifyItems: "center", alignContent: "center", textAlign: "center" }}>
                  <button type="button" onClick={() => onRemove(item.instanceId)} style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.28)", color: "#ff7aa8", fontWeight: 950, cursor: "pointer" }}>×</button>
                  <ProfileAvatar name={item.team?.name || "Équipe"} dataUrl={logo || undefined} size={58} />
                  <div style={{ marginTop: 8, fontWeight: 950, fontSize: 15, maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.team?.name || "Équipe"}</div>
                  <div style={{ marginTop: 3, color: "#b9bfd8", fontSize: 11, maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{names || `${item.chosen?.length || 0} joueur`}</div>
                </article>
              );
            })}
          </div>
        ) : (
          <div style={{ color: "#8f94b2", fontSize: 12 }}>Aucune équipe validée pour l’instant.</div>
        )}
      </section>

      <section style={{ borderRadius: 22, padding: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(6,9,20,.46)" }}>
        <div style={{ color: "#aab0ca", fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>{selectorTitle}</div>
        {!teams.length ? (
          <div style={{ color: "#8f94b2", fontSize: 12 }}>{emptyLabel}</div>
        ) : (
          <div style={{ display: "flex", gap: 14, overflowX: "auto", overflowY: "hidden", padding: "2px 6px 14px", margin: "0 -6px", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}>
            {teams.map((team, index) => {
              const base = teamBaseId(team) || String(team?.id || index);
              const all = getTeamPlayerIds(team);
              const used = usedByBase[base] || new Set<string>();
              const remaining = all.filter((id) => !used.has(id)).length;
              const disabled = remaining <= 0 || reachedMax;
              const logo = teamLogo(team);
              const level = Number(team?.botTeamLevel || parseFloat(String(team?.botLevel || "0")) || 0);
              return (
                <button key={`${base}-${index}`} type="button" disabled={disabled} onClick={() => openPicker(team)} style={{ textAlign: "center", borderRadius: 24, padding: "16px 14px 14px", border: disabled ? "1px solid rgba(255,255,255,.06)" : `1px solid ${primary}66`, background: disabled ? "rgba(255,255,255,.025)" : "rgba(8,10,20,.92)", color: disabled ? "#62687f" : "#f5f7ff", cursor: disabled ? "not-allowed" : "pointer", flex: "0 0 min(72vw, 250px)", minHeight: 190, scrollSnapAlign: "start" }}>
                  <div style={{ display: "grid", justifyItems: "center", gap: 9, minWidth: 0 }}>
                    <div style={{ position: "relative", width: 90, height: 90, display: "grid", placeItems: "center", overflow: "visible" }}>
                      {botMode && level > 0 ? <ProfileStarRing botLevel={level} anchorSize={74} starSize={9} gapPx={-5} /> : null}
                      <ProfileAvatar name={team?.name || "Équipe"} dataUrl={logo || undefined} size={72} />
                    </div>
                    <div style={{ width: "100%", minWidth: 0 }}>
                      <div style={{ fontWeight: 950, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team?.name || "Équipe"}</div>
                      <div style={{ color: disabled ? "#697089" : "#aab0ca", fontSize: 12, marginTop: 3 }}>{remaining} joueur{remaining > 1 ? "s" : ""} disponible{remaining > 1 ? "s" : ""}</div>
                      {botMode ? <span style={{ display: "inline-block", marginTop: 8, padding: "2px 8px", borderRadius: 999, border: `1px solid ${primary}77`, color: primary, fontSize: 10, fontWeight: 950 }}>IA</span> : null}
                      {reachedMax ? <div style={{ marginTop: 6, color: "#8f94b2", fontSize: 10 }}>Maximum atteint</div> : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {pickerTeam ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.72)", display: "grid", placeItems: "center", padding: 18 }} onClick={() => setPickerTeam(null)}>
          <div style={{ width: "min(580px, 96vw)", maxHeight: "82vh", overflow: "auto", borderRadius: 26, background: "rgba(8,10,20,.98)", border: `1px solid ${primary}66`, boxShadow: `0 0 42px ${primary}33`, padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <ProfileAvatar name={pickerTeam?.name || "Équipe"} dataUrl={teamLogo(pickerTeam) || undefined} size={50} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: primary, fontWeight: 950, textTransform: "uppercase", letterSpacing: .8, fontSize: 13 }}>Choisir les joueurs</div>
                <div style={{ color: "#fff", fontWeight: 950, fontSize: 17, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pickerTeam?.name || "Équipe"}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(136px, 1fr))", gap: 9 }}>
              {getTeamPlayerIds(pickerTeam).filter((pid) => !(usedByBase[teamBaseId(pickerTeam)] || new Set<string>()).has(pid)).map((pid) => {
                const p = mapGet(profilesById, pid);
                const checked = pickerIds.includes(pid);
                return (
                  <button key={pid} type="button" onClick={() => setPickerIds((prev) => checked ? prev.filter((id) => id !== pid) : [...prev, pid])} style={{ display: "flex", alignItems: "center", gap: 9, borderRadius: 17, padding: 9, border: checked ? `1px solid ${primary}` : "1px solid rgba(255,255,255,.10)", background: checked ? `${primary}18` : "rgba(255,255,255,.04)", color: "#fff", cursor: "pointer", fontWeight: 850, minWidth: 0 }}>
                    <ProfileAvatar profile={p} name={pickName(p)} size={36} />
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pickName(p)}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => setPickerTeam(null)} style={{ borderRadius: 999, padding: "10px 15px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "#fff", fontWeight: 900, cursor: "pointer" }}>Annuler</button>
              <button type="button" disabled={!pickerIds.length} onClick={validate} style={{ borderRadius: 999, padding: "10px 18px", border: `1px solid ${primary}`, background: pickerIds.length ? `${primary}22` : "rgba(255,255,255,.04)", color: pickerIds.length ? primary : "#777", fontWeight: 950, cursor: pickerIds.length ? "pointer" : "not-allowed" }}>Valider</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
