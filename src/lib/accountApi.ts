import { supabase } from "./supabaseClient";

export async function deleteAccount() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const token = data?.session?.access_token;
  if (!token) throw new Error("No access_token in session");

  return supabase.functions.invoke("delete-account", {
    headers: { Authorization: `Bearer ${token}` },
  });
}
