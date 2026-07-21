import * as React from "react";
import {
  buildPrivateMessagesStreamUrl,
  declineMessengerCall,
  listIncomingMessengerCalls,
  type MessengerCall,
} from "../lib/friendsApi";
import { ensureMessagePushSubscription, showMessageCenterNotification } from "../lib/messageCenterNotify";
import { readNasAccessToken } from "../lib/apiClient";
import { useAuthOnline } from "../hooks/useAuthOnline";

const BLUE = "#79c8ff";
const GREEN = "#7dffb2";
const RED = "#ff7b7b";
const PANEL_BG = "linear-gradient(180deg, rgba(15,20,31,.98), rgba(5,7,12,.98))";
const SEEN_CALLS_KEY = "dc_messenger_seen_incoming_calls_v2";

type AnyCall = MessengerCall & { caller?: any; callee?: any; message?: any };

function safeStorageGet(key: string): string {
  try { return window.localStorage.getItem(key) || ""; } catch { return ""; }
}

function safeStorageSet(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch {}
}

function loadSeenCalls(): Set<string> {
  try {
    const raw = safeStorageGet(SEEN_CALLS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch { return new Set(); }
}

function saveSeenCalls(set: Set<string>) {
  safeStorageSet(SEEN_CALLS_KEY, JSON.stringify(Array.from(set).slice(-80)));
}

function callIdOf(call: AnyCall | null | undefined): string {
  return String(call?.id || call?.callId || call?.metadata?.callId || "").trim();
}

function callTypeOf(call: AnyCall | null | undefined): "audio" | "video" {
  const raw = String(call?.callType || call?.type || call?.metadata?.callType || "audio").toLowerCase();
  return raw === "video" || raw === "visio" ? "video" : "audio";
}

function callStatusOf(call: AnyCall | null | undefined): string {
  return String(call?.status || call?.metadata?.status || "ringing").toLowerCase();
}

function displayCallerName(call: AnyCall | null | undefined): string {
  const caller = call?.caller || call?.message?.fromUser || call?.metadata?.fromUser || {};
  return String(caller.displayName || caller.nickname || caller.name || caller.email || "un ami").trim();
}

function isRingingIncoming(call: AnyCall | null | undefined): boolean {
  if (!callIdOf(call)) return false;
  const st = callStatusOf(call);
  if (st && !["ringing", "incoming", "pending"].includes(st)) return false;
  const direction = String(call?.direction || "incoming").toLowerCase();
  return direction !== "outgoing";
}

function callFromSsePayload(payload: any): AnyCall | null {
  const direct = payload?.call || payload?.item?.call || null;
  if (direct && isRingingIncoming(direct)) return direct;

  const message = payload?.message || payload?.item || null;
  const meta = message?.metadata || {};
  if (String(meta?.kind || "") !== "callInvite") return null;
  if (String(message?.direction || "").toLowerCase() === "outgoing") return null;
  const id = String(meta.callId || "").trim();
  if (!id) return null;
  return {
    id,
    callId: id,
    callType: meta.callType || "audio",
    type: meta.callType || "audio",
    status: meta.status || "ringing",
    direction: "incoming",
    callerUserId: message?.fromUser?.id || message?.fromUser?.userId || meta.fromUserId || "",
    calleeUserId: message?.toUser?.id || message?.toUser?.userId || "",
    caller: message?.fromUser || null,
    callee: message?.toUser || null,
    metadata: meta,
    message,
    createdAt: message?.createdAt,
    expiresAt: meta.expiresAt || message?.expiresAt || null,
  };
}

async function showIncomingSystemNotification(call: AnyCall) {
  const name = displayCallerName(call);
  const type = callTypeOf(call);
  const id = callIdOf(call);
  const title = type === "video" ? "📹 Appel visio entrant" : "📞 Appel audio entrant";
  const body = `${name} t'appelle. Réponds ou refuse l'appel.`;
  try {
    await showMessageCenterNotification(title, body, {
      tag: id ? `multisports-call-${id}` : "multisports-call",
      requireInteraction: true,
      data: {
        kind: "incoming_call",
        callId: id,
        callType: type,
        url: id ? `/#/messages?callId=${encodeURIComponent(id)}` : "/#/messages",
        acceptUrl: id ? `/#/messages?callId=${encodeURIComponent(id)}&callAction=accept` : "/#/messages",
        declineUrl: id ? `/#/messages?callId=${encodeURIComponent(id)}&callAction=decline` : "/#/messages",
      },
      actions: id ? [
        { action: "accept", title: "Répondre" },
        { action: "decline", title: "Refuser" },
      ] : [],
      vibrate: [600, 180, 600, 180, 900] as any,
    } as any);
  } catch {}
  try { (navigator as any)?.vibrate?.([450, 180, 450, 180, 700]); } catch {}
}

function requestOpenCallInMessages(callId: string, action: "accept" | "open" = "open") {
  if (!callId) return;
  try { window.sessionStorage.setItem("dc_messenger_open_call_id", callId); } catch {}
  try { window.sessionStorage.setItem("dc_messenger_open_call_action", action); } catch {}
  try { window.location.hash = `#/messages?callId=${encodeURIComponent(callId)}${action === "accept" ? "&callAction=accept" : ""}`; } catch {}
  try { window.dispatchEvent(new CustomEvent("dc-messenger-open-call", { detail: { callId, action } })); } catch {}
}

export default function GlobalMessengerCallBridge() {
  const auth = useAuthOnline() as any;
  const [incoming, setIncoming] = React.useState<AnyCall | null>(null);
  const [busy, setBusy] = React.useState(false);
  const seenRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    seenRef.current = loadSeenCalls();
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!readNasAccessToken()) return;
    ensureMessagePushSubscription().catch(() => {});
  }, [auth?.status, auth?.ready, auth?.userId]);

  const alertIncomingCall = React.useCallback((call: AnyCall) => {
    if (!isRingingIncoming(call)) return;
    const id = callIdOf(call);
    if (!id) return;
    setIncoming((prev) => callIdOf(prev) === id ? prev : call);
    if (!seenRef.current.has(id)) {
      seenRef.current.add(id);
      saveSeenCalls(seenRef.current);
      showIncomingSystemNotification(call).catch(() => {});
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;
    if (!readNasAccessToken()) return;
    let es: EventSource | null = null;
    let stopped = false;
    let reconnectTimer: number | null = null;
    let reconnectDelayMs = 2500;
    const scheduleReconnect = () => {
      if (stopped || reconnectTimer) return;
      const delay = reconnectDelayMs;
      reconnectDelayMs = Math.min(30_000, Math.max(5000, reconnectDelayMs * 2));
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };
    const connect = () => {
      if (stopped) return;
      try {
        es?.close();
        es = new EventSource(buildPrivateMessagesStreamUrl());
        es.onopen = () => { reconnectDelayMs = 2500; };
        const handle = (event: MessageEvent) => {
          try {
            const payload = JSON.parse(String(event.data || "{}"));
            const call = callFromSsePayload(payload);
            if (call) alertIncomingCall(call);
          } catch {}
        };
        es.addEventListener("call:incoming", handle as EventListener);
        es.addEventListener("message:created", handle as EventListener);
        es.addEventListener("messages:snapshot", ((event: MessageEvent) => {
          try {
            const payload = JSON.parse(String(event.data || "{}"));
            const messages = Array.isArray(payload?.messages) ? payload.messages : [];
            for (const message of messages) {
              const call = callFromSsePayload({ message });
              if (call) alertIncomingCall(call);
            }
          } catch {}
        }) as EventListener);
        es.onerror = () => {
          try { es?.close(); } catch {}
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    };
    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      try { es?.close(); } catch {}
    };
  }, [alertIncomingCall, auth?.status, auth?.ready, auth?.userId]);

  React.useEffect(() => {
    if (!readNasAccessToken()) return;
    let stopped = false;
    let timer: number | null = null;
    let pollDelayMs = 10_000;
    const schedule = (delay = pollDelayMs) => {
      if (stopped) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => { poll().catch(() => {}); }, delay);
    };
    const poll = async () => {
      if (stopped) return;
      try {
        const calls = await listIncomingMessengerCalls();
        pollDelayMs = 10_000;
        const first = (Array.isArray(calls) ? calls : []).find((call: any) => isRingingIncoming(call));
        if (first) alertIncomingCall(first as AnyCall);
      } catch {
        pollDelayMs = Math.min(60_000, Math.max(20_000, pollDelayMs * 2));
      } finally {
        schedule();
      }
    };
    poll().catch(() => {});
    const onFocus = () => {
      if (document.visibilityState === "hidden") return;
      pollDelayMs = 10_000;
      poll().catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [alertIncomingCall, auth?.status, auth?.ready, auth?.userId]);

  React.useEffect(() => {
    const onSwMessage = (event: MessageEvent) => {
      const payload: any = event.data || {};
      if (payload?.type !== "MESSENGER_NOTIFICATION_CLICK") return;
      const callId = String(payload?.data?.callId || "").trim();
      const action = String(payload.action || "open");
      if (!callId) return;
      if (action === "decline") {
        declineMessengerCall(callId).catch(() => {});
      } else {
        requestOpenCallInMessages(callId, action === "accept" ? "accept" : "open");
      }
    };

    try { navigator.serviceWorker?.addEventListener?.("message", onSwMessage as any); } catch {}

    const readHashAction = () => {
      try {
        const h = String(window.location.hash || "");
        const q = h.includes("?") ? h.slice(h.indexOf("?") + 1) : "";
        if (!q) return;
        const params = new URLSearchParams(q);
        const callId = String(params.get("callId") || "").trim();
        const action = String(params.get("callAction") || "open").trim();
        if (callId && (action === "accept" || action === "open")) requestOpenCallInMessages(callId, action as any);
      } catch {}
    };
    readHashAction();
    window.addEventListener("hashchange", readHashAction);
    return () => {
      try { navigator.serviceWorker?.removeEventListener?.("message", onSwMessage as any); } catch {}
      window.removeEventListener("hashchange", readHashAction);
    };
  }, []);

  const close = React.useCallback(() => {
    setIncoming(null);
    setBusy(false);
  }, []);

  const answer = React.useCallback(() => {
    const id = callIdOf(incoming);
    if (!id) return close();
    requestOpenCallInMessages(id, "accept");
    close();
  }, [incoming, close]);

  const decline = React.useCallback(async () => {
    const id = callIdOf(incoming);
    if (!id) return close();
    setBusy(true);
    try { await declineMessengerCall(id); } catch {}
    close();
  }, [incoming, close]);

  if (!incoming) return null;
  const type = callTypeOf(incoming);
  const name = displayCallerName(incoming);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999999, pointerEvents: "none", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "max(18px, env(safe-area-inset-top)) 14px 14px" }}>
      <div style={{ pointerEvents: "auto", width: "min(520px, calc(100vw - 28px))", borderRadius: 28, padding: 18, background: PANEL_BG, border: `1px solid ${type === "video" ? BLUE : GREEN}`, boxShadow: `0 22px 80px rgba(0,0,0,.72), 0 0 36px ${type === "video" ? "rgba(121,200,255,.24)" : "rgba(125,255,178,.24)"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 62, height: 62, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 30, background: type === "video" ? "rgba(121,200,255,.15)" : "rgba(125,255,178,.15)", border: `1px solid ${type === "video" ? BLUE : GREEN}`, boxShadow: `0 0 24px ${type === "video" ? "rgba(121,200,255,.22)" : "rgba(125,255,178,.22)"}` }}>{type === "video" ? "📹" : "📞"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: type === "video" ? BLUE : GREEN, fontWeight: 1000, textTransform: "uppercase", letterSpacing: ".04em" }}>{type === "video" ? "Appel visio entrant" : "Appel audio entrant"}</div>
            <div style={{ fontSize: 24, color: "white", fontWeight: 1000, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            <div style={{ color: "rgba(255,255,255,.72)", fontWeight: 800, marginTop: 4 }}>Répondre ou refuser l'appel</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button type="button" disabled={busy} onClick={answer} style={{ flex: 1, minHeight: 58, borderRadius: 20, border: `1px solid ${GREEN}`, color: GREEN, background: "linear-gradient(180deg, rgba(125,255,178,.20), rgba(125,255,178,.08))", fontWeight: 1000, fontSize: 17, boxShadow: "0 0 24px rgba(125,255,178,.15)" }}>✅ Répondre</button>
          <button type="button" disabled={busy} onClick={decline} style={{ flex: 1, minHeight: 58, borderRadius: 20, border: `1px solid ${RED}`, color: RED, background: "linear-gradient(180deg, rgba(255,123,123,.17), rgba(255,123,123,.06))", fontWeight: 1000, fontSize: 17, boxShadow: "0 0 24px rgba(255,123,123,.12)" }}>❌ Refuser</button>
        </div>
        <button type="button" disabled={busy} onClick={close} style={{ marginTop: 10, width: "100%", minHeight: 44, borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.72)", background: "rgba(255,255,255,.04)", fontWeight: 900 }}>Masquer</button>
      </div>
    </div>
  );
}
