// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import { useTheme } from "../contexts/ThemeContext";
import scratchTicketPreview from "../assets-webp/games/loterie-ticket-scratch-v2.png";
import { resolveProfileStarScore } from "../lib/profileStarScore";
import {
  LOTERIE_LEVELS,
  normalizeAvg3,
  type LoterieAutoMode,
  type LoterieConfig as LoterieConfigType,
  type LoterieExpressTarget,
  type LoterieLevel,
  type LoterieVariant,
  type LoterieVolleyMode,
} from "../lib/loterie";

const GOLD = "#f6c256";
const TEXT2 = "rgba(255,255,255,.68)";
const PANEL = "linear-gradient(180deg,rgba(24,24,28,.96),rgba(9,10,13,.98))";

function safeProfiles(store: any): any[] {
  const raw = store?.profiles ?? store?.profilesStore?.profiles ?? store?.profileStore?.profiles ?? [];
  return Array.isArray(raw) ? raw : [];
}

function activeProfileId(store: any): string | null {
  const id = store?.activeProfileId ?? store?.profilesStore?.activeProfileId ?? store?.profileStore?.activeProfileId ?? store?.activeProfile?.id;
  return id == null ? null : String(id);
}

function nameOf(p: any): string {
  return String(p?.displayName ?? p?.name ?? p?.nickname ?? p?.username ?? "Joueur");
}

function avatarOf(p: any): string | null {
  return p?.avatarDataUrl ?? p?.avatarUrl ?? p?.avatar ?? null;
}

function avg3Of(p: any): number {
  const direct = normalizeAvg3(p);
  if (direct > 0) return direct;
  const shared = Number(resolveProfileStarScore(p) || 0);
  return Number.isFinite(shared) && shared > 0 ? shared : 0;
}

function Avatar({ p, size = 48 }: any) {
  const src = avatarOf(p);
  const n = nameOf(p);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flex: "0 0 auto", border: `1px solid ${GOLD}70`, background: "rgba(255,255,255,.06)", display: "grid", placeItems: "center", color: GOLD, fontWeight: 1000 }}>
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : n.slice(0, 2).toUpperCase()}
    </div>
  );
}

function Segmented({ value, onChange, items }: any) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length},minmax(0,1fr))`, gap: 6 }}>
      {items.map((it: any) => {
        const active = value === it.value;
        return (
          <button key={it.value} type="button" onClick={() => onChange(it.value)} style={{ minHeight: 42, borderRadius: 12, padding: "7px 8px", border: `1px solid ${active ? GOLD : "rgba(255,255,255,.09)"}`, background: active ? "linear-gradient(180deg,rgba(246,194,86,.25),rgba(246,194,86,.08))" : "rgba(255,255,255,.035)", color: active ? "#ffe7a7" : "rgba(255,255,255,.75)", fontWeight: 950, fontSize: 11, cursor: "pointer", boxShadow: active ? "0 0 16px rgba(246,194,86,.14)" : "none" }}>
            <div>{it.label}</div>
            {it.sub ? <div style={{ marginTop: 2, opacity: .62, fontSize: 8.5, fontWeight: 800 }}>{it.sub}</div> : null}
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, hint, children }: any) {
  return (
    <section style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, background: PANEL, padding: 13, boxShadow: "0 10px 28px rgba(0,0,0,.22)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ color: GOLD, fontWeight: 1000, fontSize: 11.5, letterSpacing: .8 }}>{title}</div>
        {hint ? <div style={{ color: TEXT2, fontSize: 9.5, textAlign: "right" }}>{hint}</div> : null}
      </div>
      {children}
    </section>
  );
}

export default function LoterieConfig({ setTab, go, store, params }: any) {
  const { theme } = useTheme();
  const profiles = React.useMemo(() => safeProfiles(store), [store]);
  const activeId = activeProfileId(store);
  const [info, setInfo] = React.useState(false);

  const initialSelected = React.useMemo(() => {
    if (Array.isArray(params?.selectedIds) && params.selectedIds.length) return params.selectedIds.map(String);
    if (activeId) return [activeId];
    return profiles[0]?.id != null ? [String(profiles[0].id)] : [];
  }, []);

  const [selectedIds, setSelectedIds] = React.useState<string[]>(initialSelected);
  const [variant, setVariant] = React.useState<LoterieVariant>(params?.variant === "express" ? "express" : "classic");
  const [level, setLevel] = React.useState<LoterieLevel>(params?.level || "auto");
  const [autoMode, setAutoMode] = React.useState<LoterieAutoMode>(params?.autoMode || "balanced");
  const [volleyMode, setVolleyMode] = React.useState<LoterieVolleyMode>(params?.volleyMode || "strict3");
  const [expressTarget, setExpressTarget] = React.useState<LoterieExpressTarget>(params?.expressTarget || "simple");
  const [cardsPerPlayer, setCardsPerPlayer] = React.useState<1 | 2 | 3 | 4>(Number(params?.cardsPerPlayer || 2) as any);
  const [cellsPerCard, setCellsPerCard] = React.useState<5 | 10 | 15>(Number(params?.cellsPerCard || 10) as any);
  const [startOrderMode, setStartOrderMode] = React.useState<"random" | "fixed">(params?.startOrderMode || "random");

  const selectedPlayers = React.useMemo(() => selectedIds.map((id) => profiles.find((p) => String(p?.id) === id)).filter(Boolean), [profiles, selectedIds]);

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) return prev.filter((x) => x !== id);
      if (prev.length >= 12) return prev;
      return [...prev, id];
    });
  }

  function launch() {
    if (!selectedPlayers.length) return;
    const config: LoterieConfigType = {
      variant,
      level,
      autoMode,
      volleyMode,
      expressTarget,
      cardsPerPlayer,
      cellsPerCard,
      startOrderMode,
    };
    const players = selectedPlayers.map((p: any) => ({
      ...p,
      id: String(p.id),
      name: nameOf(p),
      avatarDataUrl: avatarOf(p),
      avg3: avg3Of(p),
    }));
    const ordered = startOrderMode === "random" ? [...players].sort(() => Math.random() - .5) : players;
    (go || setTab)?.("loterie_play", { config, players: ordered, createdAt: Date.now() });
  }

  const levelItems = [
    { value: "auto", label: "AUTO", sub: "Selon AVG/3D" },
    ...Object.entries(LOTERIE_LEVELS).map(([value, r]: any) => ({ value, label: r.label, sub: `${r.min}–${r.max}` })),
  ];

  return (
    <div style={{ minHeight: "100vh", color: theme?.text || "#fff", background: theme?.bg || "radial-gradient(circle at 50% -10%,#291f0c,#08090c 38%,#050609)", paddingBottom: 32 }}>
      <header style={{ position: "sticky", top: 0, zIndex: 20, height: 94, overflow: "hidden", borderBottom: `1px solid ${GOLD}35`, background: "linear-gradient(180deg,#090a0d 0%,#08090ccc 100%)", backdropFilter: "blur(14px)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 30%,rgba(246,194,86,.22),transparent 60%)" }} />
        <div style={{ position: "absolute", left: 10, top: 12 }}><BackDot onClick={() => (go || setTab)?.("games")} color={GOLD} glow="rgba(246,194,86,.55)" title="Retour" /></div>
        <div style={{ position: "absolute", right: 10, top: 12 }}><InfoDot onClick={() => setInfo(true)} color={GOLD} glow="rgba(246,194,86,.55)" title="Règles" /></div>
        <div style={{ position: "relative", height: "100%", display: "grid", placeItems: "center", textAlign: "center", pointerEvents: "none" }}>
          <div>
            <div style={{ fontSize: 23, fontWeight: 1000, letterSpacing: 2.8, color: GOLD, textShadow: "0 0 18px rgba(246,194,86,.4)" }}>🎰 LOTERIE</div>
            <div style={{ fontSize: 9.5, letterSpacing: 1.1, color: "rgba(255,255,255,.58)", marginTop: 3 }}>CHOISIS TES CARTONS • TROUVE LES NUMÉROS • COMPLÈTE UNE GRILLE</div>
          </div>
        </div>
      </header>

      <main style={{ width: "min(760px,calc(100% - 20px))", margin: "12px auto 0", display: "grid", gap: 10 }}>

        <Section title="APERÇU DU CARTON" hint="DA validée · style ticket / grattage loterie">
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,160px) minmax(0,1fr)", gap: 12, alignItems: "center" }}>
            <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${GOLD}55`, background: "rgba(255,255,255,.04)", boxShadow: "0 10px 28px rgba(0,0,0,.22)" }}>
              <img src={scratchTicketPreview} alt="Carton LOTERIE" style={{ width: "100%", display: "block" }} />
            </div>
            <div>
              <div style={{ color: GOLD, fontSize: 12, fontWeight: 1000 }}>Carte LOTERIE validée</div>
              <div style={{ marginTop: 6, color: TEXT2, fontSize: 10.5, lineHeight: 1.55 }}>
                Cette V2 utilise le visuel de carton que tu as validé : un <b>ticket de loterie à gratter</b> avec cases couvertes, chiffres révélés, tampons <b>VALIDÉ</b> et bandeau d'information en bas. Le rendu Play reprend cet esprit sur chaque carton joueur, avec en plus des effets de révélation, tampons validés animés et feedback JACKPOT / DOUBLE HIT.
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  'Ticket vintage',
                  'Effet grattage',
                  'Tampons validés',
                  'Progression intégrée',
                  'FX jackpot / hit',
                ].map((lab) => (
                  <span key={lab} style={{ fontSize: 9.5, color: GOLD, padding: '4px 8px', borderRadius: 999, border: `1px solid ${GOLD}40`, background: 'rgba(246,194,86,.08)' }}>{lab}</span>
                ))}
              </div>
            </div>
          </div>
        </Section>
        <Section title="JOUEURS" hint={`${selectedIds.length}/12 sélectionné${selectedIds.length > 1 ? "s" : ""}`}>
          {!profiles.length ? <div style={{ color: TEXT2, fontSize: 12 }}>Aucun profil local disponible.</div> : (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {profiles.map((p: any) => {
                const id = String(p.id);
                const active = selectedIds.includes(id);
                return (
                  <button key={id} onClick={() => togglePlayer(id)} style={{ minWidth: 112, maxWidth: 128, borderRadius: 15, padding: 9, border: `1px solid ${active ? GOLD : "rgba(255,255,255,.09)"}`, background: active ? "rgba(246,194,86,.11)" : "rgba(255,255,255,.035)", color: "#fff", cursor: "pointer", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center" }}><Avatar p={p} /></div>
                    <div style={{ marginTop: 6, fontSize: 10.5, fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(p)}</div>
                    <div style={{ marginTop: 2, fontSize: 8.5, color: active ? GOLD : TEXT2 }}>AVG3 {avg3Of(p) ? avg3Of(p).toFixed(1) : "—"}</div>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="MODE" hint={variant === "classic" ? "Le TOTAL de la volée cherche une case" : "Une seule fléchette cherche une cible exacte"}>
          <Segmented value={variant} onChange={setVariant} items={[
            { value: "classic", label: "LOTERIE", sub: "1–3 darts · total de volée" },
            { value: "express", label: "EXPRESS", sub: "1 dart · cible directe" },
          ]} />
        </Section>

        {variant === "classic" ? (
          <>
            <Section title="NIVEAU / PLAGE DE SCORES" hint="Maximum absolu : 120">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
                {levelItems.map((it: any) => {
                  const active = level === it.value;
                  return <button key={it.value} onClick={() => setLevel(it.value)} style={{ minHeight: 46, borderRadius: 12, border: `1px solid ${active ? GOLD : "rgba(255,255,255,.08)"}`, background: active ? "rgba(246,194,86,.12)" : "rgba(255,255,255,.03)", color: active ? GOLD : "rgba(255,255,255,.75)", fontWeight: 950, cursor: "pointer" }}><div style={{ fontSize: 10.5 }}>{it.label}</div><div style={{ fontSize: 8.5, opacity: .65 }}>{it.sub}</div></button>;
                })}
              </div>
              {level === "auto" ? <div style={{ marginTop: 8 }}><Segmented value={autoMode} onChange={setAutoMode} items={[
                { value: "balanced", label: "ÉQUILIBRÉ", sub: "Plage propre à chaque joueur" },
                { value: "common", label: "IDENTIQUE", sub: "Plage commune calculée sur le groupe" },
              ]} /></div> : null}
            </Section>
            <Section title="VOLÉE" hint="LIBRE permet de sécuriser un bon total après 1 ou 2 darts">
              <Segmented value={volleyMode} onChange={setVolleyMode} items={[
                { value: "free", label: "LIBRE", sub: "Valider après 1, 2 ou 3 darts" },
                { value: "strict3", label: "3 DARTS", sub: "Trois fléchettes obligatoires" },
              ]} />
            </Section>
          </>
        ) : (
          <Section title="CIBLE EXPRESS" hint="Le multiplicateur exact est obligatoire en Double / Triple">
            <Segmented value={expressTarget} onChange={setExpressTarget} items={[
              { value: "simple", label: "SIMPLE", sub: "1–20 · S/D/T valident le numéro" },
              { value: "double", label: "DOUBLE", sub: "D1–D20 + DBULL" },
              { value: "triple", label: "TRIPLE", sub: "T1–T20" },
            ]} />
          </Section>
        )}

        <Section title="CARTONS" hint="Le premier carton entièrement révélé gagne">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: TEXT2, marginBottom: 5 }}>CARTONS / JOUEUR</div>
              <Segmented value={cardsPerPlayer} onChange={(v: any) => setCardsPerPlayer(Number(v) as any)} items={[1,2,3,4].map((v) => ({ value: v, label: String(v) }))} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: TEXT2, marginBottom: 5 }}>CASES / CARTON</div>
              <Segmented value={cellsPerCard} onChange={(v: any) => setCellsPerCard(Number(v) as any)} items={[5,10,15].map((v) => ({ value: v, label: String(v) }))} />
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: TEXT2 }}>Les numéros sont uniques dans un même carton, mais peuvent se répéter entre plusieurs cartons. Un seul résultat peut donc ouvrir plusieurs cases.</div>
        </Section>

        <Section title="ORDRE DE DÉPART">
          <Segmented value={startOrderMode} onChange={setStartOrderMode} items={[
            { value: "random", label: "ALÉATOIRE" },
            { value: "fixed", label: "ORDRE SÉLECTION" },
          ]} />
        </Section>

        <button disabled={!selectedPlayers.length} onClick={launch} style={{ minHeight: 58, borderRadius: 17, border: `1px solid ${GOLD}`, background: selectedPlayers.length ? "linear-gradient(135deg,#f6c256,#ffd978 55%,#b67c18)" : "rgba(255,255,255,.08)", color: selectedPlayers.length ? "#171008" : "rgba(255,255,255,.35)", fontWeight: 1000, letterSpacing: 1.2, fontSize: 14, cursor: selectedPlayers.length ? "pointer" : "default", boxShadow: selectedPlayers.length ? "0 0 26px rgba(246,194,86,.18)" : "none" }}>
          🎰 LANCER LA LOTERIE
        </button>
      </main>

      {info ? (
        <div onClick={() => setInfo(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.74)", display: "grid", placeItems: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,96vw)", maxHeight: "86vh", overflowY: "auto", borderRadius: 20, border: `1px solid ${GOLD}70`, background: "#0d0e12", padding: 17, boxShadow: "0 22px 70px rgba(0,0,0,.55)" }}>
            <div style={{ color: GOLD, fontSize: 18, fontWeight: 1000 }}>RÈGLES — LOTERIE</div>
            <div style={{ marginTop: 10, color: "rgba(255,255,255,.82)", fontSize: 12, lineHeight: 1.6 }}>
              <b>LOTERIE :</b> chaque joueur reçoit 1 à 4 cartons. Une volée produit un total : si ce total existe sur tes cartons, toutes les cases correspondantes sont révélées. En mode Libre tu peux valider après 1, 2 ou 3 fléchettes ; en mode 3 Darts les trois lancers sont obligatoires.<br/><br/>
              <b>NIVEAU :</b> la plage des numéros dépend du niveau. AUTO peut adapter la plage individuellement selon l’AVG/3D, ou utiliser une plage commune calculée sur le groupe.<br/><br/>
              <b>EXPRESS :</b> une seule fléchette par tour. SIMPLE valide le numéro 1–20 quel que soit S/D/T ; DOUBLE exige le double exact ; TRIPLE exige le triple exact.<br/><br/>
              <b>VICTOIRE :</b> le premier joueur à révéler toutes les cases d’un seul de ses cartons gagne immédiatement.
            </div>
            <button onClick={() => setInfo(false)} style={{ width: "100%", marginTop: 14, minHeight: 44, borderRadius: 13, border: `1px solid ${GOLD}`, background: "rgba(246,194,86,.12)", color: GOLD, fontWeight: 1000 }}>FERMER</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
