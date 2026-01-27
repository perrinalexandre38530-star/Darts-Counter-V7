import React from "react";

export default function TrainingMiniGraph({ values }: { values: number[] }) {
  if (!values?.length) return null;
  const max = Math.max(...values);
  const points = values
    .map((v, i) => `${i * 10},${30 - (v / max) * 30}`)
    .join(" ");
  return (
    <svg width="120" height="30">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
}
