import React from "react";
import { DARTS_WAVE_61 } from "../games/dartsWave61";

const PLAY_LOADERS = import.meta.glob("./wave61/modes/*Play.tsx");

function canonicalModeId(raw: any) {
  const id = String(raw || "");
  return id === "galaxyes" ? "galaxies" : id;
}

const PLAY_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {};
for (const [path, loader] of Object.entries(PLAY_LOADERS)) {
  const match = path.match(/\/([^/]+)Play\.tsx$/);
  if (!match) continue;
  PLAY_COMPONENTS[match[1]] = React.lazy(loader as () => Promise<{ default: React.ComponentType<any> }>);
}

export default function Wave61Play(props: any) {
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const modeId = canonicalModeId(props?.params?.gameId || props?.gameId || resumeRecord?.modeId || resumeRecord?.game?.modeId) || DARTS_WAVE_61[0].id;
  const ModePlay = PLAY_COMPONENTS[modeId] || PLAY_COMPONENTS[DARTS_WAVE_61[0].id];

  return (
    <React.Suspense fallback={<div className="page" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "#cfd7e8" }}>Chargement de la partie…</div>}>
      <ModePlay {...props} gameId={modeId} />
    </React.Suspense>
  );
}
