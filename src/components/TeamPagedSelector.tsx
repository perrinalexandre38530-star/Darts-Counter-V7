// @ts-nocheck
import React from "react";

function teamLogo(team: any): string | null {
  return team?.logoDataUrl || team?.regionLogoDataUrl || team?.avatarDataUrl || team?.coverDataUrl || null;
}

function initialsOf(name: string) {
  const parts = String(name || "Équipe").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "—";
}

function nameOf(team: any) {
  return String(team?.name || team?.label || "Équipe");
}

function countPlayers(team: any) {
  const ids = Array.isArray(team?.playerIds) ? team.playerIds : Array.isArray(team?.players) ? team.players : [];
  return ids.length;
}

export default function TeamPagedSelector({
  teams,
  selectedIds,
  onToggle,
  accent = "#22dfff",
  pageSize = 9,
  modalTitle = "Choisir des équipes",
  listLabel = "Liste équipes",
  chooseLabel = "Choisir équipes",
}: any) {
  const [open, setOpen] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [listOpen, setListOpen] = React.useState(false);

  const ordered = React.useMemo(() => {
    return [...(teams || [])].sort((a: any, b: any) =>
      nameOf(a).localeCompare(nameOf(b), undefined, { sensitivity: "base", numeric: true })
    );
  }, [teams]);

  const selectedIdSet = React.useMemo(() => new Set((selectedIds || []).map((x: any) => String(x))), [selectedIds]);
  const selected = React.useMemo(() => ordered.filter((t: any) => selectedIdSet.has(String(t.id))), [ordered, selectedIdSet]);
  const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), pages - 1);
  const pageItems = React.useMemo(() => ordered.slice(safePage * pageSize, safePage * pageSize + pageSize), [ordered, safePage, pageSize]);

  React.useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setOpen(true)} style={pill(accent, true)}>{chooseLabel} {selected.length ? `(${selected.length})` : ""}</button>
        <button type="button" onClick={() => setListOpen((v) => !v)} style={pill(accent, listOpen)}>{listLabel}</button>
      </div>

      {listOpen ? (
        <div className="dc-scroll-thin" style={{ maxHeight: 220, overflowY: "auto", borderRadius: 16, border: `1px solid ${accent}44`, background: "rgba(0,0,0,.24)", padding: 8 }}>
          {ordered.map((team: any) => {
            const active = selectedIdSet.has(String(team.id));
            return (
              <button key={team.id} type="button" onClick={() => onToggle(team.id)} style={{ width: "100%", border: "none", borderRadius: 12, background: active ? `${accent}18` : "transparent", color: "#fff", padding: "7px 8px", display: "grid", gridTemplateColumns: "26px 38px 1fr auto", gap: 8, alignItems: "center", textAlign: "left", cursor: "pointer" }}>
                <span style={{ color: active ? accent : "rgba(255,255,255,.45)", fontWeight: 1000 }}>{active ? "☑" : "☐"}</span>
                <TeamMedallion team={team} accent={accent} size={34} active={active} />
                <span style={{ fontSize: 12.5, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(team)}</span>
                <span style={{ color: "rgba(255,255,255,.58)", fontSize: 11, fontWeight: 850 }}>{countPlayers(team)} joueur(s)</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {selected.length ? (
        <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", padding: 10 }}>
          <div style={{ color: accent, fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Équipes sélectionnées</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            {selected.map((team: any) => <SelectedTeamCard key={team.id} team={team} accent={accent} onRemove={() => onToggle(team.id)} />)}
          </div>
        </div>
      ) : null}

      {open ? (
        <div role="dialog" aria-modal="true" onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 96vw)", maxHeight: "90vh", borderRadius: 18, border: `1px solid ${accent}88`, background: "linear-gradient(180deg, rgba(7,18,35,.98), rgba(3,6,16,.98))", boxShadow: `0 22px 70px rgba(0,0,0,.78), 0 0 28px ${accent}44`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 12px 10px", borderBottom: `1px solid ${accent}44`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 950, color: accent, textTransform: "uppercase", letterSpacing: 1.2, fontSize: 13 }}>{modalTitle}</div>
                <div style={{ color: "#aab0cc", fontSize: 11, fontWeight: 800, marginTop: 4 }}>9 équipes/page · page {safePage + 1}/{pages}</div>
              </div>
              <button className="btn sm" type="button" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div style={{ padding: 14, overflowY: "auto" }} className="dc-scroll-thin">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                {pageItems.map((team: any) => {
                  const active = selectedIdSet.has(String(team.id));
                  return (
                    <button key={team.id} type="button" onClick={() => onToggle(team.id)} style={{ minWidth: 0, borderRadius: 18, padding: "10px 6px", background: active ? `${accent}22` : "rgba(255,255,255,.035)", border: active ? `1px solid ${accent}` : `1px solid ${accent}33`, boxShadow: active ? `0 0 22px ${accent}66` : "inset 0 0 16px rgba(255,255,255,.03)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                      <TeamMedallion team={team} accent={accent} size={86} active={active} />
                      <div style={{ color: active ? "#fff" : "#cbd1e8", fontSize: 12, fontWeight: 950, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nameOf(team)}</div>
                      <div style={{ color: "rgba(255,255,255,.62)", fontSize: 11, fontWeight: 850 }}>{countPlayers(team)} joueur(s)</div>
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

function TeamMedallion({ team, accent, size = 76, active = false }: any) {
  const logo = teamLogo(team);
  const name = nameOf(team);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", border: `2px solid ${active ? accent : `${accent}88`}`, boxShadow: `0 0 16px ${accent}55`, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", flexShrink: 0 }}>
      {logo ? <img src={logo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ color: "#fff", fontWeight: 1000, fontSize: Math.max(12, Math.round(size * 0.25)), letterSpacing: 1 }}>{initialsOf(name)}</div>}
    </div>
  );
}

const SelectedTeamCard = React.memo(function SelectedTeamCard({ team, accent, onRemove }: any) {
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 6, minWidth: 0 }}>
      <div style={{ position: "relative", width: 82, height: 82, display: "grid", placeItems: "center", overflow: "visible" }}>
        <TeamMedallion team={team} accent={accent} size={66} active />
        <button type="button" onClick={onRemove} title="Retirer" style={{ position: "absolute", top: -2, right: -2, width: 22, height: 22, borderRadius: "50%", border: `1px solid ${accent}`, background: "rgba(0,0,0,.75)", color: accent, fontWeight: 1000, lineHeight: 1, cursor: "pointer" }}>×</button>
      </div>
      <div style={{ color: "#fff", fontSize: 12, fontWeight: 950, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nameOf(team)}</div>
    </div>
  );
});

function pill(accent: string, active: boolean): React.CSSProperties {
  return { padding: "8px 12px", borderRadius: 999, border: `1px solid ${accent}88`, background: active ? `${accent}18` : "rgba(255,255,255,.04)", color: accent, fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: .7, boxShadow: active ? `0 0 14px ${accent}44` : "none", cursor: "pointer" };
}
function nav(accent: string): React.CSSProperties {
  return { minWidth: 84, height: 34, borderRadius: 999, border: `1px solid ${accent}88`, background: "rgba(255,255,255,.04)", color: accent, fontWeight: 950, cursor: "pointer" };
}
