import fs from "node:fs";
import path from "node:path";
import ts from "/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js";

const root = process.cwd();
const targets = [
  "src/pages/StatsHub.tsx",
  "src/components/GoldPill.tsx",
  "src/components/StatsPlayerDashboard.tsx",
  "src/components/StatsDartSetsSection.tsx",
  "src/stats/X01MultiStatsTabFull.tsx",
  "src/components/stats/X01MultiStatsTabFull.tsx",
];

const hookNames = new Set([
  "useState", "useEffect", "useMemo", "useCallback", "useRef", "useReducer",
  "useLayoutEffect", "useContext", "useSyncExternalStore", "useTheme",
  "useContainerWidth", "useInjectStatsNameCss",
]);

function lineOf(sf, node) {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

function functionName(node) {
  if (node.name && ts.isIdentifier(node.name)) return node.name.text;
  if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
    return node.parent.name.text;
  }
  return "<anonymous>";
}

function isHookCall(sf, node) {
  if (!ts.isCallExpression(node)) return false;
  const text = node.expression.getText(sf);
  const name = text.split(".").at(-1);
  return hookNames.has(name);
}

const violations = [];
for (const relative of targets) {
  const absolute = path.join(root, relative);
  const source = fs.readFileSync(absolute, "utf8");
  const sf = ts.createSourceFile(absolute, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function inspect(node) {
    if (ts.isFunctionLike(node)) {
      const hooks = [];
      const returns = [];
      function walk(child) {
        if (child !== node && ts.isFunctionLike(child)) return;
        if (isHookCall(sf, child)) hooks.push(lineOf(sf, child));
        if (ts.isReturnStatement(child)) returns.push(lineOf(sf, child));
        ts.forEachChild(child, walk);
      }
      walk(node);
      if (hooks.length) {
        const lastHook = Math.max(...hooks);
        const early = returns.filter((line) => line < lastHook);
        if (early.length) {
          violations.push(`${relative}:${lineOf(sf, node)} ${functionName(node)} return avant dernier hook: ${early.join(", ")}`);
        }
      }
    }
    ts.forEachChild(node, inspect);
  }
  inspect(sf);

  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: absolute,
    reportDiagnostics: true,
  });
  const syntaxErrors = (output.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  for (const diagnostic of syntaxErrors) {
    violations.push(`${relative}: erreur syntaxique TypeScript ${diagnostic.code}`);
  }
}


const statsHub = fs.readFileSync(path.join(root, "src/pages/StatsHub.tsx"), "utf8");
const safePercentBlock = statsHub.slice(
  statsHub.indexOf("function safePercent"),
  statsHub.indexOf("/* ---------- Hooks Historique ---------- */")
);
if (/React\.(useMemo|useState|useEffect|useCallback|useRef)\s*\(/.test(safePercentBlock)) {
  violations.push("StatsHub.safePercent: hook React encore présent dans la fonction mathématique");
}
if (!safePercentBlock.includes("return (num / den) * 100")) {
  violations.push("StatsHub.safePercent: calcul canonique absent");
}

const dashboard = fs.readFileSync(path.join(root, "src/components/StatsPlayerDashboard.tsx"), "utf8");
if (!dashboard.includes("data ? getModeStats(data, x01MultiLegsSets, sport) : []")) {
  violations.push("StatsPlayerDashboard: garde hook-safe absente");
}

const dartSets = fs.readFileSync(path.join(root, "src/components/StatsDartSetsSection.tsx"), "utf8");
const dartCardStart = dartSets.indexOf("function DartSetCard");
const dartCardHook = dartSets.indexOf("React.useEffect", dartCardStart);
const dartCardReturn = dartSets.indexOf("if (!r) return null", dartCardStart);
if (!(dartCardStart >= 0 && dartCardHook >= 0 && dartCardReturn > dartCardHook)) {
  violations.push("DartSetCard: sortie anticipée encore placée avant les hooks");
}

const x01 = fs.readFileSync(path.join(root, "src/stats/X01MultiStatsTabFull.tsx"), "utf8");
if (x01.includes('from "../components/StatsPlayerDashboard"')) {
  violations.push("X01 Multi importe encore le Dashboard complet au lieu du GoldPill autonome");
}

if (violations.length) {
  console.error("❌ Audit hooks Stats V20 échoué\n" + violations.map((v) => `- ${v}`).join("\n"));
  process.exit(1);
}

console.log("✅ Audit hooks Stats V20 OK");
console.log("- StatsHub.safePercent: fonction pure, aucun hook conditionnel");
console.log("- Dashboard: aucun return avant useMemo/useContainerWidth");
console.log("- Mes fléchettes: aucun return avant useState/useEffect");
console.log("- X01 Multi: hook order stable et GoldPill découplé du Dashboard");
