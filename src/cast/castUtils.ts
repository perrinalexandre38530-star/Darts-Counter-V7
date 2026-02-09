export function makeRoomCode(len = 6) {
  // évite 0/O et 1/I pour lecture TV
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const n = Math.max(4, Math.min(10, Math.floor(len)));
  for (let i = 0; i < n; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function safeUpper(s: string) {
  return String(s || "").trim().toUpperCase();
}