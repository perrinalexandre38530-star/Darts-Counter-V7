import React from "react";
import DartsModeScaffold from "./DartsModeScaffold";

export default function CapitalPlay(props:any) {
  return <DartsModeScaffold gameId="capital" go={props.go} />;
}
