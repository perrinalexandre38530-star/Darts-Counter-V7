import React from "react";
import DartsModeScaffold from "./DartsModeScaffold";

export default function RugbyPlay(props:any) {
  return <DartsModeScaffold gameId="rugby" go={props.go} />;
}
