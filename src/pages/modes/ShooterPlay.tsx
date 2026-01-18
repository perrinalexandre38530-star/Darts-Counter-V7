import React from "react";
import DartsModeScaffold from "./DartsModeScaffold";

export default function ShooterPlay(props:any) {
  return <DartsModeScaffold gameId="shooter" go={props.go} />;
}
