import { supabase } from "./supabaseClient";

export async function sendFriendRequest(toUserId: string) {
  const { data, error } = await supabase
    .from("friend_requests")
    .insert({ to_user: toUserId, from_user: (await supabase.auth.getUser()).data.user?.id })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listFriendRequests() {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function respondFriendRequest(requestId: string, status: "accepted" | "rejected") {
  // update request
  const { data: req, error: e1 } = await supabase
    .from("friend_requests")
    .update({ status })
    .eq("id", requestId)
    .select("*")
    .single();
  if (e1) throw e1;

  // if accepted -> upsert friends pair (normalize order)
  if (status === "accepted") {
    const a = req.from_user as string;
    const b = req.to_user as string;
    const [user_a, user_b] = a < b ? [a, b] : [b, a];

    const { error: e2 } = await supabase
      .from("friends")
      .insert({ user_a, user_b });
    // ignore unique error
    if (e2 && !String(e2.message).toLowerCase().includes("duplicate")) throw e2;
  }

  return req;
}

export async function listFriends() {
  const me = (await supabase.auth.getUser()).data.user?.id;
  if (!me) return [];
  const { data, error } = await supabase
    .from("friends")
    .select("*")
    .or(`user_a.eq.${me},user_b.eq.${me}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
