import React from "react";
import { useTheme } from "../contexts/ThemeContext";
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
  resumedRunningSessionTiming,
  runningActiveElapsedMs,
  subscribeRunningActiveSessions,
  type RunningActiveSession,
} from "../activity/runningActiveSessions";
import {
  loadRunningSessionDraft,
  mergeRunningDraftRoutes,
  saveRunningSessionDraft,
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
  const [, forceTick] = React.useState(0);

  React.useEffect(() => subscribeRunningActiveSessions(setSessions), []);
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

  if (!sessions.length) return null;
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

  const primary = sessions.find((session) => !session.paused) || sessions[0];
  const canCreate = sessions.length < 3 && !getRunningRecordingSession();

  return <div style={{ position: "fixed", right: "calc(env(safe-area-inset-right, 0px) + 4px)", top: "46%", transform: "translateY(-50%)", zIndex: 72, display: "grid", justifyItems: "end", gap: 7, pointerEvents: "none" }}>
    {expanded ? <div style={{ width: 248, padding: 8, borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", background: "rgba(7,9,14,.97)", boxShadow: "0 16px 38px rgba(0,0,0,.52)", backdropFilter: "blur(16px)", pointerEvents: "auto" }}>
      {sessions.map((session) => <div key={session.id} style={{ display: "grid", gridTemplateColumns: "1fr 34px", gap: 5, alignItems: "stretch", marginBottom: 4 }}>
        <button type="button" onClick={() => openSession(session)} style={{ minHeight: 50, padding: "7px 9px", border: 0, borderRadius: 12, background: "rgba(255,255,255,.018)", color: "#fff", textAlign: "left", display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <span style={{ width: 28, height: 28, borderRadius: 10, display: "grid", placeItems: "center", color: accent, background: `${accent}12`, border: `1px solid ${accent}30` }}><RunnerIcon size={16}/></span>
          <span style={{ minWidth: 0 }}><b style={{ display: "block", fontSize: 8.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.title}</b><small style={{ display: "block", marginTop: 2, fontSize: 7.4, opacity: .6 }}>{session.paused ? "PAUSE" : "EN COURS"} · {formatDuration(runningActiveElapsedMs(session))}{session.lastDraftAt ? " · SAUV." : ""}</small></span>
          <span style={{ color: accent, fontSize: 8.2, fontWeight: 1000 }}>{formatDistance(Number(session.lastDistanceM || 0))}</span>
        </button>
        <button type="button" onClick={() => void pauseOrResume(session)} aria-label={session.paused ? "Reprendre" : "Pause"} style={{ borderRadius: 11, border: "1px solid rgba(255,255,255,.10)", background: session.paused ? `${accent}12` : "rgba(255,255,255,.035)", color: session.paused ? accent : "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}><PauseIcon paused={session.paused}/></button>
      </div>)}
      {notice ? <div style={{ padding: "5px 7px", fontSize: 7.2, lineHeight: 1.35, color: "#ffc66d" }}>{notice}</div> : null}
      <button type="button" disabled={!canCreate} onClick={createAnotherSession} style={{ width: "100%", minHeight: 34, marginTop: 3, borderRadius: 10, border: `1px solid ${canCreate ? `${accent}42` : "rgba(255,255,255,.07)"}`, background: canCreate ? `${accent}0d` : "rgba(255,255,255,.02)", color: canCreate ? accent : "rgba(255,255,255,.35)", fontSize: 7.6, fontWeight: 1000, cursor: canCreate ? "pointer" : "default" }}>＋ NOUVELLE SESSION</button>
      <div style={{ padding: "5px 8px 1px", fontSize: 6.8, opacity: .45, textAlign: "center" }}>{sessions.length}/3 SESSIONS · 1 TRACKING GPS/CAPTEURS À LA FOIS</div>
    </div> : null}
    <button type="button" onClick={() => sessions.length === 1 ? openSession(primary) : setExpanded((value) => !value)} aria-label="Activité en cours" style={{ pointerEvents: "auto", width: 42, height: 42, borderRadius: "14px 4px 4px 14px", border: `1px solid ${accent}55`, background: "rgba(7,9,14,.92)", color: accent, display: "grid", placeItems: "center", boxShadow: `0 8px 24px rgba(0,0,0,.42),0 0 16px ${accent}12`, cursor: "pointer", position: "relative" }}>
      <RunnerIcon/>
      {sessions.length > 1 ? <span style={{ position: "absolute", top: -5, left: -5, minWidth: 17, height: 17, paddingInline: 3, borderRadius: 999, display: "grid", placeItems: "center", background: accent, color: "#071018", fontSize: 7, fontWeight: 1000 }}>{sessions.length}</span> : null}
      {!primary.paused ? <span style={{ position: "absolute", right: 4, top: 4, width: 5, height: 5, borderRadius: 99, background: "#6dff9d", boxShadow: "0 0 8px #6dff9d" }}/> : null}
    </button>
  </div>;
}
