import React from "react";
import { supabase } from "../lib/supabaseClient";

function getProjectRef(url: string) {
  try {
    const u = new URL(url);
    return (u.hostname || "").split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
}

export default function AuthDebugBanner() {
  const [info, setInfo] = React.useState<any>({
    projectRef: "…",
    email: "—",
    uid: "—",
    hasSession: false,
    storageKey: "—",
  });

  React.useEffect(() => {
    let alive = true;

    const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || "";
    const projectRef = getProjectRef(SUPABASE_URL);

    // Doit matcher ton supabaseClient.ts
    const storageKey = `dc-supabase-auth-v1:${projectRef}`;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      if (!alive) return;

      setInfo({
        projectRef,
        storageKey,
        hasSession: !!s,
        uid: s?.user?.id || "—",
        email: s?.user?.email || "—",
      });
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => load());

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Banner discret mais lisible
  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        bottom: 78, // au-dessus de la bottom nav
        zIndex: 999999,
        padding: "8px 10px",
        borderRadius: 12,
        background: "rgba(0,0,0,0.75)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#fff",
        fontSize: 12,
        maxWidth: 340,
        lineHeight: 1.25,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>AUTH DEBUG</div>
      <div>projectRef: {info.projectRef}</div>
      <div>storageKey: {info.storageKey}</div>
      <div>session: {info.hasSession ? "YES" : "NO"}</div>
      <div>email: {info.email}</div>
      <div>uid: {info.uid}</div>
    </div>
  );
}
