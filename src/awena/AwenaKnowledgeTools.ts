import type { AwenaReply, AwenaRuntimeContext } from "./awena.types";

type DartParsed = { label: string; value: number };

function norm(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[,]/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function round(value: number, digits = 2) {
  const p = 10 ** digits;
  return Math.round((value + Number.EPSILON) * p) / p;
}

function percent(num: number, den: number) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return round((num / den) * 100, 2);
}

function dartValue(raw: string): DartParsed | null {
  const token = raw.toUpperCase();
  if (token === "MISS" || token === "M") return { label: "MISS", value: 0 };
  if (token === "DBULL" || token === "BULLSEYE") return { label: "DBULL", value: 50 };
  if (token === "BULL") return { label: "BULL", value: 25 };
  const match = token.match(/^([SDT])(20|1[0-9]|[1-9])$/);
  if (!match) return null;
  const n = Number(match[2]);
  const factor = match[1] === "T" ? 3 : match[1] === "D" ? 2 : 1;
  return { label: `${match[1]}${n}`, value: n * factor };
}

function parsedDarts(question: string) {
  const matches = question.toUpperCase().match(/\b(?:DBULL|BULLSEYE|BULL|MISS|[SDT](?:20|1[0-9]|[1-9]))\b/g) || [];
  return matches.map(dartValue).filter((item): item is DartParsed => !!item);
}

function answerDartArithmetic(question: string, context: AwenaRuntimeContext): AwenaReply | null {
  const q = norm(question);
  const darts = parsedDarts(question);
  if (!darts.length) return null;
  // Une notation comme T20 peut apparaître dans une question de distance/hauteur :
  // ne pas transformer ce type de question en calcul de score.
  if (darts.length === 1 && /distance|hauteur|metres?|m du sol|oche|installer cible/.test(q)) return null;
  const calculationIntent = /combien|total|somme|score|vaut|valeur|addition|reste|restant|soustra|moins|enleve|vol[ée]e|visit/.test(q) || darts.length >= 2;
  if (!calculationIntent) return null;

  const total = darts.reduce((sum, dart) => sum + dart.value, 0);
  const detail = darts.map((dart) => `${dart.label} = ${dart.value}`).join(" · ");

  const explicitStart = q.match(/(?:depart|d[ée]part|partir de|sur un score de|score de|a partir de|reste avant|avant la vol[ée]e)\s*(\d{2,4})/);
  const subtractionIntent = /reste|restant|soustra|moins|enleve|retire|apres la vol[ée]e|apr[eè]s la vol[ée]e/.test(q);
  const contextStart = Number(context.remaining);
  const start = explicitStart ? Number(explicitStart[1]) : subtractionIntent && Number.isFinite(contextStart) && contextStart > 0 ? contextStart : null;

  if (start != null) {
    const remaining = start - total;
    return {
      text: `## CALCUL DE VOLÉE\n${detail}\n\n**Total de la volée : ${total} points.**\nÀ partir de **${start}**, il reste **${remaining}** après soustraction de la volée.${remaining < 0 ? " Le score passe sous zéro : dans un mode X01, il faut alors vérifier la règle de bust active." : ""}`,
      modeId: context.mode || null,
      knowledgeTopic: "tool:darts-arithmetic",
    };
  }

  return {
    text: `## CALCUL DE VOLÉE\n${detail}\n\n**Total : ${total} points.**`,
    modeId: context.mode || null,
    knowledgeTopic: "tool:darts-arithmetic",
  };
}

function answerDartsAverage(question: string, context: AwenaRuntimeContext): AwenaReply | null {
  const q = norm(question);
  if (!/moyenne|avg|average/.test(q) || !/flechette|dart/.test(q)) return null;
  const m = q.match(/(\d+(?:\.\d+)?)\s*points?\s*(?:en|sur|pour)\s*(\d+)\s*(?:flechettes?|darts?)/);
  if (!m) return null;
  const points = Number(m[1]);
  const darts = Number(m[2]);
  if (!(points >= 0) || !(darts > 0)) return null;
  const avg1 = round(points / darts, 2);
  const avg3 = round((points / darts) * 3, 2);
  return {
    text: `## MOYENNE FLÉCHETTES\n${points} points en ${darts} fléchettes donnent :\n\n- **AVG1 : ${avg1} point${avg1 === 1 ? "" : "s"} / fléchette** ;\n- **AVG3D : ${avg3} points / 3 fléchettes**.\n\nFormule : points ÷ fléchettes × 3 pour l’AVG3D.`,
    modeId: context.mode || null,
    knowledgeTopic: "tool:darts-average",
  };
}

function answerWinRate(question: string, context: AwenaRuntimeContext): AwenaReply | null {
  const q = norm(question);
  const m = q.match(/(\d+)\s*(?:victoires?|gagnes?|gagn[ée]s?|wins?)\s*(?:sur|\/|pour)\s*(\d+)/);
  if (!m) return null;
  const wins = Number(m[1]);
  const total = Number(m[2]);
  if (total <= 0 || wins < 0 || wins > total) return null;
  const rate = percent(wins, total);
  return {
    text: `## WIN RATE\n${wins} victoire${wins > 1 ? "s" : ""} sur ${total} match${total > 1 ? "s" : ""} = **${rate} % de victoires**.\n\nDéfaites / non-victoires : ${total - wins}.`,
    modeId: context.mode || null,
    knowledgeTopic: "tool:win-rate",
  };
}

function answerRatio(question: string, context: AwenaRuntimeContext): AwenaReply | null {
  const q = norm(question);
  if (!/pourcentage|taux|ratio|reussite|r[ée]ussite/.test(q)) return null;
  const m = q.match(/(\d+(?:\.\d+)?)\s*(?:sur|\/)\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!(b > 0) || a < 0) return null;
  const p = percent(a, b);
  return {
    text: `## TAUX\n${a} sur ${b} = **${p} %**.\n\nFormule : ${a} ÷ ${b} × 100.`,
    modeId: context.mode || null,
    knowledgeTopic: "tool:ratio",
  };
}

function answerBestOf(question: string, context: AwenaRuntimeContext): AwenaReply | null {
  const q = norm(question);
  const m = q.match(/(?:\bbo\s*|best\s+of\s+)(\d{1,2})\b/);
  if (!m) return null;
  const maxGames = Number(m[1]);
  if (!(maxGames > 0)) return null;
  const wins = Math.floor(maxGames / 2) + 1;
  return {
    text: `## BEST OF ${maxGames}\nIl faut **${wins} victoire${wins > 1 ? "s" : ""} de manche** pour gagner.\n\nLe match peut durer au maximum ${maxGames} manche${maxGames > 1 ? "s" : ""}.${maxGames % 2 === 0 ? " Un Best Of est généralement choisi avec un nombre impair afin qu’une majorité nette soit possible avant la limite." : ""}`,
    modeId: context.mode || null,
    knowledgeTopic: "tool:best-of",
  };
}

function twoD6Ways(sum: number) {
  if (sum < 2 || sum > 12) return 0;
  return sum <= 7 ? sum - 1 : 13 - sum;
}

function answerDiceProbability(question: string, context: AwenaRuntimeContext): AwenaReply | null {
  const q = norm(question);
  if (!/probabilite|chance|odds/.test(q) || !/d[ée]s?|d6|dice/.test(q)) return null;

  if (/double/.test(q) && /2\s*d[ée]s|deux\s+d[ée]s|2d6/.test(q)) {
    const specific = q.match(/double\s*([1-6])/);
    if (specific) {
      return { text: `## PROBABILITÉ 2D6\nFaire **double ${specific[1]}** : 1 combinaison sur 36, soit **2,78 %**.`, modeId: context.mode || null, knowledgeTopic: "tool:dice-probability" };
    }
    return { text: "## PROBABILITÉ 2D6\nFaire **n’importe quel double** : 6 combinaisons sur 36, soit **1/6 ≈ 16,67 %**.", modeId: context.mode || null, knowledgeTopic: "tool:dice-probability" };
  }

  const sumMatch = q.match(/(?:somme|faire|obtenir|sortir|total)\s*(?:de\s*)?(\d{1,2}).*(?:2\s*d[ée]s|deux\s+d[ée]s|2d6)|(?:2\s*d[ée]s|deux\s+d[ée]s|2d6).*(?:somme|faire|obtenir|sortir|total)\s*(?:de\s*)?(\d{1,2})/);
  const target = sumMatch ? Number(sumMatch[1] || sumMatch[2]) : NaN;
  if (Number.isFinite(target)) {
    const ways = twoD6Ways(target);
    if (!ways) return { text: `Avec 2D6, une somme de ${target} est impossible : la plage va de 2 à 12.`, modeId: context.mode || null, knowledgeTopic: "tool:dice-probability" };
    const p = round((ways / 36) * 100, 2);
    return { text: `## PROBABILITÉ 2D6\nFaire **${target}** : ${ways} combinaison${ways > 1 ? "s" : ""} sur 36, soit **${p} %**.`, modeId: context.mode || null, knowledgeTopic: "tool:dice-probability" };
  }

  const face = q.match(/(?:faire|obtenir|sortir)\s*(?:un\s*)?([1-6])\b.*(?:un\s*d[ée]|1d6|d6)/);
  if (face) return { text: `## PROBABILITÉ D6\nObtenir ${face[1]} sur un D6 équilibré : **1/6 ≈ 16,67 %**.`, modeId: context.mode || null, knowledgeTopic: "tool:dice-probability" };
  return null;
}

export function answerAwenaKnowledgeTool(question: string, context: AwenaRuntimeContext): AwenaReply | null {
  return answerDartArithmetic(question, context)
    || answerDartsAverage(question, context)
    || answerWinRate(question, context)
    || answerRatio(question, context)
    || answerBestOf(question, context)
    || answerDiceProbability(question, context);
}

export const AWENA_KNOWLEDGE_TOOL_COUNT = 6;
