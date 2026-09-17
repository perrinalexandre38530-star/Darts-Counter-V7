import React from "react";
import NewDartsModePlayPlaceholder from "./newModes/NewDartsModePlayPlaceholder";
import tickerGotcha from "../assets/tickers/ticker_gotcha.png";
export default function GotchaPlay(props: any) { return <NewDartsModePlayPlaceholder {...props} title="GOTCHA" ticker={tickerGotcha} accent="#ff9b31" configTab="gotcha_config" />; }
