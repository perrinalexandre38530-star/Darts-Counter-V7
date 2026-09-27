import React from "react";
import { DARTS_WAVE_61 } from "../games/dartsWave61";

const CONFIG_LOADERS = import.meta.glob("./wave61/modes/*Config.tsx");

function canonicalModeId(raw: any) {
  const id = String(raw || "");
  return id === "galaxyes" ? "galaxies" : id;
}

const CONFIG_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {};
for (const [path, loader] of Object.entries(CONFIG_LOADERS)) {
  const match = path.match(/\/([^/]+)Config\.tsx$/);
  if (!match) continue;
  CONFIG_COMPONENTS[match[1]] = React.lazy(loader as () => Promise<{ default: React.ComponentType<any> }>);
}

export default function Wave61Config(props: any) {
  const modeId = canonicalModeId(props?.params?.gameId || props?.gameId) || DARTS_WAVE_61[0].id;
  const ModeConfig = CONFIG_COMPONENTS[modeId] || CONFIG_COMPONENTS[DARTS_WAVE_61[0].id];

  return (
    <React.Suspense fallback={<div className="page" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "#cfd7e8" }}>Chargement du mode…</div>}>
      <ModeConfig {...props} gameId={modeId} />
    </React.Suspense>
  );
}
