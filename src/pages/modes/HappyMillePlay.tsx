import React from "react";
import DartsModeScaffold from "./DartsModeScaffold";

export default function HappyMillePlay(props:any) {
  return <DartsModeScaffold gameId="happymille" go={props.go} />;
}
