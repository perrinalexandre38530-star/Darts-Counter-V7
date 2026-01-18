import React from "react";
import DartsModeScaffold from "./DartsModeScaffold";

export default function CountUpPlay(props:any) {
  return <DartsModeScaffold gameId="countup" go={props.go} />;
}
