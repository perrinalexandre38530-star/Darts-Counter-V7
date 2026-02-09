// ============================================
// src/lib/sync/profileSync.ts
// Sync PROFIL utilisateur (SAFE & LIGHT)
// - PAS de stats / PAS de snapshots
// - Multi-appareils via table `profiles`
// ============================================

import { supabase } from "../supabaseClient";

export const getUserId = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
};

export const syncProfile = async (profileData: Record<string, any>) => {
  const userId = await getUserId();
  if (!userId) return;

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      ...profileData,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
};

export const fetchCloudProfile = async (): Promise<Record<string, any> | null> => {
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as any) || null;
};
