// @ts-nocheck
import React from "react";
import QRCode from "qrcode";
import {
  DEFAULT_GOOGLE_CAST_APP_ID,
  clearGoogleCastDiagLog,
  endGoogleCastSession,
  getGoogleCastAppId,
  getGoogleCastDiagLog,
  getGoogleCastState,
  pingGoogleCastReceiver,
  requestGoogleCastSession,
  resetGoogleCastAppId,
  setGoogleCastAppId,
  subscribeGoogleCastStatus,
} from "../../cast/googleCast";
import { buildViewerWaitingSnapshot } from "../../lib/viewer/buildViewerSnapshot";
import { closeViewerSession, createViewerSession, publishViewerSnapshot, viewerJoinUrl } from "../../lib/viewer/viewerClient";
import { clearActiveViewerSession, getActiveViewerSession, setActiveViewerSession, subscribeViewerSessionChanged } from "../../lib/viewer/viewerSession";
import { clearViewerDiagLog, getViewerDiagLog } from "../../lib/viewer/viewerPublisher";
import { getViewerAutoPublish, getViewerPollMs, setViewerAutoPublish, setViewerPollMs } from "../../lib/viewer/viewerSettings";
import type { ViewerSessionInfo } from "../../lib/viewer/types";

type ScreenTab = "cast" | "viewer" | "settings";

type Props = {
  go: (tab: any, params?: any) => void;
  initialTab?: ScreenTab | null;
};

const TAB_STORAGE_KEY = "dc_screens_initial_tab_v1";

function normalizeInitialTab(raw: any): ScreenTab {
  const value = String(raw || "").toLowerCase();
  return value === "viewer" || value === "settings" || value === "cast" ? (value as ScreenTab) : "cast";
}

function consumeStoredInitialTab(): ScreenTab | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(TAB_STORAGE_KEY);
    window.sessionStorage.removeItem(TAB_STORAGE_KEY);
    if (!raw) return null;
    return normalizeInitialTab(raw);
  } catch {
    return null;
  }
}

function cardStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background:
      "radial-gradient(120% 120% at 0% 0%, rgba(255,213,106,.10), transparent 52%), linear-gradient(180deg, rgba(18,22,31,.98), rgba(7,8,12,.98))",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 24,
    padding: 16,
    boxShadow: "0 18px 52px rgba(0,0,0,.38)",
    ...extra,
  };
}

function panelTitle(title: string, subtitle?: string) {
  return (
    <div style={{ display: "grid", gap: 4, marginBottom: 14 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 1100, color: "#ffd56a", letterSpacing: 0.2 }}>{title}</h2>
      {subtitle ? <div style={{ color: "rgba(255,255,255,.68)", fontSize: 13, lineHeight: 1.45 }}>{subtitle}</div> : null}
    </div>
  );
}

function statusBadge(active: boolean, label: string, tone: "ok" | "warn" | "idle" = "idle"): React.CSSProperties {
  const ok = active && tone === "ok";
  const warn = active && tone === "warn";
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 1000,
    border: `1px solid ${ok ? "rgba(16,185,129,.38)" : warn ? "rgba(245,158,11,.38)" : "rgba(255,255,255,.12)"}`,
    background: ok ? "rgba(16,185,129,.14)" : warn ? "rgba(245,158,11,.14)" : "rgba(255,255,255,.055)",
    color: ok ? "#a7f3d0" : warn ? "#fde68a" : "rgba(255,255,255,.82)",
  };
}

function smallButton(tone: "gold" | "danger" | "ghost" = "ghost"): React.CSSProperties {
  const gold = tone === "gold";
  const danger = tone === "danger";
  return {
    borderRadius: 14,
    padding: "11px 13px",
    border: gold ? "1px solid rgba(255,213,106,.45)" : danger ? "1px solid rgba(248,113,113,.35)" : "1px solid rgba(255,255,255,.13)",
    background: gold
      ? "linear-gradient(180deg, rgba(255,213,106,.24), rgba(255,183,42,.10))"
      : danger
      ? "rgba(248,113,113,.10)"
      : "rgba(255,255,255,.06)",
    color: gold ? "#fff4bf" : danger ? "#fecaca" : "#fff",
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow: gold ? "0 0 18px rgba(255,213,106,.12)" : "none",
  };
}

function fieldStyle(): React.CSSProperties {
  return {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.13)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    padding: "12px 14px",
    fontWeight: 900,
    outline: "none",
  };
}

function LogList({ rows, empty, color = "#fde68a" }: { rows: any[]; empty: string; color?: string }) {
  return (
    <div
      style={{
        maxHeight: 330,
        overflow: "auto",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.08)",
        background: "rgba(0,0,0,.25)",
      }}
    >
      {rows.length ? (
        rows
          .slice()
          .reverse()
          .map((row, idx) => (
            <div
              key={idx}
              style={{
                padding: 11,
                borderBottom: "1px solid rgba(255,255,255,.06)",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                lineHeight: 1.42,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              <div style={{ color, fontWeight: 1000 }}>{row.now || (row.at ? new Date(row.at).toLocaleTimeString() : "—")}</div>
              <div>{row.entry}</div>
              <div style={{ opacity: 0.76 }}>{row.extra == null ? "" : JSON.stringify(row.extra, null, 2)}</div>
            </div>
          ))
      ) : (
        <div style={{ padding: 14, opacity: 0.72, fontSize: 13 }}>{empty}</div>
      )}
    </div>
  );
}

export default function CastHostPage({ go, initialTab }: Props) {
  const [activeTab, setActiveTab] = React.useState<ScreenTab>(() => initialTab || consumeStoredInitialTab() || "cast");

  const [castState, setCastState] = React.useState(getGoogleCastState());
  const [appId, setAppIdState] = React.useState(getGoogleCastAppId());
  const [castDiag, setCastDiag] = React.useState<any[]>(getGoogleCastDiagLog());
  const [castMessage, setCastMessage] = React.useState("Cast prêt : lance la session TV avant de démarrer une partie.");
  const [castBusy, setCastBusy] = React.useState(false);

  const [viewer, setViewer] = React.useState<ViewerSessionInfo | null>(() => getActiveViewerSession());
  const [viewerDiag, setViewerDiag] = React.useState<any[]>(() => getViewerDiagLog());
  const [viewerMessage, setViewerMessage] = React.useState("Viewer prêt : crée la session tablette avant de démarrer une partie.");
  const [viewerBusy, setViewerBusy] = React.useState(false);
  const [qr, setQr] = React.useState("");

  const [pollMs, setPollMsState] = React.useState(() => getViewerPollMs());
  const [autoPublish, setAutoPublishState] = React.useState(() => getViewerAutoPublish());

  React.useEffect(() => {
    if (!initialTab) return;
    setActiveTab(normalizeInitialTab(initialTab));
  }, [initialTab]);

  React.useEffect(() => {
    const refresh = () => {
      setCastState(getGoogleCastState());
      setAppIdState(getGoogleCastAppId());
      setCastDiag(getGoogleCastDiagLog());
    };
    refresh();
    return subscribeGoogleCastStatus(refresh);
  }, []);

  React.useEffect(() => subscribeViewerSessionChanged(() => setViewer(getActiveViewerSession())), []);

  React.useEffect(() => {
    const refresh = () => setViewerDiag(getViewerDiagLog());
    window.addEventListener("dc-viewer-diag", refresh as any);
    return () => window.removeEventListener("dc-viewer-diag", refresh as any);
  }, []);

  React.useEffect(() => {
    let alive = true;
    const url = viewer?.joinUrl || (viewer?.sessionId ? viewerJoinUrl(viewer.sessionId) : "");
    if (!url) {
      setQr("");
      return;
    }
    QRCode.toDataURL(url, { margin: 1, width: 250, errorCorrectionLevel: "M" })
      .then((dataUrl: string) => {
        if (alive) setQr(dataUrl);
      })
      .catch(() => {
        if (alive) setQr("");
      });
    return () => {
      alive = false;
    };
  }, [viewer?.joinUrl, viewer?.sessionId]);

  function openTab(tab: ScreenTab) {
    setActiveTab(tab);
    try {
      window.history.replaceState(null, "", `#/cast${tab === "cast" ? "" : `/${tab}`}`);
    } catch {}
  }

  function saveAppId() {
    const next = String(appId || DEFAULT_GOOGLE_CAST_APP_ID).trim().toUpperCase();
    setGoogleCastAppId(next);
    setAppIdState(getGoogleCastAppId());
    setCastState(getGoogleCastState());
    setCastDiag(getGoogleCastDiagLog());
    setCastMessage(`Receiver App ID enregistré : ${getGoogleCastAppId()}`);
  }

  function restoreDefault() {
    resetGoogleCastAppId();
    setAppIdState(getGoogleCastAppId());
    setCastState(getGoogleCastState());
    setCastDiag(getGoogleCastDiagLog());
    setCastMessage(`App ID par défaut restauré : ${getGoogleCastAppId()}`);
  }

  async function startCast() {
    setCastBusy(true);
    setCastMessage("Ouverture du dialogue Google Cast…");
    try {
      const res = await requestGoogleCastSession();
      setCastState(getGoogleCastState());
      setCastDiag(getGoogleCastDiagLog());
      if (res.ok) {
        const next = getGoogleCastState();
        setCastMessage(next.deviceName ? `Chromecast connecté : ${next.deviceName}` : "Session Cast démarrée.");
      } else {
        setCastMessage(res.reason === "cancel" ? "Ouverture Cast annulée." : `Impossible d’ouvrir Cast : ${res.reason}`);
      }
    } finally {
      setCastBusy(false);
    }
  }

  async function stopCast() {
    setCastBusy(true);
    try {
      await endGoogleCastSession();
      setCastMessage("Session Cast arrêtée.");
      setCastState(getGoogleCastState());
      setCastDiag(getGoogleCastDiagLog());
    } finally {
      setCastBusy(false);
    }
  }

  async function pingCast() {
    setCastBusy(true);
    try {
      const ok = await pingGoogleCastReceiver();
      setCastMessage(ok ? "PING envoyé au receiver Cast." : "PING impossible : aucune session Cast active ou erreur receiver.");
      setCastDiag(getGoogleCastDiagLog());
    } finally {
      setCastBusy(false);
    }
  }

  function clearCastDiag() {
    clearGoogleCastDiagLog();
    setCastDiag(getGoogleCastDiagLog());
  }

  async function startViewer() {
    setViewerBusy(true);
    setViewerMessage("Création de la session viewer…");
    try {
      const res = await createViewerSession();
      const now = Date.now();
      const info: ViewerSessionInfo = {
        sessionId: res.sessionId,
        code: res.code || res.sessionId,
        joinUrl: res.joinUrl || viewerJoinUrl(res.sessionId),
        createdAt: now,
        expiresAt: res.expiresInSeconds ? now + res.expiresInSeconds * 1000 : null,
        enabled: true,
      };
      setActiveViewerSession(info);
      setViewer(info);
      try {
        await publishViewerSnapshot(info.sessionId, buildViewerWaitingSnapshot(info.sessionId));
      } catch {}
      setViewerMessage("Session viewer active. Lance une partie : les snapshots iront vers la tablette.");
    } catch (e: any) {
      setViewerMessage(`Erreur viewer : ${String(e?.message || e || "création impossible")}`);
    } finally {
      setViewerBusy(false);
    }
  }

  async function stopViewer() {
    const sid = viewer?.sessionId;
    setViewerBusy(true);
    try {
      if (sid) await closeViewerSession(sid);
    } catch {}
    clearActiveViewerSession();
    setViewer(null);
    setViewerMessage("Session viewer arrêtée.");
    setViewerBusy(false);
  }

  async function copyViewerLink() {
    const url = viewer?.joinUrl || (viewer?.sessionId ? viewerJoinUrl(viewer.sessionId) : "");
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setViewerMessage("Lien viewer copié.");
    } catch {
      setViewerMessage(url);
    }
  }

  function clearViewerDiag() {
    clearViewerDiagLog();
    setViewerDiag([]);
  }

  function saveViewerSettings() {
    const nextPoll = setViewerPollMs(pollMs);
    const nextAuto = setViewerAutoPublish(autoPublish);
    setPollMsState(nextPoll);
    setAutoPublishState(nextAuto);
    setViewerMessage(`Réglages viewer enregistrés : ${nextPoll} ms, publication ${nextAuto ? "active" : "désactivée"}.`);
  }

  const tabMeta: Array<{ key: ScreenTab; title: string; subtitle: string }> = [
    { key: "cast", title: "CAST", subtitle: "TV / Chromecast" },
    { key: "viewer", title: "VIEWER", subtitle: "Tablette / second écran" },
    { key: "settings", title: "RÉGLAGES", subtitle: "Paramètres écran" },
  ];

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "radial-gradient(circle at top, #18202d 0%, #090b10 56%, #050608 100%)",
        color: "#f8fafc",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "18px 14px 116px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <button onClick={() => go("home")} style={smallButton("ghost")}>← Retour</button>
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <div style={{ fontSize: "clamp(25px,7vw,38px)", fontWeight: 1200, letterSpacing: 0.4, color: "#ffd56a" }}>Écrans</div>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Cast TV et Viewer tablette, séparés et utilisables ensemble.</div>
          </div>
          <div style={{ width: 86 }} />
        </header>

        <nav style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 14 }}>
          {tabMeta.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => openTab(tab.key)}
                style={{
                  borderRadius: 18,
                  padding: "12px 8px",
                  border: active ? "1px solid rgba(255,213,106,.62)" : "1px solid rgba(255,255,255,.10)",
                  background: active ? "linear-gradient(180deg, rgba(255,213,106,.22), rgba(0,0,0,.20))" : "rgba(255,255,255,.045)",
                  color: active ? "#fff4bf" : "rgba(255,255,255,.74)",
                  boxShadow: active ? "0 0 18px rgba(255,213,106,.16)" : "none",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 1200, fontSize: 15, letterSpacing: 0.3 }}>{tab.title}</div>
                <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tab.subtitle}</div>
              </button>
            );
          })}
        </nav>

        {activeTab === "cast" && (
          <div style={{ display: "grid", gap: 12 }}>
            <section style={cardStyle()}>
              {panelTitle("📺 Cast TV / Chromecast", "À lancer avant la partie. La partie enverra ensuite les snapshots au receiver Cast actif.")}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <div style={statusBadge(castState.supported, castState.supported ? "Navigateur compatible" : "Navigateur non compatible", castState.supported ? "ok" : "warn")} />
                <div style={statusBadge(castState.sdkLoaded, castState.sdkLoaded ? "SDK chargé" : "SDK non chargé", castState.sdkLoaded ? "ok" : "idle")} />
                <div style={statusBadge(castState.isCasting, castState.isCasting ? `Connecté${castState.deviceName ? ` : ${castState.deviceName}` : ""}` : "Aucune session Cast", castState.isCasting ? "ok" : "warn")} />
              </div>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                <button onClick={startCast} disabled={castBusy} style={smallButton("gold")}>{castBusy ? "Ouverture…" : "Lancer le Cast TV"}</button>
                <button onClick={stopCast} disabled={castBusy} style={smallButton(castState.isCasting ? "danger" : "ghost")}>Arrêter Cast</button>
                <button onClick={pingCast} disabled={castBusy} style={smallButton("ghost")}>Envoyer un PING</button>
                <button onClick={clearCastDiag} style={smallButton("ghost")}>Effacer diagnostic Cast</button>
              </div>
              <div style={{ marginTop: 12, color: castMessage.startsWith("Impossible") ? "#fecaca" : "#dbeafe", fontSize: 13, fontWeight: 900 }}>{castMessage}</div>
            </section>

            <section style={cardStyle()}>
              {panelTitle("État runtime Cast")}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, fontSize: 13 }} className="screens-two-cols">
                <div>supported : <b>{String(castState.supported)}</b></div>
                <div>sdkLoaded : <b>{String(castState.sdkLoaded)}</b></div>
                <div>castState : <b>{String(castState.castState)}</b></div>
                <div>deviceName : <b>{castState.deviceName || "—"}</b></div>
                <div style={{ gridColumn: "1 / -1" }}>sessionId : <b>{(castState as any).sessionId || "—"}</b></div>
              </div>
            </section>

            <section style={cardStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 1100, fontSize: 18, color: "#ffd56a" }}>Journal diagnostic Cast</div>
                <button onClick={clearCastDiag} style={smallButton("ghost")}>Vider</button>
              </div>
              <LogList rows={castDiag} empty="Aucune entrée Cast pour le moment." />
            </section>
          </div>
        )}

        {activeTab === "viewer" && (
          <div style={{ display: "grid", gap: 12 }}>
            <section style={cardStyle()}>
              {panelTitle("📱 Viewer tablette", "À créer avant la partie. La tablette ouvre le lien ou scanne le QR code, puis reçoit le scoreboard live.")}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <div style={statusBadge(!!viewer?.sessionId, viewer?.sessionId ? "Session active" : "Aucune session viewer", viewer?.sessionId ? "ok" : "warn")} />
                <div style={statusBadge(autoPublish, autoPublish ? "Publication auto active" : "Publication auto désactivée", autoPublish ? "ok" : "warn")} />
                <div style={statusBadge(true, `Refresh tablette : ${pollMs} ms`, "idle")} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 14 }} className="screens-viewer-grid">
                <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                  {viewer?.sessionId ? (
                    <>
                      <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 1000 }}>Code tablette</div>
                      <div style={{ fontSize: 42, letterSpacing: 3, lineHeight: 1, color: "#ffd56a", fontWeight: 1200 }}>{viewer.code || viewer.sessionId}</div>
                      <div style={{ overflowWrap: "anywhere", opacity: 0.78, fontSize: 13 }}>{viewer.joinUrl || viewerJoinUrl(viewer.sessionId)}</div>
                      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                        <button onClick={copyViewerLink} style={smallButton("gold")}>Copier le lien</button>
                        <button onClick={() => go("viewer_display", { sessionId: viewer.sessionId })} style={smallButton("ghost")}>Aperçu local</button>
                        <button onClick={stopViewer} disabled={viewerBusy} style={smallButton("danger")}>Arrêter viewer</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ color: "rgba(255,255,255,.74)", lineHeight: 1.45, fontSize: 13 }}>
                        Crée une session, ouvre le QR code sur la tablette, puis reviens lancer ta partie. Aucune logique de score n’est exécutée sur la tablette.
                      </div>
                      <button disabled={viewerBusy} onClick={startViewer} style={smallButton("gold")}>{viewerBusy ? "Création…" : "Créer une session Viewer"}</button>
                    </div>
                  )}
                  <div style={{ color: viewerMessage.startsWith("Erreur") ? "#fecaca" : "#dbeafe", fontSize: 13, fontWeight: 900 }}>{viewerMessage}</div>
                </div>

                <aside style={{ borderRadius: 22, padding: 12, background: "#fff", minHeight: 256, display: "grid", placeItems: "center" }}>
                  {qr ? <img src={qr} alt="QR code viewer" style={{ width: 250, height: 250 }} /> : <div style={{ color: "#111", textAlign: "center", fontWeight: 1000 }}>Crée une session pour générer le QR code</div>}
                </aside>
              </div>
            </section>

            <section style={cardStyle()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 1100, fontSize: 18, color: "#ffd56a" }}>Journal diagnostic Viewer</div>
                <button onClick={clearViewerDiag} style={smallButton("ghost")}>Vider</button>
              </div>
              <LogList rows={viewerDiag} empty="Aucun envoi Viewer pour le moment." color="#a7f3d0" />
            </section>
          </div>
        )}

        {activeTab === "settings" && (
          <div style={{ display: "grid", gap: 12 }}>
            <section style={cardStyle()}>
              {panelTitle("Réglages Cast", "Paramètres techniques du receiver Google Cast. Ces réglages ne créent pas de session Viewer.")}
              <div style={{ display: "grid", gap: 9 }}>
                <label style={{ fontSize: 12, opacity: 0.76, fontWeight: 1000 }}>Receiver Application ID Google Cast</label>
                <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                  <input value={appId} onChange={(e) => setAppIdState(e.target.value.toUpperCase())} placeholder="Ex: 3534BC6A" style={{ ...fieldStyle(), flex: "1 1 180px", minWidth: 160 }} />
                  <button onClick={saveAppId} style={smallButton("gold")}>Enregistrer</button>
                  <button onClick={restoreDefault} style={smallButton("ghost")}>App ID par défaut</button>
                </div>
                <div style={{ color: "rgba(255,255,255,.62)", fontSize: 12 }}>App ID courant : <b>{getGoogleCastAppId()}</b></div>
              </div>
            </section>

            <section style={cardStyle()}>
              {panelTitle("Réglages Viewer", "Paramètres de l’écran tablette. Le flux reste séparé de la sauvegarde NAS globale.")}
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", borderRadius: 16, padding: 12, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.045)" }}>
                  <span>
                    <span style={{ display: "block", fontWeight: 1000 }}>Publication automatique des snapshots</span>
                    <span style={{ display: "block", opacity: 0.66, fontSize: 12, marginTop: 2 }}>Quand une session Viewer existe, les snapshots de partie sont envoyés à la tablette.</span>
                  </span>
                  <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublishState(e.target.checked)} style={{ transform: "scale(1.2)" }} />
                </label>

                <div style={{ display: "grid", gap: 7 }}>
                  <label style={{ fontSize: 12, opacity: 0.76, fontWeight: 1000 }}>Intervalle de rafraîchissement tablette</label>
                  <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
                    <input type="number" min={300} max={3000} step={100} value={pollMs} onChange={(e) => setPollMsState(Number(e.target.value || 700))} style={{ ...fieldStyle(), width: 140 }} />
                    <span style={{ opacity: 0.7, fontSize: 13 }}>ms — conseillé : 500 à 1000 ms</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                  <button onClick={saveViewerSettings} style={smallButton("gold")}>Enregistrer réglages Viewer</button>
                  <button onClick={() => { setPollMsState(700); setAutoPublishState(true); setViewerPollMs(700); setViewerAutoPublish(true); }} style={smallButton("ghost")}>Réglages par défaut</button>
                </div>
              </div>
            </section>

            <section style={cardStyle()}>
              {panelTitle("Rappel de fonctionnement", "Les sorties sont préparées en amont, puis les pages de jeu publient silencieusement vers les sorties déjà actives.")}
              <div style={{ display: "grid", gap: 8, color: "rgba(255,255,255,.76)", fontSize: 13, lineHeight: 1.5 }}>
                <div>1. Lance le Cast et/ou le Viewer depuis cette page Écrans.</div>
                <div>2. Reviens dans la configuration du jeu.</div>
                <div>3. Lance la partie : aucun bouton parasite n’apparaît dans l’écran de jeu.</div>
                <div>4. Si Cast + Viewer sont actifs, les deux reçoivent les snapshots sans partager le même canal.</div>
              </div>
            </section>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 760px){
          .screens-two-cols{grid-template-columns:1fr!important;}
          .screens-viewer-grid{grid-template-columns:1fr!important;}
        }
      `}</style>
    </div>
  );
}
