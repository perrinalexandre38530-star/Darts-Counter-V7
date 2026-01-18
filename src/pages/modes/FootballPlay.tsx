import React from "react";
import DartsModeScaffold from "./DartsModeScaffold";

export default function FootballPlay(props:any) {
  return <DartsModeScaffold gameId="football" go={props.go} />;
}
