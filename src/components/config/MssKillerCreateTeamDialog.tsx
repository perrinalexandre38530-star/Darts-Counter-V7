import React from "react";
import { createPortal } from "react-dom";

/** Création d'équipe MSS : panneau et interactions de KILLER, partagé entre sports. */
export default function MssKillerCreateTeamDialog({
  open, accent, kind, name, logo, members, options, page, teamSize,
  onClose, onSubmit, onName, onLogo, onMembers, onPage, onNewParticipant,
  error,
}: {
  open: boolean;
  accent: string;
  kind: "players" | "bots";
  name: string;
  logo: string | null;
  members: string[];
  options: any[];
  page: number;
  teamSize: number;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onName: (value: string) => void;
  onLogo: (file: File | undefined) => void;
  onMembers: (ids: string[]) => void;
  onPage: (page: number) => void;
  onNewParticipant: () => void;
  error?: string;
}) {
  if (!open) return null;
  const pageSize = 4;
  const pages = Math.max(1, Math.ceil(options.length / pageSize));
  const safePage = Math.max(0, Math.min(page, pages - 1));
  return createPortal(
    <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 10110, display: "grid", placeItems: "center", padding: 12, background: "rgba(0,0,0,.82)" }}>
      <form onSubmit={onSubmit} role="dialog" aria-modal="true" aria-label="Créer une équipe"
        style={{ width: "min(510px,100%)", maxHeight: "88dvh", overflowY: "auto", overscrollBehavior: "contain", boxSizing: "border-box", display: "grid", gap: 12, padding: 14, background: "#0c101c", border: `1px solid ${accent}88`, borderRadius: 17 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: accent, fontWeight: 900 }}>
          <span>CRÉER UNE ÉQUIPE {kind === "bots" ? "BOTS CPU" : "JOUEURS"}</span>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ color: accent, border: 0, background: "none", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label title="Importer le logo de l'équipe" style={{ width: 72, height: 72, flexShrink: 0, border: `1px solid ${accent}`, borderRadius: "50%", overflow: "hidden", display: "grid", placeItems: "center", cursor: "pointer", color: accent, fontSize: 12, textAlign: "center", background: `${accent}16` }}>
            {logo ? <img src={logo} alt="Logo de l'équipe" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "LOGO +"}
            <input type="file" accept="image/*" onChange={e=>onLogo(e.target.files?.[0])} style={{ display: "none" }} />
          </label>
          <input required maxLength={48} value={name} onChange={e => onName(e.target.value)} placeholder="Nom de l'équipe" aria-label="Nom de l'équipe"
            style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 11, border: `1px solid ${accent}55`, background: "#151724", color: "#fff" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <strong style={{ color: accent, fontSize: 12 }}>MEMBRES ({members.length}/{teamSize})</strong>
          <button type="button" onClick={onNewParticipant} style={{ border: `1px solid ${accent}55`, color: accent, background: "transparent", borderRadius: 9, padding: "7px 9px", cursor: "pointer" }}>
            ＋ {kind === "bots" ? "BOT" : "JOUEUR"}
          </button>
        </div>
        <div style={{ color: "#aab0cc", fontSize: 11, fontWeight: 800 }}>{pageSize} {kind === "bots" ? "bots" : "profils"}/page · page {safePage + 1}/{pages}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          {options.slice(safePage * pageSize, safePage * pageSize + pageSize).map(member => {
            const id = String(member.id);
            const selected = members.includes(id);
            const avatar = member.avatarDataUrl || member.avatarUrl || member.avatar || null;
            return <button key={id} type="button" aria-pressed={selected} onClick={() => onMembers(selected ? members.filter(x => x !== id) : members.length >= teamSize ? members : [...members, id])}
              style={{ display: "grid", justifyItems: "center", gap: 4, minWidth: 0, padding: 8, borderRadius: 11, border: `1px solid ${selected ? accent : `${accent}44`}`, background: selected ? `${accent}24` : "rgba(255,255,255,.025)", color: selected ? accent : "#fff", cursor: "pointer", minHeight: 96 }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", overflow: "hidden", background: "#222", display: "grid", placeItems: "center" }}>
                {avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : String(member.name || "?").slice(0,2).toUpperCase()}
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{member.name}</span>
            </button>;
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "84px 1fr 84px", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={() => onPage(Math.max(0,safePage-1))} disabled={safePage===0} style={{ borderRadius: 999, border: `1px solid ${accent}55`, background: "rgba(255,255,255,.03)", color: accent, padding: "9px 0", cursor: "pointer", opacity: safePage===0?.4:1 }}>←</button>
          <div style={{ color: "#aab0cc", fontSize: 12, fontWeight: 900, textAlign: "center" }}>PAGE {safePage+1}/{pages}</div>
          <button type="button" onClick={() => onPage(Math.min(pages-1,safePage+1))} disabled={safePage>=pages-1} style={{ borderRadius: 999, border: `1px solid ${accent}55`, background: "rgba(255,255,255,.03)", color: accent, padding: "9px 0", cursor: "pointer", opacity: safePage>=pages-1?.4:1 }}>→</button>
        </div>
        {error && <div role="alert" style={{ color: "#ff9288", fontSize: 12 }}>{error}</div>}
        <button type="submit" disabled={!name.trim() || members.length !== teamSize}
          style={{ padding: 12, borderRadius: 12, border: `1px solid ${accent}`, background: `${accent}33`, color: accent, fontWeight: 900, opacity: !name.trim() || members.length !== teamSize ? .45 : 1, cursor: "pointer" }}>CRÉER ET SÉLECTIONNER</button>
      </form>
    </div>, document.body
  );
}
