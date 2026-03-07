// ============================================
// src/auth/AuthProvider.tsx
// Legacy shim
// - Ancien provider conservé pour compat d'import uniquement
// - Ne crée plus aucun état/session séparé
// ============================================

import React from "react";
import { useAuthOnline } from "../hooks/useAuthOnline";

export const AuthContext = React.createContext<any>(null);

function AuthLegacyBridge({ children }: { children: React.ReactNode }) {
  const online = useAuthOnline();
  return <AuthContext.Provider value={online}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthLegacyBridge>{children}</AuthLegacyBridge>;
}
