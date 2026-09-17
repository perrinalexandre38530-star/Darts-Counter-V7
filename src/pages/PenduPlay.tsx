import React from "react";
import NewDartsModePlayPlaceholder from "./newModes/NewDartsModePlayPlaceholder";
import tickerPendu from "../assets/tickers/ticker_pendu.png";
export default function PenduPlay(props: any) { return <NewDartsModePlayPlaceholder {...props} title="PENDU" ticker={tickerPendu} accent="#ffb33f" configTab="pendu_config" />; }
