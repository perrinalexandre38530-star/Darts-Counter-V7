import React from "react";
import NewDartsModePlayPlaceholder from "./newModes/NewDartsModePlayPlaceholder";
import ticker from "../assets/tickers/ticker_looper.png";
export default function LooperPlay(props: any) { return <NewDartsModePlayPlaceholder {...props} title="LOOPER" ticker={ticker} accent="#8ff7ff" configTab="looper_config" />; }
