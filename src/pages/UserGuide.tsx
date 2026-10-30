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
                "MULTISPORTS SCORING rassemble tes sports, tes parties et ta progression dans une seule application. L'objectif est simple : lancer une partie rapidement, conserver des statistiques propres et retrouver tes données sur tous tes appareils — même si tu joues hors ligne.",
                "MULTISPORTS SCORING brings your sports, games and progress together in one app. The goal is simple: start a game quickly, keep clean statistics and find your data again across your devices — even when you play offline.",
                "MULTISPORTS SCORING reúne tus deportes, partidas y progreso en una sola aplicación. El objetivo es simple: iniciar una partida rápidamente, conservar estadísticas claras y recuperar tus datos en todos tus dispositivos, incluso sin conexión."
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
            <div className="msc-guide-section-label">{L("5 ÉTAPES", "5 STEPS", "5 PASOS")}</div>
            <div className="msc-guide-timeline">
              <div className="msc-guide-step">
                <GuideIcon>1</GuideIcon><div><small>{L("ÉTAPE 1", "STEP 1", "PASO 1")}</small><h2>{L("Choisir ton sport", "Choose your sport", "Elige tu deporte")}</h2><p>{L("Au démarrage, sélectionne Fléchettes, Baby-Foot, Pétanque, Ping-Pong ou un autre sport disponible. Tu peux changer ce choix plus tard dans Réglages.", "At startup, choose Darts, Table Football, Pétanque, Table Tennis or another available sport. You can change it later in Settings.", "Al iniciar, elige Dardos, Futbolín, Petanca, Ping-Pong u otro deporte disponible. Podrás cambiarlo después en Ajustes.")}</p></div>
              </div>
              <div className="msc-guide-step">
                <GuideIcon>2</GuideIcon><div><small>{L("ÉTAPE 2", "STEP 2", "PASO 2")}</small><h2>{L("Choisir PARTIE RAPIDE ou ARCADE", "Choose QUICK GAME or ARCADE", "Elige PARTIDA RÁPIDA o ARCADE")}</h2><p>{L("PARTIE RAPIDE pour jouer tout de suite. ARCADE pour utiliser tes profils, bots, équipes et toutes les options avancées.", "QUICK GAME to play right away. ARCADE to use your profiles, bots, teams and all advanced options.", "PARTIDA RÁPIDA para jugar ya. ARCADE para usar tus perfiles, bots, equipos y todas las opciones avanzadas.")}</p>
                  <div className="msc-guide-grid two compact"><InfoCard icon="⚡" title={L("PARTIE RAPIDE", "QUICK GAME", "PARTIDA RÁPIDA")}>{L("J1, J2… ou noms libres, configuration minimale, historique dédié.", "J1, J2… or custom names, minimal setup, dedicated history.", "J1, J2… o nombres libres, configuración mínima e historial dedicado.")}</InfoCard><InfoCard icon="♛" title="ARCADE">{L("Profils officiels, statistiques complètes, bots et équipes.", "Official profiles, full statistics, bots and teams.", "Perfiles oficiales, estadísticas completas, bots y equipos.")}</InfoCard></div>
                </div>
              </div>
              <div className="msc-guide-step">
                <GuideIcon>3</GuideIcon><div><small>{L("ÉTAPE 3", "STEP 3", "PASO 3")}</small><h2>{L("Configurer puis lancer", "Configure and start", "Configura y empieza")}</h2><p>{L("Chaque mode possède ses propres réglages. Les écrans de configuration te proposent des valeurs par défaut cohérentes pour démarrer sans te perdre dans les options.", "Each mode has its own settings. Configuration screens provide sensible defaults so you can start without getting lost in options.", "Cada modo tiene sus propios ajustes. Las pantallas de configuración proponen valores por defecto coherentes para empezar sin perderte entre opciones.")}</p></div>
              </div>
              <div className="msc-guide-step">
                <GuideIcon>4</GuideIcon><div><small>{L("ÉTAPE 4", "STEP 4", "PASO 4")}</small><h2>{L("Jouer et enregistrer automatiquement", "Play and save automatically", "Juega y guarda automáticamente")}</h2><p>{L("Pendant la partie, l'application conserve l'état de jeu localement. À la fin, la partie rejoint l'historique adapté et alimente les statistiques correspondantes.", "During the game, the app stores the game state locally. At the end, the game is added to the appropriate history and feeds the corresponding statistics.", "Durante la partida, la aplicación conserva el estado localmente. Al final, la partida pasa al historial correspondiente y alimenta las estadísticas.")}</p></div>
              </div>
              <div className="msc-guide-step">
                <GuideIcon>5</GuideIcon><div><small>{L("ÉTAPE 5", "STEP 5", "PASO 5")}</small><h2>{L("Analyser ta progression", "Analyze your progress", "Analiza tu progreso")}</h2><p>{L("Retrouve tes parties dans Historique et tes indicateurs dans le Centre de statistiques. Les statistiques officielles sont dérivées de l'historique pour garder une source unique et cohérente.", "Find your games in History and your indicators in the Stats Center. Official statistics are derived from history to keep one coherent source of truth.", "Encuentra tus partidas en Historial y tus indicadores en el Centro de estadísticas. Las estadísticas oficiales se derivan del historial para mantener una fuente única y coherente.")}</p></div>
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
            <div className="msc-guide-callout"><strong>{L("Un profil = une identité de jeu.", "One profile = one playing identity.", "Un perfil = una identidad de juego.")}</strong><p>{L("Le nom, l'avatar, le niveau, les dartsets/équipements et les statistiques sont rattachés au profil. Les joueurs temporaires de PARTIE RAPIDE n'altèrent pas ces données.", "Name, avatar, level, dartsets/equipment and statistics are linked to the profile. QUICK GAME temporary players do not alter this data.", "El nombre, avatar, nivel, dartsets/equipamiento y estadísticas están vinculados al perfil. Los jugadores temporales de PARTIDA RÁPIDA no modifican estos datos.")}</p></div>
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
              <div className="msc-guide-awena-orb">A</div>
              <div><h2>{L("Awena vous explique", "Awena explains", "Awena te explica")}</h2><p>{L("Dans les écrans qui proposent son bouton d'aide, Awena peut présenter le fonctionnement du menu ou du mode de jeu. Ses réglages sont disponibles dans Réglages > Awena.", "On screens with her help button, Awena can explain the menu or game mode. Her settings are available under Settings > Awena.", "En las pantallas con su botón de ayuda, Awena puede explicar el menú o modo de juego. Sus ajustes están disponibles en Ajustes > Awena.")}</p></div>
            </div>
            <button className="msc-guide-primary-button" type="button" onClick={closeGuide}>{isFirstLogin ? L("J'ai compris — commencer", "Got it — start", "Entendido — empezar") : L("Retour aux réglages", "Back to settings", "Volver a ajustes")}</button>
          </section>
        </article>
      </section>
    </main>
  );
}
