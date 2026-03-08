
// src/components/RenderGuard.tsx
import React from "react"

export function RenderGuard({ children }: { children: any }) {
  try {
    return children
  } catch (e) {
    console.error("RenderGuard caught:", e)
    return (
      <div style={{padding:20,fontFamily:"monospace"}}>
        <h2>⚠️ Render error</h2>
        <pre>{String(e)}</pre>
      </div>
    )
  }
}
