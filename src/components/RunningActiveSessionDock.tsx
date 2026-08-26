import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { RunningGlyph } from "../pages/running/RunningUi";
import { formatDistance, formatDuration, routeDistanceMeters } from "../activity/activityMath";
import {
  getNativeTrack,
  nativeTrackingStatus,
  pauseNativeTracking,
  resumeNativeTracking,
} from "../activity/nativeActivityTracking";
import {
  clearNativeTrackingOwnerIf,
  getNativeTrackingOwnerSessionId,
  getRunningRecordingSession,
  loadRunningActiveSessions,
  patchRunningActiveSession,
  setNativeTrackingOwnerSessionId,
  upsertRunningActiveSession,
  resumedRunningSessionTiming,
  runningActiveElapsedMs,
  subscribeRunningActiveSessions,
  type RunningActiveSession,
} from "../activity/runningActiveSessions";
import {
  deleteRunningSessionDraft,
  listRecoverableRunningSessionDrafts,
  loadRunningSessionDraft,
  mergeRunningDraftRoutes,
  saveRunningSessionDraft,
  type RunningSessionDraft,
} from "../activity/runningSessionDrafts";

function RunnerIcon({ size = 19 }: { size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="15.5" cy="4.8" r="2"/><path {...p} d="m13.8 8-3.2 3.3 2.6 2.5 3.5-1.2"/><path {...p} d="m10.7 11.3-4 .7"/><path {...p} d="m13.2 14-2.5 5"/><path {...p} d="m13.2 14 4.8 4"/></svg>;
}

function PauseIcon({ paused }: { paused: boolean }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return paused
    ? <svg width="14" height="14" viewBox="0 0 24 24"><path {...p} d="m8 5 11 7-11 7Z"/></svg>
    : <svg width="14" height="14" viewBox="0 0 24 24"><path {...p} d="M8 5v14M16 5v14"/></svg>;
}

export default function RunningActiveSessionDock({
  currentRoute,
  currentSport,
  go,
}: {
  currentRoute: string;
  currentSport?: string | null;
  go: (route: any, params?: any) => void;
}) {
  const { theme } = useTheme();
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#9ed2ff";
  const [sessions, setSessions] = React.useState<RunningActiveSession[]>(() => loadRunningActiveSessions());
  const [expanded, setExpanded] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [recoverableDrafts, setRecoverableDrafts] = React.useState<RunningSessionDraft[]>([]);
  const [, forceTick] = React.useState(0);

  React.useEffect(() => subscribeRunningActiveSessions(setSessions), []);
  React.useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const rows = await listRecoverableRunningSessionDrafts(sessions.map((row) => row.id));
      if (alive) setRecoverableDrafts(rows);
    };
    void refresh();
    const timer = window.setInterval(refresh, 8000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [sessions.map((row) => row.id).join("|")]);
  React.useEffect(() => {
    if (!sessions.length) return;
    const timer = window.setInterval(() => forceTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [sessions.length]);

  React.useEffect(() => {
    const ownerId = getNativeTrackingOwnerSessionId();
    const primary = sessions.find((row) => row.id === ownerId && row.mode === "native-gps" && !row.paused);
    if (!primary) return;
    let alive = true;
    const refresh = async () => {
      try {
        const status = await nativeTrackingStatus();
        if (!alive) return;
        if (!status?.running) {
          const pausedAt = Date.now();
          patchRunningActiveSession(primary.id, { paused: true, pausedAt, status: "paused" });
          clearNativeTrackingOwnerIf(primary.id);
          return;
        }
        const track = await getNativeTrack();
        if (!alive) return;
        const route = Array.isArray(track?.route) ? track!.route! : [];
        patchRunningActiveSession(primary.id, {
          paused: !!status?.paused,
          status: status?.paused ? "paused" : "recording",
          lastDistanceM: route.length > 1 ? routeDistanceMeters(route) : primary.lastDistanceM,
          lastElapsedMs: Number(status?.elapsedMs || primary.lastElapsedMs || 0),
        });
      } catch {}
    };
    void refresh();
    const timer = window.setInterval(refresh, 4000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [sessions.map((row) => `${row.id}:${row.paused}:${row.mode}`).join("|")]);

  if (!sessions.length && !recoverableDrafts.length) return null;
  const hiddenOnRunningRecord = currentRoute === "games" && String(currentSport || "").toLowerCase() === "running";
  if (hiddenOnRunningRecord) return null;

  const openSession = (session: RunningActiveSession) => {
    try { window.localStorage.setItem("dc-start-game", "running"); } catch {}
    try { window.dispatchEvent(new CustomEvent("dc:sport-change", { detail: { sport: "running", game: "running", source: "active_running_session" } })); } catch {}
    go("games", { runningResumeSessionId: session.id, runningActivitySport: session.sport });
    setExpanded(false);
  };

  const createAnotherSession = () => {
    if (sessions.length >= 3 || getRunningRecordingSession()) {
      setNotice("Mets l'activité en cours en pause avant d'en créer une autre.");
      return;
    }
    try { window.localStorage.setItem("dc-start-game", "running"); } catch {}
    go("games", { runningNewSession: true, runningActivitySport: "running" });
    setExpanded(false);
  };

  const pauseOrResume = async (session: RunningActiveSession) => {
    setNotice("");
    if (!session.paused) {
      const now = Date.now();
      if (session.mode === "native-gps" && getNativeTrackingOwnerSessionId() === session.id) {
        try {
          await pauseNativeTracking();
          const track = await getNativeTrack();
          const route = Array.isArray(track?.route) ? track!.route! : [];
          const currentDraft = await loadRunningSessionDraft(session.id);
          if (currentDraft) {
            await saveRunningSessionDraft({
              ...currentDraft,
              route: mergeRunningDraftRoutes(currentDraft.route, route),
              updatedAt: now,
            });
          }
          patchRunningActiveSession(session.id, {
            paused: true,
            pausedAt: now,
            status: "paused",
            lastDistanceM: route.length > 1 ? routeDistanceMeters(route) : session.lastDistanceM,
            lastDraftAt: currentDraft ? now : session.lastDraftAt,
          });
          return;
        } catch {}
      }
      patchRunningActiveSession(session.id, { paused: true, pausedAt: now, status: "paused" });
      return;
    }

    if (getRunningRecordingSession(session.id)) {
      setNotice("Une autre activité utilise déjà le tracking. Ouvre cette session pour la reprendre ensuite.");
      return;
    }

    if (session.mode === "native-gps" && getNativeTrackingOwnerSessionId() === session.id) {
      try {
        const status = await nativeTrackingStatus();
        if (status?.running) {
          await resumeNativeTracking();
          patchRunningActiveSession(session.id, resumedRunningSessionTiming(session));
          return;
        }
      } catch {}
    }

    // Web GPS, tapis, ou ancien GPS natif dont le service a été remplacé :
    // on rouvre la session pour relancer proprement le moteur et restaurer le brouillon.
    openSession(session);
  };

  const recoverDraft = async (draft: RunningSessionDraft) => {
    setNotice("");
    const startedAt = Number(draft.startedAt || draft.updatedAt || Date.now());
    let paused = true;
    let mode = draft.mode || (draft.sport === "treadmill" ? "treadmill" : "web-gps");
    if (mode === "native-gps") {
      try {
        const status = await nativeTrackingStatus();
        if (status?.running) {
          paused = !!status.paused;
          setNativeTrackingOwnerSessionId(draft.sessionId);
        }
      } catch {}
    }
    const result = upsertRunningActiveSession({
      id: draft.sessionId,
      activityId: draft.activityId,
      sport: draft.sport,
      title: draft.title || "Activité récupérée",
      presetId: draft.presetId || "goal-free",
      workoutType: draft.workoutType,
      startedAt,
      paused,
      pausedAt: paused ? Date.now() : undefined,
      pausedTotalMs: Number(draft.pausedTotalMs || 0),
      status: paused ? "paused" : "recording",
      mode,
      targetDistanceM: draft.targetDistanceM,
      targetDurationMs: draft.targetDurationMs,
      targetPaceSecPerKm: draft.targetPaceSecPerKm,
      routeReferenceId: draft.routeReferenceId,
      shoeId: draft.shoeId,
      lastDistanceM: draft.route.length > 1 ? routeDistanceMeters(draft.route) : Number(draft.treadmillDistanceM || 0),
      lastElapsedMs: Math.max(0, Number(draft.updatedAt || 0) - startedAt - Number(draft.pausedTotalMs || 0)),
      lastDraftAt: draft.updatedAt,
      recoveredAt: Date.now(),
      lastUpdatedAt: Date.now(),
    });
    if (!result.ok) {
      setNotice("3 sessions actives maximum. Termine une session avant de récupérer celle-ci.");
      return;
    }
    setRecoverableDrafts((rows) => rows.filter((row) => row.sessionId !== draft.sessionId));
    openSession(result.rows.find((row) => row.id === draft.sessionId) || result.rows[0]);
  };

  const abandonDraft = async (draft: RunningSessionDraft) => {
    await deleteRunningSessionDraft(draft.sessionId);
    setRecoverableDrafts((rows) => rows.filter((row) => row.sessionId !== draft.sessionId));
  };

  const primary = sessions.find((session) => !session.paused) || sessions[0] || null;
  const canCreate = sessions.length < 3 && !getRunningRecordingSession();

  return <div style={{ position: "fixed", right: "calc(env(safe-area-inset-right, 0px) + 5px)", top: "46%", transform: "translateY(-50%)", zIndex: 72, display: "grid", justifyItems: "end", gap: 7, pointerEvents: "none" }}>
    {expanded ? <div style={{ width: 258, padding: 9, borderRadius: 20, border: `1px solid ${accent}30`, background: "linear-gradient(165deg,rgba(13,18,29,.985),rgba(5,8,14,.995))", boxShadow: "0 22px 50px rgba(0,0,0,.58),inset 0 1px 0 rgba(255,255,255,.05)", backdropFilter: "blur(18px)", pointerEvents: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "2px 3px 7px" }}><div><div style={{ fontSize: 7.2, opacity: .45, fontWeight: 1000, letterSpacing: 1.2 }}>RUNNING PERFORMANCE</div><div style={{ marginTop: 2, fontSize: 10.5, fontWeight: 1000 }}>SESSIONS ACTIVES</div></div><span style={{ minWidth: 28, height: 24, borderRadius: 999, display: "grid", placeItems: "center", color: accent, border: `1px solid ${accent}32`, background: `${accent}0d`, fontSize: 8, fontWeight: 1000 }}>{sessions.length}/3</span></div>
      {sessions.map((session) => <div key={session.id} style={{ display: "grid", gridTemplateColumns: "1fr 36px", gap: 6, alignItems: "stretch", marginBottom: 6 }}>
        <button type="button" onClick={() => openSession(session)} style={{ minHeight: 56, padding: "8px 9px", border: "1px solid rgba(255,255,255,.065)", borderRadius: 14, background: "rgba(255,255,255,.025)", color: "#fff", textAlign: "left", display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <span style={{ width: 32, height: 32, borderRadius: 11, display: "grid", placeItems: "center", color: accent, background: `${accent}12`, border: `1px solid ${accent}30` }}><RunnerIcon size={17}/></span>
          <span style={{ minWidth: 0 }}><b style={{ display: "block", fontSize: 8.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.title}</b><small style={{ display: "block", marginTop: 3, fontSize: 7.4, opacity: .58 }}>{session.paused ? "PAUSE" : "EN COURS"} · {formatDuration(runningActiveElapsedMs(session))}{session.lastDraftAt ? " · SAUV." : ""}</small></span>
          <span style={{ color: accent, fontSize: 8.2, fontWeight: 1000 }}>{formatDistance(Number(session.lastDistanceM || 0))}</span>
        </button>
        <button type="button" onClick={() => void pauseOrResume(session)} aria-label={session.paused ? "Reprendre" : "Pause"} style={{ borderRadius: 12, border: `1px solid ${session.paused ? `${accent}38` : "rgba(255,255,255,.10)"}`, background: session.paused ? `${accent}0d` : "rgba(255,255,255,.035)", color: session.paused ? accent : "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}><PauseIcon paused={session.paused}/></button>
      </div>)}
      {recoverableDrafts.length ? <div style={{ marginTop: sessions.length ? 8 : 0, paddingTop: sessions.length ? 8 : 0, borderTop: sessions.length ? "1px solid rgba(255,255,255,.07)" : undefined }}><div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 3px 7px", color: "#ffc970" }}><RunningGlyph name="recover" size={14}/><b style={{ fontSize: 8.2 }}>SESSION À RÉCUPÉRER</b></div>{recoverableDrafts.slice(0, 2).map((draft) => <div key={draft.sessionId} style={{ padding: 8, marginBottom: 6, borderRadius: 13, border: "1px solid rgba(255,201,112,.20)", background: "rgba(255,201,112,.055)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div style={{ minWidth: 0 }}><b style={{ display: "block", fontSize: 8.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{draft.title || "Activité interrompue"}</b><small style={{ display: "block", marginTop: 3, fontSize: 7.2, opacity: .58 }}>{formatDistance(draft.route.length > 1 ? routeDistanceMeters(draft.route) : Number(draft.treadmillDistanceM || 0))} · sauvegarde {new Date(draft.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div><RunningGlyph name="recover" size={16}/></div><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, marginTop: 7 }}><button type="button" onClick={() => void recoverDraft(draft)} style={{ minHeight: 30, borderRadius: 9, border: `1px solid ${accent}42`, background: `${accent}10`, color: accent, fontSize: 7.5, fontWeight: 1000 }}>RÉCUPÉRER</button><button type="button" onClick={() => void abandonDraft(draft)} style={{ minHeight: 30, borderRadius: 9, border: "1px solid rgba(255,255,255,.08)", background: "transparent", color: "rgba(255,255,255,.48)", fontSize: 7.2 }}>IGNORER</button></div></div>)}</div> : null}
      {notice ? <div style={{ padding: "5px 7px", fontSize: 7.2, lineHeight: 1.35, color: "#ffc66d" }}>{notice}</div> : null}
      <button type="button" disabled={!canCreate} onClick={createAnotherSession} style={{ width: "100%", minHeight: 35, marginTop: 4, borderRadius: 11, border: `1px solid ${canCreate ? `${accent}42` : "rgba(255,255,255,.07)"}`, background: canCreate ? `${accent}0d` : "rgba(255,255,255,.02)", color: canCreate ? accent : "rgba(255,255,255,.35)", fontSize: 7.6, fontWeight: 1000, cursor: canCreate ? "pointer" : "default" }}>＋ NOUVELLE SESSION</button>
      <div style={{ padding: "6px 8px 1px", fontSize: 6.7, opacity: .4, textAlign: "center" }}>1 TRACKING GPS/CAPTEURS ACTIF À LA FOIS</div>
    </div> : null}
    <button type="button" onClick={() => (sessions.length === 1 && !recoverableDrafts.length && primary) ? openSession(primary) : setExpanded((value) => !value)} aria-label="Activité en cours" style={{ pointerEvents: "auto", minWidth: 45, height: 45, padding: primary && !expanded ? "0 7px" : 0, borderRadius: "16px 5px 5px 16px", border: `1px solid ${accent}55`, background: "linear-gradient(155deg,rgba(15,20,32,.98),rgba(5,8,14,.98))", color: accent, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: `0 12px 28px rgba(0,0,0,.50),0 0 18px ${accent}13,inset 0 1px 0 rgba(255,255,255,.05)`, cursor: "pointer", position: "relative" }}>
      {recoverableDrafts.length && !sessions.length ? <RunningGlyph name="recover" size={19}/> : <RunnerIcon/>}
      {primary && !expanded ? <span style={{ maxWidth: 58, overflow: "hidden", whiteSpace: "nowrap", fontSize: 7.3, fontWeight: 1000 }}>{formatDuration(runningActiveElapsedMs(primary))}</span> : null}
      {(sessions.length + recoverableDrafts.length) > 1 ? <span style={{ position: "absolute", top: -5, left: -5, minWidth: 17, height: 17, paddingInline: 3, borderRadius: 999, display: "grid", placeItems: "center", background: accent, color: "#071018", fontSize: 7, fontWeight: 1000 }}>{sessions.length + recoverableDrafts.length}</span> : null}
      {primary && !primary.paused ? <span style={{ position: "absolute", right: 4, top: 4, width: 5, height: 5, borderRadius: 99, background: "#6dff9d", boxShadow: "0 0 8px #6dff9d" }}/> : null}
    </button>
  </div>;
}
