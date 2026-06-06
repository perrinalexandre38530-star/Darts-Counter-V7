// @ts-nocheck
import React from "react";
import ProfileStarRing from "./ProfileStarRing";

export type BotPagedSelectorItem = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  botLevel?: string | number | null;
};

function resolveLevel(raw: any): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw ?? "").trim().toLowerCase().replace(",", ".");
  const n = Number((s.match(/\d+(?:\.5)?/) || [""])[0]);
  if (Number.isFinite(n) && n > 0) return n;
  if (s.includes("elite") || s.includes("legend") || s.includes("légende")) return 5;
  if (s.includes("pro")) return 4;
  if (s.includes("standard") || s.includes("medium")) return 3;
  if (s.includes("easy") || s.includes("facile")) return 2;
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

export default function BotPagedSelector({
  bots,
  selectedIds,
  onToggle,
  accent = "#22dfff",
  pageSize = 4,
  showCheckbox = true,
  label = "BOTS IA",
}: {
  bots: BotPagedSelectorItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  accent?: string;
  pageSize?: number;
  showCheckbox?: boolean;
  label?: string;
}) {
  const [showBots, setShowBots] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const sorted = React.useMemo(() => {
    return [...(bots || [])].sort((a, b) => {
      const lb = resolveLevel(b.botLevel);
      const la = resolveLevel(a.botLevel);
      if (lb !== la) return lb - la;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [bots]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const pageBots = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const level = pageBots.length ? resolveLevel(pageBots[0].botLevel) : 0;
  const title = pageBots.length ? groupLabel(level) : "BOTS IA";

  return (
    <div style={{ width: "100%" }}>
      {showCheckbox ? (
        <button
          type="button"
          onClick={() => setShowBots((v) => !v)}
          style={{
            marginBottom: 10,
            padding: "8px 12px",
            borderRadius: 999,
            border: `1px solid ${accent}`,
            background: showBots ? `${accent}22` : "rgba(255,255,255,.04)",
            color: accent,
            fontSize: 12,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 0.7,
            boxShadow: showBots ? `0 0 14px ${accent}55` : "none",
          }}
        >
          {showBots ? "☑" : "☐"} {label}
        </button>
      ) : null}

      {showBots ? (
        <div
          style={{
            border: `1px solid ${accent}55`,
            borderRadius: 18,
            padding: 12,
            background: "rgba(4,10,22,.72)",
            boxShadow: `inset 0 0 22px ${accent}18`,
          }}
        >
          <div style={{ color: accent, fontWeight: 950, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
            {title} — page {safePage + 1}/{pages}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
            {pageBots.map((bot) => {
              const active = selectedIds.includes(bot.id);
              const l = resolveLevel(bot.botLevel);
              return (
                <button
                  key={bot.id}
                  type="button"
                  onClick={() => onToggle(bot.id)}
                  style={{
                    minWidth: 0,
                    background: active ? `${accent}22` : "transparent",
                    border: active ? `1px solid ${accent}` : "1px solid rgba(255,255,255,.05)",
                    borderRadius: 16,
                    padding: "10px 4px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5,
                    cursor: "pointer",
                    boxShadow: active ? `0 0 18px ${accent}66` : "none",
                  }}
                  title={bot.name}
                >
                  <div style={{ position: "relative", width: 70, height: 70, display: "grid", placeItems: "center" }}>
                    {l > 0 ? <ProfileStarRing level={l} size={78} /> : null}
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: `1px solid ${accent}`,
                        background: "rgba(0,0,0,.35)",
                        display: "grid",
                        placeItems: "center",
                        boxShadow: `0 0 14px ${accent}66`,
                      }}
                    >
                      {bot.avatarDataUrl ? (
                        <img src={bot.avatarDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ color: accent, fontWeight: 950 }}>BOT</span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      color: active ? "#fff" : "#9ca3c8",
                      fontSize: 10.5,
                      fontWeight: 900,
                      textAlign: "center",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {bot.name}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage <= 0} style={navBtn(accent)}>
              ←
            </button>
            <div style={{ color: "#aab0cc", fontSize: 11, fontWeight: 800 }}>{sorted.length} bot(s)</div>
            <button type="button" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={safePage >= pages - 1} style={navBtn(accent)}>
              →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function navBtn(accent: string): React.CSSProperties {
  return {
    minWidth: 58,
    height: 34,
    borderRadius: 999,
    border: `1px solid ${accent}88`,
    background: "rgba(255,255,255,.04)",
    color: accent,
    fontWeight: 950,
    cursor: "pointer",
  };
}
