import React from "react";
import MssSelectorIconButton from "../MssSelectorIconButton";
import { MssStartOrderSection } from "./MssMatchFormatPanel";
import killerStatusIcon from "../../assets/icons/killer-list.png";
import { MssInputMethodChoice } from "./MssPremiumConfig";
import { isKillerVoiceAvailable, hasKillerAutoDartsBridge } from "../../lib/scoreInput/killerInput";
import { loadCameraCalibration } from "../../lib/cameraCalibrationStore";
import "../../styles/mss-scoring-palette.css";

export type KillerQuickRules = {
  lives: number;
  becomeRule: "single" | "double";
  damageRule: "one" | "multiplier";
  numberAssignMode: "random" | "throw";
  startOrderMode: "alternate" | "random" | "manual" | "bull";
  inputMode: "keypad" | "dartboard" | "voice" | "camera" | "autodarts";
  selfHitWhileKiller: boolean;
  selfHitUsesMultiplier: boolean;
  lifeSteal: boolean;
  blindKiller: boolean;
  bullSplash: boolean;
  bullHeal: boolean;
  bullHealLives: number;
  bullHealFull: boolean;
  bullRotate: boolean;
  bullRotationMode: "random" | "defined";
  bullRotationTurns: number;
  shieldOnDBull: boolean;
  disarmOnDBull: boolean;
  shieldTurns: number;
  selectBonusShield: boolean;
  missAutoHit: boolean;
  resurrectionMode: "off" | "one_player_once" | "all_once" | "all";
  resurrectionLives: number;
  arcadeEnabled: boolean;
  hitEnabled: boolean;
  voiceEnabled: boolean;
};

export const DEFAULT_KILLER_QUICK_RULES: KillerQuickRules = {
  lives: 3, becomeRule: "single", damageRule: "one", numberAssignMode: "random", startOrderMode: "alternate", inputMode: "keypad",
  selfHitWhileKiller: false, selfHitUsesMultiplier: false, lifeSteal: false, blindKiller: false,
  bullSplash: false, bullHeal: false, bullHealLives: 1, bullHealFull: false, bullRotate: false,
  bullRotationMode: "random", bullRotationTurns: 1, shieldOnDBull: false, disarmOnDBull: false, shieldTurns: 1,
  selectBonusShield: false, missAutoHit: false,
  resurrectionMode: "off", resurrectionLives: 1,
  arcadeEnabled: false, hitEnabled: false, voiceEnabled: false,
};

const head: React.CSSProperties = { fontSize: 13, fontWeight: 950, letterSpacing: .7, textTransform: "uppercase" };
const help: React.CSSProperties = { fontSize: 11, lineHeight: 1.45, color: "#aeb6cb", textAlign: "center" };

function HeartChoice({ n, active, accent, onClick, gained = false }: { n: number; active: boolean; accent: string; onClick: () => void; gained?: boolean }) {
  return <button type="button" aria-label={`${gained ? "Rendre" : "Commencer avec"} ${n} vies`} aria-pressed={active} onClick={onClick}
    style={{ padding: 0, border: 0, background: "transparent", minWidth: 0, width: "100%", maxWidth: 55, aspectRatio: "60 / 52", justifySelf: "center", cursor: "pointer", filter: active ? `drop-shadow(0 0 6px ${accent}55)` : "none" }}>
    <svg viewBox="0 0 60 52" width="100%" height="100%" aria-hidden="true">
      <path d="M26 45.4 22 41.8C12.4 33.3 5.5 27.1 5.5 18.4c0-6.7 5.2-11.8 11.6-11.8 3.7 0 7.2 1.8 9.4 4.7 2.2-2.9 5.7-4.7 9.4-4.7 6.4 0 11.6 5.1 11.6 11.8 0 8.7-6.9 14.9-16.5 23.4L26 45.4Z" fill={active ? accent : "#0b0d19"} stroke={accent} strokeOpacity={active ? 1 : .6} strokeWidth="2" strokeLinejoin="round" />
      <text x="26" y="28" textAnchor="middle" fontSize="18" fontWeight="900" fill={active ? "#211608" : "#e4e7f2"}>{n}</text>
      {gained && <><circle cx="46" cy="37" r="10" fill={active ? "#ffedc4" : "#0b0d19"} stroke={accent} strokeWidth="2"/><path d="M46 31.5v11M40.5 37h11" stroke={active ? "#241607" : accent} strokeWidth="2.6" strokeLinecap="round"/></>}
    </svg>
  </button>;
}

function Numbers({ values, value, setValue, accent }: { values: number[]; value: number; setValue: (v: number) => void; accent: string }) {
  return <div style={{ display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap" }}>{values.map(n =>
    <button key={n} type="button" aria-pressed={n === value} onClick={() => setValue(n)} style={{ width: 34, height: 34, padding: 0, borderRadius: "50%", border: `1px solid ${n === value ? accent : "#4c4550"}`, background: n === value ? `${accent}1f` : "rgba(255,255,255,.02)", color: n === value ? accent : "#e3e7f5", fontWeight: 900, cursor: "pointer" }}>{n}</button>
  )}</div>;
}

function Variant({ title, info, value, onClick, accent, disabled = false }: { title: string; info: string; value: boolean; onClick: () => void; accent: string; disabled?: boolean }) {
  const [showInfo, setShowInfo] = React.useState(false);
  return <div style={{ opacity: disabled ? .4 : 1, borderBottom: "1px solid rgba(255,255,255,.065)", padding: "7px 0" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ fontWeight: 850, fontSize: 11.5, color: "#f4f3ff", minWidth: 0, flex: 1 }}>{title}</span>
      <button type="button" title={`À propos : ${title}`} aria-expanded={showInfo} onClick={() => setShowInfo(v=>!v)} style={{ color: accent, background: "transparent", border: `1px solid ${accent}70`, borderRadius: "50%", fontSize: 12, width: 22, height: 22, padding: 0, cursor: "pointer" }}>i</button>
      <button type="button" role="switch" aria-checked={value} aria-label={`${title} : ${value ? "activée" : "désactivée"}`} disabled={disabled} onClick={onClick}
        style={{ width: 29, height: 29, marginLeft: "auto", borderRadius: "50%", border: value ? `1px solid ${accent}` : "1px solid #ff6685", background: value ? accent : "transparent", color: value ? "#1c1609" : "#fff", fontSize: 16, fontWeight: 900, cursor: disabled ? "not-allowed" : "pointer", flex: "0 0 auto", boxShadow: value ? "0 0 9px rgba(20,194,119,.25)" : "none" }}>
        {value ? "✓" : ""}
      </button>
    </div>
    {showInfo && <div style={{ ...help, textAlign: "left", padding: "5px 34px 2px 0" }}>{info}</div>}
  </div>;
}

function InfoPanel({ children, title, accent }: { children: React.ReactNode; title: string; accent: string }) {
  return <section style={{ minWidth: 0, border: "1px solid rgba(255,255,255,.075)", borderRadius: 17, background: "rgba(8,10,23,.84)", padding: "12px 13px", display: "grid", gap: 11 }}>
    <h3 style={{ ...head, margin: 0, color: accent }}>{title}</h3>{children}
  </section>;
}

function MiniIcon({ label, active, value, onClick, accent }: { label: string; active: boolean; value: string; onClick: () => void; accent: string }) {
  return <button type="button" aria-label={label} aria-pressed={active} onClick={onClick}
    style={{ minWidth: 52, height: 47, borderRadius: 13, border: `1px solid ${active ? accent : `${accent}60`}`, background: active ? `${accent}20` : "rgba(255,255,255,.025)", color: accent, fontSize: 19, fontWeight: 950, cursor: "pointer", boxShadow: active ? `0 0 12px ${accent}33` : "none" }}>{value}</button>;
}

export default function MssKillerQuickSettings({ rules, setRules, accent, progressive = false }: {
  rules: KillerQuickRules; setRules: React.Dispatch<React.SetStateAction<KillerQuickRules>>; accent: string; progressive?: boolean;
}) {
  const [advanced, setAdvanced] = React.useState(false);
  const [bullPanel, setBullPanel] = React.useState(false);
  const [audioPanel, setAudioPanel] = React.useState(false);
  const update = (patch: Partial<KillerQuickRules>) => setRules(r => ({ ...r, ...patch }));
  const setBull = (key: "bullSplash" | "bullHeal" | "bullHealFull" | "shieldOnDBull" | "disarmOnDBull") => {
    setRules(prev => {
      const next: KillerQuickRules = { ...prev, [key]: !prev[key] };
      if (!prev[key] && !prev.bullRotate) {
        if (key === "bullSplash") { next.bullHeal = false; next.bullHealFull = false; next.shieldOnDBull = false; next.disarmOnDBull = false; }
        if (key === "bullHeal") { next.bullSplash = false; next.lifeSteal = false; }
        if (["bullHealFull", "shieldOnDBull", "disarmOnDBull"].includes(key)) {
          next.bullSplash = false;
          for (const other of ["bullHealFull", "shieldOnDBull", "disarmOnDBull"] as const) if (other !== key) next[other] = false;
        }
      }
      return next;
    });
  };
  const voiceReady = React.useMemo(() => isKillerVoiceAvailable(), []);
  const cameraReady = React.useMemo(() => {
    try { return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && !!loadCameraCalibration(); }
    catch { return false; }
  }, []);
  const autodartsReady = React.useMemo(() => hasKillerAutoDartsBridge(), []);
  const inputOptions = [
    ["keypad", "KEYPAD", true], ["dartboard", "CIBLE", true], ["voice", "VOCAL", voiceReady],
    ["camera", "CAMÉRA", cameraReady], ["autodarts", "AUTODARTS", autodartsReady],
  ] as const;
  return <div style={{ display: "grid", gap: 11 }}>
    <InfoPanel title="RÈGLES DE BASE" accent={accent}>
      <div style={{ ...head, fontSize: 11, color: "#c3c7df" }}>NOMBRE DE VIES</div>
      <div role="group" aria-label="Nombre de vies" style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 2, width: "100%", maxWidth: 380, margin: "0 auto" }}>
        {[1,2,3,4,5,6].map(n => <HeartChoice key={n} n={n} active={progressive ? n === 5 : rules.lives === n} accent={accent} onClick={() => !progressive && update({ lives: n })} />)}
      </div>
      <div style={{ ...head, fontSize: 11, color: "#c3c7df" }}>DEVENIR KILLER</div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 39px minmax(0,1fr)", gap: 8, alignItems: "center" }}>
        {(["single", "double"] as const).map((kind, i) => <React.Fragment key={kind}>{i === 1 && <img src={killerStatusIcon} alt="KILLER" style={{ width: 38, height: 38, objectFit: "contain" }} />}
          <button type="button" className={kind === "single" ? "mss-hit-s" : "mss-hit-d"} aria-pressed={(progressive ? "single" : rules.becomeRule) === kind} onClick={() => !progressive && update({ becomeRule: kind })}
            style={{ minWidth: 0, height: 54, borderRadius: 14, borderWidth: 1, borderStyle: "solid", fontSize: 12, fontWeight: 950, cursor: "pointer", outline: (progressive ? "single" : rules.becomeRule) === kind ? `2px solid ${accent}` : "none", outlineOffset: -3 }}>{kind === "single" ? "SIMPLE" : "DOUBLE"}</button></React.Fragment>)}
      </div>
      <div style={{ ...head, fontSize: 11, color: "#c3c7df" }}>DÉGÂTS</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
        <MiniIcon label="1 vie retirée par impact" active={!progressive && rules.damageRule === "one"} value="−1" accent={accent} onClick={() => !progressive && update({ damageRule: "one" })} />
        <MiniIcon label="1, 2 ou 3 vies selon S, D ou T" active={progressive || rules.damageRule === "multiplier"} value="X" accent={accent} onClick={() => !progressive && update({ damageRule: "multiplier" })} />
      </div>
      <div style={{ ...help, marginTop: -4 }}><strong style={{ color: accent }}>{progressive || rules.damageRule === "multiplier" ? "MULTIPLICATEUR S / D / T" : "−1 PAR IMPACT"}</strong>
        <div>{progressive || rules.damageRule === "multiplier" ? "Simple −1, double −2, triple −3 vies." : "Un impact valide retire toujours une vie."}</div>
      </div>
      {progressive && <p style={{ ...help, margin: 0 }}>KILLER Progressif conserve ses règles fixes : 5 vies-cibles, progression S/D/T et numéro déterminé au lancer.</p>}
    </InfoPanel>
    <InfoPanel title="DÉPART ET SAISIE" accent={accent}>
      <MssStartOrderSection accent={accent} value={rules.startOrderMode} onChange={n => update({ startOrderMode: n })} />
      <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", paddingTop: 10 }}>
        <div style={{ ...head, fontSize: 11, color: "#c3c7df", marginBottom: 8 }}>ATTRIBUTION DES SECTEURS</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <MssSelectorIconButton icon="random-order" label="Numéros aléatoires" accent={accent} active={!progressive && rules.numberAssignMode === "random"} onClick={() => !progressive && update({ numberAssignMode: "random" })} />
          <MssSelectorIconButton icon="dart-throw" label="Premier lancer" accent={accent} active={progressive || rules.numberAssignMode === "throw"} onClick={() => !progressive && update({ numberAssignMode: "throw", blindKiller: false })} />
        </div>
        <div style={{ ...help, marginTop: 7 }}>{progressive || rules.numberAssignMode === "throw" ? "Chaque joueur obtient son secteur avec un lancer de fléchette." : "Un secteur unique est attribué automatiquement à chaque joueur ou équipe."}</div>
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", paddingTop: 10 }}>
        <div style={{ ...head, fontSize: 11, color: "#c3c7df", marginBottom: 8 }}>MODE DE SAISIE</div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 9 }}>
          {inputOptions.map(([id, title, ready]) => <MssInputMethodChoice key={id} label={title + (ready ? "" : " · non configuré")} icon={id} active={rules.inputMode === id} disabled={!ready} accent={accent} onClick={() => update({ inputMode: id })} />)}
        </div>
        <div style={{ ...help, marginTop: 7 }}><strong style={{ color: accent }}>{inputOptions.find(v => v[0] === rules.inputMode)?.[1]}</strong> · {({ keypad: "Clavier S/D/T comme dans X01.", dartboard: "Saisie en touchant la cible interactive.", voice: "Annonce les fléchettes au micro.", camera: "Caméra calibrée.", autodarts: "Appareil connecté." } as const)[rules.inputMode]}</div>
        {(!voiceReady || !cameraReady || !autodartsReady) && <div style={{ ...help, opacity: .75 }}>Les modes non configurés sont grisés. Tu peux les préparer depuis la configuration Arcade.</div>}
      </div>
    </InfoPanel>
    <section style={{ border: `1px solid ${accent}5a`, borderRadius: 17, overflow: "hidden", background: "rgba(9,10,23,.88)" }}>
      <button type="button" aria-expanded={advanced} onClick={() => setAdvanced(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "transparent", border: "none", color: accent, fontWeight: 950, fontSize: 13, textAlign: "left", cursor: "pointer" }}>
        <span>VARIANTES AVANCÉES <span style={{ fontWeight: 650, fontSize: 10, color: "#b8becf" }}>· réglages rapides</span></span><span>{advanced ? "−" : "+"}</span>
      </button>
      {advanced && <div style={{ padding: "0 13px 13px", display: "grid", gap: 11, opacity: progressive ? .55 : 1 }}>
        {progressive && <div style={help}>Non disponibles en KILLER Progressif, dont les règles sont fixes.</div>}
        <div>
          <Variant title="AUTO-PÉNALITÉ" info="Toucher son propre secteur quand on est KILLER enlève une vie." accent={accent} value={!progressive && rules.selfHitWhileKiller} disabled={progressive} onClick={() => update({ selfHitWhileKiller: !rules.selfHitWhileKiller, selfHitUsesMultiplier: false })} />
          {rules.selfHitWhileKiller && !progressive && <Variant title="MULTIPLICATEUR" info="Auto-pénalité selon S/D/T : −1, −2 ou −3." accent={accent} value={rules.selfHitUsesMultiplier} onClick={() => update({ selfHitUsesMultiplier: !rules.selfHitUsesMultiplier })} />}
          <Variant title="VOL DE VIES" info="Les vies perdues par la cible sont transférées au KILLER." accent={accent} value={!progressive && rules.lifeSteal} disabled={progressive} onClick={() => update({ lifeSteal: !rules.lifeSteal, bullHeal: false })} />
          <Variant title="BLIND KILLER" info="Les numéros restent masqués pendant la partie. Incompatible avec l'attribution au premier lancer." accent={accent} value={!progressive && rules.blindKiller} disabled={progressive || rules.numberAssignMode === "throw"} onClick={() => update({ blindKiller: !rules.blindKiller })} />
          <Variant title="MISS = AUTO-HIT" info="Une fléchette hors cible retire automatiquement 1 vie au tireur." accent={accent} value={!progressive && rules.missAutoHit} disabled={progressive} onClick={() => update({ missAutoHit: !rules.missAutoHit })} />
          <Variant title="BOUCLIER AU PREMIER LANCER" info="Bonus bouclier selon le segment obtenu pour choisir son numéro." accent={accent} value={!progressive && rules.selectBonusShield} disabled={progressive || rules.numberAssignMode !== "throw"} onClick={() => update({ selectBonusShield: !rules.selectBonusShield })} />
        </div>
        <button type="button" aria-expanded={bullPanel} onClick={() => setBullPanel(v=>!v)} style={{ ...head, background: `${accent}12`, border: `1px solid ${accent}35`, color: accent, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", cursor: "pointer" }}><span>FONCTIONS BULL</span><span>{bullPanel ? "−" : "+"}</span></button>
        {bullPanel && <div style={{ display: "grid", gap: 6 }}>
          <Variant title="ROTATION DES FONCTIONS" info="Avec la rotation, plusieurs fonctions peuvent alterner sur un même segment." value={rules.bullRotate} accent={accent} disabled={progressive} onClick={() => {
            setRules(r => {
              if (!r.bullRotate) return { ...r, bullRotate: true };
              // Sans rotation, une seule fonction par segment (contrat KILLER Arcade).
              if (r.bullSplash) return { ...r, bullRotate: false, bullHeal: false, bullHealFull: false, shieldOnDBull: false, disarmOnDBull: false };
              return { ...r, bullRotate: false, disarmOnDBull: false, bullHealFull: r.bullHealFull && !r.shieldOnDBull };
            });
          }} />
          {rules.bullRotate && <div style={{ display: "grid", gap: 8, padding: "4px 8px 8px", borderLeft: `2px solid ${accent}60` }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 9 }}><MssSelectorIconButton icon="random-order" label="Rotation aléatoire" accent={accent} active={rules.bullRotationMode === "random"} onClick={() => update({ bullRotationMode: "random" })} /><MssSelectorIconButton icon="manual-order" label="Ordre défini" accent={accent} active={rules.bullRotationMode === "defined"} onClick={() => update({ bullRotationMode: "defined" })} /></div>
            <div style={{ ...help, color: accent }}>{rules.bullRotationMode === "random" ? "ALÉATOIRE" : "ORDRE DÉFINI"}</div>
            {rules.bullRotationMode === "defined" && <Numbers values={[1,2,3,4,5]} value={rules.bullRotationTurns} setValue={v => update({ bullRotationTurns: v })} accent={accent} />}
          </div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}><strong style={{ ...head, color: accent, fontSize: 11 }}>OPTIONS DU</strong><span className="mss-hit-bull25" style={{ border: "1px solid", borderRadius: 10, padding: "5px 11px", fontSize: 11, fontWeight: 900 }}>1/2 BULL</span></div>
          <Variant title="DÉGÂTS À TOUS (−1 / −2)" info="Fonction couplée : le 1/2 BULL retire 1 vie et le BULL50 2 vies à tous les adversaires." accent={accent} disabled={progressive} value={rules.bullSplash} onClick={() => setBull("bullSplash")} />
          <Variant title="SOINS" info="Le 1/2 BULL rend le nombre de vies choisi." accent={accent} disabled={progressive} value={rules.bullHeal} onClick={() => setBull("bullHeal")} />
          {rules.bullHeal && !progressive && <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,55px))", justifyContent: "center", gap: 8 }}>
            {[1,2,3].map(n => <HeartChoice key={n} n={n} gained active={rules.bullHealLives === n} onClick={() => update({ bullHealLives: n })} accent={accent} />)}
          </div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}><strong style={{ ...head, color: accent, fontSize: 11 }}>OPTIONS DU</strong><span className="mss-hit-bull50" style={{ border: "1px solid", borderRadius: 10, padding: "5px 11px", fontSize: 11, fontWeight: 900 }}>BULL</span></div>
          <Variant title="SOINS MAX" info="Restaure toutes les vies de l'équipe ou du tireur." accent={accent} disabled={progressive} value={rules.bullHealFull} onClick={() => setBull("bullHealFull")} />
          <Variant title="BOUCLIER" info="Protège le joueur actif pendant le nombre de tours choisi." accent={accent} disabled={progressive} value={rules.shieldOnDBull} onClick={() => setBull("shieldOnDBull")} />
          {rules.shieldOnDBull && !progressive && <Numbers values={[1,2,3,4,5]} value={rules.shieldTurns} setValue={v => update({ shieldTurns: v })} accent={accent} />}
          <Variant title="DÉSARMEMENT" info="Retire temporairement le statut KILLER aux adversaires." accent={accent} disabled={progressive} value={rules.disarmOnDBull} onClick={() => setBull("disarmOnDBull")} />
        </div>}
        <div style={{ borderTop: "1px solid rgba(255,255,255,.065)", paddingTop: 8 }}>
          <div style={{ ...head, color: accent, marginBottom: 9 }}>RÉSURRECTION</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            {([ ["off", "revive-off", "OFF"], ["one_player_once", "revive-once", "1 JOUEUR"], ["all_once", "revive-all-once", "TOUS 1 FOIS"], ["all", "revive-unlimited", "ILLIMITÉ"] ] as const).map(([id, icon, title]) =>
              <MssSelectorIconButton key={id} icon={icon} accent={accent} label={title} active={rules.resurrectionMode === id} disabled={progressive} onClick={() => update({ resurrectionMode: id })} />)}
          </div>
          <div style={{ ...help, marginTop: 8, color: accent, fontWeight: 850 }}>{({ off:"OFF", one_player_once:"1 JOUEUR (1 FOIS)", all_once:"TOUS (1 FOIS)", all:"TOUS (ILLIMITÉ)" } as const)[rules.resurrectionMode]}</div>
          {rules.resurrectionMode !== "off" && !progressive && <div role="group" aria-label="Vies rendues" style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 2, maxWidth: 370, margin: "10px auto 0" }}>
            {[1,2,3,4,5,6].map(n => <HeartChoice key={n} gained n={n} active={rules.resurrectionLives === n} accent={accent} onClick={() => update({ resurrectionLives: n })} />)}
          </div>}
        </div>
      </div>}
    </section>
    <section style={{ border: `1px solid ${accent}4d`, background: "rgba(10,12,23,.85)", borderRadius: 16, overflow: "hidden" }}>
      <button type="button" aria-expanded={audioPanel} onClick={() => setAudioPanel(v=>!v)} style={{ width: "100%", padding: "12px 14px", display: "flex", justifyContent: "space-between", background: "none", border: "none", color: accent, fontSize: 12, fontWeight: 950, letterSpacing: .6, cursor: "pointer" }}><span>MODE AUDIO</span><span>{audioPanel ? "−" : "+"}</span></button>
      {audioPanel && <div style={{ display: "grid", gap: 6, padding: "0 13px 13px" }}>
        <Variant title="SONS ARCADE" info="Ambiances et annonces de victoire." accent={accent} value={rules.arcadeEnabled} onClick={() => update({ arcadeEnabled: !rules.arcadeEnabled })} />
        <Variant title="BRUITAGES" info="Sons des impacts de fléchettes." accent={accent} value={rules.hitEnabled} onClick={() => update({ hitEnabled: !rules.hitEnabled })} />
        <Variant title="ANNONCES VOCALES" info="Voix de synthèse pendant la partie." accent={accent} value={rules.voiceEnabled} onClick={() => update({ voiceEnabled: !rules.voiceEnabled })} />
      </div>}
    </section>
  </div>;
}
