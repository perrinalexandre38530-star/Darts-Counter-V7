import React from "react";
import DartsModeScaffold from "./DartsModeScaffold";

export default function ScramPlay(props:any) {
  return <DartsModeScaffold gameId="scram" go={props.go} />;
}
