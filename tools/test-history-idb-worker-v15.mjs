import fs from "node:fs";
import process from "node:process";

const history = fs.readFileSync("src/lib/history.ts", "utf8");
const worker = fs.readFileSync("src/lib/historyPayloadDecode.worker.ts", "utf8");

const expectations = [
  [history.includes('readHistoryRecordOffMainThread'), "history.ts doit utiliser la lecture Worker"],
  [history.includes('action: "read-decode"'), "history.ts doit envoyer l'action read-decode"],
  [history.includes('history.get.workerRead'), "history.ts doit instrumenter workerRead"],
  [worker.includes('action: "read-decode"'), "worker doit accepter read-decode"],
  [worker.includes('indexedDB.open'), "worker doit lire IndexedDB lui-même"],
  [worker.includes('readAndDecodeHistory'), "worker doit décoder le record hors UI"],
];

let failed = false;
for (const [ok, label] of expectations) {
  if (!ok) {
    console.error(`❌ ${label}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("✅ V15: IndexedDB History.get + decode déplacés hors thread UI sur Android.");
