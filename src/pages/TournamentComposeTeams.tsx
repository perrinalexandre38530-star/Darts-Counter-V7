// @ts-nocheck
// ============================================
// src/pages/TournamentComposeTeams.tsx
// PÉTANQUE — Étape B : Composition des équipes engagées (Club / Ad-hoc)
// - Lit un draft depuis sessionStorage (dc-petanque-compose-draft-v1)
// - Permet d'affecter les joueurs aux équipes (lineup) avec verrouillage (pas de doublon)
// - Source joueurs: roster d'équipe club + profils locaux
// ============================================

import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import { loadTeamsBySport, createTeam as createClubTeam, upsertTeam as upsertClubTeam } from "../lib/petanqueTeamsStore";

const DRAFT_KEY = "dc-petanque-compose-draft-v1";

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function TournamentComposeTeams({ store, go, params }: any) {
  const draft = React.useMemo(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const teamSize = Number(draft?.teamSize) || 2;
  const mode = String(draft?.mode || "teams"); // "club" | "teams"
  const [entries, setEntries] = React.useState<any[]>(Array.isArray(draft?.entries) ? draft.entries : []);
  const [activeEntryId, setActiveEntryId] = React.useState<string>(String(draft?.activeEntryId || entries?.[0]?.entryId || ""));
  const [tab, setTab] = React.useState<"roster" | "profiles">("roster");
  const [query, setQuery] = React.useState("");

  // Club teams
  const [clubTeams, setClubTeams] = React.useState<any[]>([]);
  React.useEffect(() => {
    try {
      setClubTeams(loadTeamsBySport("petanque") || []);
    } catch {
      setClubTeams([]);
    }
  }, []);

  // Profiles (local)
  const profiles = React.useMemo(() => {
    const arr = (store as any)?.profiles || [];
    return arr
      .filter((p: any) => p?.id)
      .map((p: any) => ({
        id: String(p.id),
        name: p?.name || p?.displayName || p?.pseudo || "Joueur",
        avatar: p?.avatarUrl || p?.avatarDataUrl || p?.avatar || p?.photo || null,
        raw: p,
      }))
      .filter((p: any) => !!p.id);
  }, [store]);

  const usedIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const e of entries || []) {
      for (const pid of (e?.lineupIds || [])) if (pid) set.add(String(pid));
    }
    return set;
  }, [entries]);

  const activeEntry = React.useMemo(() => (entries || []).find((e) => String(e?.entryId) === String(activeEntryId)), [entries, activeEntryId]);
  const activeClubTeam = React.useMemo(() => {
    const sid = String(activeEntry?.sourceTeamId || "");
    if (!sid) return null;
    return (clubTeams || []).find((t) => String(t?.id) === sid) || null;
  }, [activeEntry, clubTeams]);

  const rosterIds = React.useMemo(() => {
    const arr = Array.isArray(activeClubTeam?.playerIds) ? activeClubTeam.playerIds : [];
    return arr.map(String);
  }, [activeClubTeam]);

  const pool = React.useMemo(() => {
    const q = String(query || "").trim().toLowerCase();

    const baseIds =
      tab === "roster"
        ? rosterIds
        : profiles.map((p: any) => String(p.id));

    const list = baseIds
      .map((pid: string) => profiles.find((p: any) => String(p.id) === pid))
      .filter(Boolean)
      .filter((p: any) => {
        if (!q) return true;
        return String(p?.name || "").toLowerCase().includes(q);
      });

    return list;
  }, [tab, rosterIds, profiles, query]);

  function saveBack() {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          ...draft,
          entries,
          activeEntryId,
        })
      );
    } catch {}
  }

  React.useEffect(() => {
    saveBack();
  }, [entries, activeEntryId]);

  function addToActive(pid: string) {
    if (!activeEntry) return;
    const id = String(pid);
    setEntries((prev) => {
      const next = [...(prev || [])];
      const idx = next.findIndex((e) => String(e.entryId) === String(activeEntry.entryId));
      if (idx < 0) return prev;
      const cur = (next[idx].lineupIds || []).map(String).filter(Boolean);
      if (cur.includes(id)) return prev;
      if (cur.length >= teamSize) return prev;
      // enforce no-duplicate across entries
      if (usedIds.has(id)) return prev;
      next[idx] = { ...next[idx], lineupIds: [...cur, id] };
      return next;
    });
  }

  function removeFromActive(pid: string) {
    if (!activeEntry) return;
    const id = String(pid);
    setEntries((prev) => {
      const next = [...(prev || [])];
      const idx = next.findIndex((e) => String(e.entryId) === String(activeEntry.entryId));
      if (idx < 0) return prev;
      next[idx] = { ...next[idx], lineupIds: (next[idx].lineupIds || []).map(String).filter(Boolean).filter((x: string) => x !== id) };
      return next;
    });
  }

  const allComplete = React.useMemo(() => {
    if ((entries || []).length < 2) return false;
    for (const e of entries || []) {
      if (!String(e?.name || "").trim()) return false;
      const ids = (e?.lineupIds || []).map(String).filter(Boolean);
      if (ids.length !== teamSize) return false;
    }
    return true;
  }, [entries, teamSize]);

  // Create club team inline (minimal)
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createName, setCreateName] = React.useState("");
  const [createRoster, setCreateRoster] = React.useState<string[]>([]);
  const [createQuery, setCreateQuery] = React.useState("");

  function commitCreateTeam() {
    try {
      const base = createClubTeam({ sport: "petanque", name: String(createName || "").trim() || "Équipe" });
      const next = { ...base, playerIds: [...(createRoster || [])] };
      upsertClubTeam(next);
      setCreateOpen(false);
      setCreateName("");
      setCreateRoster([]);
      setCreateQuery("");
      setClubTeams(loadTeamsBySport("petanque") || []);
    } catch {}
  }

  return (
    <div style={{ padding: 12, color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button onClick={() => go("tournament_create")} style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "#fff" }}>
          ← Retour
        </button>
        <div style={{ fontWeight: 950, opacity: 0.9 }}>Composition des équipes</div>
        <button
          onClick={() => {
            saveBack();
            go("tournament_create");
          }}
          style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "#fff" }}
        >
          Fermer
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
        Mode: <b>{mode === "club" ? "Équipes club" : "Équipes tournoi"}</b> · Taille équipe: <b>{teamSize}</b>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 12, alignItems: "start" }}>
        {/* Left: entries */}
        <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", padding: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 950 }}>Équipes engagées</div>
            {mode === "club" ? (
              <button onClick={() => setCreateOpen(true)} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(0,0,0,0.25)", color: "#fff", fontWeight: 900 }}>
                + Équipe club
              </button>
            ) : null}
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {(entries || []).map((e: any) => {
              const filled = (e?.lineupIds || []).filter(Boolean).length;
              const active = String(e?.entryId) === String(activeEntryId);
              return (
                <div
                  key={e.entryId}
                  onClick={() => setActiveEntryId(String(e.entryId))}
                  style={{
                    cursor: "pointer",
                    padding: 10,
                    borderRadius: 12,
                    border: active ? "1px solid rgba(255,220,120,0.55)" : "1px solid rgba(255,255,255,0.10)",
                    background: active ? "rgba(255,220,120,0.08)" : "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>{e?.name || "Équipe"}</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>{filled}/{teamSize}</div>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                    {(e?.lineupIds || []).filter(Boolean).map((pid: string) => {
                      const p = profiles.find((x: any) => String(x.id) === String(pid));
                      return (
                        <div key={pid} title={p?.name || ""} style={{ flex: "0 0 auto" }}>
                          <ProfileAvatar name={p?.name || "Joueur"} src={p?.avatar || null} size={44} />
                        </div>
                      );
                    })}
                    {Array.from({ length: Math.max(0, teamSize - filled) }).map((_, i) => (
                      <div key={`slot-${i}`} style={{ width: 44, height: 44, borderRadius: 999, border: "1px dashed rgba(255,255,255,0.25)", opacity: 0.35 }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {createOpen ? (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 950 }}>Nouvelle équipe club</div>
                <button onClick={() => setCreateOpen(false)} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(0,0,0,0.25)", color: "#fff", fontWeight: 900 }}>
                  Fermer
                </button>
              </div>

              <input value={createName} onChange={(e: any) => setCreateName(e.target.value)} placeholder="Nom de l'équipe" style={{ marginTop: 8, width: "100%", padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)", color: "#fff" }} />

              <input value={createQuery} onChange={(e: any) => setCreateQuery(e.target.value)} placeholder="Rechercher un joueur..." style={{ marginTop: 8, width: "100%", padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)", color: "#fff" }} />

              <div style={{ marginTop: 8, display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
                {profiles
                  .filter((p: any) => {
                    const q = String(createQuery || "").trim().toLowerCase();
                    if (!q) return true;
                    return String(p?.name || "").toLowerCase().includes(q);
                  })
                  .map((p: any) => {
                    const pid = String(p.id);
                    const active = createRoster.includes(pid);
                    return (
                      <div key={pid} style={{ flex: "0 0 auto", textAlign: "center", opacity: active ? 1 : 0.7 }}>
                        <div
                          onClick={() => {
                            setCreateRoster((prev) => {
                              const set = new Set(prev || []);
                              if (set.has(pid)) set.delete(pid);
                              else set.add(pid);
                              return Array.from(set);
                            });
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <ProfileAvatar name={p?.name || "Joueur"} src={p?.avatar || null} size={54} />
                        </div>
                        <div style={{ marginTop: 6, fontSize: 11, fontWeight: 900, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p?.name}</div>
                      </div>
                    );
                  })}
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={() => setCreateOpen(false)} style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "#fff" }}>
                  Annuler
                </button>
                <button onClick={commitCreateTeam} style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid rgba(255,220,120,0.55)", background: "rgba(255,220,120,0.12)", color: "#fff", fontWeight: 950 }}>
                  Enregistrer
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right: pool */}
        <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", padding: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 950 }}>{tab === "roster" ? "Roster" : "Profils"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setTab("roster")} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)", background: tab === "roster" ? "rgba(255,220,120,0.12)" : "rgba(0,0,0,0.25)", color: "#fff", fontWeight: 900 }}>
                Roster
              </button>
              <button onClick={() => setTab("profiles")} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)", background: tab === "profiles" ? "rgba(255,220,120,0.12)" : "rgba(0,0,0,0.25)", color: "#fff", fontWeight: 900 }}>
                Profils
              </button>
            </div>
          </div>

          <input value={query} onChange={(e: any) => setQuery(e.target.value)} placeholder="Rechercher..." style={{ marginTop: 10, width: "100%", padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)", color: "#fff" }} />

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
            Clique pour <b>ajouter</b> à l’équipe active. Clique sur un avatar dans l’équipe pour <b>retirer</b>.
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {(pool || []).map((p: any) => {
              const pid = String(p.id);
              const inActive = (activeEntry?.lineupIds || []).map(String).includes(pid);
              const disabled = !inActive && usedIds.has(pid); // already used elsewhere
              return (
                <div key={pid} style={{ flex: "0 0 auto", textAlign: "center", opacity: disabled ? 0.35 : 1 }}>
                  <div
                    onClick={() => {
                      if (!activeEntry) return;
                      if (inActive) removeFromActive(pid);
                      else {
                        if (disabled) return;
                        addToActive(pid);
                      }
                    }}
                    style={{ cursor: disabled ? "not-allowed" : "pointer" }}
                  >
                    <ProfileAvatar name={p?.name || "Joueur"} src={p?.avatar || null} size={54} />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 900, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p?.name}</div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Statut: {allComplete ? <b>OK</b> : <b>Incomplet</b>}
            </div>
            <button
              onClick={() => {
                saveBack();
                go("tournament_create");
              }}
              style={{ padding: "8px 10px", borderRadius: 12, border: allComplete ? "1px solid rgba(0,255,160,0.35)" : "1px solid rgba(255,255,255,0.12)", background: allComplete ? "rgba(0,255,160,0.10)" : "rgba(0,0,0,0.25)", color: "#fff", fontWeight: 950 }}
            >
              Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
