import React from "react";
import NewDartsModePlayPlaceholder from "./newModes/NewDartsModePlayPlaceholder";
import tickerCrados from "../assets/tickers/ticker_crados.png";
export default function CradosPlay(props: any) { return <NewDartsModePlayPlaceholder {...props} title="CRADOS" ticker={tickerCrados} accent="#b7f247" configTab="crados_config" />; }
