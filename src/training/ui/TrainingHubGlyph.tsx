import React from "react";

export default function HubGlyph({ name, size = 17 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "today") return <svg {...common}><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4"/></svg>;
  if (name === "week") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2"/></svg>;
  if (name === "cycle") return <svg {...common}><path d="M20 7h-5V2"/><path d="M20 7a8 8 0 1 0 1 7"/><path d="M4 17h5v5"/></svg>;
  if (name === "library") return <svg {...common}><path d="M4 4h6v16H4zM14 4h6v16h-6z"/><path d="M7 8h0M17 8h0"/></svg>;
  if (name === "skills") return <svg {...common}><path d="M4 19V9M10 19V5M16 19v-8M22 19V3"/></svg>;
  if (name === "coach") return <svg {...common}><path d="M12 3a6 6 0 0 0-6 6c0 4 3 5 3 8h6c0-3 3-4 3-8a6 6 0 0 0-6-6Z"/><path d="M9 21h6M9 17h6"/></svg>;
  if (name === "history") return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5M12 7v5l3 2"/></svg>;
  if (name === "progress") return <svg {...common}><path d="M4 18l5-5 4 3 7-9"/><path d="M15 7h5v5"/></svg>;
  if (name === "diagnosis") return <svg {...common}><circle cx="11" cy="11" r="6"/><path d="m16 16 5 5M8 11h6M11 8v6"/></svg>;
  if (name === "exercises") return <svg {...common}><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  if (name === "scoring") return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3M20 12h-3"/></svg>;
  if (name === "doubles") return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5"/><path d="M6.4 6.4l2.1 2.1M17.6 17.6l-2.1-2.1"/></svg>;
  if (name === "checkout") return <svg {...common}><path d="M5 21V4"/><path d="M5 5h11l-2 4 2 4H5"/></svg>;
  if (name === "precision") return <svg {...common}><circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.5"/></svg>;
  if (name === "bull") return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg>;
  if (name === "regularity") return <svg {...common}><path d="M3 12c2.2-5 4.4 5 6.6 0s4.4-5 6.6 0 4.4 5 4.8 0"/></svg>;
  if (name === "mastery") return <svg {...common}><path d="M12 3 5 6v5c0 4.8 3 8 7 10 4-2 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
  if (name === "badges") return <svg {...common}><circle cx="12" cy="9" r="5"/><path d="m9 14-2 7 5-3 5 3-2-7"/></svg>;
  if (name === "records") return <svg {...common}><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M6 6H4v2a4 4 0 0 0 4 4M18 6h2v2a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6"/></svg>;
  if (name === "live") return <svg {...common}><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>;
  if (name === "effectiveness") return <svg {...common}><path d="m4 17 5-5 4 3 7-8"/><path d="M16 7h4v4"/></svg>;
  if (name === "plans") return <svg {...common}><rect x="4" y="4" width="12" height="14" rx="2"/><path d="M8 8h5M8 12h5M8 16h3M16 7h4v13H8"/></svg>;
  return <svg {...common}><path d="M4 12h16M12 4v16"/></svg>;
}

