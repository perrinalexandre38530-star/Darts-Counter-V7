import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(message);
};

const core = read("src/awena/AwenaCore.ts");
const encyclopedia = read("src/awena/AwenaEncyclopedia.ts");
const screens = read("src/awena/AwenaScreenKnowledge.ts");
const provider = read("src/awena/AwenaProvider.tsx");
const overlay = read("src/awena/components/AwenaOverlay.tsx");

must(core.includes('answerAwenaEncyclopedia'), "Encyclopédie Awena non branchée dans AwenaCore.");
must(core.includes('answerAwenaScreenQuestion'), "Connaissance écran non branchée dans AwenaCore.");
must(encyclopedia.includes('id: "bot"'), "Entrée BOT absente.");
must(encyclopedia.includes('id: "checkout"'), "Entrée checkout absente.");
must(encyclopedia.includes('id: "backup-vs-sync"'), "Comparaison sauvegarde/sync absente.");
must(encyclopedia.includes('id: "best-of-vs-first-to"'), "Comparaison Best Of/First To absente.");
must(screens.includes('CONFIGURATION —'), "Aide écran configuration absente.");
must(provider.includes('awenaRememberedMode'), "Mémoire conversationnelle de mode absente.");
must(!provider.includes('mode: reply.modeId || prev.mode'), "Le mode conversationnel pollue encore le mode actif.");
must(overlay.includes('LOCAL V7.7'), "Version visuelle V7.7 absente.");
must(overlay.includes('Que puis-je faire sur cet écran ?'), "Raccourci aide écran absent.");

console.log("✅ AWENA V7.7 knowledge architecture: OK");
