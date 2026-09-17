import React from "react";
import NewDartsModePlayPlaceholder from "./newModes/NewDartsModePlayPlaceholder";
import ticker from "../assets/tickers/ticker_call_three.png";
export default function CallThreePlay(props: any) { return <NewDartsModePlayPlaceholder {...props} title="CALL THREE" ticker={ticker} accent="#ffb13b" configTab="call_three_config" />; }
