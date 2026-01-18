import React from "react";
import DartsModeScaffold from "./DartsModeScaffold";

export default function BaseballPlay(props:any) {
  return <DartsModeScaffold gameId="baseball" go={props.go} />;
}
