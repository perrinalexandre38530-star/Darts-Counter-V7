import type { AppSportId } from "../../config/sportCatalog";

import logoFit from "../../assets/games/logo-fit-performance.webp";
import logoRunning from "../../assets/games/logo-running-performance.webp";
import logoDarts from "../../assets/games/logo-darts.webp";
import logoFoot from "../../assets/games/logo-foot.png";
import logoBabyFoot from "../../assets/games/logo-babyfoot.webp";
import logoPingPong from "../../assets/games/logo-pingpong.webp";
import logoPetanque from "../../assets/games/logo-petanque.webp";
import logoMolkky from "../../assets/games/logo-molkky.png";
import logoDiceGame from "../../assets/games/logo-dicegame.webp";
import logoEsports from "../../assets/games/logo-esports.webp";
import logoArchery from "../../assets/games/logo-archery.png";
import logoBadminton from "../../assets/games/logo-badminton.png";
import logoBasket from "../../assets/games/logo-basket.png";
import logoBillard from "../../assets/games/logo-billard.png";
import logoChess from "../../assets/games/logo-chess.png";
import logoCornhole from "../../assets/games/logo-cornhole.png";
import logoFrisbee from "../../assets/games/logo-frisbee.png";
import logoPadel from "../../assets/games/logo-padel.png";
import logoPickleball from "../../assets/games/logo-pickleball.png";
import logoRugby from "../../assets/games/logo-rugby.png";
import logoTennis from "../../assets/games/logo-tennis.png";
import logoVolley from "../../assets/games/logo-volley.png";

import bannerFit from "../../assets/agenda/agenda-fit.webp";
import bannerRunning from "../../assets/agenda/agenda-running.webp";
import bannerDarts from "../../assets/agenda/agenda-darts.webp";
import bannerFoot from "../../assets/agenda/agenda-foot.webp";
import bannerBabyFoot from "../../assets/agenda/agenda-babyfoot.webp";
import bannerPingPong from "../../assets/agenda/agenda-pingpong.webp";
import bannerPetanque from "../../assets/agenda/agenda-petanque.webp";
import bannerMolkky from "../../assets/agenda/agenda-molkky.webp";
import bannerDiceGame from "../../assets/agenda/agenda-dicegame.webp";
import bannerEsports from "../../assets/agenda/agenda-esports.webp";
import bannerArchery from "../../assets/agenda/agenda-archery.webp";
import bannerBadminton from "../../assets/agenda/agenda-badminton.webp";
import bannerBasket from "../../assets/agenda/agenda-basket.webp";
import bannerBillard from "../../assets/agenda/agenda-billard.webp";
import bannerChess from "../../assets/agenda/agenda-chess.webp";
import bannerCornhole from "../../assets/agenda/agenda-cornhole.webp";
import bannerFrisbee from "../../assets/agenda/agenda-frisbee.webp";
import bannerPadel from "../../assets/agenda/agenda-padel.webp";
import bannerPickleball from "../../assets/agenda/agenda-pickleball.webp";
import bannerRugby from "../../assets/agenda/agenda-rugby.webp";
import bannerTennis from "../../assets/agenda/agenda-tennis.webp";
import bannerVolley from "../../assets/agenda/agenda-volley.webp";

export const AGENDA_SPORT_ASSETS: Record<AppSportId, { logo: string; banner: string }> = {
  fit: { logo: logoFit, banner: bannerFit },
  running: { logo: logoRunning, banner: bannerRunning },
  darts: { logo: logoDarts, banner: bannerDarts },
  foot: { logo: logoFoot, banner: bannerFoot },
  babyfoot: { logo: logoBabyFoot, banner: bannerBabyFoot },
  pingpong: { logo: logoPingPong, banner: bannerPingPong },
  petanque: { logo: logoPetanque, banner: bannerPetanque },
  molkky: { logo: logoMolkky, banner: bannerMolkky },
  dicegame: { logo: logoDiceGame, banner: bannerDiceGame },
  esports: { logo: logoEsports, banner: bannerEsports },
  archery: { logo: logoArchery, banner: bannerArchery },
  badminton: { logo: logoBadminton, banner: bannerBadminton },
  basket: { logo: logoBasket, banner: bannerBasket },
  billard: { logo: logoBillard, banner: bannerBillard },
  chess: { logo: logoChess, banner: bannerChess },
  cornhole: { logo: logoCornhole, banner: bannerCornhole },
  frisbee: { logo: logoFrisbee, banner: bannerFrisbee },
  padel: { logo: logoPadel, banner: bannerPadel },
  pickleball: { logo: logoPickleball, banner: bannerPickleball },
  rugby: { logo: logoRugby, banner: bannerRugby },
  tennis: { logo: logoTennis, banner: bannerTennis },
  volley: { logo: logoVolley, banner: bannerVolley },
};
