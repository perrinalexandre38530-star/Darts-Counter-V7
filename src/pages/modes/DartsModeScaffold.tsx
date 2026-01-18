import React from "react";
import { dartsGameRegistry } from "../../games/dartsGameRegistry";

type Props = {
  gameId: string;
  go: (t: any, p?: any) => void;
};

export default function DartsModeScaffold({ gameId, go }: Props) {
  const game = dartsGameRegistry.find(g => g.id === gameId);

  return (
    <div style={{ padding: 16, color: "#fff" }}>
      <h2>{game?.label ?? gameId}</h2>
      <p>{game?.infoBody}</p>
      <button onClick={() => go("home")}>Quitter</button>
    </div>
  );
}
