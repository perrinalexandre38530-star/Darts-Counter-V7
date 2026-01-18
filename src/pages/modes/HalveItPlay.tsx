import React from "react";
import DartsModeScaffold from "./DartsModeScaffold";

export default function HalveItPlay(props:any) {
  return <DartsModeScaffold gameId="halveit" go={props.go} />;
}
