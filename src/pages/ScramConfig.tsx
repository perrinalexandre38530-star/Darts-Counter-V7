// =============================================================
// src/pages/ScramConfig.tsx
// SCRAM — configuration alignée avec les modes Darts avancés
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import BotPagedSelector from "../components/BotPagedSelector";
import InfoDot from "../components/InfoDot";
import OptionRow from "../components/OptionRow";
import OptionSelect from "../components/OptionSelect";
import OptionToggle from "../components/OptionToggle";
import PageHeader from "../components/PageHeader";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import Section from "../components/Section";
import { useTheme } from "../contexts/ThemeContext";
import { loadBotPlayers } from "../lib/bots";
import type { ScramConfigPayload, ScramTeam } from "../lib/gameEngines/scramEngine";
import { recordProfileUsageForMode } from "../lib/profileUsage";

import tickerScram from "../assets/tickers/ticker_scram.png";
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarJackpot from "../assets/avatars/bots-pro/jackpot.png";
import avatarCraftyCockney from "../assets/avatars/bots-pro/crafty-cockney.png";
import avatarBarney from "../assets/avatars/bots-pro/barney.png";
import avatarTheMenace from "../assets/avatars/bots-pro/the-menace.png";
import avatarDarthMaple from "../assets/avatars/bots-pro/darth-maple.png";
import avatarTheGiant from "../assets/avatars/bots-pro/the-giant.png";
import avatarTheHammer from "../assets/avatars/bots-pro/the-hammer.png";
import avatarVoltage from "../assets/avatars/bots-pro/voltage.png";
import avatarOneDart from "../assets/avatars/bots-pro/one-dart.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
import avatarTheFerret from "../assets/avatars/bots-pro/the-ferret.png";
import avatarHollywood from "../assets/avatars/bots-pro/hollywood.png";
import avatarTheAsp from "../assets/avatars/bots-pro/the-asp.png";
import avatarBullyBoy from "../assets/avatars/bots-pro/bully-boy.png";
import avatarThePower from "../assets/avatars/bots-pro/the-power.png";
import avatarCoolHand from "../assets/avatars/bots-pro/cool-hand.png";
import avatarFlyingScotsman from "../assets/avatars/bots-pro/flying-scotsman.png";

type BotLevel = "easy" | "normal" | "hard";
type FirstStopperChoice = ScramTeam | "random";
type BotLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  botLevel?: string;
  isBot?: boolean;
};

export type { ScramConfigPayload } from "../lib/gameEngines/scramEngine";

const LS_CFG_KEY = "dc_modecfg_scram_v2";
const CYAN = "#42d6ff";
const GOLD = "#ffd76a";

const PRO_BOTS: BotLite[] = [
  { id: "pro_mvg", name: "Green Machine", botLevel: "5/5", avatarDataUrl: avatarGreenMachine },
  { id: "pro_littler", name: "Wonder Kid", botLevel: "5/5", avatarDataUrl: avatarWonderKid },
  { id: "pro_humphries", name: "Cool Hand", botLevel: "5/5", avatarDataUrl: avatarCoolHand },
  { id: "pro_taylor", name: "The Power", botLevel: "5/5", avatarDataUrl: avatarThePower },
  { id: "pro_crafty", name: "Crafty", botLevel: "5/5", avatarDataUrl: avatarCraftyCockney },
  { id: "pro_jackpot", name: "Jackpot", botLevel: "4.5/5", avatarDataUrl: avatarJackpot },
  { id: "pro_barney", name: "Barney", botLevel: "4.5/5", avatarDataUrl: avatarBarney },
  { id: "pro_price", name: "Ice Man", botLevel: "4/5", avatarDataUrl: avatarIceMan },
  { id: "pro_wright", name: "Snake King", botLevel: "4/5", avatarDataUrl: avatarSnakeKing },
  { id: "pro_anderson", name: "Flying Scotsman", botLevel: "4/5", avatarDataUrl: avatarFlyingScotsman },
  { id: "pro_smith", name: "Bully Boy", botLevel: "4/5", avatarDataUrl: avatarBullyBoy },
  { id: "pro_clayton", name: "The Ferret", botLevel: "4/5", avatarDataUrl: avatarTheFerret },
  { id: "pro_aspinall", name: "The Asp", botLevel: "3.5/5", avatarDataUrl: avatarTheAsp },
  { id: "pro_dobey", name: "Hollywood", botLevel: "3.5/5", avatarDataUrl: avatarHollywood },
  { id: "pro_darth_maple", name: "Darth Maple", botLevel: "3.5/5", avatarDataUrl: avatarDarthMaple },
  { id: "pro_menace", name: "The Menace", botLevel: "3.5/5", avatarDataUrl: avatarTheMenace },
  { id: "pro_the_giant", name: "The Giant", botLevel: "3/5", avatarDataUrl: avatarTheGiant },
  { id: "pro_voltage", name: "Voltage", botLevel: "3/5", avatarDataUrl: avatarVoltage },
  { id: "pro_one_dart", name: "One Dart", botLevel: "3/5", avatarDataUrl: avatarOneDart },
  { id: "pro_the_hammer", name: "The Hammer", botLevel: "3/5", avatarDataUrl: avatarTheHammer },
];

function loadUserBots(): BotLite[] {
  try {
    return loadBotPlayers().map((bot: any) => ({
      id: String(bot.id),
      name: bot?.name || "BOT",
      avatarDataUrl: bot?.avatarDataUrl ?? bot?.avatarUrl ?? bot?.avatar ?? null,
      avatarUrl: bot?.avatarUrl ?? bot?.avatar ?? null,
      avatar: bot?.avatar ?? bot?.avatarUrl ?? bot?.avatarDataUrl ?? null,
      botLevel: bot?.botLevel ?? bot?.level ?? "",
      isBot: true,
    })).filter((bot: BotLite) => Boolean(bot.id));
  } catch {
    return [];
  }
}

function isBotLike(profile: any) {
  return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel);
}

function readSavedConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_CFG_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function RulesContent() {
  return (
    <div style={{ display: "grid", gap: 12, fontSize: 13, lineHeight: 1.45 }}>
      <div>
        <strong style={{ color: CYAN }}>PRINCIPE</strong><br />
        Le Scram se joue en <strong>deux phases</strong>, avec les cibles Cricket 15 à 20 et le Bull.
        Une équipe est <strong>Bloqueur</strong>, l’autre est <strong>Scoreur</strong>.
      </div>
      <div>
        <strong style={{ color: GOLD }}>PHASE 1</strong><br />
        Le Bloqueur joue en premier et ferme chaque cible en 3 marques : simple = 1, double = 2,
        triple = 3. Pendant ce temps, le Scoreur marque la valeur de ses fléchettes sur les cibles
        qui ne sont pas encore fermées.
      </div>
      <div>
        <strong style={{ color: GOLD }}>PHASE 2</strong><br />
        Les rôles s’inversent. Le nouveau Bloqueur commence avec un tableau vierge et l’autre équipe
        tente de dépasser le score obtenu pendant la première phase.
      </div>
      <div>
        <strong style={{ color: "#7dffca" }}>VICTOIRE</strong><br />
        Quand le second Bloqueur a fermé toutes les cibles, l’équipe qui totalise le plus de points gagne.
        Une égalité est possible. Le cap de rounds est seulement une sécurité facultative par phase.
      </div>
      <div style={{ opacity: 0.78 }}>
        Équipes automatiques : J1 + J3 + J5 + J7 contre J2 + J4 + J6 + J8.
        Il faut donc sélectionner 2, 4, 6 ou 8 participants.
      </div>
    </div>
  );
}

export default function ScramConfig(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store ?? null;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(readSavedConfig, []);
  const storeProfiles: any[] = Array.isArray(store?.profiles) ? store.profiles : [];
  const humanProfiles = React.useMemo(() => storeProfiles.filter((p) => !isBotLike(p)), [storeProfiles]);

  const [botsEnabled, setBotsEnabled] = React.useState(Boolean(saved.botsEnabled));
  const [botLevel, setBotLevel] = React.useState<BotLevel>(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [useBull, setUseBull] = React.useState(saved.useBull !== false);
  const [maxRoundsPerPhase, setMaxRoundsPerPhase] = React.useState<number>(Number(saved.maxRoundsPerPhase || 0) || 0);
  const [firstStopper, setFirstStopper] = React.useState<FirstStopperChoice>(saved.firstStopper === "B" || saved.firstStopper === "random" ? saved.firstStopper : "A");
  const [selectedIds, setSelectedIds] = React.useState<string[]>(Array.isArray(saved.selectedIds) ? saved.selectedIds.slice(0, 8).map(String) : []);
  const [botProfiles, setBotProfiles] = React.useState<BotLite[]>([]);

  React.useLayoutEffect(() => {
    try { window.scrollTo(0, 0); } catch {}
  }, []);

  React.useEffect(() => {
    const map = new Map<string, BotLite>();
    PRO_BOTS.forEach((bot) => map.set(bot.id, { ...bot, isBot: true }));
    loadUserBots().forEach((bot) => map.set(bot.id, { ...bot, isBot: true }));
    setBotProfiles([...map.values()]);
  }, []);

  React.useEffect(() => {
    if (selectedIds.length || humanProfiles.length < 2) return;
    setSelectedIds(humanProfiles.slice(0, 2).map((p) => String(p.id)));
  }, [humanProfiles, selectedIds.length]);

  React.useEffect(() => {
    if (botsEnabled) return;
    const botIds = new Set(botProfiles.map((bot) => bot.id));
    setSelectedIds((previous) => previous.filter((id) => !botIds.has(id)));
  }, [botsEnabled, botProfiles]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_CFG_KEY, JSON.stringify({
        selectedIds,
        botsEnabled,
        botLevel,
        useBull,
        maxRoundsPerPhase,
        firstStopper,
      }));
    } catch {}
  }, [selectedIds, botsEnabled, botLevel, useBull, maxRoundsPerPhase, firstStopper]);

  const allProfiles = React.useMemo(() => [
    ...humanProfiles,
    ...botProfiles.map((bot) => ({ ...bot, isBot: true })),
  ], [humanProfiles, botProfiles]);
  const byId = React.useMemo(() => new Map(allProfiles.map((profile: any) => [String(profile.id), profile])), [allProfiles]);
  const selectedProfiles = selectedIds.map((id) => byId.get(String(id))).filter(Boolean) as any[];
  const teamA = selectedProfiles.filter((_, index) => index % 2 === 0);
  const teamB = selectedProfiles.filter((_, index) => index % 2 === 1);
  const validCount = selectedIds.length >= 2 && selectedIds.length <= 8 && selectedIds.length % 2 === 0;

  function togglePlayer(id: string) {
    setSelectedIds((previous) => {
      if (previous.includes(id)) return previous.filter((value) => value !== id);
      if (previous.length >= 8) return previous;
      return [...previous, id];
    });
  }

  function backToGames() {
    if (typeof go === "function") go("games");
  }

  function onStart() {
    if (!validCount) return;
    const botIds = selectedProfiles.filter(isBotLike).map((p: any) => String(p.id));
    const chosenFirstStopper: ScramTeam = firstStopper === "random" ? (Math.random() < 0.5 ? "A" : "B") : firstStopper;
    const payload: ScramConfigPayload = {
      players: selectedIds.length,
      selectedIds,
      playersList: selectedProfiles.map((profile: any) => ({
        ...profile,
        id: String(profile.id),
        name: profile?.name || profile?.displayName || "Joueur",
      })),
      botIds,
      botsEnabled,
      botLevel,
      useBull,
      maxRoundsPerPhase,
      firstStopper: chosenFirstStopper,
    };
    try { recordProfileUsageForMode("scram", selectedIds); } catch {}
    if (typeof go === "function") go("scram_play", payload);
  }

  const panel = {
    borderRadius: 18,
    padding: 12,
    background: "linear-gradient(180deg, rgba(255,255,255,.065), rgba(0,0,0,.28))",
    border: "1px solid rgba(255,255,255,.10)",
  } as React.CSSProperties;

  return (
    <div style={{ minHeight: "100dvh", paddingBottom: 92 }}>
      <PageHeader
        tickerSrc={tickerScram}
        tickerAlt="SCRAM"
        left={<BackDot onClick={backToGames} color={CYAN} glow="rgba(66,214,255,.58)" title="Retour aux jeux" />}
        right={<InfoDot title="Règles et configuration du Scram" color={GOLD} glow="rgba(255,215,106,.55)" content={<RulesContent />} />}
      />

      <div style={{ padding: "12px 12px 0" }}>
        <Section title="PARTICIPANTS">
          <div style={panel}>
            <div style={{ fontSize: 12, opacity: .84, fontWeight: 950, marginBottom: 9 }}>
              Sélection : {selectedIds.length}/8 — 2 équipes équilibrées
            </div>
            <PlayerPagedSelector
              usageMode="scram"
              profiles={humanProfiles}
              selectedIds={selectedIds}
              onToggle={togglePlayer}
              accent={theme?.primary || CYAN}
              pageSize={9}
              modalTitle="Choisir les joueurs Scram"
            />

            <div style={{ marginTop: 12 }}>
              <OptionRow label="Bots IA">
                <OptionToggle value={botsEnabled} onChange={setBotsEnabled} />
              </OptionRow>
              {botsEnabled ? (
                <>
                  <OptionRow label="Difficulté IA">
                    <OptionSelect
                      value={botLevel}
                      options={[
                        { value: "easy", label: "Facile" },
                        { value: "normal", label: "Normal" },
                        { value: "hard", label: "Difficile" },
                      ]}
                      onChange={setBotLevel}
                    />
                  </OptionRow>
                  <div style={{ marginTop: 10 }}>
                    <BotPagedSelector
                      bots={botProfiles as any}
                      selectedIds={selectedIds}
                      onToggle={togglePlayer}
                      accent={CYAN}
                      label="BOTS IA"
                      modalTitle="Choisir des BOTS IA"
                      showCheckbox={false}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </Section>

        {selectedIds.length ? (
          <Section title="ÉQUIPES AUTOMATIQUES">
            <div style={{ ...panel, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {([
                ["TEAM A", teamA, "#ff4ad1"],
                ["TEAM B", teamB, GOLD],
              ] as const).map(([label, members, color]) => (
                <div key={label} style={{ minWidth: 0, padding: 10, borderRadius: 15, background: `${color}10`, border: `1px solid ${color}55` }}>
                  <div style={{ color, fontWeight: 1000, fontSize: 12, marginBottom: 7 }}>{label}</div>
                  <div style={{ display: "grid", gap: 5 }}>
                    {members.map((member: any) => <div key={member.id} style={{ fontSize: 12, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.name}</div>)}
                    {!members.length ? <div style={{ opacity: .5, fontSize: 12 }}>—</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <Section title="RÈGLES">
          <div style={panel}>
            <OptionRow label="Bull inclus">
              <OptionToggle value={useBull} onChange={setUseBull} />
            </OptionRow>
            <OptionRow label="Premier bloqueur">
              <OptionSelect
                value={firstStopper}
                options={[
                  { value: "A", label: "Team A" },
                  { value: "B", label: "Team B" },
                  { value: "random", label: "Aléatoire" },
                ]}
                onChange={setFirstStopper}
              />
            </OptionRow>
            <OptionRow label="Cap de rounds / phase">
              <OptionSelect
                value={maxRoundsPerPhase}
                options={[0, 10, 15, 20, 25, 30].map((value) => ({ value, label: value ? String(value) : "Illimité" }))}
                onChange={(value: any) => setMaxRoundsPerPhase(Number(value) || 0)}
              />
            </OptionRow>
            <div style={{ marginTop: 9, fontSize: 11.5, opacity: .68, lineHeight: 1.35 }}>
              Partie standard : deux phases, rôles inversés, meilleur total final. Le cap termine seulement une phase trop longue.
            </div>
          </div>
        </Section>

        <div style={{ padding: "4px 12px 14px" }}>
          <button
            type="button"
            className="btn-primary"
            disabled={!validCount}
            onClick={onStart}
            style={{ width: "100%", minHeight: 48, fontWeight: 1000, letterSpacing: 1.1 }}
          >
            DÉMARRER LE SCRAM
          </button>
          {!validCount ? (
            <div style={{ marginTop: 9, fontSize: 12, color: "#ff9aa7", fontWeight: 850, textAlign: "center" }}>
              Sélectionne 2, 4, 6 ou 8 participants pour équilibrer les équipes.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
