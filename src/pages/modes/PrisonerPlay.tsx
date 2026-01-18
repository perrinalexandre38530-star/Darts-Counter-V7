import React from "react";
import DartsModeScaffold from "./DartsModeScaffold";

export default function PrisonerPlay(props:any) {
  return <DartsModeScaffold gameId="prisoner" go={props.go} />;
}
