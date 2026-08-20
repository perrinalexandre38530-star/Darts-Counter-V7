import eliazAvatar from "../assets/avatars/attrape-moi/eliaz.png";
import bleizAvatar from "../assets/avatars/attrape-moi/bleiz.png";
import novaAvatar from "../assets/avatars/attrape-moi/nova.png";
import slykAvatar from "../assets/avatars/attrape-moi/slyk.png";
import ravenAvatar from "../assets/avatars/attrape-moi/raven.png";
import kronAvatar from "../assets/avatars/attrape-moi/kron.png";
import esquiveTeamLogo from "../assets/avatars/attrape-moi/team_esquive.webp";
import sniperTeamLogo from "../assets/avatars/attrape-moi/team_sniper.webp";

export type CatchMeBotRole = "runner" | "chaser";

export type CatchMeBotSkill = {
  rating: number;
  levelLabel: string;
  speciality: string;
  preferredNumbers: number[];
  capacities: {
    precision: number;
    power: number;
    regularity: number;
    aggression: number;
  };
  bullAffinity: number;
  dbullAffinity: number;
  missFactor: number;
};

type AttrapeMoiBotDef = {
  id: string;
  name: string;
  avatar: string;
  level: number;
  botLevel: string;
  groupLabel?: string;
  catchMeRoleSkills: {
    runner: CatchMeBotSkill;
    chaser: CatchMeBotSkill;
  };
};

function makeSkill({
  rating,
  levelLabel,
  speciality,
  preferredNumbers,
  precision,
  power,
  regularity,
  aggression,
  bullAffinity,
  dbullAffinity,
  missFactor,
}: {
  rating: number;
  levelLabel: string;
  speciality: string;
  preferredNumbers: number[];
  precision: number;
  power: number;
  regularity: number;
  aggression: number;
  bullAffinity?: number;
  dbullAffinity?: number;
  missFactor?: number;
}): CatchMeBotSkill {
  return {
    rating,
    levelLabel,
    speciality,
    preferredNumbers,
    capacities: {
      precision,
      power,
      regularity,
      aggression,
    },
    bullAffinity: bullAffinity ?? 0.05,
    dbullAffinity: dbullAffinity ?? 0.015,
    missFactor: missFactor ?? 0.15,
  };
}

const ATTRAPE_MOI_BOT_DEFS: AttrapeMoiBotDef[] = [
  {
    id: "amstp_bot_kron",
    name: "KRON",
    avatar: kronAvatar,
    level: 1,
    botLevel: "Débutant • Chasseur",
    groupLabel: "Rising",
    catchMeRoleSkills: {
      runner: makeSkill({
        rating: 1.1,
        levelLabel: "Niveau 1",
        speciality: "Fuite limitée",
        preferredNumbers: [16, 14, 12, 10],
        precision: 34,
        power: 28,
        regularity: 36,
        aggression: 42,
        bullAffinity: 0.01,
        dbullAffinity: 0.002,
        missFactor: 0.24,
      }),
      chaser: makeSkill({
        rating: 3.3,
        levelLabel: "Confirmé",
        speciality: "Traque frontale",
        preferredNumbers: [20, 19, 18, 17],
        precision: 68,
        power: 73,
        regularity: 64,
        aggression: 82,
        bullAffinity: 0.06,
        dbullAffinity: 0.02,
        missFactor: 0.11,
      }),
    },
  },
  {
    id: "amstp_bot_bleiz",
    name: "BLEIZ",
    avatar: bleizAvatar,
    level: 2,
    botLevel: "Débutant+ • Chasseur",
    groupLabel: "Rising",
    catchMeRoleSkills: {
      runner: makeSkill({
        rating: 1.6,
        levelLabel: "Niv. 2",
        speciality: "Fuite nerveuse",
        preferredNumbers: [18, 16, 14, 12],
        precision: 42,
        power: 38,
        regularity: 44,
        aggression: 48,
        bullAffinity: 0.02,
        dbullAffinity: 0.005,
        missFactor: 0.2,
      }),
      chaser: makeSkill({
        rating: 4.1,
        levelLabel: "Avancé",
        speciality: "Pression constante",
        preferredNumbers: [20, 20, 19, 18],
        precision: 78,
        power: 84,
        regularity: 76,
        aggression: 88,
        bullAffinity: 0.08,
        dbullAffinity: 0.026,
        missFactor: 0.08,
      }),
    },
  },
  {
    id: "amstp_bot_raven",
    name: "RAVEN",
    avatar: ravenAvatar,
    level: 2.5,
    botLevel: "Normal • Chasseur",
    groupLabel: "Mixte",
    catchMeRoleSkills: {
      runner: makeSkill({
        rating: 2.2,
        levelLabel: "Normal",
        speciality: "Évasion prudente",
        preferredNumbers: [19, 18, 16, 14],
        precision: 53,
        power: 47,
        regularity: 56,
        aggression: 52,
        bullAffinity: 0.025,
        dbullAffinity: 0.007,
        missFactor: 0.17,
      }),
      chaser: makeSkill({
        rating: 4.7,
        levelLabel: "Expert",
        speciality: "Sniper pur",
        preferredNumbers: [20, 20, 19, 19],
        precision: 91,
        power: 90,
        regularity: 88,
        aggression: 94,
        bullAffinity: 0.1,
        dbullAffinity: 0.032,
        missFactor: 0.06,
      }),
    },
  },
  {
    id: "amstp_bot_nova",
    name: "NOVA",
    avatar: novaAvatar,
    level: 3.5,
    botLevel: "Normal • Fuyarde",
    groupLabel: "Challenger",
    catchMeRoleSkills: {
      runner: makeSkill({
        rating: 3.1,
        levelLabel: "Normal",
        speciality: "Fuite mobile",
        preferredNumbers: [20, 19, 18, 17],
        precision: 69,
        power: 62,
        regularity: 68,
        aggression: 61,
        bullAffinity: 0.05,
        dbullAffinity: 0.014,
        missFactor: 0.11,
      }),
      chaser: makeSkill({
        rating: 1.8,
        levelLabel: "Débutant",
        speciality: "Poursuite hésitante",
        preferredNumbers: [18, 17, 16, 15],
        precision: 44,
        power: 40,
        regularity: 46,
        aggression: 48,
        bullAffinity: 0.02,
        dbullAffinity: 0.004,
        missFactor: 0.19,
      }),
    },
  },
  {
    id: "amstp_bot_eliaz",
    name: "ELIAZ",
    avatar: eliazAvatar,
    level: 4,
    botLevel: "Confirmé • Fuyard",
    groupLabel: "Pro",
    catchMeRoleSkills: {
      runner: makeSkill({
        rating: 4.0,
        levelLabel: "Confirmé",
        speciality: "Maître de l’esquive",
        preferredNumbers: [20, 19, 19, 18],
        precision: 83,
        power: 77,
        regularity: 82,
        aggression: 65,
        bullAffinity: 0.07,
        dbullAffinity: 0.02,
        missFactor: 0.08,
      }),
      chaser: makeSkill({
        rating: 2.4,
        levelLabel: "Intermédiaire",
        speciality: "Chasse opportuniste",
        preferredNumbers: [20, 18, 17, 16],
        precision: 58,
        power: 56,
        regularity: 61,
        aggression: 57,
        bullAffinity: 0.04,
        dbullAffinity: 0.01,
        missFactor: 0.15,
      }),
    },
  },
  {
    id: "amstp_bot_slyk",
    name: "SLYK",
    avatar: slykAvatar,
    level: 5,
    botLevel: "Expert • Fuyard",
    groupLabel: "Elite",
    catchMeRoleSkills: {
      runner: makeSkill({
        rating: 4.8,
        levelLabel: "Expert",
        speciality: "Fantôme insaisissable",
        preferredNumbers: [20, 20, 19, 18],
        precision: 93,
        power: 86,
        regularity: 91,
        aggression: 69,
        bullAffinity: 0.09,
        dbullAffinity: 0.028,
        missFactor: 0.05,
      }),
      chaser: makeSkill({
        rating: 1.2,
        levelLabel: "Débutant",
        speciality: "Chasse indirecte",
        preferredNumbers: [18, 16, 15, 14],
        precision: 37,
        power: 32,
        regularity: 40,
        aggression: 43,
        bullAffinity: 0.015,
        dbullAffinity: 0.003,
        missFactor: 0.22,
      }),
    },
  },
];

export const ATTRAPE_MOI_IA_BOTS = ATTRAPE_MOI_BOT_DEFS.map((bot) => ({
  id: bot.id,
  name: bot.name,
  avatarDataUrl: bot.avatar,
  avatarUrl: bot.avatar,
  avatar: bot.avatar,
  isBot: true,
  bot: true,
  cpu: true,
  type: "bot",
  kind: "bot",
  source: "attrape_moi_ia",
  isAttrapeMoiOfficialBot: true,
  level: bot.level,
  botLevel: bot.botLevel,
  groupLabel: bot.groupLabel,
  catchMeRoleSkills: bot.catchMeRoleSkills,
}));

export function buildAttrapeMoiBotTeams(botProfiles: any[] = ATTRAPE_MOI_IA_BOTS) {
  const byId = new Map<string, any>();
  for (const bot of botProfiles || []) {
    const id = String(bot?.id || "");
    if (id) byId.set(id, bot);
  }

  const teamDefs = [
    {
      id: "amstp_bot_team_esquive",
      name: "ESQUIVE",
      subtitle: "Fuyards IA",
      color: "#ff5d9e",
      logoUrl: esquiveTeamLogo,
      botTeamLevel: 4.5,
      playerIds: ["amstp_bot_slyk", "amstp_bot_eliaz", "amstp_bot_nova"],
    },
    {
      id: "amstp_bot_team_sniper",
      name: "SNIPER",
      subtitle: "Chasseurs IA",
      color: "#42d6ff",
      logoUrl: sniperTeamLogo,
      botTeamLevel: 4,
      playerIds: ["amstp_bot_raven", "amstp_bot_bleiz", "amstp_bot_kron"],
    },
  ];

  return teamDefs.map((team) => ({
    ...team,
    sport: "darts",
    isBotTeam: true,
    botLevel: `${team.botTeamLevel}/5`,
    members: team.playerIds.map((id) => byId.get(id)).filter(Boolean),
  }));
}

export function resolveAttrapeMoiBotSkill(profile: any, role: CatchMeBotRole): CatchMeBotSkill | null {
  const roleKey: CatchMeBotRole = role === "chaser" ? "chaser" : "runner";
  const skills = profile?.catchMeRoleSkills || profile?.amstpRoleSkills || null;
  const found = skills?.[roleKey];
  if (found) return found as CatchMeBotSkill;
  return null;
}
