// @ts-nocheck
import React from "react";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import PlayerPagedSelector from "../../components/PlayerPagedSelector";
import BotPagedSelector from "../../components/BotPagedSelector";
import SelectionStickyBanner from "../../components/SelectionStickyBanner";
import { useTheme } from "../../contexts/ThemeContext";
import tickerBatard from "../../assets/tickers/ticker_bastard.png";
import { PRO_BOTS } from "../../lib/botsPro";
import { getProBotAvatar } from "../../lib/botsProAvatars";
import { loadBots } from "../../lib/bots";
import { classicPreset, progressifPreset, punitionPreset } from "../../lib/batard/batardPresets";
import type {
  BatardConfig as BatardRulesConfig,
  BatardFailPolicy,
  BatardRound,
  BatardMultiplierRule,
  BatardWinMode,
} from "../../lib/batard/batardTypes";

export type BatardConfigPayload = {
  players: number;
  botsEnabled: boolean;
  botLevel: "easy" | "normal" | "hard";
  batard: BatardRulesConfig;
  presetId: "classic" | "progressif" | "punition" | "custom";
  selectedHumanIds?: string[];
  selectedBotIds?: string[];
};

type ConfigViewMode = "guided" | "complete";
type PresetId = BatardConfigPayload["presetId"];

const MAX_PLAYERS = 8;
const T = {
  bg: "#040710",
  stroke: "rgba(255,255,255,.10)",
  text: "#f8fafc",
  soft: "rgba(226,232,240,.70)",
  gold: "#ffd76a",
  cyan: "#42d6ff",
  pink: "#ff63b8",
  red: "#ff667e",
  green: "#65efb4",
};

const WIN_LABEL: Record<BatardWinMode, string> = {
  SCORE_MAX: "Meilleur score",
  RACE_TO_FINISH: "Premier au bout",
};

const FAIL_LABEL: Record<BatardFailPolicy, string> = {
  NONE: "Aucune pénalité",
  MINUS_POINTS: "Malus de points",
  BACK_ROUND: "Recul dans la séquence",
  FREEZE: "Round à rejouer",
};

function isBotProfile(p: any) {
  if (!p) return false;
  const id = String(p?.id || "");
  return Boolean(
    p?.isBot ||
      p?.bot ||
      p?.cpu ||
      p?.type === "bot" ||
      p?.kind === "bot" ||
      id.startsWith("bot_") ||
      id.startsWith("pro_")
  );
}

function uid() {
  return `batard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clonePreset(source: BatardRulesConfig): BatardRulesConfig {
  return { ...source, rounds: (source?.rounds || []).map((r) => ({ ...r })) };
}

function presetFor(id: PresetId): BatardRulesConfig {
  if (id === "progressif") return clonePreset(progressifPreset);
  if (id === "punition") return clonePreset(punitionPreset);
  return clonePreset(classicPreset);
}

function roundShort(r: BatardRound | null | undefined) {
  if (!r) return "—";
  const mult = String(r.multiplierRule || "ANY");
  if (r.type === "TARGET_BULL") return mult === "DOUBLE" ? "DBULL" : "BULL";
  if (r.type === "ANY_SCORE") {
    if (mult === "DOUBLE") return "D ANY";
    if (mult === "TRIPLE") return "T ANY";
    if (mult === "SINGLE") return "S ANY";
    return "SCORE";
  }
  const prefix = mult === "DOUBLE" ? "D" : mult === "TRIPLE" ? "T" : mult === "SINGLE" ? "S" : "";
  return `${prefix}${r.target ?? "?"}`;
}

function RulesInfo() {
  return (
    <div style={{ display: "grid", gap: 11, fontSize: 13, lineHeight: 1.45 }}>
      <div><b style={{ color: T.gold }}>BUT</b><br />Chaque joueur affronte la même séquence de rounds. Un round impose une cible ou un type de touche.</div>
      <div><b style={{ color: T.cyan }}>VALIDER UN ROUND</b><br />Une volée contient jusqu’à 3 fléchettes. Il faut au moins le nombre de touches valides demandé pour passer au round suivant.</div>
      <div><b style={{ color: T.pink }}>ÉCHEC</b><br />Si la volée ne valide pas le round, la pénalité choisie s’applique : aucune, points retirés, recul ou round à rejouer.</div>
      <div><b style={{ color: T.green }}>VICTOIRE</b><br /><b>Meilleur score</b> : tout le monde termine la séquence, le total le plus élevé gagne. <b>Premier au bout</b> : le premier joueur qui termine la séquence gagne immédiatement.</div>
      <div><b style={{ color: T.gold }}>PRESETS</b><br />Classic = variété de cibles. Progressif = 1 → 20 → Bull. Punition = parcours court et exigeant.</div>
    </div>
  );
}

export default function BatardConfig(props: any) {
  const themeCtx: any = useTheme();
  const theme: any = themeCtx?.theme || themeCtx || {};
  const primary = theme?.primary || T.cyan;
  const secondary = theme?.secondary || T.gold;
  const bg = theme?.bg || T.bg;

  const store = props?.store ?? props?.params?.store ?? null;
  const profiles = React.useMemo(
    () => (Array.isArray(store?.profiles) ? store.profiles.filter((p: any) => !isBotProfile(p)) : []),
    [store?.profiles]
  );
  const activeProfileId = store?.activeProfileId != null ? String(store.activeProfileId) : null;

  const [viewMode, setViewMode] = React.useState<ConfigViewMode>("guided");
  const [selectedHumanIds, setSelectedHumanIds] = React.useState<string[]>([]);
  const [selectedBotIds, setSelectedBotIds] = React.useState<string[]>([]);
  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<"easy" | "normal" | "hard">("normal");
  const [storedBots, setStoredBots] = React.useState<any[]>(() => {
    try { return loadBots(); } catch { return []; }
  });

  const [presetId, setPresetId] = React.useState<PresetId>("classic");
  const [rules, setRules] = React.useState<BatardRulesConfig>(() => clonePreset(classicPreset));
  const [selectedRoundIndex, setSelectedRoundIndex] = React.useState(0);

  React.useEffect(() => {
    const refresh = () => {
      try { setStoredBots(loadBots()); } catch {}
    };
    window.addEventListener("dc:bots-changed", refresh as any);
    return () => window.removeEventListener("dc:bots-changed", refresh as any);
  }, []);

  React.useEffect(() => {
    if (selectedHumanIds.length) return;
    const ids = profiles.map((p: any) => String(p.id)).filter(Boolean);
    if (!ids.length) return;
    const seed: string[] = [];
    if (activeProfileId && ids.includes(activeProfileId)) seed.push(activeProfileId);
    for (const id of ids) {
      if (seed.length >= 2) break;
      if (!seed.includes(id)) seed.push(id);
    }
    setSelectedHumanIds(seed);
  }, [profiles, activeProfileId, selectedHumanIds.length]);

  const allBots = React.useMemo(() => {
    const byId = new Map<string, any>();
    for (const bot of storedBots || []) {
      const id = String(bot?.id || "");
      if (!id) continue;
      byId.set(id, {
        ...bot,
        id,
        name: bot?.name || "BOT",
        botLevel: bot?.botLevel || bot?.level || "medium",
        isUserBot: true,
        source: "home",
      });
    }
    for (const bot of PRO_BOTS || []) {
      const id = String(bot.id);
      byId.set(id, {
        ...bot,
        id,
        name: bot.displayName,
        avatar: getProBotAvatar(bot.avatarKey || bot.id),
        avatarDataUrl: getProBotAvatar(bot.avatarKey || bot.id),
        botLevel: bot.botLevel,
        source: "pro",
      });
    }
    return Array.from(byId.values());
  }, [storedBots]);

  const selectedHumans = React.useMemo(
    () => profiles.filter((p: any) => selectedHumanIds.includes(String(p.id))),
    [profiles, selectedHumanIds]
  );
  const selectedBots = React.useMemo(
    () => allBots.filter((b: any) => selectedBotIds.includes(String(b.id))),
    [allBots, selectedBotIds]
  );
  const participantsCount = selectedHumanIds.length + (botsEnabled ? selectedBotIds.length : 0);
  const ready = participantsCount >= 2 && rules.rounds?.length > 0;

  const selectedBannerItems = React.useMemo(
    () => [
      ...selectedHumans.map((p: any) => ({
        id: String(p.id),
        name: p.name || "Joueur",
        subtitle: "Joueur",
        profile: p,
      })),
      ...(botsEnabled
        ? selectedBots.map((b: any) => ({
            id: String(b.id),
            name: b.name || b.displayName || "BOT",
            subtitle: "BOT IA",
            avatarDataUrl: b.avatarDataUrl || b.avatar || b.avatarUrl || null,
            profile: b,
          }))
        : []),
    ],
    [selectedHumans, selectedBots, botsEnabled]
  );

  function toggleHuman(rawId: any) {
    const id = String(rawId || "");
    if (!id) return;
    setSelectedHumanIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const total = prev.length + (botsEnabled ? selectedBotIds.length : 0);
      if (total >= MAX_PLAYERS) return prev;
      return [...prev, id];
    });
  }

  function toggleBot(rawId: any) {
    const id = String(rawId || "");
    if (!id) return;
    setSelectedBotIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (selectedHumanIds.length + prev.length >= MAX_PLAYERS) return prev;
      return [...prev, id];
    });
  }

  function applyPreset(id: PresetId) {
    setPresetId(id);
    if (id !== "custom") setRules(presetFor(id));
    setSelectedRoundIndex(0);
  }

  function patchRules(patch: Partial<BatardRulesConfig>) {
    setRules((prev) => ({
      ...prev,
      ...patch,
      presetId: presetId === "custom" ? prev.presetId : "custom",
      label: presetId === "custom" ? prev.label : "Personnalisé",
    }));
    setPresetId("custom");
  }

  function updateRound(index: number, patch: Partial<BatardRound>) {
    patchRules({
      rounds: (rules.rounds || []).map((r, i) => (i === index ? ({ ...r, ...patch } as BatardRound) : r)),
    });
  }

  function addRound() {
    const next: BatardRound = {
      id: uid(),
      label: "Nouveau round",
      type: "TARGET_NUMBER",
      target: 20,
      multiplierRule: "ANY",
    };
    patchRules({ rounds: [...(rules.rounds || []), next] });
    setSelectedRoundIndex(rules.rounds.length);
  }

  function removeRound(index: number) {
    if ((rules.rounds || []).length <= 1) return;
    patchRules({ rounds: rules.rounds.filter((_, i) => i !== index) });
    setSelectedRoundIndex((i) => Math.max(0, Math.min(i, rules.rounds.length - 2)));
  }

  function moveRound(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rules.rounds.length) return;
    const next = [...rules.rounds];
    [next[index], next[target]] = [next[target], next[index]];
    patchRules({ rounds: next });
    setSelectedRoundIndex(target);
  }

  function start() {
    if (!ready) return;
    const payload: BatardConfigPayload = {
      players: participantsCount,
      botsEnabled,
      botLevel,
      presetId,
      batard: {
        ...rules,
        scoreOnlyValid: rules.scoreOnlyValid !== false,
        minValidHitsToAdvance: Math.max(1, Math.min(3, Number(rules.minValidHitsToAdvance || 1))),
        failValue: Math.max(0, Number(rules.failValue || 0)),
        rounds: (rules.rounds || []).map((r) => ({ ...r })),
      },
      selectedHumanIds: selectedHumanIds.map(String),
      selectedBotIds: botsEnabled ? selectedBotIds.map(String) : [],
    };
    if (props?.setTab) props.setTab("batard_play", { config: payload, store, fresh: Date.now() });
    else if (props?.go) props.go("batard_play", { config: payload, store, fresh: Date.now() });
  }

  const activeRound =
    rules.rounds?.[Math.max(0, Math.min(selectedRoundIndex, rules.rounds.length - 1))] || null;

  return (
    <div
      style={{
        minHeight: "100dvh",
        color: T.text,
        background: `radial-gradient(circle at 50% -8%, ${primary}20 0, ${bg} 45%, #020309 100%)`,
        overflowX: "hidden",
      }}
    >
      <PageHeader
        tickerSrc={tickerBatard}
        tickerAlt="BÂTARD"
        tickerBottomGap={8}
        left={
          <div style={{ marginLeft: 6 }}>
            <BackDot
              onClick={() => (props?.setTab ? props.setTab("games") : props?.go?.("games"))}
              color={primary}
              glow={`${primary}88`}
            />
          </div>
        }
        right={
          <div style={{ marginRight: 6 }}>
            <InfoDot title="BÂTARD — règles" content={<RulesInfo />} color={secondary} glow={`${secondary}77`} />
          </div>
        }
      />

      <main style={{ width: "100%", maxWidth: 760, margin: "0 auto", padding: "8px 10px 150px", boxSizing: "border-box" }}>
        <div style={{ ...panel(primary), padding: 6, marginBottom: 9, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
          <ViewButton active={viewMode === "guided"} color={primary} label="CONFIG GUIDÉE" sub="Simple, étape par étape" onClick={() => setViewMode("guided")} />
          <ViewButton active={viewMode === "complete"} color={secondary} label="CONFIG COMPLÈTE" sub="Tous les réglages" onClick={() => setViewMode("complete")} />
        </div>

        <SelectionStickyBanner title={`${participantsCount}/${MAX_PLAYERS} PARTICIPANTS`} items={selectedBannerItems} accent={primary} />

        <ConfigCard step="01" title="PARTICIPANTS" subtitle="Les mêmes sélecteurs que X01" color={primary}>
          <PlayerPagedSelector
            profiles={profiles}
            selectedIds={selectedHumanIds}
            onToggle={toggleHuman}
            accent={primary}
            pageSize={9}
            modalTitle="Choisir les joueurs"
            usageMode="batard"
            showSelectedSummary={true}
          />

          <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${T.stroke}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: botsEnabled ? 10 : 0 }}>
              <div>
                <div style={{ fontSize: 11, color: secondary, fontWeight: 1000, letterSpacing: .8 }}>BOTS IA</div>
                <div style={{ marginTop: 2, fontSize: 10.5, color: T.soft }}>Bots personnels + Bots Pro X01</div>
              </div>
              <button type="button" onClick={() => setBotsEnabled((v) => !v)} style={togglePill(secondary, botsEnabled)}>
                {botsEnabled ? "☑ ON" : "☐ OFF"}
              </button>
            </div>
            {botsEnabled ? (
              <>
                <BotPagedSelector
                  bots={allBots}
                  selectedIds={selectedBotIds}
                  onToggle={toggleBot}
                  accent={secondary}
                  pageSize={4}
                  showCheckbox={false}
                  label="BOTS IA"
                  modalTitle="Choisir les BOTS IA"
                  showSelectedSummary={true}
                />
                {viewMode === "complete" ? (
                  <div style={{ marginTop: 10 }}>
                    <Label>INTENSITÉ GLOBALE</Label>
                    <Segmented
                      value={botLevel}
                      color={secondary}
                      options={[["easy", "Facile"], ["normal", "Normal"], ["hard", "Difficile"]]}
                      onChange={setBotLevel}
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </ConfigCard>

        <ConfigCard step="02" title="STYLE DE PARTIE" subtitle="Choisis l’esprit du BÂTARD" color={secondary}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
            <PresetCard active={presetId === "classic"} color={primary} title="CLASSIC" big="9" sub="rounds variés" onClick={() => applyPreset("classic")} />
            <PresetCard active={presetId === "progressif"} color={T.green} title="PROGRESSIF" big="1→20" sub="puis Bull" onClick={() => applyPreset("progressif")} />
            <PresetCard active={presetId === "punition"} color={T.pink} title="PUNITION" big="HARD" sub="malus actifs" onClick={() => applyPreset("punition")} />
          </div>
          <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5 }}>
            <MiniKpi label="ROUNDS" value={rules.rounds.length} color={secondary} />
            <MiniKpi label="VICTOIRE" value={rules.winMode === "SCORE_MAX" ? "SCORE" : "COURSE"} color={primary} />
            <MiniKpi label="ÉCHEC" value={rules.failPolicy === "NONE" ? "OFF" : "ON"} color={rules.failPolicy === "NONE" ? T.soft : T.pink} />
          </div>
        </ConfigCard>

        <ConfigCard step="03" title="VICTOIRE" subtitle="Comment désigner le gagnant ?" color={T.green}>
          <ChoiceGrid>
            <Choice active={rules.winMode === "SCORE_MAX"} color={secondary} title="MEILLEUR SCORE" text="Tout le monde joue tous les rounds. Le total le plus élevé gagne." onClick={() => patchRules({ winMode: "SCORE_MAX" })} />
            <Choice active={rules.winMode === "RACE_TO_FINISH"} color={primary} title="PREMIER AU BOUT" text="La partie s’arrête dès qu’un joueur termine toute la séquence." onClick={() => patchRules({ winMode: "RACE_TO_FINISH" })} />
          </ChoiceGrid>
        </ConfigCard>

        <ConfigCard step="04" title="ÉCHEC D’UN ROUND" subtitle="Que se passe-t-il si la volée ne valide pas la cible ?" color={T.pink}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
            {([
              ["NONE", "RIEN", "Le joueur passe simplement la main."],
              ["FREEZE", "À REJOUER", "Il reste sur ce round au prochain tour."],
              ["MINUS_POINTS", "MALUS", "Des points sont retirés du score."],
              ["BACK_ROUND", "RECUL", "Le joueur recule dans la séquence."],
            ] as any[]).map(([id, title, text]) => (
              <Choice
                key={id}
                active={rules.failPolicy === id}
                color={id === "NONE" ? primary : T.pink}
                title={title}
                text={text}
                onClick={() => patchRules({ failPolicy: id as BatardFailPolicy })}
              />
            ))}
          </div>
          {rules.failPolicy === "MINUS_POINTS" || rules.failPolicy === "BACK_ROUND" ? (
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 112px", gap: 10, alignItems: "center" }}>
              <div>
                <Label>{rules.failPolicy === "MINUS_POINTS" ? "POINTS DE MALUS" : "ROUNDS DE RECUL"}</Label>
                <div style={{ fontSize: 10.5, color: T.soft }}>{rules.failPolicy === "MINUS_POINTS" ? "Retirés après une volée ratée." : "Nombre de positions perdues."}</div>
              </div>
              <NumberField
                value={rules.failValue || (rules.failPolicy === "BACK_ROUND" ? 1 : 10)}
                min={0}
                max={100}
                onChange={(v) => patchRules({ failValue: v })}
              />
            </div>
          ) : null}
        </ConfigCard>

        {viewMode === "guided" ? (
          <ConfigCard step="05" title="SÉQUENCE" subtitle="Aperçu rapide — passe en Config complète pour éditer" color={primary}>
            <RoundStrip rounds={rules.rounds} activeIndex={-1} color={primary} onSelect={() => {}} />
            <button type="button" onClick={() => setViewMode("complete")} style={{ ...actionButton(primary), marginTop: 9, minHeight: 38 }}>
              MODIFIER LA SÉQUENCE
            </button>
          </ConfigCard>
        ) : (
          <>
            <ConfigCard step="05" title="RÈGLES AVANCÉES" subtitle="Réglages fins du moteur" color={primary}>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <Label>TOUCHES VALIDES POUR AVANCER</Label>
                  <Segmented
                    value={String(rules.minValidHitsToAdvance || 1)}
                    color={primary}
                    options={[["1", "1 hit"], ["2", "2 hits"], ["3", "3 hits"]]}
                    onChange={(v) => patchRules({ minValidHitsToAdvance: Number(v) })}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: `1px solid ${T.stroke}`, paddingTop: 10 }}>
                  <div>
                    <Label>SCORER UNIQUEMENT LES FLÈCHES VALIDES</Label>
                    <div style={{ fontSize: 10.5, color: T.soft }}>OFF = toutes les flèches marquent, mais seules les touches conformes font avancer.</div>
                  </div>
                  <button type="button" onClick={() => patchRules({ scoreOnlyValid: !rules.scoreOnlyValid })} style={togglePill(primary, rules.scoreOnlyValid !== false)}>
                    {rules.scoreOnlyValid !== false ? "☑ ON" : "☐ OFF"}
                  </button>
                </div>
              </div>
            </ConfigCard>

            <ConfigCard step="06" title="ÉDITEUR DE SÉQUENCE" subtitle={`${rules.rounds.length} round${rules.rounds.length > 1 ? "s" : ""}`} color={secondary}>
              <RoundStrip rounds={rules.rounds} activeIndex={selectedRoundIndex} color={secondary} onSelect={setSelectedRoundIndex} />
              {activeRound ? (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 16, border: `1px solid ${secondary}44`, background: "rgba(0,0,0,.22)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: secondary, fontSize: 10, fontWeight: 1000, letterSpacing: .8 }}>ROUND {selectedRoundIndex + 1}</div>
                      <div style={{ fontSize: 14, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeRound.label}</div>
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <TinyButton label="↑" onClick={() => moveRound(selectedRoundIndex, -1)} disabled={selectedRoundIndex === 0} color={primary} />
                      <TinyButton label="↓" onClick={() => moveRound(selectedRoundIndex, 1)} disabled={selectedRoundIndex >= rules.rounds.length - 1} color={primary} />
                      <TinyButton label="×" onClick={() => removeRound(selectedRoundIndex)} disabled={rules.rounds.length <= 1} color={T.red} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 9 }}>
                    <div>
                      <Label>NOM DU ROUND</Label>
                      <input value={activeRound.label || ""} onChange={(e) => updateRound(selectedRoundIndex, { label: e.target.value })} style={inputStyle(secondary)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <Label>TYPE</Label>
                        <select value={activeRound.type} onChange={(e) => updateRound(selectedRoundIndex, { type: e.target.value as any })} style={inputStyle(primary)}>
                          <option value="TARGET_NUMBER">Cible numéro</option>
                          <option value="TARGET_BULL">Bull</option>
                          <option value="ANY_SCORE">Score libre</option>
                        </select>
                      </div>
                      <div>
                        <Label>MULTIPLICATEUR</Label>
                        <select value={activeRound.multiplierRule || "ANY"} onChange={(e) => updateRound(selectedRoundIndex, { multiplierRule: e.target.value as BatardMultiplierRule })} style={inputStyle(primary)}>
                          <option value="ANY">Libre</option>
                          <option value="SINGLE">Simple</option>
                          <option value="DOUBLE">Double</option>
                          <option value="TRIPLE">Triple</option>
                        </select>
                      </div>
                    </div>
                    {activeRound.type === "TARGET_NUMBER" ? (
                      <div>
                        <Label>CIBLE 1–20</Label>
                        <NumberField value={Number(activeRound.target || 20)} min={1} max={20} onChange={(v) => updateRound(selectedRoundIndex, { target: Math.max(1, Math.min(20, v)) })} />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <button type="button" onClick={addRound} style={{ ...actionButton(secondary), marginTop: 9, minHeight: 38 }}>
                ＋ AJOUTER UN ROUND
              </button>
            </ConfigCard>
          </>
        )}

        <div style={{ ...panel(ready ? primary : T.soft), padding: 10, position: "relative", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5, marginBottom: 9 }}>
            <MiniKpi label="JOUEURS" value={participantsCount} color={primary} />
            <MiniKpi label="FORMAT" value={presetId === "custom" ? "CUSTOM" : presetId.toUpperCase()} color={secondary} />
            <MiniKpi label="ROUNDS" value={rules.rounds.length} color={T.green} />
          </div>
          <div style={{ color: ready ? T.text : T.red, fontSize: 10.5, fontWeight: 850, textAlign: "center", marginBottom: 8 }}>
            {ready ? `${WIN_LABEL[rules.winMode]} • ${FAIL_LABEL[rules.failPolicy]}` : "Sélectionne au moins 2 participants pour lancer la partie."}
          </div>
          <button type="button" disabled={!ready} onClick={start} style={{ ...startButton(primary, ready), width: "100%" }}>
            LANCER LA PARTIE
          </button>
        </div>
      </main>
    </div>
  );
}

function panel(color: string): React.CSSProperties {
  return {
    borderRadius: 18,
    border: `1px solid ${color}45`,
    background: "linear-gradient(180deg, rgba(255,255,255,.065), rgba(5,8,16,.74))",
    boxShadow: `0 10px 26px rgba(0,0,0,.28), 0 0 20px ${color}10`,
    minWidth: 0,
    boxSizing: "border-box",
  };
}

function ConfigCard({ step, title, subtitle, color, children }: any) {
  return (
    <section style={{ ...panel(color), padding: 10, marginBottom: 9 }}>
      <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr)", gap: 9, alignItems: "center", marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", border: `1px solid ${color}88`, background: `${color}12`, color, fontSize: 11, fontWeight: 1100, boxShadow: `0 0 14px ${color}22` }}>{step}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color, fontSize: 12, fontWeight: 1100, letterSpacing: .9 }}>{title}</div>
          <div style={{ color: T.soft, fontSize: 10.5, marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      {children}
    </section>
  );
}

function ViewButton({ active, color, label, sub, onClick }: any) {
  return (
    <button type="button" onClick={onClick} style={{ minHeight: 52, borderRadius: 14, border: active ? `1px solid ${color}` : `1px solid ${T.stroke}`, background: active ? `${color}18` : "rgba(255,255,255,.025)", color: active ? color : T.soft, boxShadow: active ? `0 0 16px ${color}22` : "none", cursor: "pointer", padding: "6px 8px" }}>
      <div style={{ fontSize: 10.5, fontWeight: 1100 }}>{label}</div>
      <div style={{ fontSize: 8.5, opacity: .78, marginTop: 2 }}>{sub}</div>
    </button>
  );
}

function PresetCard({ active, color, title, big, sub, onClick }: any) {
  return (
    <button type="button" onClick={onClick} style={{ minWidth: 0, minHeight: 84, borderRadius: 15, border: active ? `1px solid ${color}` : `1px solid ${T.stroke}`, background: active ? `linear-gradient(180deg, ${color}18, rgba(0,0,0,.28))` : "rgba(255,255,255,.025)", boxShadow: active ? `0 0 16px ${color}22` : "none", color: T.text, padding: "8px 4px", cursor: "pointer" }}>
      <div style={{ color, fontSize: 8.5, fontWeight: 1100, letterSpacing: .5 }}>{title}</div>
      <div style={{ marginTop: 5, fontSize: String(big).length > 3 ? 17 : 23, fontWeight: 1100, lineHeight: 1, color }}>{big}</div>
      <div style={{ marginTop: 4, color: T.soft, fontSize: 8.5 }}>{sub}</div>
    </button>
  );
}

function MiniKpi({ label, value, color }: any) {
  return (
    <div style={{ minWidth: 0, padding: "6px 3px", borderRadius: 11, border: `1px solid ${T.stroke}`, background: "rgba(255,255,255,.035)", textAlign: "center" }}>
      <div style={{ color: T.soft, fontSize: 7.5, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ color, marginTop: 2, fontSize: 13, lineHeight: 1, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  );
}

function ChoiceGrid({ children }: any) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>{children}</div>;
}

function Choice({ active, color, title, text, onClick }: any) {
  return (
    <button type="button" onClick={onClick} style={{ minWidth: 0, borderRadius: 15, border: active ? `1px solid ${color}` : `1px solid ${T.stroke}`, background: active ? `${color}13` : "rgba(255,255,255,.025)", boxShadow: active ? `0 0 15px ${color}18` : "none", color: T.text, textAlign: "left", padding: 9, cursor: "pointer" }}>
      <div style={{ color: active ? color : T.text, fontSize: 10, fontWeight: 1100, letterSpacing: .45 }}>{active ? "● " : "○ "}{title}</div>
      <div style={{ marginTop: 4, color: T.soft, fontSize: 9.2, lineHeight: 1.3 }}>{text}</div>
    </button>
  );
}

function RoundStrip({ rounds, activeIndex, color, onSelect }: any) {
  return (
    <div className="dc-scroll-thin" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "2px 1px 5px" }}>
      {(rounds || []).map((round: BatardRound, index: number) => {
        const active = index === activeIndex;
        return (
          <button key={round.id || index} type="button" onClick={() => onSelect(index)} style={{ flex: "0 0 auto", minWidth: 56, height: 43, borderRadius: 13, border: active ? `1px solid ${color}` : `1px solid ${T.stroke}`, background: active ? `${color}18` : "rgba(255,255,255,.03)", color: active ? color : T.text, padding: "4px 8px", cursor: activeIndex < 0 ? "default" : "pointer" }}>
            <div style={{ fontSize: 7.5, color: T.soft, fontWeight: 900 }}>R{index + 1}</div>
            <div style={{ fontSize: 10.5, fontWeight: 1100, marginTop: 1 }}>{roundShort(round)}</div>
          </button>
        );
      })}
    </div>
  );
}

function Label({ children }: any) {
  return <div style={{ color: T.soft, fontSize: 8.5, fontWeight: 1000, letterSpacing: .6, marginBottom: 5 }}>{children}</div>;
}

function Segmented({ value, options, color, onChange }: any) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length},minmax(0,1fr))`, gap: 5 }}>
      {options.map(([id, label]: any) => (
        <button key={id} type="button" onClick={() => onChange(id)} style={{ minHeight: 34, borderRadius: 11, border: value === id ? `1px solid ${color}` : `1px solid ${T.stroke}`, background: value === id ? `${color}17` : "rgba(255,255,255,.025)", color: value === id ? color : T.soft, fontSize: 9.5, fontWeight: 1000, cursor: "pointer" }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function NumberField({ value, min, max, onChange }: any) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value || min))))}
      style={{ width: "100%", height: 38, boxSizing: "border-box", borderRadius: 12, border: `1px solid ${T.stroke}`, background: "rgba(0,0,0,.28)", color: T.text, fontSize: 14, fontWeight: 1000, textAlign: "center", outline: "none" }}
    />
  );
}

function TinyButton({ label, onClick, disabled, color }: any) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ width: 32, height: 30, borderRadius: 10, border: `1px solid ${color}66`, background: `${color}10`, color, opacity: disabled ? .3 : 1, fontWeight: 1100, cursor: disabled ? "default" : "pointer" }}>
      {label}
    </button>
  );
}

function inputStyle(color: string): React.CSSProperties {
  return { width: "100%", height: 38, boxSizing: "border-box", borderRadius: 12, border: `1px solid ${color}55`, background: "rgba(0,0,0,.28)", color: T.text, padding: "0 10px", outline: "none", fontSize: 11.5, fontWeight: 850 };
}

function actionButton(color: string): React.CSSProperties {
  return { width: "100%", borderRadius: 12, border: `1px solid ${color}66`, background: `${color}11`, color, fontSize: 10, fontWeight: 1100, letterSpacing: .5, cursor: "pointer" };
}

function togglePill(color: string, active: boolean): React.CSSProperties {
  return { flex: "0 0 auto", minWidth: 62, height: 32, borderRadius: 999, border: `1px solid ${color}${active ? "bb" : "55"}`, background: active ? `${color}18` : "rgba(255,255,255,.035)", color: active ? color : T.soft, fontSize: 9.5, fontWeight: 1100, cursor: "pointer" };
}

function startButton(color: string, active: boolean): React.CSSProperties {
  return { minHeight: 48, borderRadius: 15, border: active ? `1px solid ${color}` : `1px solid ${T.stroke}`, background: active ? `linear-gradient(135deg, ${color}32, ${color}10)` : "rgba(255,255,255,.035)", color: active ? color : "rgba(255,255,255,.35)", fontSize: 13, fontWeight: 1100, letterSpacing: .9, boxShadow: active ? `0 0 20px ${color}24` : "none", cursor: active ? "pointer" : "not-allowed" };
}
