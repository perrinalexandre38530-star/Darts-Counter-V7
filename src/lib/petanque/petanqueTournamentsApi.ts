// ============================================
// src/lib/petanque/petanqueTournamentsApi.ts
// PÉTANQUE TOURNOIS — API Supabase (online)
// - Tournois + matchs séparés des tournois Darts
// ============================================

import { supabase } from "../supabaseClient";

export type PetanqueTournament = {
  id: string;
  created_at: string;
  updated_at: string;
  owner_user_id: string | null;
  name: string;
  invite_code: string;
  visibility: "public" | "private";
  target_score: number;
  payload: any;
};

export type PetanqueTournamentMatch = {
  id: string;
  created_at: string;
  updated_at: string;
  tournament_id: string;
  round: number;
  a_name: string;
  b_name: string;
  a_score: number | null;
  b_score: number | null;
  status: "pending" | "finished";
  reported_by: string | null;
  payload: any;
};

function mkInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans O/0/I/1
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function createPetanqueTournamentOnline(args: {
  name: string;
  targetScore: number;
  visibility: "public" | "private";
  players: string[]; // noms
}) {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess?.session?.user?.id ?? null;
  if (!uid) throw new Error("Connexion requise pour créer un tournoi.");

  const invite_code = mkInviteCode();

  const { data: trow, error: terr } = await supabase
    .from("petanque_tournaments")
    .insert({
      owner_user_id: uid,
      name: args.name,
      invite_code,
      visibility: args.visibility,
      target_score: args.targetScore,
      payload: { players: args.players },
    })
    .select("*")
    .single();

  if (terr) throw terr;

  // Génération matches minimaliste: ronde 1 en “paires” (1v2, 3v4, etc.)
  const players = (args.players || []).map((x) => String(x || "").trim()).filter(Boolean);
  const matches: any[] = [];
  for (let i = 0; i < players.length; i += 2) {
    const a = players[i];
    const b = players[i + 1] ?? "BYE";
    matches.push({
      tournament_id: trow.id,
      round: 1,
      a_name: a,
      b_name: b,
      status: b === "BYE" ? "finished" : "pending",
      a_score: b === "BYE" ? args.targetScore : null,
      b_score: b === "BYE" ? 0 : null,
      reported_by: uid,
      payload: {},
    });
  }

  if (matches.length) {
    const { error: merr } = await supabase.from("petanque_tournament_matches").insert(matches);
    if (merr) throw merr;
  }

  return trow as PetanqueTournament;
}

export async function listPetanqueTournamentsOnline() {
  const { data, error } = await supabase
    .from("petanque_tournaments")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as PetanqueTournament[];
}

export async function getPetanqueTournamentById(id: string) {
  const { data, error } = await supabase.from("petanque_tournaments").select("*").eq("id", id).single();
  if (error) throw error;
  return data as PetanqueTournament;
}

export async function getPetanqueTournamentByInvite(invite_code: string) {
  const code = String(invite_code || "").trim().toUpperCase();
  const { data, error } = await supabase.from("petanque_tournaments").select("*").eq("invite_code", code).single();
  if (error) throw error;
  return data as PetanqueTournament;
}

export async function listPetanqueMatches(tournament_id: string) {
  const { data, error } = await supabase
    .from("petanque_tournament_matches")
    .select("*")
    .eq("tournament_id", tournament_id)
    .order("round", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as PetanqueTournamentMatch[];
}

export async function submitPetanqueMatchScore(args: {
  matchId: string;
  a_score: number;
  b_score: number;
}) {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess?.session?.user?.id ?? null;
  if (!uid) throw new Error("Connexion requise pour saisir un score.");

  const a = Math.max(0, Math.floor(Number(args.a_score)));
  const b = Math.max(0, Math.floor(Number(args.b_score)));

  const { data, error } = await supabase
    .from("petanque_tournament_matches")
    .update({
      a_score: a,
      b_score: b,
      status: "finished",
      reported_by: uid,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.matchId)
    .select("*")
    .single();

  if (error) throw error;
  return data as PetanqueTournamentMatch;
}
