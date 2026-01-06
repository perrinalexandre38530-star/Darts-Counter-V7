import { supabase } from "./supabaseClient";

export type PresenceState = "online" | "away" | "offline";

export type PresencePayload = {
  userId: string;
  name?: string;
  state: PresenceState;
  ts: number;
};

export function makePresenceChannel() {
  return supabase.channel("online:presence", {
    config: { presence: { key: "anon" } }, // overridden after auth
  });
}

export async function joinPresence(opts: {
  userId: string;
  name?: string;
  state: PresenceState;
  onChange: (map: Record<string, PresencePayload>) => void;
}) {
  const { userId, name, state, onChange } = opts;

  const chan = supabase.channel("online:presence", {
    config: { presence: { key: userId } },
  });

  const read = () => {
    const st = chan.presenceState() as any;
    const flat: Record<string, PresencePayload> = {};
    Object.keys(st).forEach((k) => {
      const arr = st[k] as any[];
      const last = arr?.[arr.length - 1];
      if (last?.userId) flat[last.userId] = last as PresencePayload;
    });
    onChange(flat);
  };

  chan
    .on("presence", { event: "sync" }, read)
    .on("presence", { event: "join" }, read)
    .on("presence", { event: "leave" }, read);

  await chan.subscribe(async (status) => {
    if (status !== "SUBSCRIBED") return;
    await chan.track({
      userId,
      name,
      state,
      ts: Date.now(),
    } satisfies PresencePayload);
  });

  return {
    channel: chan,
    setState: async (next: PresenceState) => {
      await chan.track({ userId, name, state: next, ts: Date.now() } as PresencePayload);
    },
    leave: async () => {
      try {
        await chan.untrack();
      } catch {}
      await supabase.removeChannel(chan);
    },
  };
}
