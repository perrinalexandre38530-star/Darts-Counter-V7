import foot01 from "../../assets/tickers/foot-01.webp";
import foot02 from "../../assets/tickers/foot-02.webp";
import foot03 from "../../assets/tickers/foot-03.webp";
import foot04 from "../../assets/tickers/foot-04.webp";
import foot05 from "../../assets/tickers/foot-05.webp";
import foot06 from "../../assets/tickers/foot-06.webp";
import foot07 from "../../assets/tickers/foot-07.webp";
import foot08 from "../../assets/tickers/foot-08.webp";
import foot09 from "../../assets/tickers/foot-09.webp";
import foot10 from "../../assets/tickers/foot-10.webp";
import foot11 from "../../assets/tickers/foot-11.webp";
import foot12 from "../../assets/tickers/foot-12.webp";
import foot13 from "../../assets/tickers/foot-13.webp";
import foot14 from "../../assets/tickers/foot-14.webp";
import foot15 from "../../assets/tickers/foot-15.webp";
import foot16 from "../../assets/tickers/foot-16.webp";
import foot17 from "../../assets/tickers/foot-17.webp";
import foot18 from "../../assets/tickers/foot-18.webp";
import foot19 from "../../assets/tickers/foot-19.webp";
import foot20 from "../../assets/tickers/foot-20.webp";
import foot21 from "../../assets/tickers/foot-21.webp";
import foot22 from "../../assets/tickers/foot-22.webp";
import foot23 from "../../assets/tickers/foot-23.webp";
import foot24 from "../../assets/tickers/foot-24.webp";
import foot25 from "../../assets/tickers/foot-25.webp";
import foot26 from "../../assets/tickers/foot-26.webp";
import foot27 from "../../assets/tickers/foot-27.webp";
import tickerFootPenalty from "../../assets/tickers/ticker_foot_penalty.webp";
import tickerFoot1v1 from "../../assets/tickers/ticker_foot_1v1.webp";
import tickerFoot2v2 from "../../assets/tickers/ticker_foot_2v2.webp";
import tickerFoot3v3 from "../../assets/tickers/ticker_foot_3v3.webp";
import tickerFoot5v5 from "../../assets/tickers/ticker_foot_5v5.webp";
import tickerFoot7v7 from "../../assets/tickers/ticker_foot_7v7.webp";
import tickerFoot8v8 from "../../assets/tickers/ticker_foot_8v8.webp";
import tickerFoot11v11 from "../../assets/tickers/ticker_foot_11v11.webp";

export const FOOT_TICKERS = {
  home: [foot01, foot02, foot03],
  // Cartes du menu Jeux : on conserve les tickers propres dédiés déjà validés.
  games: {
    penalty: tickerFootPenalty,
    "1v1": tickerFoot1v1,
    "2v2": tickerFoot2v2,
    "3v3": tickerFoot3v3,
    "5v5": tickerFoot5v5,
    "7v7": tickerFoot7v7,
    "8v8": tickerFoot8v8,
    "11v11": tickerFoot11v11,
  },
  competition: [foot12, foot13, foot14, foot15],
  stats: [foot16, foot17, foot18],
  history: [foot19, foot20, foot21],
  online: [foot22, foot23, foot24],
  profile: [foot25, foot26, foot27],
} as const;

export type FootGameTickerId = keyof typeof FOOT_TICKERS.games;

export function getFootGameTicker(formatId: any): string {
  const id = String(formatId || "") as FootGameTickerId;
  return FOOT_TICKERS.games[id] || FOOT_TICKERS.games.penalty;
}

export function getFootSectionTicker(section: keyof Omit<typeof FOOT_TICKERS, "games">, index = 0): string {
  const list = FOOT_TICKERS[section] as readonly string[];
  return list[Math.abs(index) % list.length] || FOOT_TICKERS.home[0];
}
