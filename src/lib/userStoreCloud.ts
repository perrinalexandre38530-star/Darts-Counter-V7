import { supabase } from "./supabaseClient";

function looksMissingColumn(err: any, col: string): boolean {
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    msg.includes(`could not find the '${col}' column`) ||
    (msg.includes("column") && msg.includes(col.toLowerCase()) && msg.includes("does not exist")) ||
    String((err as any)?.code || "") === "PGRST204"
  );
}

export async function loadUserStoreCloud(userId: string) {
  // ✅ Compat schémas: payload/data/store
  // ✅ Compat clé: user_id OU owner_user_id
  const selectCols = "payload,data,store,updated_at,version";

  // A) user_id
  {
    const { data, error } = await supabase.from("user_store").select(selectCols).eq("user_id", userId).maybeSingle();
    if (!error) {
      if (!data) return null;
      const row: any = data as any;
      const payload = row.payload ?? row.data ?? row.store ?? null;
      return { payload, updated_at: row.updated_at ?? null, version: row.version ?? null };
    }

    // B) fallback owner_user_id
    if (!looksMissingColumn(error, "user_id")) throw error;
  }

  // B) owner_user_id
  {
    const { data, error } = await supabase
      .from("user_store")
      .select(selectCols)
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const row: any = data as any;
    const payload = row.payload ?? row.data ?? row.store ?? null;

    return {
      payload,
      updated_at: row.updated_at ?? null,
      version: row.version ?? null,
    };
  }
}

export async function saveUserStoreCloud(userId: string, payload: any, version = 8) {
  const baseRow: any = {
    user_id: userId,
    owner_user_id: userId,
    updated_at: new Date().toISOString(),
    version,
  };

  // Helper upsert with flexible conflict key
  const upsertWith = async (row: any, onConflict: "user_id" | "owner_user_id") => {
    const { error } = await supabase.from("user_store").upsert(row as any, { onConflict } as any);
    return error;
  };

  // 1) Essai schéma A: payload (user_id conflict)
  {
    const err = await upsertWith({ ...baseRow, payload }, "user_id");
    if (!err) return;

    const msg = String((err as any)?.message || err);
    const lower = msg.toLowerCase();

    // si user_id n'existe pas -> retry owner_user_id
    if (looksMissingColumn(err, "user_id")) {
      const err2 = await upsertWith({ ...baseRow, payload }, "owner_user_id");
      if (!err2) return;

      // si payload n'existe pas -> on tente data/store
      if (!looksMissingColumn(err2, "payload")) throw new Error(String((err2 as any)?.message || err2));
    } else {
      // si payload n'existe pas -> on tentera data/store ; sinon on throw
      if (!looksMissingColumn(err, "payload")) throw new Error(String((err as any)?.message || err));
    }
  }

  // 2) Schéma B: data/store (avec conflict key auto)
  {
    // try user_id then owner_user_id fallback
    const err = await upsertWith({ ...baseRow, data: payload, store: payload }, "user_id");
    if (!err) return;

    if (looksMissingColumn(err, "user_id")) {
      const err2 = await upsertWith({ ...baseRow, data: payload, store: payload }, "owner_user_id");
      if (err2) throw err2;
      return;
    }

    throw err;
  }
}
