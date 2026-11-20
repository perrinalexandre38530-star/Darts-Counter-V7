import { DEFAULT_VIEWER_API_URL, normalizeViewerCode } from "./viewerClient";
import type { ViewerLiveSnapshot } from "./types";

type ViewerRealtimeRole = "host" | "guest";
type ViewerRealtimeStatus = "connecting" | "connected" | "disconnected" | "error";

type Options = {
  sessionId: string;
  role: ViewerRealtimeRole;
  onCommand?: (data: any) => void;
  onSnapshot?: (snapshot: ViewerLiveSnapshot) => void;
  onLifecycle?: (data: any) => void;
  onStatus?: (status: ViewerRealtimeStatus) => void;
};

export type ViewerRealtimeConnection = {
  sessionId: string;
  role: ViewerRealtimeRole;
  sendCommand: (data: any) => boolean;
  sendSnapshot: (snapshot: ViewerLiveSnapshot) => boolean;
  sendLifecycle: (data: any) => boolean;
  isOpen: () => boolean;
  close: () => void;
};

function wsBase() {
  // HTTP and WebSocket must point to the same Viewer backend. The TV build
  // may override the Worker URL; previously the socket silently ignored it.
  const env = (import.meta as any)?.env || {};
  const base = String(env.VITE_VIEWER_API_URL || env.VITE_ONLINE_API_URL || DEFAULT_VIEWER_API_URL || "");
  return base.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:").replace(/\/+$/, "");
}

export function viewerRealtimeUrl(sessionId: string) {
  const sid = normalizeViewerCode(sessionId);
  return `${wsBase()}/api/viewer/session/${encodeURIComponent(sid)}/socket`;
}

export function createViewerRealtimeConnection(options: Options): ViewerRealtimeConnection {
  const sessionId = normalizeViewerCode(options.sessionId);
  const role = options.role;
  let ws: WebSocket | null = null;
  let closed = false;
  let reconnectTimer: number | null = null;
  let heartbeatTimer: number | null = null;
  let reconnectAttempt = 0;
  let joined = false;
  let lastPongAt = 0;
  const queue: string[] = [];

  const status = (next: ViewerRealtimeStatus) => {
    try { options.onStatus?.(next); } catch {}
  };

  const rawSend = (payload: any) => {
    const text = JSON.stringify(payload);
    if (ws && ws.readyState === WebSocket.OPEN && joined) {
      try {
        ws.send(text);
        return true;
      } catch {}
    }
    if (queue.length < 24) queue.push(text);
    else {
      queue.shift();
      queue.push(text);
    }
    return false;
  };

  const flushQueue = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !joined) return;
    while (queue.length) {
      const text = queue.shift();
      if (!text) continue;
      try { ws.send(text); } catch { break; }
    }
  };

  const scheduleReconnect = () => {
    if (closed || reconnectTimer != null) return;
    const delay = Math.min(8000, 700 * Math.pow(1.7, reconnectAttempt++));
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  };

  const startHeartbeat = () => {
    if (heartbeatTimer != null) window.clearInterval(heartbeatTimer);
    heartbeatTimer = window.setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      // A socket can remain OPEN while the TV/phone lost its network route.
      if (lastPongAt && Date.now() - lastPongAt > 50000) {
        try { ws.close(4000, "viewer_heartbeat_timeout"); } catch {}
        return;
      }
      try { ws.send(JSON.stringify({ kind: "ping", at: Date.now() })); } catch {}
    }, 18000);
  };

  const connect = () => {
    if (closed || !sessionId) return;
    status("connecting");
    try {
      ws = new WebSocket(viewerRealtimeUrl(sessionId));
    } catch {
      status("error");
      scheduleReconnect();
      return;
    }

    const currentSocket = ws;
    ws.addEventListener("open", () => {
      if (closed || ws !== currentSocket) return;
      joined = false;
      try {
        ws?.send(JSON.stringify({
          kind: "join",
          role,
          lobbyCode: sessionId,
          matchId: `viewer:${sessionId}`,
          playerId: role === "host" ? "phone" : "samsung-tv",
        }));
      } catch {}
      // Wait for the server's join acknowledgement before claiming connected.
    });

    ws.addEventListener("message", (event) => {
      if (closed || ws !== currentSocket) return;
      let message: any = null;
      try { message = JSON.parse(String(event.data || "")); } catch { return; }
      if (!message || typeof message !== "object") return;
      if (message.kind === "welcome") return;
      if (message.kind === "pong") { lastPongAt = Date.now(); return; }
      if (message.kind === "info" && !joined) {
        joined = true;
        reconnectAttempt = 0;
        lastPongAt = Date.now();
        status("connected");
        flushQueue();
        startHeartbeat();
        return;
      }
      if (message.kind === "error") {
        status("error");
        try { currentSocket?.close(4001, "viewer_server_error"); } catch {}
        return;
      }
      if (message.kind === "command") {
        try { options.onCommand?.(message.data); } catch {}
      } else if (message.kind === "snapshot") {
        try { options.onSnapshot?.(message.data as ViewerLiveSnapshot); } catch {}
      } else if (message.kind === "lifecycle") {
        try { options.onLifecycle?.(message.data); } catch {}
      }
    });

    ws.addEventListener("close", () => {
      if (ws !== currentSocket) return;
      joined = false;
      lastPongAt = 0;
      if (heartbeatTimer != null) window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
      if (closed) return;
      status("disconnected");
      scheduleReconnect();
    });

    ws.addEventListener("error", () => {
      if (!closed) status("error");
    });
  };

  connect();

  return {
    sessionId,
    role,
    sendCommand: (data) => rawSend({ kind: "command", data }),
    sendSnapshot: (snapshot) => rawSend({ kind: "snapshot", data: snapshot }),
    sendLifecycle: (data) => rawSend({ kind: "lifecycle", data }),
    isOpen: () => !!ws && ws.readyState === WebSocket.OPEN && joined,
    close: () => {
      closed = true;
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      if (heartbeatTimer != null) window.clearInterval(heartbeatTimer);
      reconnectTimer = null;
      heartbeatTimer = null;
      try { ws?.close(1000, "viewer_closed"); } catch {}
      ws = null;
      status("disconnected");
    },
  };
}

let hostConnection: ViewerRealtimeConnection | null = null;
let hostSessionId = "";
let hostOnCommand: ((data: any) => void) | undefined;
let hostOnLifecycle: ((data: any) => void) | undefined;
let hostOnStatus: ((status: ViewerRealtimeStatus) => void) | undefined;

export function configureViewerRealtimeHost(options: {
  sessionId: string;
  onCommand?: (data: any) => void;
  onLifecycle?: (data: any) => void;
  onStatus?: (status: ViewerRealtimeStatus) => void;
}) {
  const sid = normalizeViewerCode(options.sessionId);
  hostOnCommand = options.onCommand;
  hostOnLifecycle = options.onLifecycle;
  hostOnStatus = options.onStatus;

  if (!sid) {
    hostConnection?.close();
    hostConnection = null;
    hostSessionId = "";
    return null;
  }

  if (hostConnection && hostSessionId === sid) return hostConnection;
  hostConnection?.close();
  hostSessionId = sid;
  hostConnection = createViewerRealtimeConnection({
    sessionId: sid,
    role: "host",
    onCommand: (data) => hostOnCommand?.(data),
    onLifecycle: (data) => hostOnLifecycle?.(data),
    onStatus: (next) => hostOnStatus?.(next),
  });
  return hostConnection;
}

export function closeViewerRealtimeHost() {
  hostConnection?.close();
  hostConnection = null;
  hostSessionId = "";
}

export function sendViewerHostCommand(data: any) {
  return hostConnection?.sendCommand(data) ?? false;
}

export function sendViewerHostSnapshot(snapshot: ViewerLiveSnapshot) {
  return hostConnection?.sendSnapshot(snapshot) ?? false;
}

export function sendViewerHostLifecycle(data: any) {
  return hostConnection?.sendLifecycle(data) ?? false;
}
