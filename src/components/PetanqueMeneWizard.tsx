import React from "react";

type StatKey =
  | "pointage"
  | "bec"
  | "trou"
  | "tirReussi"
  | "carreau"
  | "reprise"
  | "butAnnulation"
  | "butPoint"
  | "pousseeAssist"
  | "pousseeConcede";

export type MeneWizardAllocation = {
  playerId: string;
  stat: StatKey;
  value: number;
};

export type MeneWizardParticipant = {
  id: string;
  label: string;
  kind: "player" | "team";
  avatarSrc?: string | null;
  // for teams
  members?: Array<{ id: string; label: string; avatarSrc?: string | null }>;
};

export type MeneWizardMode = "score" | "stats";

type Props = {
  open: boolean;
  mode: MeneWizardMode;
  title?: string;
  theme: any;
  participants: MeneWizardParticipant[];
  statIcons: Record<StatKey, string>;
  initialWinnerId?: string;
  initialPoints?: number;
  maxPoints?: number;
  /** If provided, the mene timer starts from this timestamp instead of Date.now() on open. */
  initialMeneStartedAt?: number;
  onClose: () => void;
  onSwitchMode?: (mode: MeneWizardMode) => void;
  onConfirm: (payload: {
    winnerId: string;
    points: number;
    meneStartedAt: number;
    meneEndedAt: number;
    allocations: MeneWizardAllocation[];
  }) => void;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function sumAlloc(map: Record<string, number>) {
  let t = 0;
  for (const k of Object.keys(map)) t += Number(map[k] || 0);
  return t;
}

export default function PetanqueMeneWizard(props: Props) {
  const {
    open,
    mode,
    title,
    theme,
    participants,
    statIcons,
    initialWinnerId,
    initialPoints,
    maxPoints = 6,
    initialMeneStartedAt,
    onClose,
    onSwitchMode,
    onConfirm,
  } = props;

  const [winnerId, setWinnerId] = React.useState<string>(
    initialWinnerId ?? participants?.[0]?.id ?? "A"
  );
  const [points, setPoints] = React.useState<number>(
    typeof initialPoints === "number" ? initialPoints : 0
  );
  const [meneStartedAt, setMeneStartedAt] = React.useState<number>(() => Date.now());
  const [paused, setPaused] = React.useState(false);
  const [pauseStartedAt, setPauseStartedAt] = React.useState<number | null>(null);
  const [pausedMs, setPausedMs] = React.useState(0);

  // allocations stored per "playerId|stat" => number
  const [alloc, setAlloc] = React.useState<Record<string, number>>({});
  const [memberPickOpen, setMemberPickOpen] = React.useState(false);
  const [memberPickStat, setMemberPickStat] = React.useState<StatKey | null>(null);
  const [memberPickDelta, setMemberPickDelta] = React.useState<1 | -1>(1);
  const [memberPickForWinner, setMemberPickForWinner] = React.useState<string>(winnerId);
  const [memberChosenId, setMemberChosenId] = React.useState<string | null>(null);

  // ✅ icon-click => open a small in-wizard popover to adjust - 0 +
  const [adjustStat, setAdjustStat] = React.useState<StatKey | null>(null);

  const winner = React.useMemo(
    () => participants.find((p) => p.id === winnerId) ?? participants[0],
    [participants, winnerId]
  );

  // reset ONLY when the sheet is opened.
  // IMPORTANT: do NOT depend on `participants` identity here, otherwise the sheet/popovers will
  // auto-close on every parent re-render (participants arrays are often reconstructed).
  React.useEffect(() => {
    if (!open) return;
    const firstId = participants?.[0]?.id ?? "A";
    setWinnerId(initialWinnerId ?? firstId);
    setPoints(typeof initialPoints === "number" ? initialPoints : 0);
    setAlloc({});
    setMeneStartedAt(typeof initialMeneStartedAt === "number" ? initialMeneStartedAt : Date.now());
    setPaused(false);
    setPauseStartedAt(null);
    setPausedMs(0);
    setMemberPickOpen(false);
    setMemberPickStat(null);
    setMemberChosenId(null);
    setAdjustStat(null);
  }, [open]);

  // timer
  const [, tick] = React.useState(0);
  React.useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => tick((x) => x + 1), 250);
    return () => window.clearInterval(t);
  }, [open]);

  const now = Date.now();
  const elapsedMs = paused
    ? Math.max(0, (pauseStartedAt ?? now) - meneStartedAt - pausedMs)
    : Math.max(0, now - meneStartedAt - pausedMs);

  const allocatedTotal = sumAlloc(alloc);
  const mustMatchPoints = mode === "score" && points > 0;
  const canConfirm = mode === "stats" ? true : points === 0 ? true : allocatedTotal === points;

  const keyFor = (playerId: string, stat: StatKey) => `${playerId}|${stat}`;


  const safeBump = (playerId: string, stat: StatKey, delta: 1 | -1) => {
    setAlloc((prev) => {
      const prevTotal = sumAlloc(prev);
      if (delta > 0 && mustMatchPoints && prevTotal >= points) return prev;

      const next = { ...prev };
      const k = keyFor(playerId, stat);
      const cur = Number(next[k] || 0);
      const nv = clamp(cur + delta, 0, 99);
      if (nv <= 0) delete next[k];
      else next[k] = nv;
      return next;
    });
  };

  const requestBump = (stat: StatKey, delta: 1 | -1) => {
    // Special rule: PTS Concede must be attributed to the OPPOSITE camp/player.
    const isConcede = stat === "pousseeConcede";

    const pickParticipant = (pid: string) => participants.find((p) => p.id === pid) ?? participants[0];
    const opponentOf = (pid: string) => {
      if (participants.length < 2) return pid;
      if (pid === "A") return "B";
      if (pid === "B") return "A";
      const other = participants.find((p) => p.id !== pid);
      return other?.id ?? pid;
    };

    const basePid = isConcede ? opponentOf(winner.id) : winner.id;
    const baseParticipant = pickParticipant(basePid);

    // in team mode, require selecting a member (unless 1 member)
    const members = baseParticipant?.members ?? [];
    if (baseParticipant?.kind === "team" && members.length > 1) {
      const chosen =
        memberChosenId && members.some((m) => m.id === memberChosenId) ? memberChosenId : null;
      if (chosen) {
        safeBump(chosen, stat, delta);
        return;
      }
      setMemberPickForWinner(baseParticipant.id);
      setMemberPickStat(stat);
      setMemberPickDelta(delta);
      setMemberPickOpen(true);
      return;
    }

    const targetPlayerId =
      baseParticipant?.kind === "team"
        ? (baseParticipant.members?.[0]?.id ?? baseParticipant.id)
        : baseParticipant.id;

    safeBump(targetPlayerId, stat, delta);
  };

  const confirm = () => {
    if (!canConfirm) return;
    const endedAt = Date.now();
    const allocations: MeneWizardAllocation[] = Object.keys(alloc)
      .map((k) => {
        const [playerId, stat] = k.split("|") as [string, StatKey];
        return { playerId, stat, value: Number(alloc[k] || 0) };
      })
      .filter((a) => a.value > 0);
    onConfirm({
      winnerId,
      points,
      meneStartedAt,
      meneEndedAt: endedAt,
      allocations,
    });
  };

  if (!open) return null;

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    background: "rgba(0,0,0,0.62)",
    backdropFilter: "blur(10px)",
  };

  const panel: React.CSSProperties = {
    width: "min(720px, 96vw)",
    maxHeight: "min(86dvh, 860px)",
    overflow: "auto",
    borderRadius: 18,
    border: `1px solid ${theme?.borderSoft ?? "rgba(255,255,255,0.14)"}`,
    background: "rgba(10,12,24,0.96)",
    boxShadow: `0 28px 80px rgba(0,0,0,0.75)`,
  };

  const header: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 5,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "12px 14px",
    background: "rgba(10,12,24,0.96)",
    borderBottom: `1px solid ${theme?.borderSoft ?? "rgba(255,255,255,0.12)"}`,
    backdropFilter: "blur(12px)",
  };

  const chip: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: `1px solid ${theme?.borderSoft ?? "rgba(255,255,255,0.14)"}`,
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    color: "rgba(255,255,255,0.92)",
  };

  const btn: React.CSSProperties = {
    borderRadius: 999,
    padding: "10px 12px",
    border: `1px solid ${theme?.borderSoft ?? "rgba(255,255,255,0.14)"}`,
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 950,
    cursor: "pointer",
  };

  const titleTxt = title ?? (mode === "score" ? "SCORE — Ajouter une mène" : "Statistiques — Ajouter une action");

  const ALL_STATS: Array<{ k: StatKey; label: string }> = [
    { k: "pointage", label: "Pointage" },
    { k: "bec", label: "Bec" },
    { k: "trou", label: "Trou" },
    { k: "tirReussi", label: "Tir réussi" },
    { k: "carreau", label: "Carreau" },
    { k: "reprise", label: "Reprise" },
    { k: "butAnnulation", label: "Bouclier" },
    { k: "butPoint", label: "But +" },
    { k: "pousseeAssist", label: "PTS Assist" },
    { k: "pousseeConcede", label: "PTS Concede" },
  ];

  // In SCORE mode, we only allow stats that can explain the scored points.
  // (No "Trou" / "Bouclier" / "But +" / "Reprise" in scoring attribution)
  const SCORE_STATS: Array<{ k: StatKey; label: string }> = [
    { k: "pointage", label: "Pointage" },
    { k: "bec", label: "Bec" },
    { k: "tirReussi", label: "Tir réussi" },
    { k: "carreau", label: "Carreau" },
    { k: "pousseeAssist", label: "PTS Assist" },
    { k: "pousseeConcede", label: "PTS Concede" },
  ];

  const stats: Array<{ k: StatKey; label: string }> = mode === "score" ? SCORE_STATS : ALL_STATS;

  const statByKey = React.useMemo(() => {
    const m = new Map<StatKey, string>();
    for (const s of stats) m.set(s.k, s.label);
    return m;
  }, []);

  const totalForStat = (k: StatKey) => {
    let v = 0;
    if (winner?.kind === "team") {
      for (const m of winner.members ?? []) v += Number(alloc[keyFor(m.id, k)] || 0);
    } else {
      v = Number(alloc[keyFor(winner.id, k)] || 0);
    }
    return v;
  };

  const openAdjust = (k: StatKey) => {
    setAdjustStat(k);
    setAdjustOpen(true);
  };

  return (
    <div
      style={overlay}
      role="dialog"
      aria-modal="true"
      onPointerDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={panel} onPointerDown={(e) => e.stopPropagation()}>
        <div style={header}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 1100, letterSpacing: 0.3 }}>{titleTxt}</div>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 3 }}>
              {mode === "score" ? "Mène" : "Action"} — Temps: {fmtMs(elapsedMs)}
              {mode === "score" ? ` — Alloué: ${allocatedTotal}/${points}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {mode === "stats" && (
              <button
                style={{
                  ...btn,
                  padding: "8px 12px",
                  border: `1px solid ${(theme?.primary ?? "#FFD24A")}88`,
                  color: theme?.primary ?? "#FFD24A",
                  background: "rgba(255,255,255,0.04)",
                  fontWeight: 1100,
                  letterSpacing: 1.2,
                }}
                onClick={() => onSwitchMode?.("score")}
                title="Ajouter une mène (score)"
              >
                SCORE&nbsp;+
              </button>
            )}
            <button
              style={{ ...btn, padding: "8px 12px" }}
              onClick={onClose}
              title="Fermer"
            >
              Fermer
            </button>
          </div>
        </div>

        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* winner carousel */}
          <div>
            <div style={{ fontWeight: 950, marginBottom: 8 }}>
              {mode === "score" ? "Qui marque la mène ?" : "Cible"}
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                paddingBottom: 6,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {participants.map((p) => {
                const on = p.id === winnerId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setWinnerId(p.id);
                      setMemberChosenId(null);
                    }}
                    style={{
                      ...btn,
                      minWidth: 160,
                      justifyContent: "flex-start",
                      gap: 10,
                      border: `1px solid ${on ? (theme?.primary ?? "#FFD24A") + "88" : theme?.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                      boxShadow: on ? `0 0 18px ${(theme?.primary ?? "#FFD24A")}33` : undefined,
                      background: on ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 999,
                        overflow: "hidden",
                        border: `1px solid ${on ? (theme?.primary ?? "#FFD24A") + "99" : "rgba(255,255,255,0.14)"}`,
                        background: "rgba(0,0,0,0.25)",
                        flex: "0 0 auto",
                      }}
                    >
                      {p.avatarSrc ? (
                        <img
                          src={p.avatarSrc}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          draggable={false}
                        />
                      ) : null}
                    </div>
                    <div style={{ minWidth: 0, textAlign: "left" }}>
                      <div
                        style={{
                          fontWeight: 1100,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.label}
                      </div>
                      <div style={{ opacity: 0.72, fontSize: 12 }}>
                        {p.kind === "team" ? "Équipe" : "Joueur"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* points */}
          {mode === "score" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 950 }}>Points de la mène</div>
                <div style={chip}>Alloué {allocatedTotal} / {points}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 10 }}>
                <button
                  style={{ ...btn, width: 48, height: 44, padding: 0, fontSize: 20 }}
                  onClick={() => setPoints((p) => Math.max(0, p - 1))}
                  title="-"
                >
                  −
                </button>
                <div style={{ fontSize: 28, fontWeight: 1200, minWidth: 42, textAlign: "center" }}>{points}</div>
                <button
                  style={{ ...btn, width: 48, height: 44, padding: 0, fontSize: 20 }}
                  onClick={() => setPoints((p) => Math.min(maxPoints, p + 1))}
                  title="+"
                >
                  +
                </button>
              </div>
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6, textAlign: "center" }}>
                {points === 0 ? "Mène nulle possible" : "La somme des stats doit être égale aux points"}
              </div>
            </div>
          )}

          {/* stats */}
          <div>
            <div style={{ fontWeight: 950, marginBottom: 8 }}>
              Comment les points ont été marqués ?
            </div>
            {/* ✅ Lisibilité: grandes icônes + libellé, les contrôles - 0 + s'ouvrent au clic */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              {stats.map((it) => {
                let v = 0;
                if (winner?.kind === "team") {
                  for (const m of winner.members ?? []) v += Number(alloc[keyFor(m.id, it.k)] || 0);
                } else {
                  v = Number(alloc[keyFor(winner.id, it.k)] || 0);
                }

                return (
                  <button
                    key={it.k}
                    type="button"
                    onPointerDown={(e) => {
                      // important: évite un "flash" (fermeture immédiate par handlers parents)
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAdjustStat(it.k);
                    }}
                    style={{
                      ...btn,
                      width: "100%",
                      padding: 14,
                      borderRadius: 18,
                      border: `1px solid ${theme?.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                      background: "rgba(255,255,255,0.04)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      position: "relative",
                      minHeight: 104,
                    }}
                    title={it.label}
                  >
                    {!!v && (
                      <div
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          width: 26,
                          height: 26,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          border: `1px solid ${(theme?.primary ?? "#FFD24A")}66`,
                          color: theme?.primary ?? "#FFD24A",
                          fontWeight: 1100,
                          background: "rgba(0,0,0,0.20)",
                        }}
                      >
                        {v}
                      </div>
                    )}

                    <img
                      src={statIcons[it.k]}
                      alt=""
                      style={{ width: 56, height: 56, objectFit: "contain", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.45))" }}
                      draggable={false}
                      onError={(ev) => {
                        // évite les carrés vides si une icône manque: on cache l'image
                        try {
                          (ev.currentTarget as any).style.display = "none";
                        } catch {}
                      }}
                    />
                    <div style={{ fontWeight: 1000, fontSize: 13, opacity: 0.95 }}>{it.label}</div>
                  </button>
                );
              })}
            </div>

            {/* popover - 0 + (dans le wizard, pas de portal => ne disparaît pas) */}
            {adjustStat && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 10000,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 14,
                  background: "rgba(0,0,0,0.45)",
                }}
              >
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    width: "min(420px, 92vw)",
                    borderRadius: 18,
                    border: `1px solid ${theme?.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                    background: "rgba(10,12,24,0.98)",
                    boxShadow: "0 26px 80px rgba(0,0,0,0.70)",
                    padding: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <img
                        src={statIcons[adjustStat]}
                        alt=""
                        style={{ width: 34, height: 34, objectFit: "contain" }}
                        draggable={false}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 1100 }}>{statByKey.get(adjustStat) ?? adjustStat}</div>
                        <div style={{ opacity: 0.72, fontSize: 12 }}>
                          {winner?.kind === "team" ? "Équipe" : "Joueur"}
                          {mustMatchPoints ? ` — ${allocatedTotal}/${points}` : ""}
                        </div>
                      </div>
                    </div>
                    <button
                      style={{ ...btn, padding: "8px 10px" }}
                      onClick={() => setAdjustStat(null)}
                      title="Fermer"
                    >
                      Fermer
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 14 }}>
                    <button
                      style={{ ...btn, width: 52, height: 46, padding: 0, fontSize: 22 }}
                      onClick={() => requestBump(adjustStat, -1)}
                      title="-"
                    >
                      −
                    </button>
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        border: `1px solid ${(theme?.primary ?? "#FFD24A")}66`,
                        color: theme?.primary ?? "#FFD24A",
                        fontWeight: 1200,
                        fontSize: 20,
                      }}
                    >
                      {(() => {
                        if (winner?.kind === "team") {
                          let vv = 0;
                          for (const m of winner.members ?? []) vv += Number(alloc[keyFor(m.id, adjustStat)] || 0);
                          return vv;
                        }
                        return Number(alloc[keyFor(winner.id, adjustStat)] || 0);
                      })()}
                    </div>
                    <button
                      style={{
                        ...btn,
                        width: 52,
                        height: 46,
                        padding: 0,
                        fontSize: 22,
                        opacity: mustMatchPoints && allocatedTotal >= points ? 0.45 : 1,
                      }}
                      onClick={() => requestBump(adjustStat, +1)}
                      title="+"
                      disabled={mustMatchPoints && allocatedTotal >= points}
                    >
                      +
                    </button>
                  </div>

                  {winner?.kind === "team" && (winner.members?.length ?? 0) > 1 && (
                    <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12, textAlign: "center" }}>
                      {memberChosenId
                        ? `Attribué à: ${winner.members?.find((m) => m.id === memberChosenId)?.label ?? ""}`
                        : "Choix joueur: un clic te demandera le joueur si nécessaire"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <button
              style={{ ...btn, opacity: paused ? 0.85 : 1 }}
              onClick={() => {
                if (!paused) {
                  setPaused(true);
                  setPauseStartedAt(Date.now());
                } else {
                  const ps = pauseStartedAt ?? Date.now();
                  setPaused(false);
                  setPauseStartedAt(null);
                  setPausedMs((v) => v + (Date.now() - ps));
                }
              }}
              title={paused ? "Reprendre" : "Pause"}
            >
              {paused ? "Reprendre" : "Pause"}
            </button>

            <button
              style={{
                ...btn,
                border: `1px solid ${(theme?.primary ?? "#FFD24A")}88`,
                color: theme?.primary ?? "#FFD24A",
                opacity: canConfirm ? 1 : 0.45,
              }}
              onClick={confirm}
              disabled={!canConfirm}
              title={canConfirm ? "Valider" : "Alloue toutes les stats"}
            >
              Valider
            </button>
          </div>
        </div>

        {/* member picker */}
        {memberPickOpen && winner?.kind === "team" ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "grid",
              placeItems: "center",
              padding: 14,
              zIndex: 10000,
            }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setMemberPickOpen(false);
            }}
          >
            <div
              style={{
                width: "min(560px, 94vw)",
                borderRadius: 16,
                border: `1px solid ${theme?.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: "rgba(10,12,24,0.98)",
                padding: 12,
                boxShadow: "0 22px 70px rgba(0,0,0,0.8)",
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 1100 }}>Attribuer à quel joueur ?</div>
                <button style={{ ...btn, padding: "8px 12px" }} onClick={() => setMemberPickOpen(false)}>
                  Fermer
                </button>
              </div>
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                Choisis un joueur de {winner.label} (mémorisé pour les prochains +)
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  overflowX: "auto",
                  marginTop: 12,
                  paddingBottom: 6,
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {(winner.members ?? []).map((m) => (
                  <button
                    key={m.id}
                    style={{
                      ...btn,
                      minWidth: 180,
                      justifyContent: "flex-start",
                      gap: 10,
                      display: "flex",
                      alignItems: "center",
                      border: `1px solid ${m.id === memberChosenId ? (theme?.primary ?? "#FFD24A") + "88" : theme?.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                      background: m.id === memberChosenId ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
                    }}
                    onClick={() => {
                      setMemberChosenId(m.id);
                      const st = memberPickStat;
                      if (st) safeBump(m.id, st, memberPickDelta);
                      setMemberPickOpen(false);
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 999,
                        overflow: "hidden",
                        border: `1px solid ${(theme?.primary ?? "#FFD24A")}55`,
                        background: "rgba(0,0,0,0.25)",
                      }}
                    >
                      {m.avatarSrc ? (
                        <img
                          src={m.avatarSrc}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          draggable={false}
                        />
                      ) : null}
                    </div>
                    <div style={{ minWidth: 0, textAlign: "left" }}>
                      <div style={{ fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.label}
                      </div>
                      <div style={{ opacity: 0.72, fontSize: 12 }}>Tap pour attribuer</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
