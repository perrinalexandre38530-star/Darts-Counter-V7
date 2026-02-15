import React, { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabaseSingleton";

export const AuthContext = React.createContext<Session | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={session}>
      {children}
    </AuthContext.Provider>
  );
}
