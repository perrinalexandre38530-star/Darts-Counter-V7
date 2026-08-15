import fs from "node:fs";

const config = fs.readFileSync("src/pages/X01ConfigV3.tsx", "utf8");
const play = fs.readFileSync("src/pages/X01PlayV3.tsx", "utf8");
const voice = fs.readFileSync("src/awena/AwenaVoice.ts", "utf8");

const must = (ok, msg) => { if (!ok) throw new Error(msg); };
must(config.includes('{ id: "awena", label: "Awena · voix officielle" }'), "Awena option missing in X01 voice selector");
must(config.includes('"robot", "awena"'), "normalizeVoiceId does not preserve awena");
must(play.includes('voiceId === "awena"'), "X01PlayV3 does not route Awena separately");
must(play.includes('awenaVoice.speakNarration'), "X01PlayV3 does not use Awena narration channel");
must(play.includes('void awenaVoice.stop()'), "voice arbitration stop missing");
must(voice.includes('async speakNarration'), "Awena narration API missing");
console.log("AWENA X01 VOICE BRIDGE: OK");
