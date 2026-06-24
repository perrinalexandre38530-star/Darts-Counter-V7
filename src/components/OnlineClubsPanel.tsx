import React from "react";
import { createClub, listClubInvites, listClubTeams, listMyClubs, respondClubInvite, type Club, type ClubInvite, type ClubTeam } from "../lib/clubsApi";
import { loadTeams, upsertTeam } from "../lib/petanqueTeamsStore";

type Props = {
  signedIn?: boolean;
  accent?: string;
  onOpenTeam?: (team: any) => void;
};

function alpha(hex = "#22e6ff", opacity = "33") {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#22e6ff";
  return `${h}${opacity}`;
}

function card(accent: string): React.CSSProperties {
  return {
    borderRadius: 18,
    border: `1px solid ${alpha(accent, "38")}`,
    background: `linear-gradient(145deg, ${alpha(accent, "14")}, rgba(255,255,255,.045))`,
    boxShadow: `0 0 22px ${alpha(accent, "14")}, inset 0 1px 0 rgba(255,255,255,.055)`,
    padding: 12,
  };
}

function Logo({ src, name, accent, size = 44 }: { src?: string | null; name: string; accent: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 14, overflow: "hidden", flex: "0 0 auto", display: "grid", placeItems: "center", border: `1px solid ${alpha(accent, "80")}`, background: `radial-gradient(circle at 35% 25%, ${alpha(accent, "44")}, rgba(0,0,0,.62))`, color: accent, fontWeight: 1000 }}>
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function OnlineClubsPanel({ signedIn = true, accent = "#22e6ff" }: Props) {
  const [clubs, setClubs] = React.useState<Club[]>([]);
  const [teamsByClub, setTeamsByClub] = React.useState<Record<string, ClubTeam[]>>({});
  const [invites, setInvites] = React.useState<ClubInvite[]>([]);
  const [localClubTeams, setLocalClubTeams] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [newClubName, setNewClubName] = React.useState("");

  const reload = React.useCallback(async () => {
    setError(null);
    setLocalClubTeams(loadTeams().filter((t: any) => String(t.teamKind || "leisure") === "club"));
    if (!signedIn) return;
    setBusy(true);
    try {
      const [nextClubs, nextInvites] = await Promise.all([listMyClubs(), listClubInvites().catch(() => [])]);
      setClubs(nextClubs);
      setInvites(nextInvites);
      const entries = await Promise.all(nextClubs.map(async (club) => [club.id, await listClubTeams(club.id).catch(() => [])] as const));
      setTeamsByClub(Object.fromEntries(entries));
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les clubs");
    } finally {
      setBusy(false);
    }
  }, [signedIn]);

  React.useEffect(() => { reload(); }, [reload]);

  async function handleCreateClub() {
    const name = newClubName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await createClub({ name, sports: [], visibility: "members" });
      setNewClubName("");
      await reload();
    } catch (e: any) {
      setError(e?.message || "Création du club impossible");
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(id: string, status: "accepted" | "refused") {
    setBusy(true);
    try { await respondClubInvite(id, status); await reload(); }
    catch (e: any) { setError(e?.message || "Réponse impossible"); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 1000, color: accent, letterSpacing: .4 }}>CLUBS</div>
          <div style={{ fontSize: 12, opacity: .78 }}>Clubs et équipes Online que tu as rejoints.</div>
        </div>
        <button type="button" onClick={reload} disabled={busy} style={{ borderRadius: 999, padding: "9px 12px", border: `1px solid ${alpha(accent, "66")}`, background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 900 }}>↻</button>
      </div>

      {!signedIn ? (
        <div style={card(accent)}>Connecte ton compte Online pour afficher les clubs partagés.</div>
      ) : null}

      {error ? <div style={{ ...card("#ff5a6f"), color: "#ffd9df", fontSize: 12 }}>{error}</div> : null}

      <div style={card(accent)}>
        <div style={{ fontWeight: 1000, marginBottom: 8 }}>Créer un club</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newClubName} onChange={(e) => setNewClubName(e.target.value)} placeholder="Nom du club" style={{ flex: 1, minWidth: 0, borderRadius: 14, border: `1px solid ${alpha(accent, "46")}`, background: "rgba(0,0,0,.28)", color: "#fff", padding: "11px 12px", fontWeight: 800 }} />
          <button type="button" disabled={!newClubName.trim() || busy || !signedIn} onClick={handleCreateClub} style={{ borderRadius: 14, border: 0, background: !newClubName.trim() || !signedIn ? "rgba(255,255,255,.12)" : `linear-gradient(135deg, ${accent}, ${alpha(accent, "99")})`, color: "#001018", padding: "0 13px", fontWeight: 1000 }}>Créer</button>
        </div>
      </div>

      {invites.length ? (
        <div style={card(accent)}>
          <div style={{ fontWeight: 1000, marginBottom: 8 }}>Invitations en attente</div>
          <div style={{ display: "grid", gap: 8 }}>
            {invites.map((it) => (
              <div key={it.id} style={{ borderRadius: 14, background: "rgba(255,255,255,.055)", padding: 10, display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 900 }}>{it.clubName || "Club"}{it.teamName ? ` • ${it.teamName}` : ""}</div>
                <div style={{ fontSize: 11, opacity: .72 }}>Invité par {it.senderName || "un membre"}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => handleInvite(it.id, "accepted")} style={{ flex: 1, borderRadius: 12, border: 0, padding: 9, fontWeight: 1000, background: "rgba(84,255,145,.22)", color: "#9dffbd" }}>Accepter</button>
                  <button type="button" onClick={() => handleInvite(it.id, "refused")} style={{ flex: 1, borderRadius: 12, border: 0, padding: 9, fontWeight: 1000, background: "rgba(255,90,111,.16)", color: "#ff9baa" }}>Refuser</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {clubs.length === 0 ? (
          <div style={card(accent)}>
            <div style={{ fontWeight: 1000 }}>Aucun club Online rejoint</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: .76 }}>Crée un club ou accepte une invitation. Les équipes “Club” créées dans Teams pourront ensuite être synchronisées ici.</div>
          </div>
        ) : clubs.map((club) => {
          const teams = teamsByClub[club.id] || [];
          return (
            <div key={club.id} style={card(accent)}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Logo src={club.logoUrl} name={club.name} accent={accent} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 1000, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{club.name}</div>
                  <div style={{ fontSize: 11, opacity: .72 }}>{club.membersCount || 0} membre(s) • {teams.length} équipe(s) • rôle {club.role || "membre"}</div>
                </div>
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {teams.length === 0 ? <div style={{ fontSize: 12, opacity: .7 }}>Aucune équipe dans ce club pour l’instant.</div> : teams.map((team) => (
                  <div key={team.id} style={{ borderRadius: 14, padding: 9, background: "rgba(0,0,0,.22)", display: "flex", alignItems: "center", gap: 9 }}>
                    <Logo src={team.logoDataUrl || team.logoUrl} name={team.name} accent={accent} size={34} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.name}</div>
                      <div style={{ fontSize: 10.5, opacity: .7 }}>{String(team.sport || "sport").toUpperCase()} • {team.membersCount || 0} membre(s)</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {localClubTeams.length ? (
        <div style={card(accent)}>
          <div style={{ fontWeight: 1000 }}>Équipes Club locales à synchroniser</div>
          <div style={{ marginTop: 6, fontSize: 11.5, opacity: .72 }}>Ces équipes ont été créées comme “Équipe Club” dans Teams. La synchronisation fine avec invitations/effectif sera l’étape suivante.</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {localClubTeams.slice(0, 8).map((t: any) => (
              <div key={t.id} style={{ borderRadius: 14, padding: 9, background: "rgba(255,255,255,.05)", display: "flex", gap: 9, alignItems: "center" }}>
                <Logo src={t.logoDataUrl || t.logoUrl} name={t.name} accent={accent} size={34} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 950 }}>{t.name}</div>
                  <div style={{ fontSize: 10.5, opacity: .72 }}>{t.clubName || "Club non nommé"} • {(t.sportIds || [t.sport]).join(", ")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
