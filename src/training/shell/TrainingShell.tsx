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
  fullWidth = false,
  bodyPadding = 14,
}: {
  header: React.ReactNode;
  body: React.ReactNode;
  footer?: React.ReactNode;
  fullWidth?: boolean;
  bodyPadding?: number | string;
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
        ...(fullWidth ? { maxWidth: "none", width: "100%", margin: 0 } : {}),
      }}
    >
      {header}
      <div style={{ padding: bodyPadding }}>{body}</div>
      {footer}
    </div>
  );
}
