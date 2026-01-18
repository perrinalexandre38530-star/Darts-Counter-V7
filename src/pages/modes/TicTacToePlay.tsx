import React from "react";
import DartsModeScaffold from "./DartsModeScaffold";

export default function TicTacToePlay(props:any) {
  return <DartsModeScaffold gameId="tictactoe" go={props.go} />;
}
