import React, { useMemo, useState } from "react";
import type { Store, Profile } from "../lib/types";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerGolf from "../assets/tickers/ticker_golf.png";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import ProfileAvatar from "../components/ProfileAvatar";
import { PRO_BOTS } from "../lib/botsPro";
import { getProBotAvatar } from "../lib/botsProAvatars";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";

type BotLevel = "easy" | "normal" | "hard";
type HoleOrderMode = "chronological" | "random";
type GolfScoringMode = "strokes" | "points";

export type PlayerLite = {
  id: string;
  name: string;
  avatarDataUrl?: any | null;
  avatarUrl?: any | null;
  isBot?: boolean;
  botLevel?: BotLevel;
};

export type GolfConfigPayload = {
  // compat
  players: number;

  // PRO
  playersList?: PlayerLite[];

  holes: 9 | 18;
  teamsEnabled: boolean;

  botsEnabled: boolean;
  botLevel: BotLevel;

  /** Si aucune touche de la cible sur 3 flèches, on applique ces "coups" (strokes). */
  missStrokes: 4 | 5 | 6;

  /** Ordre des trous (1..9/18) */
  holeOrderMode: HoleOrderMode;

  /** Mode de scoring : strokes (score bas gagne) / points (score haut gagne) */
  scoringMode: GolfScoringMode;

  /** Afficher la grille des trous en partie */
  showHoleGrid: boolean;
};

const INFO_TEXT = `GOLF (Darts) — règles

Principe
- 9 ou 18 trous.
- Au trou N, la cible est le numéro N.
- 3 flèches par joueur, puis on valide.

Scoring
- Strokes : 1/2/3 selon la flèche du 1er hit, sinon pénalité (4/5/6). Score bas gagne.
- Points : 3/2/1 selon la flèche du 1er hit, sinon 0. Score haut gagne.

Options PRO
- Ordre des trous : chronologique ou aléatoire.
- Grille des trous : tableau récapitulatif en partie.
- Équipes (A/B) : total équipe = somme des joueurs.`;

function loadUserBots(): PlayerLite[] {
  try {
    const raw = localStorage.getItem("dc_bots_v1");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((b: any) => ({
        id: String(b?.id ?? ""),
        name: String(b?.name ?? "BOT"),
        avatarDataUrl: b?.avatarDataUrl ?? b?.avatarUrl ?? null,
        avatarUrl: b?.avatarUrl ?? null,
        isBot: true,
        botLevel: (b?.botLevel as BotLevel) || "normal",
      }))
      .filter((b: any) => b.id && b.name);
  } catch {
    return [];
  }
}

export default function GolfConfig(props: { store?: Store; go?: any; setTab?: any }) {
  const { t } = useLang();
  const theme = useTheme();

  const storeProfiles: PlayerLite[] = useMemo(() => {
    const ps = (props?.store as any)?.profiles as Profile[] | undefined;
    if (!ps || !Array.isArray(ps)) return [];
    return ps.map((p) => ({
      id: p.id,
      name: p.name,
      avatarDataUrl: (p as any).avatarDataUrl ?? null,
      avatarUrl: (p as any).avatarUrl ?? null,
      isBot: (p as any).isBot ?? false,
      botLevel: (p as any).botLevel ?? "normal",
    }));
  }, [props?.store]);

  const userBots = useMemo(() => loadUserBots(), []);
  const available = useMemo(() => {
    // profils locaux + bots user (si pas déjà dedans)
    const byId = new Map<string, PlayerLite>();
    [...storeProfiles, ...userBots].forEach((p) => byId.set(p.id, p));
    return Array.from(byId.values());
  }, [storeProfiles, userBots]);

  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [botsEnabled, setBotsEnabled] = useState(false);
  const [botLevel, setBotLevel] = useState<BotLevel>("normal");

  const [holes, setHoles] = useState<9 | 18>(9);
  const [holeOrderMode, setHoleOrderMode] = useState<HoleOrderMode>("chronological");
  const [scoringMode, setScoringMode] = useState<GolfScoringMode>("strokes");
  const [missStrokes, setMissStrokes] = useState<4 | 5 | 6>(4);
  const [showHoleGrid, setShowHoleGrid] = useState(true);

  // --- Sélection joueurs (PRO) : on privilégie les profils existants.
  const defaultIds = useMemo(() => available.slice(0, 2).map((p) => p.id), [available]);
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultIds);

  const selectedPlayers = useMemo(() => {
    const map = new Map(available.map((p) => [p.id, p] as const));
    const list = selectedIds.map((id) => map.get(id)).filter(Boolean) as PlayerLite[];
    // fallback si aucun profil dispo
    if (!list.length) {
      return [
        { id: "p1", name: "Joueur 1" },
        { id: "p2", name: "Joueur 2" },
      ];
    }
    // forcer min 2
    if (list.length === 1) return [list[0], { id: "p2", name: "Joueur 2" }];
    return list;
  }, [available, selectedIds]);

  const playersCount = Math.max(2, Math.min(8, selectedPlayers.length));

  const payload: GolfConfigPayload = useMemo(
    () => ({
      players: playersCount,
      playersList: selectedPlayers.slice(0, playersCount),
      holes,
      teamsEnabled,
      botsEnabled,
      botLevel,
      missStrokes,
      holeOrderMode,
      scoringMode,
      showHoleGrid,
    }),
    [
      playersCount,
      selectedPlayers,
      holes,
      teamsEnabled,
      botsEnabled,
      botLevel,
      missStrokes,
      holeOrderMode,
      scoringMode,
      showHoleGrid,
    ]
  );

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    if (props?.go) return props.go("games");
    window.history.back();
  }

  function start() {
    if (props?.setTab) return props.setTab("golf_play", { config: payload });
    if (props?.go) return props.go("golf_play", { config: payload });
  }

  // --- UI helpers (médaillons)
  const pillStyle: React.CSSProperties = {
    borderRadius: 999,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,0.25)",
    padding: "10px 12px",
  };

  return (
    <div className="page">
      <PageHeader
        title="GOLF"
        tickerSrc={tickerGolf}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles GOLF" content={INFO_TEXT} />}
      />

      <Section title={t("config.players", "Joueurs")}>
        {/* Sélection actuelle (carrousel style X01/Killer) */}
        <div className="dc-scroll-thin" style={{ display: "flex", gap: 14, overflowX: "auto", padding: "6px 2px 10px" }}>
          {selectedPlayers.slice(0, playersCount).map((p, idx) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                // remove (mais garder min 2)
                setSelectedIds((prev) => {
                  if (prev.length <= 2) return prev;
                  return prev.filter((x) => x !== p.id);
                });
              }}
              style={{
                width: 86,
                minWidth: 86,
                textAlign: "center",
                cursor: selectedIds.length > 2 ? "pointer" : "default",
                opacity: selectedIds.length > 2 ? 1 : 0.92,
              }}
              title={selectedIds.length > 2 ? "Cliquer pour retirer" : ""}
            >
              <div
                style={{
                  width: 86,
                  height: 86,
                  borderRadius: "50%",
                  padding: 4,
                  background: "rgba(0,0,0,0.35)",
                  border: `1px solid ${theme.borderSoft}`,
                  boxShadow: `0 0 18px ${theme.primary}33`,
                }}
              >
                <ProfileAvatar profile={p as any} size={78} />
              </div>
              <div style={{ marginTop: 8, fontWeight: 900, fontSize: 12, color: theme.text }}>
                {p.name || `${t("generic.player", "Joueur")} ${idx + 1}`}
              </div>
            </div>
          ))}
        </div>

        {/* Ajout rapide */}
        <OptionRow label={t("config.playerCount", "Nombre de joueurs")}>
          <OptionSelect
            value={playersCount}
            options={[2, 3, 4, 5, 6, 7, 8]}
            onChange={(n: number) => {
              const target = Math.max(2, Math.min(8, Number(n) || 2));
              setSelectedIds((prev) => {
                const cur = [...prev];
                // compléter avec profils dispo
                const pool = available.map((p) => p.id).filter((id) => !cur.includes(id));
                while (cur.length < target && pool.length) cur.push(pool.shift()!);
                while (cur.length > target) cur.pop();
                // si pas assez de profils, on garde la taille (Play fallback créera des noms)
                return cur.length ? cur : prev;
              });
            }}
          />
        </OptionRow>

        <OptionRow label={t("config.teams", "Mode équipes (A/B)")}>
          <OptionToggle value={teamsEnabled} onChange={setTeamsEnabled} />
        </OptionRow>

        <OptionRow label={t("config.bots", "Bots IA")}>
          <OptionToggle value={botsEnabled} onChange={setBotsEnabled} />
        </OptionRow>

        {botsEnabled && (
          <OptionRow label={t("config.botLevel", "Difficulté IA")}>
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
        )}

        {/* Liste des profils disponibles à ajouter (PRO) */}
        {available.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: theme.textSoft, marginBottom: 8 }}>
              Ajouter un profil (cliquer) :
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {available
                .filter((p) => !selectedIds.includes(p.id))
                .slice(0, 18)
                .map((p) => (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedIds((prev) => (prev.length >= 8 ? prev : [...prev, p.id]))}
                    style={{ ...pillStyle, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                    title="Ajouter"
                  >
                    <ProfileAvatar profile={p as any} size={34} />
                    <div style={{ fontWeight: 900, fontSize: 12 }}>{p.name}</div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Section>

      <Section title={t("config.rules", "Règles")}>
        <OptionRow label={t("golf.holes", "Nombre de trous")}>
          <OptionSelect value={holes} options={[9, 18]} onChange={(v: any) => setHoles(v === 18 ? 18 : 9)} />
        </OptionRow>

        <OptionRow label={t("golf.holeOrder", "Ordre des trous")}>
          <OptionSelect
            value={holeOrderMode}
            options={[
              { value: "chronological", label: "Chronologique" },
              { value: "random", label: "Aléatoire" },
            ]}
            onChange={setHoleOrderMode}
          />
        </OptionRow>

        <OptionRow label={t("golf.scoringMode", "Mode de scoring")}>
          <OptionSelect
            value={scoringMode}
            options={[
              { value: "strokes", label: "Strokes (score bas gagne)" },
              { value: "points", label: "Points (score haut gagne)" },
            ]}
            onChange={setScoringMode}
          />
        </OptionRow>

        <OptionRow label={t("golf.missPenalty", "Pénalité si aucun hit")}>
          <OptionSelect value={missStrokes} options={[4, 5, 6]} onChange={setMissStrokes} />
        </OptionRow>

        <OptionRow label={t("golf.showGrid", "Afficher la grille des trous")}>
          <OptionToggle value={showHoleGrid} onChange={setShowHoleGrid} />
        </OptionRow>
      </Section>

      <Section>
        <button className="btn-primary w-full" onClick={start}>
          {t("config.startGame", "Démarrer la partie")}
        </button>
      </Section>
    </div>
  );
}