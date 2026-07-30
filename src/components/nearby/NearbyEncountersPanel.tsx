import React from "react";
import type { NearbyEncounter } from "../../lib/nearbyPlayersApi";
import NearbyPlayerCard from "./NearbyPlayerCard";

type Props = {
  encounters: NearbyEncounter[];
  accent: string;
  onClear?: () => void;
  onFriend?: (encounter: NearbyEncounter) => void;
  onMessage?: (encounter: NearbyEncounter) => void;
  onMatch?: (encounter: NearbyEncounter) => void;
  onTournament?: (encounter: NearbyEncounter) => void;
};

export default function NearbyEncountersPanel({ encounters, accent, onClear, onFriend, onMessage, onMatch, onTournament }: Props) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ borderRadius: 22, border: `1px solid ${accent}4d`, background: `radial-gradient(110% 160% at 0% 0%, ${accent}20, rgba(5,10,17,.94) 58%)`, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 1000, color: accent }}>✦ JOUEURS CROISÉS</div>
            <div style={{ marginTop: 4, fontSize: 11.5, opacity: .72, lineHeight: 1.4 }}>Un croisement est enregistré quand deux profils visibles apparaissent dans la même recherche locale. Aucune coordonnée ni trajet n’est conservé.</div>
          </div>
          {encounters.length && onClear ? <button type="button" onClick={onClear} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "8px 10px", fontSize: 10.5, fontWeight: 1000, cursor: "pointer" }}>Effacer</button> : null}
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>
          <div style={{ borderRadius: 14, padding: 9, background: "rgba(255,255,255,.045)", textAlign: "center" }}><div style={{ color: accent, fontSize: 19, fontWeight: 1000 }}>{encounters.length}</div><div style={{ fontSize: 9.5, opacity: .65 }}>profils</div></div>
          <div style={{ borderRadius: 14, padding: 9, background: "rgba(255,255,255,.045)", textAlign: "center" }}><div style={{ color: "#ffd36d", fontSize: 19, fontWeight: 1000 }}>{encounters.reduce((sum, item) => sum + Math.max(1, item.crossedCount), 0)}</div><div style={{ fontSize: 9.5, opacity: .65 }}>croisements</div></div>
          <div style={{ borderRadius: 14, padding: 9, background: "rgba(255,255,255,.045)", textAlign: "center" }}><div style={{ color: "#79f19a", fontSize: 19, fontWeight: 1000 }}>{encounters.filter((item) => item.availableNow || item.lookingForGame).length}</div><div style={{ fontSize: 9.5, opacity: .65 }}>actifs</div></div>
        </div>
      </div>

      {encounters.length === 0 ? (
        <div style={{ borderRadius: 22, border: "1px solid rgba(255,255,255,.1)", background: "rgba(5,10,17,.86)", padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>✦</div>
          <div style={{ marginTop: 8, fontWeight: 1000 }}>Aucun joueur croisé pour le moment</div>
          <div style={{ marginTop: 5, fontSize: 12, opacity: .7, lineHeight: 1.45 }}>Lance régulièrement une recherche locale. Les profils compatibles réapparus autour de toi seront regroupés ici.</div>
        </div>
      ) : encounters.map((encounter) => (
        <NearbyPlayerCard
          key={encounter.userId}
          player={encounter}
          accent={accent}
          crossedCount={encounter.crossedCount}
          lastCrossedAt={encounter.lastCrossedAt}
          onFriend={onFriend ? () => onFriend(encounter) : undefined}
          onMessage={onMessage ? () => onMessage(encounter) : undefined}
          onMatch={onMatch ? () => onMatch(encounter) : undefined}
          onTournament={onTournament ? () => onTournament(encounter) : undefined}
        />
      ))}
    </div>
  );
}
