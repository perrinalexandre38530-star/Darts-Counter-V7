import React from "react";
import NewDartsModePlayPlaceholder from "./newModes/NewDartsModePlayPlaceholder";
import ticker from "../assets/tickers/ticker_steeplechase.png";
export default function SteeplechasePlay(props: any) { return <NewDartsModePlayPlaceholder {...props} title="STEEPLECHASE" ticker={ticker} accent="#7dffbd" configTab="steeplechase_config" />; }
