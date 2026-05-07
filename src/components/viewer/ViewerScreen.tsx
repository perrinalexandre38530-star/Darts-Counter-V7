import * as React from "react";
import type { ViewerLiveSnapshot, ViewerPlayer } from "../../lib/viewer/types";

type Props = {
  snapshot: ViewerLiveSnapshot | null;
  connectionLabel?: string;
  onJoin?: () => void;
};

function avatarSrc(p: ViewerPlayer) {
  return p.avatarUrl || p.avatarDataUrl || null;
}

function scoreText(value: any) {
  if (value == null || value === "") return "—";
  return String(value);
}

function PlayerAvatar({ p, size = 72 }: { p: ViewerPlayer; size?: number }) {
  const src = avatarSrc(p);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        border: p.isActive ? "3px solid #ffd56a" : "1px solid rgba(255,255,255,.20)",
        boxShadow: p.isActive ? "0 0 26px rgba(255,213,106,.32)" : "0 8px 18px rgba(0,0,0,.32)",
        background: "linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.04))",
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: Math.max(18, size * 0.34), fontWeight: 1000 }}>{String(p.name || "?").slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: any }) {
  if (value == null || value === "" || value === false) return null;
  return (
    <div
      style={{
        borderRadius: 999,
        padding: "7px 10px",
        border: "1px solid rgba(255,255,255,.12)",
        background: "rgba(255,255,255,.06)",
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ opacity: 0.72 }}>{label}</span> {String(value)}
    </div>
  );
}

function ActivePlayerCard({ p, game }: { p: ViewerPlayer; game: string }) {
  const stats = p.stats || {};
  return (
    <section
      style={{
        borderRadius: 28,
        padding: "clamp(16px, 3vw, 30px)",
        border: "1px solid rgba(255,213,106,.38)",
        background:
          "radial-gradient(700px 220px at 20% 0%, rgba(255,213,106,.18), transparent 65%), linear-gradient(180deg, rgba(255,255,255,.075), rgba(0,0,0,.24))",
        boxShadow: "0 26px 70px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.10)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
          <PlayerAvatar p={p} size={94} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, letterSpacing: 1.8, textTransform: "uppercase", color: "#ffd56a", fontWeight: 1000 }}>
              Au tour de
            </div>
            <div style={{ fontSize: "clamp(30px, 5vw, 64px)", lineHeight: 1, fontWeight: 1100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name || "Joueur"}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", opacity: 0.72, fontWeight: 1000 }}>
            {game === "killer" ? "Vies / Score" : "Score"}
          </div>
          <div style={{ fontSize: "clamp(72px, 13vw, 170px)", lineHeight: 0.86, fontWeight: 1200, color: "#fff" }}>
            {scoreText(p.score)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
        <StatPill label="Moy." value={stats.avg3d ?? stats.avg} />
        <StatPill label="Best" value={stats.bestVisit} />
        <StatPill label="Darts" value={stats.totalThrows ?? stats.dartsThrown} />
        <StatPill label="MPR" value={stats.mpr} />
        <StatPill label="Vies" value={p.lives} />
        <StatPill label="Cible" value={p.target} />
      </div>
    </section>
  );
}

function PlayerMini({ p }: { p: ViewerPlayer }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderRadius: 20,
        padding: "12px 14px",
        border: p.isWinner ? "1px solid rgba(16,185,129,.38)" : "1px solid rgba(255,255,255,.10)",
        background: p.isWinner ? "rgba(16,185,129,.13)" : "rgba(255,255,255,.055)",
        opacity: p.eliminated ? 0.58 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <PlayerAvatar p={p} size={48} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name || "—"}</div>
          <div style={{ fontSize: 11, opacity: 0.72, fontWeight: 900 }}>
            {p.isWinner ? "Vainqueur" : p.eliminated ? "Éliminé" : p.rank ? `Rang ${p.rank}` : "En attente"}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 42, lineHeight: 1, fontWeight: 1100 }}>{scoreText(p.score)}</div>
    </div>
  );
}

function Waiting({ onJoin }: { onJoin?: () => void }) {
  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ maxWidth: 720, textAlign: "center", borderRadius: 30, padding: 28, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)" }}>
        <div style={{ fontSize: 34, fontWeight: 1100, color: "#ffd56a" }}>MULTISPORTS SCORING</div>
        <div style={{ marginTop: 10, fontSize: 18, opacity: 0.86 }}>Viewer tablette prêt. Lance une partie sur le téléphone pour afficher le scoreboard ici.</div>
        {onJoin ? (
          <button onClick={onJoin} style={{ marginTop: 18, borderRadius: 16, padding: "12px 16px", border: "1px solid rgba(255,255,255,.14)", background: "#ffd56a", color: "#17120b", fontWeight: 1000 }}>
            Saisir un autre code
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function ViewerScreen({ snapshot, connectionLabel, onJoin }: Props) {
  const players = Array.isArray(snapshot?.players) ? snapshot!.players : [];
  const active = players.find((p) => p.isActive) || players.find((p) => p.id === snapshot?.activePlayerId) || players[0] || null;
  const others = active ? players.filter((p) => p.id !== active.id) : players;
  const game = String(snapshot?.game || "unknown").toLowerCase();
  const phase = snapshot?.phase || "lobby";
  const meta = snapshot?.match || snapshot?.meta || {};

  if (!snapshot || (!players.length && phase !== "finished")) {
    return (
      <div style={{ minHeight: "100dvh", color: "#f8fafc", background: "radial-gradient(circle at top, #182033 0%, #080a10 56%, #030406 100%)" }}>
        <Waiting onJoin={onJoin} />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        color: "#f8fafc",
        background:
          "radial-gradient(900px 500px at 16% 0%, rgba(79,180,255,.16), transparent 62%), radial-gradient(780px 460px at 88% 20%, rgba(255,213,106,.11), transparent 58%), #06070c",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(14px, 2vw, 28px)", display: "grid", gap: 16 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "clamp(24px, 3.2vw, 46px)", fontWeight: 1200, letterSpacing: 1.2, color: "#ffd56a", textShadow: "0 0 24px rgba(255,213,106,.24)" }}>
              MULTISPORTS SCORING
            </div>
            <div style={{ marginTop: 4, fontSize: 14, opacity: 0.8, fontWeight: 900 }}>
              {snapshot?.title || "Scoreboard"} · {game.toUpperCase()} {phase === "finished" ? "· TERMINÉ" : "· LIVE"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <StatPill label="Connexion" value={connectionLabel || "live"} />
            <StatPill label="Set" value={meta.setIndex ?? meta.set} />
            <StatPill label="Leg" value={meta.legIndex ?? meta.leg} />
            <StatPill label="Tour" value={meta.round ?? meta.end ?? meta.hole} />
            <StatPill label="Cible" value={meta.target} />
          </div>
        </header>

        {phase === "finished" ? (
          <section style={{ borderRadius: 26, padding: 20, border: "1px solid rgba(16,185,129,.28)", background: "rgba(16,185,129,.09)" }}>
            <div style={{ fontSize: 34, fontWeight: 1100, color: "#a7f3d0" }}>Résumé final</div>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {[...players].sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999)).map((p) => <PlayerMini key={p.id} p={p} />)}
            </div>
          </section>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, .75fr)", gap: 16 }} className="viewer-grid-responsive">
            <div style={{ display: "grid", gap: 16 }}>
              {active ? <ActivePlayerCard p={active} game={game} /> : null}
            </div>
            <aside style={{ display: "grid", gap: 10, alignContent: "start" }}>
              <div style={{ fontSize: 13, letterSpacing: 1.6, textTransform: "uppercase", opacity: 0.72, fontWeight: 1000 }}>Ordre / autres joueurs</div>
              {others.length ? others.map((p) => <PlayerMini key={p.id} p={p} />) : <PlayerMini p={active!} />}
            </aside>
          </div>
        )}
      </div>
      <style>{`@media (max-width: 820px){.viewer-grid-responsive{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}
