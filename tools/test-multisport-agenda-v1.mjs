import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const checks = [];
const check = (name, condition) => { checks.push([name, !!condition]); if (!condition) process.exitCode = 1; };

const app = read("src/App.tsx");
const nav = read("src/components/BottomNav.tsx");
const agenda = read("src/planning/multisportAgenda.ts");
const agendaPage = read("src/pages/agenda/MultisportAgendaPage.tsx");
const programs = read("src/fit/fitProgramCatalog.ts");
const fitPlan = read("src/pages/fit/FitPerfPlan.tsx");
const fitHome = read("src/pages/fit/FitPerfHome.tsx");

check("global agenda route", app.includes('case "agenda"') && app.includes("MultisportAgendaPage"));
check("agenda in bottom nav", nav.includes('{ k: "agenda"'));
check("manual agenda persistence", agenda.includes("mss-multisport-agenda-v1") && agenda.includes("createMultisportEvent"));
check("running plan bridge", agenda.includes("buildRunningPlanWeeks") && agenda.includes('source: "running_program"'));
check("running race bridge", agenda.includes("loadRunningRaces") && agenda.includes('source: "running_race"'));
check("fit program bridge", agenda.includes("getActiveFitProgramDefinition") && agenda.includes('source: "fit_program"'));
check("invitation response", agenda.includes("respondToAgendaInvitation") && agendaPage.includes("ACCEPTER"));
check("calendar views", agendaPage.includes('"today" | "week" | "month" | "invitations"'));
check("all major sports", ["darts","foot","babyfoot","pingpong","petanque","molkky","running","fit"].every((sport) => agenda.includes(`${sport}:`)));
check("fit practices", ["calisthenics","hiit","military","yoga","mobility","stretching","functional","powerlifting"].every((id) => programs.includes(`\"${id}\"`)));
check("fit program discovery", fitPlan.includes("Que veux-tu pratiquer ?") && fitPlan.includes("FIT_PROGRAMS"));
check("fit home global next activity", fitHome.includes("nextSportEvent") && fitHome.includes("openSportEvent"));

for (const [name, ok] of checks) console.log(`${ok ? "✓" : "✗"} ${name}`);
console.log(`\nMULTISPORT AGENDA V1: ${checks.filter(([,ok]) => ok).length}/${checks.length} checks passed`);
if (process.exitCode) process.exit(process.exitCode);
