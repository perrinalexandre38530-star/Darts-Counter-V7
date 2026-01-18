import React from "react";
import DartsModeScaffold from "./DartsModeScaffold";

export default function KnockoutPlay(props:any) {
  return <DartsModeScaffold gameId="knockout" go={props.go} />;
}
