import React, { useState } from "react";
import { classicPreset, progressifPreset } from "../../lib/batard/batardPresets";

interface Props {
  onStart: (config: any) => void;
}

export default function BatardConfig({ onStart }: Props) {
  const [preset, setPreset] = useState("classic");

  const handleStart = () => {
    if (preset === "classic") {
      onStart(classicPreset);
    } else {
      onStart(progressifPreset);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🎯 BATARD CONFIG</h2>

      <select
        value={preset}
        onChange={(e) => setPreset(e.target.value)}
      >
        <option value="classic">Classic</option>
        <option value="progressif">Progressif</option>
      </select>

      <button onClick={handleStart}>
        START
      </button>
    </div>
  );
}
