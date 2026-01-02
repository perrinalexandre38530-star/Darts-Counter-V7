// @ts-nocheck
// ============================================
// src/pages/Tournaments.tsx
// TOURNOIS — LISTE / CREATE (Local) — V3 (NO LIMITS + BIG TOURNAMENTS)
//
// ✅ 4 types : Simple KO / Double KO / Championnat (RR) / Poules + KO
// ✅ Repêchage toggle : affiche onglet Repêchage dans TournamentView
//
// ✅ NEW (THIS PATCH):
// - "Max joueurs" (optionnel) : vide = illimité
// - "Joueurs par poule" (au lieu de limiter 2/3/4/…)
//   -> nbPoules auto = ceil(N / joueursParPoule)
// - RR tours (déjà) + estimation du nb de matchs (warning perf si énorme)
// - KO : Bracket "Auto" (recommandé) ou "Manuel" (taille cible libre)
//   -> pas de limites 4/8/16 : champ numérique + auto pow2
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import type { Tournament, TournamentViewKind } from "../lib/tournaments/types";
import {
  createTournamentDraft,
  buildInitialMatches,
} from "../lib/tournaments/engine";
import {
  listTournamentsLocal,
  upsertTournamentLocal,
  upsertMatchesForTournamentLocal,
} from "../lib/tournaments/storeLocal";

const TYPE_LABEL: Record<TournamentViewKind, string> = {
  single_ko: "Élimination simple",
  double_ko: "Élimination double",
  round_robin: "Championnat (Round Robin)",
  groups_ko: "Poules + KO",
};

function clamp(n: number, a: number, b: number) {
  const x = Number.isFinite(n) ? n : a;
  return Math.max(a, Math.min(b, x));
}

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function nextPow2(n: number) {
  const x = Math.max(1, n | 0);
  let p = 1;
  while (p < x) p <<= 1;
  return p;
}

function estimateRRMatches(totalPlayers: number, groupsCount: number, rounds: number) {
  const n = Math.max(0, totalPlayers | 0);
  const g = Math.max(1, groupsCount | 0);
  const r = Math.max(1, rounds | 0);
  // Répartition approximative équilibrée
  const base = Math.floor(n / g);
  const rem = n % g;
  let matches = 0;
  for (let i = 0; i < g; i++) {
    const gi = base + (i < rem ? 1 : 0);
    matches += (gi * (gi - 1)) / 2;
  }
  return Math.round(matches * r);
}

export default function Tournaments({ store, go }: any) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [list, setList] = React.useState<Tournament[]>(
    () => (listTournamentsLocal?.() as any) || []
  );

  const [name, setName] = React.useState("Tournoi");
  const [mode, setMode] = React.useState<"x01" | "cricket" | "killer">("x01");

  const [viewKind, setViewKind] = React.useState<TournamentViewKind>("groups_ko");

  // ✅ NEW : max joueurs (optionnel, vide = illimité)
  const [maxPlayers, setMaxPlayers] = React.useState<string>("");

  // RR options
  const [rrRounds, setRrRounds] = React.useState(1);

  // ✅ NEW : poules pilotées par "joueurs par poule"
  const [playersPerGroup, setPlayersPerGroup] = React.useState<string>("4");
  const [qualifiers, setQualifiers] = React.useState(2);

  // repêchage
  const [repechageEnabled, setRepechageEnabled] = React.useState(false);

  // ✅ NEW : bracket sizing
  const [bracketAuto, setBracketAuto] = React.useState(true);
  const [bracketTarget, setBracketTarget] = React.useState<string>("");

  React.useEffect(() => {
    try {
      setList((listTournamentsLocal?.() as any) || []);
    } catch {
      setList([]);
    }
  }, []);

  function refresh() {
    try {
      setList((listTournamentsLocal?.() as any) || []);
    } catch {
      setList([]);
    }
  }

  function buildStagesForKind(kind: TournamentViewKind, totalPlayers: number) {
    if (kind === "single_ko") {
      return [{ id: "ko", type: "single_elim", role: "ko", name: "Phase finale", seeding: "random" }];
    }
    if (kind === "double_ko") {
      return [
        { id: "w", type: "single_elim", role: "ko", name: "Winners Bracket", seeding: "random" },
        { id: "l", type: "single_elim", role: "repechage", name: "Losers Bracket", seeding: "random" },
        { id: "gf", type: "single_elim", role: "ko", name: "Grande Finale", seeding: "random" },
      ];
    }
    if (kind === "round_robin") {
      return [
        {
          id: "rr",
          type: "round_robin",
          role: "groups",
          name: "Championnat",
          groups: 1,
          rounds: Math.max(1, Number(rrRounds) || 1),
          qualifiersPerGroup: 0,
          seeding: "random",
        },
      ];
    }

    // groups_ko
    const ppgRaw = Number(String(playersPerGroup || "").trim());
    const ppg = clamp(ppgRaw || 4, 2, 9999); // libre, juste un plancher
    const groupsCount = Math.max(1, Math.ceil(Math.max(2, totalPlayers) / ppg));
    const q = clamp(Number(qualifiers) || 1, 1, Math.max(1, ppg));

    return [
      {
        id: "rr",
        type: "round_robin",
        role: "groups",
        name: "Poules",
        groups: groupsCount,
        rounds: Math.max(1, Number(rrRounds) || 1),
        qualifiersPerGroup: q,
        seeding: "random",
      },
      { id: "ko", type: "single_elim", role: "ko", name: "Phase finale", seeding: "random" },
      ...(repechageEnabled
        ? [{ id: "rep", type: "single_elim", role: "repechage", name: "Repêchage", seeding: "random" }]
        : []),
    ];
  }

  function createTournament() {
    let players = (store?.profiles || [])
      .filter((p: any) => p?.id)
      .map((p: any) => ({
        id: String(p.id),
        name: p.name || "Joueur",
        avatarDataUrl: p.avatarDataUrl ?? null,
        avatarUrl: p.avatarUrl ?? null,
        countryCode: p.countryCode ?? null,
        isBot: !!p.isBot,
      }));

    if (players.length < 2) {
      alert("Ajoute au moins 2 profils locaux pour créer un tournoi.");
      return;
    }

    // ✅ cap max joueurs (optionnel). Si dépasse -> on prend un échantillon aléatoire.
    const cap = Number(String(maxPlayers || "").trim());
    if (Number.isFinite(cap) && cap > 1 && players.length > cap) {
      players = shuffle(players).slice(0, cap);
    }

    const totalPlayers = players.length;

    // ✅ bracket sizing (info seulement, l’engine peut l’ignorer si non supporté)
    const rawTarget = Number(String(bracketTarget || "").trim());
    const targetSize =
      !bracketAuto && Number.isFinite(rawTarget) && rawTarget >= 2
        ? Math.floor(rawTarget)
        : null;
    const bracketAutoSize = nextPow2(totalPlayers);

    // stages (groupsCount calculé depuis joueurs/poule)
    const stages = buildStagesForKind(viewKind, totalPlayers);

    const tour = createTournamentDraft({
      name: name?.trim() || "Tournoi",
      source: "local",
      ownerProfileId: store?.activeProfileId ?? null,
      players,
      viewKind,
      repechage: { enabled: !!repechageEnabled },
      game: {
        mode,
        rules:
          mode === "x01"
            ? { start: 501, doubleOut: true }
            : mode === "cricket"
            ? { cutThroat: false }
            : mode === "killer"
            ? { lives: 5 }
            : {},
      },
      stages,

      // ✅ meta (safe): utile pour UI/engine si tu le gères plus tard
      bracket: {
        auto: !!bracketAuto,
        targetSize: targetSize,
        autoSize: bracketAutoSize,
      },
    } as any);

    const matches = buildInitialMatches(tour);

    upsertTournamentLocal(tour as any);
    upsertMatchesForTournamentLocal(tour.id, matches as any);

    refresh();
    go("tournament_view", { id: tour.id });
  }

  const kindHelp = React.useMemo(() => {
    if (viewKind === "single_ko") return "Élimination directe : bracket + matchs par tour (1/8, 1/4, etc).";
    if (viewKind === "double_ko") return "Double élimination : Winners + Repêchage (Losers) + Grande finale.";
    if (viewKind === "round_robin") return "Championnat : classement + rounds (ROUND 1, ROUND 2…).";
    return "Poules + KO : poules (auto) + classement + bracket KO.";
  }, [viewKind]);

  // estimation RR
  const playersCountAll = ((store?.profiles || []).filter((p: any) => p?.id) || []).length;
  const cap = Number(String(maxPlayers || "").trim());
  const effectivePlayers = Number.isFinite(cap) && cap > 1 ? Math.min(playersCountAll, cap) : playersCountAll;

  const computedGroups = React.useMemo(() => {
    if (viewKind !== "groups_ko") return 1;
    const ppgRaw = Number(String(playersPerGroup || "").trim());
    const ppg = clamp(ppgRaw || 4, 2, 9999);
    return Math.max(1, Math.ceil(Math.max(2, effectivePlayers) / ppg));
  }, [viewKind, playersPerGroup, effectivePlayers]);

  const rrMatchesEst = React.useMemo(() => {
    if (!(viewKind === "round_robin" || viewKind === "groups_ko")) return 0;
    const groupsCount = viewKind === "round_robin" ? 1 : computedGroups;
    return estimateRRMatches(effectivePlayers, groupsCount, Math.max(1, Number(rrRounds) || 1));
  }, [viewKind, effectivePlayers, computedGroups, rrRounds]);

  const showRRConfig = viewKind === "round_robin" || viewKind === "groups_ko";
  const showGroupConfig = viewKind === "groups_ko";
  const showRepechageToggle = viewKind === "double_ko" || viewKind === "groups_ko";
  const showBracketConfig = viewKind !== "round_robin"; // KO / groups_ko / double_ko

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => go("games")}
          style={{
            borderRadius: 12,
            padding: "8px 10px",
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            color: theme.text,
          }}
        >
          ←
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 950, color: theme.primary, textShadow: `0 0 12px ${theme.primary}66` }}>
            TOURNOIS (LOCAL)
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4 }}>
            {list.length} tournoi{list.length > 1 ? "s" : ""} • Crée & joue plusieurs matchs
          </div>
        </div>
        <div style={{ width: 44 }} />
      </div>

      {/* CREATE */}
      <div
        style={{
          marginTop: 14,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          padding: 14,
          boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontWeight: 950, color: theme.primary, textShadow: `0 0 10px ${theme.primary}44`, marginBottom: 10 }}>
          ➕ Créer un tournoi
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du tournoi"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,.18)",
              color: theme.text,
              outline: "none",
              fontSize: 13.5,
            }}
          />

          {/* ✅ NEW : Cap max joueurs */}
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 900 }}>Participants</div>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                placeholder="Max joueurs (vide = illimité)"
                inputMode="numeric"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,.18)",
                  color: theme.text,
                  outline: "none",
                  fontSize: 13.5,
                }}
              />
              <div
                style={{
                  borderRadius: 14,
                  padding: "10px 12px",
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,.14)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 12.5,
                  whiteSpace: "nowrap",
                }}
                title="Nombre de profils locaux détectés"
              >
                {playersCountAll} profils
              </div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
              Utilisé pour éviter les ajouts accidentels. Si tu as plus de profils que le max, on prend un échantillon aléatoire.
            </div>
          </div>

          {/* Type tournoi */}
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 900 }}>Type de tournoi</div>
            <select
              value={viewKind}
              onChange={(e) => setViewKind(e.target.value as any)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,.18)",
                color: theme.text,
              }}
            >
              <option value="single_ko">{TYPE_LABEL.single_ko}</option>
              <option value="double_ko">{TYPE_LABEL.double_ko}</option>
              <option value="round_robin">{TYPE_LABEL.round_robin}</option>
              <option value="groups_ko">{TYPE_LABEL.groups_ko}</option>
            </select>
            <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>{kindHelp}</div>
          </div>

          {/* Mode jeu + RR rounds */}
          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,.18)",
                color: theme.text,
              }}
            >
              <option value="x01">X01</option>
              <option value="cricket">Cricket</option>
              <option value="killer">Killer</option>
            </select>

            {showRRConfig ? (
              <select
                value={rrRounds}
                onChange={(e) => setRrRounds(Number(e.target.value))}
                style={{
                  width: 160,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(0,0,0,.18)",
                  color: theme.text,
                }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} tour{n > 1 ? "s" : ""} RR
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {/* ✅ NEW : Poules pilotées par joueurs/poule */}
          {showGroupConfig ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 900 }}>Poules</div>

              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={playersPerGroup}
                  onChange={(e) => setPlayersPerGroup(e.target.value)}
                  placeholder="Joueurs par poule (ex: 5)"
                  inputMode="numeric"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(0,0,0,.18)",
                    color: theme.text,
                    outline: "none",
                    fontSize: 13.5,
                  }}
                />

                <select
                  value={qualifiers}
                  onChange={(e) => setQualifiers(Number(e.target.value))}
                  style={{
                    width: 170,
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(0,0,0,.18)",
                    color: theme.text,
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} qualif/poule
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
                Nb poules auto ≈ <b>{computedGroups}</b> (sur {effectivePlayers} joueurs).<br />
                Les qualifs/poule seront clampés pour rester cohérents.
              </div>
            </div>
          ) : null}

          {/* ✅ NEW : Estimation RR */}
          {showRRConfig ? (
            <div
              style={{
                borderRadius: 14,
                padding: "10px 12px",
                border: `1px solid ${theme.borderSoft}`,
                background: rrMatchesEst > 2000 ? "rgba(255,80,120,0.12)" : "rgba(0,0,0,.14)",
              }}
            >
              <div style={{ fontWeight: 950, marginBottom: 4 }}>
                Estimation matchs RR : <span style={{ color: rrMatchesEst > 2000 ? "#ff5c8a" : theme.primary }}>{rrMatchesEst}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.35 }}>
                {rrMatchesEst > 5000
                  ? "⚠️ Très gros volume : l’UI & le stockage peuvent devenir lourds. Recommande Poules + KO."
                  : rrMatchesEst > 2000
                  ? "⚠️ Gros volume : ça peut charger lentement. Pense à augmenter joueurs/poule ou réduire les tours."
                  : "OK pour la plupart des appareils."}
              </div>
            </div>
          ) : null}

          {/* ✅ NEW : Bracket sizing (KO) */}
          {showBracketConfig ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12.5, opacity: 0.85, fontWeight: 900 }}>Phase finale (bracket)</div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setBracketAuto(true)}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    padding: "10px 12px",
                    border: `1px solid ${bracketAuto ? theme.primary + "AA" : theme.borderSoft}`,
                    background: bracketAuto ? `linear-gradient(180deg, ${theme.primary}, ${theme.primary}CC)` : "rgba(0,0,0,.14)",
                    color: bracketAuto ? "#1b1508" : theme.text,
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  Auto (recommandé)
                </button>

                <button
                  type="button"
                  onClick={() => setBracketAuto(false)}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    padding: "10px 12px",
                    border: `1px solid ${!bracketAuto ? "#b6b6ffAA" : theme.borderSoft}`,
                    background: !bracketAuto ? "linear-gradient(180deg,#b6b6ff,#8d8dff)" : "rgba(0,0,0,.14)",
                    color: !bracketAuto ? "#120c06" : theme.text,
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  Manuel
                </button>
              </div>

              {!bracketAuto ? (
                <input
                  value={bracketTarget}
                  onChange={(e) => setBracketTarget(e.target.value)}
                  placeholder="Taille bracket (ex: 24, 32, 48...)"
                  inputMode="numeric"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(0,0,0,.18)",
                    color: theme.text,
                    outline: "none",
                    fontSize: 13.5,
                  }}
                />
              ) : null}

              <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
                Auto = prochaine puissance de 2 (byes auto). Pour {effectivePlayers} joueurs : <b>{nextPow2(effectivePlayers)}</b>.
              </div>
            </div>
          ) : null}

          {/* Repêchage toggle */}
          {showRepechageToggle ? (
            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 14,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,.14)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={repechageEnabled}
                onChange={(e) => setRepechageEnabled(e.target.checked)}
              />
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontWeight: 950 }}>Activer le repêchage</div>
                <div style={{ fontSize: 12, opacity: 0.78 }}>
                  Affiche un onglet <b>Repêchage</b> (matches dédiés).
                </div>
              </div>
            </label>
          ) : null}

          <button
            onClick={createTournament}
            style={{
              borderRadius: 999,
              padding: "11px 12px",
              border: "none",
              fontWeight: 950,
              background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
              color: "#1b1508",
              cursor: "pointer",
            }}
          >
            Créer & ouvrir
          </button>

          <div style={{ fontSize: 12.5, opacity: 0.78, lineHeight: 1.35 }}>
            ✅ Plus de limites “4/8/16”. Tu peux organiser de très gros tournois (attention au volume RR).
          </div>
        </div>
      </div>

      {/* LIST */}
      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {list.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Aucun tournoi pour le moment.</div>
        ) : (
          list
            .slice()
            .sort((a: any, b: any) => (b?.updatedAt ?? 0) - (a?.updatedAt ?? 0))
            .map((tour: any) => (
              <button
                key={tour.id}
                onClick={() => go("tournament_view", { id: tour.id })}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 16,
                  border: `1px solid ${theme.borderSoft}`,
                  background: theme.card,
                  padding: 14,
                  cursor: "pointer",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.40)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 950, color: theme.primary, textShadow: `0 0 10px ${theme.primary}44` }}>
                    {tour.name}
                  </div>
                  <div style={{ fontSize: 11.5, opacity: 0.8 }}>
                    {TYPE_LABEL[String(tour.viewKind || "groups_ko") as any] || "Tournoi"}
                  </div>
                </div>

                <div style={{ fontSize: 12.5, opacity: 0.82, marginTop: 6 }}>
                  {String(tour.game?.mode || "").toUpperCase()} • {String(tour.status || "").toUpperCase()} • {(tour.players || []).length} joueurs
                  {tour.repechage?.enabled ? " • Repêchage" : ""}
                </div>
              </button>
            ))
        )}
      </div>
    </div>
  );
}
