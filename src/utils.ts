export function json(status: number, data: any): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  export function randomLobbyCode(): string {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    let out = "";
    for (let i = 0; i < 4; i++) {
      out += letters[Math.floor(Math.random() * letters.length)];
    }
    return out;
  }
  
  export function broadcast(clients: WebSocket[], msg: any) {
    const payload = JSON.stringify(msg);
    for (const ws of clients) {
      try { ws.send(payload); } catch {}
    }
  }
  