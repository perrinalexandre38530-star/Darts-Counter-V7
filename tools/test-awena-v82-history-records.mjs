import fs from "node:fs";

function must(condition, message) {
  if (!condition) throw new Error(message);
}

const records = fs.readFileSync(new URL("../src/awena/AwenaRecords.ts", import.meta.url), "utf8");
const advanced = fs.readFileSync(new URL("../src/awena/AwenaAdvancedEncyclopedia.ts", import.meta.url), "utf8");
const core = fs.readFileSync(new URL("../src/awena/AwenaCore.ts", import.meta.url), "utf8");
const overlay = fs.readFileSync(new URL("../src/awena/components/AwenaOverlay.tsx", import.meta.url), "utf8");

must(records.includes("await History.list()"), "Awena Records must use History.list() as authoritative source");
must(records.includes("SOURCE DE VÉRITÉ AWENA RECORDS"), "missing source-of-truth guard");
must(!records.includes("const snapshot = fastHistory()"), "legacy lightweight cache still drives Records");
must(records.includes("detailedModeHistory"), "missing full payload fallback by mode");
must(records.includes("X01_METRICS"), "missing dedicated X01 metrics catalog");
must(records.includes("h180") && records.includes("h80") && records.includes("h120") && records.includes("checkoutRate") && records.includes("hitRate") && records.includes("best9") && records.includes("bestVisit"), "X01 metrics coverage incomplete");
must(records.includes("sampleFromRec as x01SampleFromRec"), "X01 compatibility must reuse the app History stats parser");
must(records.includes("rateNumerator") && records.includes("legWinRate") && records.includes("missRate"), "X01 derived rates coverage incomplete");
must(records.includes("historySourceLine"), "record replies should expose History provenance");
must(records.includes("training x01|trainingx01"), "classic X01 records must exclude Training X01 sessions");
must(advanced.match(/id: "/g)?.length >= 95, "advanced encyclopedia should contain at least 95 topics");
must(advanced.includes("0 ≠ DONNÉE ABSENTE") && advanced.includes("MOYENNE PONDÉRÉE") && advanced.includes("HITS TOTAUX"), "advanced stats precision topics missing");
must(core.includes("answerAwenaAdvancedEncyclopedia"), "advanced encyclopedia not wired into AwenaCore");
must(/LOCAL V8\.[2-9]/.test(overlay), "Awena overlay version is V8.2.1 or newer");

must(!/text:\s*"/.test(advanced), "advanced encyclopedia must use md(...) blocks, not fragile multiline quoted strings");
console.log("✅ AWENA V8.2.1 History-first Records + clean Advanced Encyclopedia: OK");
