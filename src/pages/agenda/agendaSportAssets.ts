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

import calendarIconFit from "../../assets/agenda/icons/agenda-icon-fit.webp";
import calendarIconRunning from "../../assets/agenda/icons/agenda-icon-running.webp";
import calendarIconDarts from "../../assets/agenda/icons/agenda-icon-darts.webp";
import calendarIconFoot from "../../assets/agenda/icons/agenda-icon-foot.webp";
import calendarIconBabyFoot from "../../assets/agenda/icons/agenda-icon-babyfoot.webp";
import calendarIconPingPong from "../../assets/agenda/icons/agenda-icon-pingpong.webp";
import calendarIconPetanque from "../../assets/agenda/icons/agenda-icon-petanque.webp";
import calendarIconMolkky from "../../assets/agenda/icons/agenda-icon-molkky.webp";
import calendarIconDiceGame from "../../assets/agenda/icons/agenda-icon-dicegame.webp";
import calendarIconEsports from "../../assets/agenda/icons/agenda-icon-esports.webp";
import calendarIconArchery from "../../assets/agenda/icons/agenda-icon-archery.webp";
import calendarIconBadminton from "../../assets/agenda/icons/agenda-icon-badminton.webp";
import calendarIconBasket from "../../assets/agenda/icons/agenda-icon-basket.webp";
import calendarIconBillard from "../../assets/agenda/icons/agenda-icon-billard.webp";
import calendarIconChess from "../../assets/agenda/icons/agenda-icon-chess.webp";
import calendarIconCornhole from "../../assets/agenda/icons/agenda-icon-cornhole.webp";
import calendarIconFrisbee from "../../assets/agenda/icons/agenda-icon-frisbee.webp";
import calendarIconPadel from "../../assets/agenda/icons/agenda-icon-padel.webp";
import calendarIconPickleball from "../../assets/agenda/icons/agenda-icon-pickleball.webp";
import calendarIconRugby from "../../assets/agenda/icons/agenda-icon-rugby.webp";
import calendarIconTennis from "../../assets/agenda/icons/agenda-icon-tennis.webp";
import calendarIconVolley from "../../assets/agenda/icons/agenda-icon-volley.webp";

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

export const AGENDA_SPORT_ASSETS: Record<AppSportId, { logo: string; banner: string; calendarIcon: string }> = {
  fit: { calendarIcon: calendarIconFit, logo: logoFit, banner: bannerFit },
  running: { calendarIcon: calendarIconRunning, logo: logoRunning, banner: bannerRunning },
  darts: { calendarIcon: calendarIconDarts, logo: logoDarts, banner: bannerDarts },
  foot: { calendarIcon: calendarIconFoot, logo: logoFoot, banner: bannerFoot },
  babyfoot: { calendarIcon: calendarIconBabyFoot, logo: logoBabyFoot, banner: bannerBabyFoot },
  pingpong: { calendarIcon: calendarIconPingPong, logo: logoPingPong, banner: bannerPingPong },
  petanque: { calendarIcon: calendarIconPetanque, logo: logoPetanque, banner: bannerPetanque },
  molkky: { calendarIcon: calendarIconMolkky, logo: logoMolkky, banner: bannerMolkky },
  dicegame: { calendarIcon: calendarIconDiceGame, logo: logoDiceGame, banner: bannerDiceGame },
  esports: { calendarIcon: calendarIconEsports, logo: logoEsports, banner: bannerEsports },
  archery: { calendarIcon: calendarIconArchery, logo: logoArchery, banner: bannerArchery },
  badminton: { calendarIcon: calendarIconBadminton, logo: logoBadminton, banner: bannerBadminton },
  basket: { calendarIcon: calendarIconBasket, logo: logoBasket, banner: bannerBasket },
  billard: { calendarIcon: calendarIconBillard, logo: logoBillard, banner: bannerBillard },
  chess: { calendarIcon: calendarIconChess, logo: logoChess, banner: bannerChess },
  cornhole: { calendarIcon: calendarIconCornhole, logo: logoCornhole, banner: bannerCornhole },
  frisbee: { calendarIcon: calendarIconFrisbee, logo: logoFrisbee, banner: bannerFrisbee },
  padel: { calendarIcon: calendarIconPadel, logo: logoPadel, banner: bannerPadel },
  pickleball: { calendarIcon: calendarIconPickleball, logo: logoPickleball, banner: bannerPickleball },
  rugby: { calendarIcon: calendarIconRugby, logo: logoRugby, banner: bannerRugby },
  tennis: { calendarIcon: calendarIconTennis, logo: logoTennis, banner: bannerTennis },
  volley: { calendarIcon: calendarIconVolley, logo: logoVolley, banner: bannerVolley },
};
