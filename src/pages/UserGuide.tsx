import * as React from "react";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import "./UserGuide.css";

type Props = {
  go: (tab: any, params?: any) => void;
  params?: any;
};

type GuideItem = {
  id: string;
  group: string;
  icon: string;
  labelFr: string;
  labelEn: string;
  labelEs: string;
};

const NAV: GuideItem[] = [
  { id: "start", group: "discover", icon: "▣", labelFr: "Mode d'emploi", labelEn: "User guide", labelEs: "Guía de uso" },
  { id: "philosophy", group: "discover", icon: "◇", labelFr: "L'esprit MULTISPORTS", labelEn: "MULTISPORTS spirit", labelEs: "Espíritu MULTISPORTS" },
  { id: "quickstart", group: "play", icon: "◎", labelFr: "Bien démarrer", labelEn: "Quick start", labelEs: "Primeros pasos" },
  { id: "gameplay", group: "play", icon: "◉", labelFr: "Jouer une partie", labelEn: "Play a game", labelEs: "Jugar una partida" },
  { id: "profiles", group: "play", icon: "♙", labelFr: "Profils & joueurs", labelEn: "Profiles & players", labelEs: "Perfiles y jugadores" },
  { id: "stats", group: "progress", icon: "▥", labelFr: "Historique & statistiques", labelEn: "History & statistics", labelEs: "Historial y estadísticas" },
  { id: "backup", group: "progress", icon: "⬡", labelFr: "Sauvegarde & hors ligne", labelEn: "Backup & offline", labelEs: "Copia y sin conexión" },
  { id: "screens", group: "progress", icon: "▱", labelFr: "TV, Cast & Viewer", labelEn: "TV, Cast & Viewer", labelEs: "TV, Cast y Viewer" },
  { id: "awena", group: "help", icon: "✦", labelFr: "Awena vous accompagne", labelEn: "Awena helps you", labelEs: "Awena te acompaña" },
];

const GROUP_LABELS: Record<string, [string, string, string]> = {
  discover: ["DÉCOUVRIR", "DISCOVER", "DESCUBRIR"],
  play: ["JOUER", "PLAY", "JUGAR"],
  progress: ["PROGRESSER & SAUVEGARDER", "PROGRESS & SAVE", "PROGRESAR Y GUARDAR"],
  help: ["ASSISTANCE", "HELP", "AYUDA"],
};

function GuideIcon({ children }: { children: React.ReactNode }) {
  return <span className="msc-guide-step-icon" aria-hidden="true">{children}</span>;
}

function InfoCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="msc-guide-info-card">
      <div className="msc-guide-info-title"><span>{icon}</span>{title}</div>
      <div className="msc-guide-info-copy">{children}</div>
    </div>
  );
}

export default function UserGuide({ go, params }: Props) {
  const { lang } = useLang() as any;
  const L = React.useCallback(
    (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es),
    [lang]
  );
  const [active, setActive] = React.useState("start");
  const isFirstLogin = params?.source === "first_login";

  React.useEffect(() => {
    if (!isFirstLogin) return;
    try {
      const userId = String(params?.userId || "").trim();
      const key = userId ? `msc_user_guide_seen_v1:${userId}` : "msc_user_guide_seen_v1";
      localStorage.setItem(key, "1");
    } catch {}
  }, [isFirstLogin, params?.userId]);

  const jump = (id: string) => {
    setActive(id);
    try {
      document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {}
  };

  const closeGuide = () => {
    if (isFirstLogin) go("gameSelect");
    else go("settings");
  };

  const groups = ["discover", "play", "progress", "help"];

  return (
    <main className="msc-guide-root">
      <aside className="msc-guide-sidebar" aria-label={L("Navigation du mode d'emploi", "User guide navigation", "Navegación de la guía")}> 
        <div className="msc-guide-brand">
          <span>MULTISPORTS</span> <strong>SCORING</strong>
        </div>

        <div className="msc-guide-sidebar-scroll">
          {groups.map((group) => (
            <section key={group} className="msc-guide-nav-group">
              <div className="msc-guide-group-label">{L(...GROUP_LABELS[group])}</div>
              {NAV.filter((item) => item.group === group).map((item) => (
                <button key={item.id} type="button" className={`msc-guide-nav-item ${active === item.id ? "is-active" : ""}`} onClick={() => jump(item.id)}>
                  <span className="msc-guide-nav-icon">{item.icon}</span>
                  <span>{L(item.labelFr, item.labelEn, item.labelEs)}</span>
                </button>
              ))}
            </section>
          ))}
        </div>

        <div className="msc-guide-sidebar-footer">
          <div><span>◎</span><span>{L("modes", "modes", "modos")}</span><b>126+</b></div>
          <div><span>♙</span><span>{L("profils", "profiles", "perfiles")}</span><b>LOCAL</b></div>
          <div><span>⬡</span><span>{L("sauvegarde", "backup", "copia")}</span><b>AUTO</b></div>
        </div>
      </aside>

      <section className="msc-guide-main">
        <header className="msc-guide-topbar">
          <div className="msc-guide-breadcrumb"><span>MULTISPORTS SCORING</span><i>/</i><strong>{L("Mode d'emploi", "User guide", "Guía de uso")}</strong></div>
          <button type="button" className="msc-guide-close" onClick={closeGuide}>← {L("Retour", "Back", "Volver")}</button>
        </header>

        <article className="msc-guide-content">
          <section id="guide-start" className="msc-guide-section">
            <div className="msc-guide-kicker">MULTISPORTS SCORING</div>
            <h1>{L("Mode d'emploi", "User guide", "Guía de uso")}</h1>
            <p className="msc-guide-lead">{L("Comment fonctionne MULTISPORTS SCORING ?", "How does MULTISPORTS SCORING work?", "¿Cómo funciona MULTISPORTS SCORING?")}</p>

            <div className="msc-guide-hero-card">
              <p>{L(
                "MULTISPORTS SCORING rassemble tes sports, tes parties et ta progression dans une seule application. Pour bien commencer, le plus simple est de créer ton profil, ajouter si besoin des profils locaux pour jouer entre amis, puis choisir un sport et lancer une partie.",
                "MULTISPORTS SCORING brings your sports, games and progress together in one app. To get started, the easiest path is to create your profile, add local profiles if you want to play with friends, then choose a sport and start a game.",
                "MULTISPORTS SCORING reúne tus deportes, partidas y progreso en una sola aplicación. Para empezar bien, lo más sencillo es crear tu perfil, añadir perfiles locales si quieres jugar con amigos y después elegir un deporte e iniciar una partida."
              )}</p>
            </div>

            {isFirstLogin ? (
              <div className="msc-guide-first-login">
                <span>✓</span>
                <div><strong>{L("Bienvenue !", "Welcome!", "¡Bienvenido!")}</strong><p>{L("Ce guide s'affiche automatiquement uniquement lors de ta première connexion. Tu pourras toujours le rouvrir depuis Réglages > Mode d'emploi.", "This guide opens automatically only on your first sign-in. You can reopen it anytime from Settings > User guide.", "Esta guía se abre automáticamente solo en tu primer inicio de sesión. Podrás volver a abrirla desde Ajustes > Guía de uso.")}</p></div>
              </div>
            ) : null}
          </section>

          <section id="guide-philosophy" className="msc-guide-section">
            <div className="msc-guide-section-label">{L("L'ESPRIT DE L'APPLICATION", "THE APP'S PHILOSOPHY", "LA FILOSOFÍA DE LA APP")}</div>
            <div className="msc-guide-grid two">
              <InfoCard icon="⚡" title={L("Rapide quand tu veux", "Fast when you want", "Rápido cuando quieras")}>{L("PARTIE RAPIDE te permet de jouer immédiatement sans créer de profils. Les joueurs temporaires restent séparés de tes statistiques officielles.", "QUICK GAME lets you play immediately without creating profiles. Temporary players stay separate from your official statistics.", "PARTIDA RÁPIDA te permite jugar inmediatamente sin crear perfiles. Los jugadores temporales quedan separados de tus estadísticas oficiales.")}</InfoCard>
              <InfoCard icon="★" title={L("Complet quand tu veux", "Complete when you want", "Completo cuando quieras")}>{L("ARCADE utilise tes profils, équipes, bots, réglages avancés, sons, animations et statistiques liées aux joueurs.", "ARCADE uses your profiles, teams, bots, advanced settings, sounds, animations and player-linked statistics.", "ARCADE utiliza tus perfiles, equipos, bots, ajustes avanzados, sonidos, animaciones y estadísticas ligadas a los jugadores.")}</InfoCard>
            </div>
          </section>

          <section id="guide-quickstart" className="msc-guide-section">
            <div className="msc-guide-section-label">{L("5 ÉTAPES SIMPLES POUR COMMENCER", "5 SIMPLE STEPS TO START", "5 PASOS SIMPLES PARA EMPEZAR")}</div>
            <div className="msc-guide-timeline">
              <div className="msc-guide-step">
                <GuideIcon>1</GuideIcon><div><small>{L("ÉTAPE 1", "STEP 1", "PASO 1")}</small><h2>{L("Créer ton profil principal", "Create your main profile", "Crea tu perfil principal")}</h2><p>{L("Commence par Mon profil pour créer ton identité de jeu : nom, avatar, pays, équipe, matériel et statistiques personnelles. C'est la base si tu veux suivre ta progression dans le temps.", "Start with My profile to create your playing identity: name, avatar, country, team, equipment and personal statistics. This is the base if you want to track your progress over time.", "Empieza por Mi perfil para crear tu identidad de juego: nombre, avatar, país, equipo, material y estadísticas personales. Es la base si quieres seguir tu progreso con el tiempo.")}</p></div>
              </div>
              <div className="msc-guide-step">
                <GuideIcon>2</GuideIcon><div><small>{L("ÉTAPE 2", "STEP 2", "PASO 2")}</small><h2>{L("Créer des profils locaux pour jouer entre amis", "Create local profiles to play with friends", "Crea perfiles locales para jugar con amigos")}</h2><p>{L("Dans Profils locaux, ajoute les joueurs réguliers de la maison ou de tes soirées. Tu peux leur donner un nom, un avatar et les réutiliser facilement en local, même sans connexion.", "In Local profiles, add the regular players from home or your game nights. You can give them a name, an avatar and reuse them easily locally, even offline.", "En Perfiles locales, añade a los jugadores habituales de casa o de tus partidas entre amigos. Puedes darles un nombre, un avatar y reutilizarlos fácilmente en local, incluso sin conexión.")}</p></div>
              </div>
              <div className="msc-guide-step">
                <GuideIcon>3</GuideIcon><div><small>{L("ÉTAPE 3", "STEP 3", "PASO 3")}</small><h2>{L("Choisir ton sport puis ton mode de jeu", "Choose your sport and then your game mode", "Elige tu deporte y luego tu modo de juego")}</h2><p>{L("Sélectionne Fléchettes, Baby-Foot, Pétanque, Ping-Pong ou un autre sport, puis choisis PARTIE RAPIDE pour jouer tout de suite, ou ARCADE pour utiliser tes profils, équipes, bots et options avancées.", "Select Darts, Table Football, Pétanque, Table Tennis or another sport, then choose QUICK GAME to play right away, or ARCADE to use your profiles, teams, bots and advanced options.", "Selecciona Dardos, Futbolín, Petanca, Ping-Pong u otro deporte y después elige PARTIDA RÁPIDA para jugar enseguida, o ARCADE para usar tus perfiles, equipos, bots y opciones avanzadas.")}</p>
                  <div className="msc-guide-grid two compact"><InfoCard icon="⚡" title={L("PARTIE RAPIDE", "QUICK GAME", "PARTIDA RÁPIDA")}>{L("Pour jouer immédiatement : joueurs temporaires, configuration légère, historique séparé.", "To play immediately: temporary players, light setup and separate history.", "Para jugar inmediatamente: jugadores temporales, configuración ligera e historial separado.")}</InfoCard><InfoCard icon="♛" title="ARCADE">{L("Pour jouer sérieusement : profils officiels, statistiques complètes, bots, équipes et options avancées.", "For the full experience: official profiles, full statistics, bots, teams and advanced options.", "Para la experiencia completa: perfiles oficiales, estadísticas completas, bots, equipos y opciones avanzadas.")}</InfoCard></div>
                </div>
              </div>
              <div className="msc-guide-step">
                <GuideIcon>4</GuideIcon><div><small>{L("ÉTAPE 4", "STEP 4", "PASO 4")}</small><h2>{L("Configurer puis lancer la partie", "Configure and start the game", "Configura y empieza la partida")}</h2><p>{L("Chaque mode possède ses propres réglages, mais l'application propose toujours des valeurs simples pour démarrer vite. Choisis les joueurs, le format, quelques options, puis lance la partie.", "Each mode has its own settings, but the app always suggests simple defaults so you can start quickly. Choose the players, the format, a few options, then start the game.", "Cada modo tiene sus propios ajustes, pero la app siempre propone valores simples para empezar rápido. Elige los jugadores, el formato, algunas opciones y lanza la partida.")}</p></div>
              </div>
              <div className="msc-guide-step">
                <GuideIcon>5</GuideIcon><div><small>{L("ÉTAPE 5", "STEP 5", "PASO 5")}</small><h2>{L("Retrouver tes parties, stats et sauvegardes", "Find your games, stats and backups", "Encuentra tus partidas, estadísticas y copias")}</h2><p>{L("À la fin, la partie rejoint l'Historique. Le Centre de statistiques lit cet historique pour afficher tes moyennes, records et progressions. Et comme l'application fonctionne d'abord en local, tu peux continuer à jouer même hors ligne.", "At the end, the game is added to History. The Stats Center reads this history to display your averages, records and progress. Because the app works locally first, you can keep playing even offline.", "Al final, la partida pasa al Historial. El Centro de estadísticas lee ese historial para mostrar tus medias, récords y progresión. Como la app funciona primero en local, puedes seguir jugando incluso sin conexión.")}</p></div>
              </div>
            </div>
          </section>

          <section id="guide-gameplay" className="msc-guide-section">
            <div className="msc-guide-section-label">{L("PENDANT UNE PARTIE", "DURING A GAME", "DURANTE UNA PARTIDA")}</div>
            <div className="msc-guide-grid three">
              <InfoCard icon="◫" title={L("Portrait", "Portrait", "Vertical")}>{L("Le score, le joueur actif et la saisie sont organisés pour tenir au maximum sur un écran.", "Score, active player and input are arranged to fit on one screen whenever possible.", "La puntuación, el jugador activo y la entrada se organizan para caber en una pantalla siempre que sea posible.")}</InfoCard>
              <InfoCard icon="▭" title={L("Paysage", "Landscape", "Horizontal")}>{L("La zone de score reste visible à gauche et les commandes sont placées à droite pour exploiter toute la largeur.", "The score area stays visible on the left while controls sit on the right to use the full width.", "La zona de puntuación queda visible a la izquierda y los controles a la derecha para aprovechar todo el ancho.")}</InfoCard>
              <InfoCard icon="↶" title={L("Reprise", "Resume", "Reanudar")}>{L("Une partie interrompue peut être reprise si le mode prend en charge la sauvegarde de partie en cours.", "An interrupted game can be resumed when the mode supports in-progress saves.", "Una partida interrumpida puede reanudarse cuando el modo admite guardado en curso.")}</InfoCard>
            </div>
          </section>

          <section id="guide-profiles" className="msc-guide-section">
            <div className="msc-guide-section-label">{L("PROFILS & JOUEURS", "PROFILES & PLAYERS", "PERFILES Y JUGADORES")}</div>
            <div className="msc-guide-callout"><strong>{L("Un profil = une identité de jeu. Un profil local = un joueur réutilisable à la maison.", "One profile = one playing identity. One local profile = a reusable player at home.", "Un perfil = una identidad de juego. Un perfil local = un jugador reutilizable en casa.")}</strong><p>{L("Ton profil principal sert à te représenter partout dans l'application. Les profils locaux servent à créer facilement les joueurs de tes parties entre amis. Les joueurs temporaires de PARTIE RAPIDE, eux, restent séparés et n'altèrent pas les statistiques officielles.", "Your main profile represents you throughout the app. Local profiles make it easy to create the players for your games with friends. QUICK GAME temporary players stay separate and do not alter official statistics.", "Tu perfil principal te representa en toda la aplicación. Los perfiles locales sirven para crear fácilmente a los jugadores de tus partidas entre amigos. Los jugadores temporales de PARTIDA RÁPIDA quedan separados y no modifican las estadísticas oficiales.")}</p></div>
          </section>

          <section id="guide-stats" className="msc-guide-section">
            <div className="msc-guide-section-label">{L("HISTORIQUE & STATISTIQUES", "HISTORY & STATISTICS", "HISTORIAL Y ESTADÍSTICAS")}</div>
            <div className="msc-guide-grid two"><InfoCard icon="▤" title={L("Historique", "History", "Historial")}>{L("C'est la source principale des parties terminées. Les parties rapides restent dans un historique séparé jusqu'à une éventuelle association à des profils.", "This is the main source for completed games. Quick games remain in a separate history until they are optionally linked to profiles.", "Es la fuente principal de las partidas terminadas. Las partidas rápidas quedan en un historial separado hasta asociarlas opcionalmente a perfiles.")}</InfoCard><InfoCard icon="↗" title={L("Centre de statistiques", "Stats Center", "Centro de estadísticas")}>{L("Il transforme les parties valides de l'historique en moyennes, records, tendances, classements et statistiques détaillées propres à chaque mode.", "It turns valid history records into averages, records, trends, rankings and detailed mode-specific statistics.", "Transforma las partidas válidas del historial en medias, récords, tendencias, clasificaciones y estadísticas detalladas de cada modo.")}</InfoCard></div>
          </section>

          <section id="guide-backup" className="msc-guide-section">
            <div className="msc-guide-section-label">{L("SAUVEGARDE & MODE HORS LIGNE", "BACKUP & OFFLINE MODE", "COPIA Y MODO SIN CONEXIÓN")}</div>
            <div className="msc-guide-hero-card slim"><p>{L("MULTISPORTS SCORING est conçu en priorité pour fonctionner localement. Tu peux continuer à jouer sans Internet. Quand une connexion est disponible, les synchronisations et sauvegardes distantes peuvent reprendre sans bloquer le gameplay.", "MULTISPORTS SCORING is designed to work locally first. You can keep playing without Internet. When a connection is available, remote sync and backups can resume without blocking gameplay.", "MULTISPORTS SCORING está diseñado para funcionar primero en local. Puedes seguir jugando sin Internet. Cuando vuelve la conexión, las sincronizaciones y copias remotas pueden continuar sin bloquear el juego.")}</p></div>
            <div className="msc-guide-grid three"><InfoCard icon="⌂" title={L("Local", "Local", "Local")}>{L("Parties, profils, historique et réglages sont disponibles sur l'appareil.", "Games, profiles, history and settings are available on the device.", "Partidas, perfiles, historial y ajustes están disponibles en el dispositivo.")}</InfoCard><InfoCard icon="☁" title={L("Cloud / NAS", "Cloud / NAS", "Cloud / NAS")}>{L("Les destinations configurées servent de sauvegarde et de synchronisation, pas de prérequis pour jouer.", "Configured destinations provide backup and sync, not a requirement to play.", "Los destinos configurados sirven para copia y sincronización, no son un requisito para jugar.")}</InfoCard><InfoCard icon="↺" title={L("Restauration", "Restore", "Restauración")}>{L("Une restauration volontaire remet les données sauvegardées au centre du système avant de reprendre la synchronisation.", "A deliberate restore puts the saved data back at the center of the system before synchronization resumes.", "Una restauración voluntaria vuelve a situar los datos guardados en el centro del sistema antes de reanudar la sincronización.")}</InfoCard></div>
          </section>

          <section id="guide-screens" className="msc-guide-section">
            <div className="msc-guide-section-label">{L("ÉCRANS EXTERNES", "EXTERNAL SCREENS", "PANTALLAS EXTERNAS")}</div>
            <div className="msc-guide-grid two"><InfoCard icon="TV" title={L("Samsung TV / Viewer", "Samsung TV / Viewer", "Samsung TV / Viewer")}>{L("Le téléphone peut piloter un écran distant via le Viewer. Un code de session permet d'associer rapidement les deux appareils.", "Your phone can drive a remote screen through Viewer. A session code quickly pairs both devices.", "El teléfono puede controlar una pantalla remota mediante Viewer. Un código de sesión permite asociar rápidamente ambos dispositivos.")}</InfoCard><InfoCard icon="◫" title="Google Cast">{L("Cast reste une sortie séparée pour afficher l'expérience sur un écran compatible.", "Cast remains a separate output for displaying the experience on a compatible screen.", "Cast sigue siendo una salida separada para mostrar la experiencia en una pantalla compatible.")}</InfoCard></div>
          </section>

          <section id="guide-awena" className="msc-guide-section last">
            <div className="msc-guide-section-label">AWENA</div>
            <div className="msc-guide-awena">
              <div className="msc-guide-awena-orb" aria-hidden="true"><img src="/awena/awena-avatar.webp" alt="" /></div>
              <div><h2>{L("Awena vous explique", "Awena explains", "Awena te explica")}</h2><p>{L("Dans les écrans qui proposent son bouton d'aide, Awena peut t'expliquer simplement le principe du menu, du mode de jeu ou de l'étape en cours. Ses réglages sont disponibles dans Réglages > Awena.", "On screens with her help button, Awena can simply explain the menu, the game mode or the current step. Her settings are available under Settings > Awena.", "En las pantallas con su botón de ayuda, Awena puede explicarte de forma sencilla el menú, el modo de juego o el paso actual. Sus ajustes están disponibles en Ajustes > Awena.")}</p></div>
            </div>
            <button className="msc-guide-primary-button" type="button" onClick={closeGuide}>{isFirstLogin ? L("J'ai compris — commencer", "Got it — start", "Entendido — empezar") : L("Retour aux réglages", "Back to settings", "Volver a ajustes")}</button>
          </section>
        </article>
      </section>
    </main>
  );
}
