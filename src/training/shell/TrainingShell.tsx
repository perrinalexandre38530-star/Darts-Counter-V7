// ============================================
// src/training/shell/TrainingShell.tsx
// Layout commun (fidèle pages Play existantes: header sticky + body + footer)
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

export default function TrainingShell({
  header,
  body,
  footer,
}: {
  header: React.ReactNode;
  body: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <div
      className="container"
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        paddingBottom: 96,
      }}
    >
      {header}
      <div style={{ padding: 14 }}>{body}</div>
      {footer}
    </div>
  );
}
