import NativeStartOrderConfig from '../components/NativeStartOrderConfig';
import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerTicTacToe from "../assets/tickers/ticker_tic_tac_toe.png";
import { top10MorpionLabel } from "../lib/top10MorpionLabels";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";


type BotLevel = "easy" | "normal" | "hard";

export type TicTacToeConfigPayload = {
  players: number | any[];
  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  objective?: number;
};

const INFO_TEXT = `MORPION : 8 numéros différents tirés au sort, Bull toujours au centre. Chaque joueur doit réaliser 4 touches sur une case pour se l’approprier. Simple, double et triple comptent chacun une touche. Aligner 3 cases pour gagner la manche.`;

export default function TicTacToeConfig(props: any) {
  const { t, lang } = useLang();
  const tr = (value: string) => top10MorpionLabel(lang, value);
  useTheme();

  const [players, setPlayers] = useState(2);
  const profiles = (props?.store?.profiles || []).filter((p: any) => !p?.isBot && p?.id);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => props?.store?.activeProfileId ? [String(props.store.activeProfileId)] : []);
  const toggle = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, players));
  const [botsEnabled, setBotsEnabled] = useState(false);
  const [botLevel, setBotLevel] = useState<BotLevel>("normal");
  const [rounds, setRounds] = useState(3);

  const chosen = selectedIds.map((id) => profiles.find((p: any) => String(p.id) === id)).filter(Boolean);
  const others = profiles.filter((p: any) => !chosen.some((x: any) => x.id === p.id));
  const humans = [...chosen, ...(!botsEnabled ? others : [])].slice(0, players).map((p: any) => ({ id: p.id, name: p.name || p.nickname || tr("Joueur"), avatarDataUrl: p.avatarDataUrl || null, isBot: false }));
  const remaining = Array.from({ length: Math.max(0, players - humans.length) }, (_, i) => ({ id: botsEnabled ? `morpion-bot-${i}` : `morpion-local-${i}`, name: botsEnabled ? `Bot ${i+1}` : `${tr("Joueur")} ${humans.length+i+1}`, isBot: !!botsEnabled, botLevel }));
  const payload: TicTacToeConfigPayload = { players: [...humans, ...remaining], botsEnabled, botLevel, rounds };

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function start() {
    // App.tsx wiring: tab "tic_tac_toe_play"
    if (props?.setTab) return props.setTab("tic_tac_toe_play", { config: payload });
    // Router alternative: à adapter au câblage final si besoin
  }

  return (
    <div className="page">
      <PageHeader difficultyGameId="tic_tac_toe"
        title={lang === "fr" ? "MORPION" : "TIC-TAC-TOE"}
        tickerSrc={tickerTicTacToe}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title={tr("Règles MORPION")} content={tr(INFO_TEXT)} />}
      />

      <Section title={t("config.players", "Joueurs")}>
        <OptionRow label={t("config.playerCount", "Nombre de joueurs")}>
          <OptionSelect value={players} options={[2, 3, 4]} onChange={setPlayers} />
        </OptionRow>

        {profiles.length > 0 && <div style={{ margin: "10px 0", padding: 10, borderRadius: 12, background: "#161a2a" }}><b>{tr("Profils locaux")}</b><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{profiles.map((p: any) => <button key={p.id} type="button" aria-pressed={selectedIds.includes(String(p.id))} onClick={() => toggle(String(p.id))} style={{ border: selectedIds.includes(String(p.id)) ? "1px solid #70e4f8" : "1px solid #ffffff33", background: selectedIds.includes(String(p.id)) ? "#195b8d" : "#222739", color: "#fff", padding: "8px 10px", borderRadius: 18 }}>{selectedIds.includes(String(p.id)) ? "✓ " : ""}{p.name || p.nickname || tr("Profil")}</button>)}</div></div>}
        <OptionRow label={t("config.bots", "Bots IA")}>
          <OptionToggle value={botsEnabled} onChange={setBotsEnabled} />
        </OptionRow>

        {botsEnabled && (
          <OptionRow label={t("config.botLevel", "Difficulté IA")}>
            <OptionSelect
              value={botLevel}
              options={[
                { value: "easy", label: tr("Facile") },
                { value: "normal", label: tr("Normal") },
                { value: "hard", label: tr("Difficile") },
              ]}
              onChange={setBotLevel}
            />
          </OptionRow>
        )}
      </Section>

      <Section title={t("config.rules", "Règles")}>
        <OptionRow label={t("config.rounds", "Rounds")}>
          <OptionSelect value={rounds} options={[1, 3, 5, 7]} onChange={setRounds} />
        </OptionRow>

        <div style={{ fontSize: 13, opacity: .8 }}>{tr("4 touches par case · Bull centrale · numéros aléatoires à chaque manche.")}</div>
      </Section>

      <Section>
        <button className="btn-primary w-full" onClick={start}>
          {t("config.startGame", "Démarrer la partie")}
        </button>
      </Section>
    
      <NativeStartOrderConfig />
      </div>
  );
}
