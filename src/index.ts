import { LobbyRoom } from "./lobby";
import { json, randomLobbyCode } from "./utils";

export default {
  async fetch(req: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.split("/").filter(Boolean);

    // create lobby — global API
    if (req.method === "POST" && path[0] === "lobby" && path[1] === "create") {
      const code = randomLobbyCode();
      const id = env.LOBBY.idFromName(code);
      const stub = env.LOBBY.get(id);
      await stub.fetch(new Request(`https://dummy/init`)); // ensure exists
      return json(200, { code });
    }

    // join / commands / ws routed into DO
    if (path[0] === "lobby" && path[1]) {
      const code = path[1];
      const id = env.LOBBY.idFromName(code);
      const stub = env.LOBBY.get(id);
      const forward = new URL(req.url);
      forward.pathname = path.slice(2).join("/");

      return stub.fetch(new Request(forward, req));
    }

    return json(404, { error: "invalid_route" });
  },
};
