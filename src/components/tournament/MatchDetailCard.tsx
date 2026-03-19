import React from "react";

type Props = {
  match: any;
  playersById: Record<string, any>;
  allMatches: any[];
  score?: { a: number; b: number } | null;
  phaseLabel?: string;
  onClose: () => void;
  onSimulate: () => void;
  onPlay: () => void;
  onOpenResult: () => void;
};

const BYE = "__BYE__";
const TBD = "__TBD__";

function isByeId(x: any) {
  return String(x || "") === BYE;
}
function isTbdId(x: any) {
  return String(x || "") === TBD;
}

function getInitials(name?: string) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "").toUpperCase();
  const b = (parts[1]?.[0] || parts[0]?.[1] || "").toUpperCase();
  return (a + b) || "?";
}

function AvatarCircle({ name, avatarUrl, size = 56, dim }: any) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
        opacity: dim ? 0.65 : 1,
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ fontWeight: 950, fontSize: Math.max(12, Math.floor(size * 0.38)) }}>{getInitials(name)}</div>
      )}
    </div>
  );
}

function pickFirstDefined(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && v !== "") return v;
  }
  return null;
}

function resolveSourceMatchForTbdSide(allMatches: any[], current: any, side: "a" | "b"): any | null {
  const directKeysA = ["aFromMatchId", "fromMatchIdA", "prevMatchIdA", "sourceMatchIdA", "feederMatchIdA"];
  const directKeysB = ["bFromMatchId", "fromMatchIdB", "prevMatchIdB", "sourceMatchIdB", "feederMatchIdB"];

  const direct = pickFirstDefined(current, side === "a" ? directKeysA : directKeysB);
  if (direct) {
    const f = allMatches.find((m) => String(m?.id) === String(direct));
    if (f) return f;
  }

  const currentId = String(current?.id || "");
  if (!currentId) return null;

  const candidates = allMatches.filter((m) => {
    const next = pickFirstDefined(m, ["nextMatchId", "nextId", "winnerToMatchId", "toMatchId"]);
    if (!next) return false;
    return String(next) === currentId;
  });

  if (!candidates.length) return null;

  const bySide = candidates.find((m) => {
    const slot = pickFirstDefined(m, ["nextSlot", "toSlot", "winnerToSlot", "slot"]);
    if (!slot) return false;
    const s = String(slot).toLowerCase();
    return side === "a" ? s.includes("a") || s.includes("left") : s.includes("b") || s.includes("right");
  });

  return bySide || candidates[0] || null;
}

function resolveSide(allMatches: any[], current: any, side: "a" | "b", playersById: Record<string, any>) {
  const pid = String(side === "a" ? current?.aPlayerId : current?.bPlayerId || "");
  if (!pid) return { label: "TBD", player: null, subtitle: "À définir", dim: true };
  if (isByeId(pid)) return { label: "BYE", player: null, subtitle: "Exempt", dim: true };
  if (!isTbdId(pid)) {
    const pl = playersById[pid] || null;
    return { label: pl?.name || "Joueur", player: pl, subtitle: "", dim: false };
  }

  const feeder = resolveSourceMatchForTbdSide(allMatches, current, side);
  if (!feeder) return { label: "Vainqueur match précédent", player: null, subtitle: "À définir", dim: true };

  const fa = String(feeder?.aPlayerId || "");
  const fb = String(feeder?.bPlayerId || "");
  const pa = fa && playersById[fa] ? playersById[fa] : null;
  const pb = fb && playersById[fb] ? playersById[fb] : null;
  const leftName = pa?.name || (isByeId(fa) ? "BYE" : isTbdId(fa) ? "TBD" : "Joueur");
  const rightName = pb?.name || (isByeId(fb) ? "BYE" : isTbdId(fb) ? "TBD" : "Joueur");
  return {
    label: "Vainqueur du match précédent",
    player: null,
    subtitle: `${leftName} vs ${rightName}`,
    dim: true,
  };
}

function PlayerCard({ side, score, winner }: any) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 18,
        padding: 14,
        border: winner ? "1px solid rgba(127,226,169,0.45)" : "1px solid rgba(255,255,255,0.10)",
        background: winner
          ? "linear-gradient(180deg, rgba(127,226,169,0.18), rgba(255,255,255,0.04))"
          : "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
        boxShadow: winner ? "0 0 24px rgba(127,226,169,0.16)" : "none",
      }}
    >
      <div style={{ display: "grid", justifyItems: "center", gap: 8, minWidth: 0, textAlign: "center" }}>
        <AvatarCircle name={side?.label} avatarUrl={side?.player?.avatar || side?.player?.avatarDataUrl || side?.player?.avatarUrl} dim={side?.dim} size={68} />
        <div style={{ minWidth: 0, width: "100%" }}>
          <div style={{ fontWeight: 950, fontSize: 13.5, lineHeight: 1.15, whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere" }}>
            {side?.label || "Joueur"}
          </div>
        </div>
        <div style={{ fontSize: 30, fontWeight: 1000, color: winner ? "#7fe2a9" : "rgba(255,255,255,0.92)", lineHeight: 1 }}>
          {score ?? "–"}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, accent = "#ffcf57" }: any) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
      }}
    >
      <div style={{ fontSize: 10.5, opacity: 0.68, marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 950, color: accent, fontSize: 13.5 }}>{value}</div>
    </div>
  );
}

export default function MatchDetailCard({
  match,
  playersById,
  allMatches,
  score,
  phaseLabel,
  onClose,
  onSimulate,
  onPlay,
  onOpenResult,
}: Props) {
  if (!match) return null;

  const status = String(match?.status || "pending");
  const playable =
    status === "pending" &&
    !!match?.aPlayerId &&
    !!match?.bPlayerId &&
    !isByeId(match?.aPlayerId) &&
    !isByeId(match?.bPlayerId) &&
    !isTbdId(match?.aPlayerId) &&
    !isTbdId(match?.bPlayerId);

  const running = status === "running" || status === "playing";
  const done = status === "done";

  const sideA = resolveSide(allMatches || [], match, "a", playersById || {});
  const sideB = resolveSide(allMatches || [], match, "b", playersById || {});
  const winnerId = String(match?.winnerId || "");
  const aId = String(match?.aPlayerId || "");
  const bId = String(match?.bPlayerId || "");
  const winnerA = !!winnerId && winnerId === aId;
  const winnerB = !!winnerId && winnerId === bId;

  const badgeColor = done ? "#7fe2a9" : running ? "#4fb4ff" : playable ? "#ffcf57" : "rgba(255,255,255,0.65)";
  const badgeLabel = done ? "TERMINÉ" : running ? "EN COURS" : playable ? "À JOUER" : "ATTENTE";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0,0,0,0.68)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: "min(760px, 96vw)",
          maxHeight: "92vh",
          overflow: "auto",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.12)",
          background:
            "radial-gradient(120% 180% at 0% 0%, rgba(79,180,255,0.10), transparent 45%), radial-gradient(120% 180% at 100% 0%, rgba(255,207,87,0.10), transparent 40%), linear-gradient(180deg, rgba(22,22,28,0.985), rgba(10,10,14,0.995))",
          boxShadow: "0 32px 100px rgba(0,0,0,0.72)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 1000, fontSize: 18, color: "#ffcf57", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {phaseLabel || "Match"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.76, marginTop: 4 }}>
              {match?.updatedAt ? `Dernière activité • ${new Date(match.updatedAt).toLocaleDateString()} ${new Date(match.updatedAt).toLocaleTimeString().slice(0, 5)}` : "Match du tournoi"}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                borderRadius: 999,
                padding: "7px 11px",
                border: `1px solid ${badgeColor}55`,
                background: `linear-gradient(180deg, ${badgeColor}22, rgba(255,255,255,0.04))`,
                color: badgeColor,
                fontWeight: 950,
                fontSize: 11.5,
                whiteSpace: "nowrap",
              }}
            >
              {badgeLabel}
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.9)",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div style={{ padding: 18, display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
            <PlayerCard side={sideA} score={score?.a} winner={winnerA} />
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                fontWeight: 1000,
                letterSpacing: 0.4,
              }}
            >
              VS
            </div>
            <PlayerCard side={sideB} score={score?.b} winner={winnerB} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10 }}>
            <StatTile label="Phase" value={phaseLabel || "—"} accent="#4fb4ff" />
            <StatTile label="Statut" value={badgeLabel} accent={badgeColor} />
            <StatTile label="Vainqueur" value={done ? (playersById?.[winnerId]?.name || "—") : "À venir"} accent="#7fe2a9" />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onPlay}
              style={{
                borderRadius: 14,
                padding: "12px 16px",
                border: "none",
                background: running
                  ? "linear-gradient(180deg,#4fb4ff,#1c78d5)"
                  : done
                  ? "linear-gradient(180deg,#7fe2a9,#2da36a)"
                  : playable
                  ? "linear-gradient(180deg,#ffc63a,#ffaf00)"
                  : "linear-gradient(180deg,#454545,#2a2a2a)",
                color: done || running || playable ? "#140f08" : "rgba(255,255,255,0.65)",
                fontWeight: 1000,
                cursor: done || running || playable ? "pointer" : "default",
                minWidth: 160,
              }}
            >
              {done ? "Voir le résultat" : running ? "Reprendre le match" : playable ? "Jouer ce match" : "Match indisponible"}
            </button>

            <button
              type="button"
              onClick={onSimulate}
              disabled={!playable}
              style={{
                borderRadius: 14,
                padding: "12px 16px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: playable ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                color: playable ? "#ffcf57" : "rgba(255,255,255,0.45)",
                fontWeight: 950,
                cursor: playable ? "pointer" : "default",
                minWidth: 140,
              }}
            >
              ⚡ Simuler
            </button>

            {done ? (
              <button
                type="button"
                onClick={onOpenResult}
                style={{
                  borderRadius: 14,
                  padding: "12px 16px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.92)",
                  fontWeight: 950,
                  cursor: "pointer",
                  minWidth: 140,
                }}
              >
                ✏ Modifier le vainqueur
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
