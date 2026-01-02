import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return new Response("Missing auth", { status: 401 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Identify caller (user)
  const sbUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: userData, error: userErr } = await sbUser.auth.getUser();
  if (userErr || !userData?.user) return new Response("Unauthorized", { status: 401 });

  const userId = userData.user.id;

  // Admin client
  const sbAdmin = createClient(supabaseUrl, serviceKey);

  // Delete app data (optionnel mais conseillé)
  await sbAdmin.from("matches_online").delete().eq("user_id", userId);
  await sbAdmin.from("profiles_online").delete().eq("id", userId);

  // Revoke sessions on ALL devices
  await sbAdmin.auth.admin.signOut(userId);

  // Delete Auth user
  const { error: delErr } = await sbAdmin.auth.admin.deleteUser(userId);
  if (delErr) return new Response(delErr.message, { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
