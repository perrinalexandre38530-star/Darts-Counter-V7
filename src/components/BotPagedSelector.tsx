// @ts-nocheck
import React from "react";
import ProfileStarRing from "./ProfileStarRing";

export type BotPagedSelectorItem = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  avatarKey?: string | null;
  botLevel?: string | number | null;
  level?: string | number | null;
};

function resolveLevelValue(raw: any): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Les anciens objets peuvent stocker soit un niveau /5, soit une note /100.
    const normalized = raw > 5 ? raw / 20 : raw;
    return Math.max(0, Math.min(5, Math.round(normalized * 2) / 2));
  }
  const s = String(raw ?? "").trim().toLowerCase().replace(",", ".");
  if (!s) return 0;
  const fraction = s.match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
  if (fraction) {
    const n = Number(fraction[1]);
    if (Number.isFinite(n) && n > 0) return Math.max(0, Math.min(5, Math.round(n * 2) / 2));
  }
  const n = Number((s.match(/\d+(?:\.5)?/) || [""])[0]);
  if (Number.isFinite(n) && n > 0) {
    const normalized = n > 5 ? n / 20 : n;
    return Math.max(0, Math.min(5, Math.round(normalized * 2) / 2));
  }
  if (s.includes("elite") || s.includes("legend") || s.includes("légende") || s.includes("legende")) return 5;
  if (s.includes("pro")) return 4.5;
  if (s.includes("challenger")) return 4;
  if (s.includes("mixte") || s.includes("mix")) return 3.5;
  if (s.includes("rising")) return 3;
  if (s.includes("strong") || s.includes("fort") || s.includes("hard") || s.includes("difficile")) return 3;
  if (s.includes("medium") || s.includes("standard") || s.includes("normal") || s.includes("moyen")) return 2;
  if (s.includes("easy") || s.includes("facile") || s.includes("beginner") || s.includes("debutant") || s.includes("débutant") || s.includes("rookie")) return 1;
  return 0;
}

function resolveLevel(bot: any): number {
  const candidates = [
    bot?.profileStarring,
    bot?.starring,
    bot?.stars,
    bot?.botLevel,
    bot?.level,
    bot?.difficulty,
    bot?.skill,
    bot?.rating,
    bot?.avg3D,
    bot?.avg3d,
    bot?.stats?.avg3D,
    bot?.stats?.avg3d,
  ];
  for (const raw of candidates) {
    const level = resolveLevelValue(raw);
    if (level > 0) return level;
  }
  return 0;
}

function groupLabel(level: number): string {
  if (level >= 5) return "Elite";
  if (level >= 4.5) return "Pro";
  if (level >= 4) return "Challenger";
  if (level >= 3.5) return "Mixte";
  if (level >= 3) return "Rising";
  return "CPU Home";
}

function avatarOf(item: any): string | null {
  const raw = item?.avatarDataUrl || item?.avatarUrl || item?.avatar || item?.photoUrl || item?.image || null;
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  return raw?.src || raw?.default || null;
}

function itemGroup(item: any): string {
  if (item?.groupLabel) return item.groupLabel;
  if (item?.isUserBot || item?.source === "cpu" || item?.source === "home") return "CPU Home";
  return groupLabel(resolveLevel(item));
}

const GROUP_ORDER = ["Elite", "Pro", "Challenger", "Mixte", "Rising", "CPU Home"];

export default function BotPagedSelector({
  bots,
  selectedIds,
  onToggle,
  accent = "#22dfff",
  pageSize = 4,
  showCheckbox = true,
  label = "BOTS IA",
  modalTitle = "Choisir des BOTS IA",
}: {
  bots: BotPagedSelectorItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  accent?: string;
  pageSize?: number;
  showCheckbox?: boolean;
  label?: string;
  modalTitle?: string;
}) {
  const [enabled, setEnabled] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [page, setPage] = React.useState(0);

  const sorted = React.useMemo(() => {
    return [...(bots || [])].sort((a, b) => {
      const ga = GROUP_ORDER.indexOf(itemGroup(a));
      const gb = GROUP_ORDER.indexOf(itemGroup(b));
      if (ga !== gb) return (ga < 0 ? 99 : ga) - (gb < 0 ? 99 : gb);
      const lb = resolveLevel(b);
      const la = resolveLevel(a);
      if (lb !== la) return lb - la;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [bots]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), pages - 1);
  const pageBots = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const pageTitle = pageBots.length ? itemGroup(pageBots[0]) : "BOTS IA";
  const selectedBots = React.useMemo(
    () => sorted.filter((b) => selectedIds?.includes(b.id)),
    [sorted, selectedIds]
  );
  const selectedCount = selectedBots.length;

  React.useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {showCheckbox ? (
          <button
            type="button"
            aria-pressed={enabled}
            title={enabled ? `Masquer ${label}` : `Afficher ${label}`}
            onClick={() => setEnabled((v) => !v)}
            style={{
              ...pillBtn(accent, enabled),
              minWidth: 54,
              justifyContent: "center",
              paddingInline: 12,
            }}
          >
            {enabled ? "☑ ON" : "☐ OFF"}
          </button>
        ) : null}
        {enabled ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={pillBtn(accent, true)}
          >
            Choisir {label.toLowerCase()} {selectedCount ? `(${selectedCount})` : ""}
          </button>
        ) : null}
      </div>

      {enabled && selectedCount ? (
        <div style={{ marginTop: 10, borderRadius: 16, border: `1px solid ${accent}33`, background: "rgba(255,255,255,.035)", padding: 10 }}>
          <div style={{ color: accent, fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>BOTS sélectionnés</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))", gap: 10 }}>
            {selectedBots.map((bot) => {
              const level = resolveLevel(bot);
              const src = avatarOf(bot);
              return (
                <div key={bot.id} style={{ display: "grid", justifyItems: "center", gap: 6, minWidth: 0 }}>
                  <div style={{ position: "relative", width: 82, height: 82, display: "grid", placeItems: "center", overflow: "visible" }}>
                    {level > 0 ? <ProfileStarRing botLevel={level} anchorSize={72} starSize={10} gapPx={-5} /> : null}
                    <div style={{ width: 66, height: 66, borderRadius: "50%", overflow: "hidden", border: `2px solid ${accent}88`, boxShadow: `0 0 14px ${accent}55`, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center" }}>
                      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: accent, fontWeight: 950 }}>BOT</span>}
                    </div>
                    <button type="button" onClick={() => onToggle(bot.id)} title="Retirer" style={{ position: "absolute", top: -2, right: -2, width: 22, height: 22, borderRadius: "50%", border: `1px solid ${accent}`, background: "rgba(0,0,0,.75)", color: accent, fontWeight: 1000, lineHeight: 1, cursor: "pointer" }}>×</button>
                  </div>
                  <div style={{ color: "#fff", fontSize: 12, fontWeight: 950, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bot.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {enabled && open ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 96vw)",
              maxHeight: "88vh",
              borderRadius: 18,
              border: `1px solid ${accent}88`,
              background: "linear-gradient(180deg, rgba(7,18,35,.98), rgba(3,6,16,.98))",
              boxShadow: `0 22px 70px rgba(0,0,0,.78), 0 0 28px ${accent}44`,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "12px 12px 10px", borderBottom: `1px solid ${accent}44`, display: "grid", gap: 7 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 950, color: accent, textTransform: "uppercase", letterSpacing: 1.2, fontSize: 13 }}>
                  {modalTitle}
                </div>
                <button className="btn sm" type="button" onClick={() => setOpen(false)}>✕</button>
              </div>
              <div style={{ color: "#aab0cc", fontSize: 11, fontWeight: 800 }}>
                {pageTitle} · page {safePage + 1}/{pages} · {sorted.length} bot(s)
              </div>
            </div>

            <div style={{ padding: 14, overflow: "hidden", minHeight: 0, flex: "1 1 auto", display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gridTemplateRows: "repeat(2, minmax(0, 1fr))",
                  gap: 14,
                  alignContent: "center",
                }}
              >
                {pageBots.map((bot) => {
                  const active = selectedIds.includes(bot.id);
                  const level = resolveLevel(bot);
                  const src = avatarOf(bot);
                  return (
                    <button
                      key={bot.id}
                      type="button"
                      onClick={() => onToggle(bot.id)}
                      style={{
                        minWidth: 0,
                        borderRadius: 18,
                        padding: "12px 8px 10px",
                        background: active ? `${accent}22` : "rgba(255,255,255,.035)",
                        border: active ? `1px solid ${accent}` : `1px solid ${accent}33`,
                        boxShadow: active ? `0 0 22px ${accent}66` : "inset 0 0 16px rgba(255,255,255,.03)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 7,
                      }}
                      title={bot.name}
                    >
                      <div style={{ position: "relative", width: 104, height: 104, display: "grid", placeItems: "center", overflow: "visible", marginTop: 6 }}>
                        {level > 0 ? <ProfileStarRing botLevel={level} anchorSize={94} starSize={13} gapPx={-5} /> : null}
                        <div
                          style={{
                            width: 86,
                            height: 86,
                            borderRadius: "50%",
                            overflow: "hidden",
                            border: `2px solid ${active ? accent : `${accent}88`}`,
                            background: "rgba(0,0,0,.55)",
                            display: "grid",
                            placeItems: "center",
                            boxShadow: `0 0 16px ${accent}55`,
                          }}
                        >
                          {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: accent, fontWeight: 950 }}>BOT</span>}
                        </div>
                      </div>
                      <div style={{ color: active ? "#fff" : "#cbd1e8", fontSize: 12, fontWeight: 950, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {bot.name}
                      </div>
                      <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 9, fontWeight: 950, background: `linear-gradient(180deg, ${accent}, ${accent}AA)`, color: "#020611", border: "1px solid rgba(255,255,255,.45)" }}>BOT</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage <= 0} style={navBtn(accent)}>←</button>
                <div style={{ color: "#aab0cc", fontSize: 12, fontWeight: 900 }}>PAGE {safePage + 1}/{pages}</div>
                <button type="button" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={safePage >= pages - 1} style={navBtn(accent)}>→</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function pillBtn(accent: string, active: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${accent}88`,
    background: active ? `${accent}18` : "rgba(255,255,255,.04)",
    color: accent,
    fontSize: 12,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    boxShadow: active ? `0 0 14px ${accent}44` : "none",
    cursor: active ? "pointer" : "not-allowed",
  };
}

function navBtn(accent: string): React.CSSProperties {
  return {
    minWidth: 84,
    height: 34,
    borderRadius: 999,
    border: `1px solid ${accent}88`,
    background: "rgba(255,255,255,.04)",
    color: accent,
    fontWeight: 950,
    cursor: "pointer",
  };
}
