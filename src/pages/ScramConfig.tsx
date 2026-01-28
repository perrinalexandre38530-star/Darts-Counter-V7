import React, { useEffect, useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import ProfileMedallionCarousel, { type MedallionItem } from "../components/ProfileMedallionCarousel";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import tickerScram from "../assets/tickers/ticker_scram.png";

type BotLevel = "easy" | "normal" | "hard";

type UserBot = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
};

const LS_BOTS_KEY = "dc_bots_v1";

const LS_BOTS_KEYS = ["dc_bots_v1", "dc-bots-v1", "dcBotsV1", "darts-counter-bots", "bots"];


function safeParseBotsFromLS(): UserBot[] {
  if (typeof window === "undefined") return [];
  try {
    const out: UserBot[] = [];
    for (const key of LS_BOTS_KEYS) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) continue;
      for (const b of arr) {
        const id = String((b as any)?.id ?? "");
        const name = String((b as any)?.name ?? "BOT");
        const avatarDataUrl = (b as any)?.avatarDataUrl ?? (b as any)?.avatarUrl ?? null;
        if (id && name) out.push({ id, name, avatarDataUrl });
      }
    }
    const map = new Map<string, UserBot>();
    out.forEach((b) => map.set(b.id, b));
    return Array.from(map.values());
  } catch {
    return [];
  }
}

function isBotProfile(p: any): boolean {
  if (!p) return false;
  if (p.isBot === true) return true;
  const bl = typeof p.botLevel === "string" ? p.botLevel.trim() : "";
  if (bl) return true;
  const lvl = typeof p.level === "string" ? p.level.trim() : "";
  if (lvl && ["easy","medium","strong","pro","legend","normal","hard"].includes(lvl)) return true;
  const kind = typeof p.kind === "string" ? p.kind : "";
  if (kind.toLowerCase() === "bot") return true;
  return false;
}

function botsFromStoreProfiles(profiles: any[]): UserBot[] {
  return (profiles || [])
    .filter((p: any) => !!p?.isBot)
    .map((p: any) => ({
      id: String(p.id),
      name: String(p.name ?? "BOT"),
      avatarDataUrl: p.avatarDataUrl ?? p.avatarUrl ?? null,
    }))
    .filter((b: any) => b.id && b.name);
}

function loadBots(profiles: any[]): UserBot[] {
  const storeBots = botsFromStoreProfiles(profiles);
  const lsBots = safeParseBotsFromLS();
  const merged = [...storeBots, ...lsBots];
  const map = new Map<string, UserBot>();
  merged.forEach((b) => map.set(b.id, b));
  return Array.from(map.values());
}

const INFO_TEXT = `SCRAM (type Cricket Race → Scram)\n- Phase RACE : fermer 20..15 + BULL avant l'adversaire.\n- Phase SCRAM : dès qu'une équipe a fermé, elle marque des points sur les cibles ouvertes tant que l'autre n'a pas fermé.\n`;

export type ScramConfigPayload = {
  selectedIds: string[];
  players: number;
  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;     // 0 = illimité
  objective: number;  // 0 = pas d'objectif
};


function normalizeImgSrc(src: any): string | undefined {
  if (!src) return undefined;
  if (typeof src !== "string") return undefined;
  return src;
}

export default function ScramConfig(props: any) {
  const { t } = useLang();
  const theme = useTheme() as any;
  const primary = theme?.primary ?? "#7dffca";
  const primarySoft = theme?.primarySoft ?? "rgba(125,255,202,0.16)";

  const storeProfiles = (props?.store?.profiles ?? []) as any[];
  const humanProfiles = useMemo(() => storeProfiles.filter((p: any) => !isBotProfile(p)), [storeProfiles]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [botsEnabled, setBotsEnabled] = useState(false);
  const [botLevel, setBotLevel] = useState<BotLevel>("normal");
  const [rounds, setRounds] = useState(0);
  const [objective, setObjective] = useState(200);

  const minPlayers = 2;
  const maxPlayers = 8;

  const [userBots, setUserBots] = useState<UserBot[]>([]);
  useEffect(() => {
    setUserBots(loadBots(storeProfiles));
  }, [storeProfiles]);

  const botIds = useMemo(() => new Set(userBots.map((b) => b.id)), [userBots]);

  useEffect(() => {
    if (!botsEnabled) {
      setSelectedIds((prev) => prev.filter((id) => !botIds.has(id)));
    }
  }, [botsEnabled, botIds]);

  const canStart = selectedIds.length >= minPlayers;
  const canTeams = useMemo(() => selectedIds.length >= 2, [selectedIds.length]);

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const has = prev.includes(id);
      if (has) {
        if (pendingId === id) {
          setPendingId(null);
          return prev.filter((x) => x !== id);
        }
        setPendingId(id);
        return prev;
      }
      setPendingId(null);
      if (prev.length >= maxPlayers) return prev;
      return [...prev, id];
    });
  }

  function start() {
    if (!canStart) return;
  const payload: ScramConfigPayload = {
    selectedIds,
    players: selectedIds.length,
    botsEnabled,
    botLevel,
    rounds,
    objective,
  };
    if (props?.setTab) return props.setTab("scram_play", { config: payload });
  }

  return (
    <div className="page">
      <PageHeader
        title="SCRAM"
        tickerSrc={tickerScram}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles SCRAM" content={INFO_TEXT} />}
      />

      <Section title={t("config.players", "Joueurs")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>
            Sélection : {selectedIds.length}/{maxPlayers} — min {minPlayers}
          </div>
        </div>

        {/* Human carousel ALWAYS visible */}
        {humanProfiles.length === 0 ? (
          <p style={{ fontSize: 13, color: "#b3b8d0", marginTop: 10, marginBottom: 0 }}>
            Aucun profil local. Crée des joueurs dans <b>Profils</b>.
          </p>
        ) : (
          <ProfileMedallionCarousel
            items={humanProfiles.map(
              (p: any): MedallionItem => ({
                id: String(p.id),
                name: String(p.name ?? ""),
                profile: p,
              })
            )}
            selectedIds={selectedIds}
            onToggle={togglePlayer}
            primary={primary}
            primarySoft={primarySoft}
            padLeft={8}
          />
        )}

        <OptionRow label={t("config.bots", "Bots IA")}>
          <OptionToggle value={botsEnabled} onChange={setBotsEnabled} />
        </OptionRow>

        {/* Bot carousel ONLY when enabled */}
        {botsEnabled && (
          <>
            <OptionRow label={t("config.botLevel", "Difficulté IA")}>
              <OptionSelect
                value={botLevel}
                options={[
                  { value: "easy", label: "Easy" },
                  { value: "normal", label: "Normal" },
                  { value: "hard", label: "Hard" },
                ]}
                onChange={(v: any) => setBotLevel(v)}
              />
            </OptionRow>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>Bots : {userBots.length}</div>
            </div>

            {userBots.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, marginTop: 8 }}>
                Aucun bot personnalisé trouvé (dc_bots_v1). Crée des bots dans <b>Profils</b>.
              </div>
            ) : (
              <ProfileMedallionCarousel
                items={userBots.map(
                  (b): MedallionItem => ({
                    id: String(b.id),
                    name: String(b.name ?? "BOT"),
                    profile: {
                      id: b.id,
                      name: b.name,
                      avatarUrl: normalizeImgSrc(b.avatarDataUrl),
                      avatarDataUrl: null,
                      isBot: true,
                    },
                  })
                )}
                selectedIds={selectedIds}
                onToggle={togglePlayer}
                primary={primary}
                primarySoft={primarySoft}
                padLeft={8}
              />
            )}
          </>
        )}
      </Section>

      <Section title={t("config.rules", "Règles")}>
        <OptionRow label={t("scram.objective", "Objectif points (phase SCRAM)")}>
          <OptionSelect
            value={objective}
            options={[
              { value: 100, label: "100" },
              { value: 150, label: "150" },
              { value: 200, label: "200" },
              { value: 250, label: "250" },
              { value: 300, label: "300" },
            ]}
            onChange={(v: any) => setObjective(Number(v) as any)}
          />
        </OptionRow>

        <OptionRow label={t("scram.rounds", "Cap de rounds (0 = illimité)")}>
          <OptionSelect
            value={rounds}
            options={[
              { value: 0, label: t("common.unlimited", "Illimité") },
              { value: 5, label: "5" },
              { value: 7, label: "7" },
              { value: 9, label: "9" },
              { value: 11, label: "11" },
              { value: 13, label: "13" },
            ]}
            onChange={(v: any) => setRounds(Number(v) as any)}
          />
        </OptionRow>
      </Section>


      <div style={{ padding: "0 14px 18px" }}>
        <button className="btn-primary" style={{ width: "100%", opacity: canStart ? 1 : 0.55 }} disabled={!canStart} onClick={start}>
          {t("common.start", "Démarrer la partie")}
        </button>
        {!canStart && (
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 10, textAlign: "center" }}>
            Sélectionne au moins {minPlayers} joueurs (humains et/ou bots).
          </div>
        )}
      </div>
    </div>
  );
}
