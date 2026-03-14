import * as React from "react";
import QRCode from "qrcode";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthOnline } from "../../hooks/useAuthOnline";
import { useCastHost } from "../../cast/useCastHost";
import type { CastSnapshot } from "../../cast/castTypes";

type Props = { go: (tab: any, params?: any) => void };

type DemoState = {
  title: string;
  leftName: string;
  rightName: string;
  leftScore: number;
  rightScore: number;
  active: 1 | 2;
};

const LAST_CAST_KEY = "dc_cast_last_room_v2";

const DEMO_INIT: DemoState = {
  title: "Multisports Scoring",
  leftName: "Joueur 1",
  rightName: "Joueur 2",
  leftScore: 0,
  rightScore: 0,
  active: 1,
};

function SmallButton({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: 14,
        padding: "12px 14px",
        border: primary ? "1px solid rgba(255,213,106,.30)" : "1px solid rgba(255,255,255,.14)",
        background: primary
          ? "linear-gradient(180deg, rgba(255,213,106,.95), rgba(242,169,42,.92))"
          : "linear-gradient(180deg, rgba(255,255,255,.07), rgba(0,0,0,.30))",
        color: primary ? "#1a1202" : "#f5f5f7",
        fontWeight: 1000,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
        boxShadow: primary ? "0 12px 24px rgba(0,0,0,.32)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function ActionCard({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,.10)",
        background: "linear-gradient(180deg, rgba(255,255,255,.045), rgba(0,0,0,.24))",
        padding: 14,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 1000 }}>{title}</div>
        <div style={{ fontSize: 12.5, opacity: 0.82 }}>{sub}</div>
      </div>
      {children}
    </div>
  );
}

function ScoreStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <SmallButton label="-1" onClick={() => onChange(Math.max(0, Number(value || 0) - 1))} />
      <div
        style={{
          minWidth: 58,
          textAlign: "center",
          fontSize: 24,
          fontWeight: 1100,
          letterSpacing: 0.3,
        }}
      >
        {Number(value || 0)}
      </div>
      <SmallButton label="+1" onClick={() => onChange(Number(value || 0) + 1)} primary />
    </div>
  );
}

function buildSnapshot(demo: DemoState): CastSnapshot {
  return {
    game: "unknown",
    title: demo.title || "Multisports Scoring",
    status: "live",
    players: [
      { id: "left", name: demo.leftName || "Joueur 1", score: Number(demo.leftScore) || 0, active: demo.active === 1 },
      { id: "right", name: demo.rightName || "Joueur 2", score: Number(demo.rightScore) || 0, active: demo.active === 2 },
    ],
    meta: { source: "cast_simple_host" },
    updatedAt: Date.now(),
  };
}

export default function CastHostPage({ go }: Props) {
  const theme = useTheme() as any;
  const auth = useAuthOnline() as any;
  const isSignedIn = auth?.status === "signed_in" || !!auth?.user?.id;
  const host = useCastHost();

  const [demo, setDemo] = React.useState<DemoState>(DEMO_INIT);
  const [qrUrl, setQrUrl] = React.useState<string>("");
  const [showQr, setShowQr] = React.useState(false);
  const [infoMsg, setInfoMsg] = React.useState<string | null>(null);
  const [busyAction, setBusyAction] = React.useState<string | null>(null);

  const joinUrl = host.room ? `${window.location.origin}${window.location.pathname}#/cast/${host.room.id}` : "";

  React.useEffect(() => {
    if (!joinUrl || !showQr) {
      setQrUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(joinUrl, {
      margin: 1,
      width: 260,
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => {
        if (!cancelled) setQrUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [joinUrl, showQr]);

  React.useEffect(() => {
    if (!host.room) return;
    try {
      localStorage.setItem(LAST_CAST_KEY, JSON.stringify({ id: host.room.id, code: host.room.code, at: Date.now() }));
    } catch {}
  }, [host.room]);

  React.useEffect(() => {
    if (!host.room) return;
    const t = window.setTimeout(() => {
      host.pushState(host.room!.id, buildSnapshot(demo)).catch(() => {});
    }, 180);
    return () => window.clearTimeout(t);
  }, [demo, host, host.room]);

  async function ensureRoom() {
    if (host.room) return host.room;
    if (!isSignedIn) throw new Error("Connexion requise pour démarrer le cast.");
    const res = await host.createRoom({ codeLen: 6 });
    return res.room;
  }

  async function withAction(name: string, fn: () => Promise<void>) {
    setInfoMsg(null);
    setBusyAction(name);
    try {
      await fn();
    } catch (e: any) {
      setInfoMsg(String(e?.message || e || "Erreur"));
    } finally {
      setBusyAction(null);
    }
  }

  async function startCast() {
    await withAction("start", async () => {
      const room = await ensureRoom();
      await host.pushState(room.id, buildSnapshot(demo));
      setInfoMsg(`Cast prêt. Code ${room.code}.`);
    });
  }

  async function openReceiver() {
    await withAction("receiver", async () => {
      const room = await ensureRoom();
      await host.pushState(room.id, buildSnapshot(demo));
      const url = `${window.location.origin}${window.location.pathname}#/cast/${room.id}`;
      window.open(url, "_blank", "noopener,noreferrer");
      setInfoMsg("Écran TV ouvert dans un nouvel onglet.");
    });
  }

  async function shareLink() {
    await withAction("share", async () => {
      const room = await ensureRoom();
      await host.pushState(room.id, buildSnapshot(demo));
      const url = `${window.location.origin}${window.location.pathname}#/cast/${room.id}`;
      const shareData = { title: demo.title || "Multisports Scoring", text: `Ouvre cet écran pour suivre le score : ${room.code}`, url };
      if (navigator.share) {
        await navigator.share(shareData);
        setInfoMsg("Lien de cast partagé.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setInfoMsg("Lien copié dans le presse-papiers.");
    });
  }

  async function copyCode() {
    if (!host.room?.code) return;
    try {
      await navigator.clipboard.writeText(host.room.code);
      setInfoMsg("Code de cast copié.");
    } catch {
      setInfoMsg("Impossible de copier le code.");
    }
  }

  async function stopCast() {
    if (!host.room?.id) return;
    await withAction("stop", async () => {
      await host.closeRoom(host.room!.id);
      try {
        localStorage.removeItem(LAST_CAST_KEY);
      } catch {}
      setShowQr(false);
      setInfoMsg("Diffusion arrêtée.");
    });
  }

  const roomCode = host.room?.code || "------";

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 96, color: theme.text || "#f5f5f7" }}>
      <div
        style={{
          borderRadius: 22,
          padding: 16,
          border: "1px solid rgba(255,255,255,.10)",
          background:
            "radial-gradient(120% 160% at 0% 0%, rgba(255,195,26,.09), transparent 55%), radial-gradient(90% 90% at 100% 0%, rgba(79,180,255,.08), transparent 50%), linear-gradient(180deg, rgba(22,22,28,.98), rgba(10,10,14,.99))",
          boxShadow: "0 14px 34px rgba(0,0,0,.55)",
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 6, maxWidth: 760 }}>
            <div style={{ fontSize: 24, fontWeight: 1100, color: theme.primary || "#ffd56a" }}>CAST</div>
            <div style={{ fontSize: 13.5, opacity: 0.9 }}>
              Un seul écran de contrôle. Tu démarres le cast, tu ouvres l’écran TV, puis tu partages le lien ou le QR code.
            </div>
          </div>
          <SmallButton label="← Réglages" onClick={() => go("settings")} />
        </div>

        {!isSignedIn ? (
          <div style={{ color: "#ff9d9d", fontWeight: 900, fontSize: 13.5 }}>
            Connecte-toi d’abord dans « Mon profil » pour créer une room de diffusion.
          </div>
        ) : null}

        {(host.error || infoMsg) ? (
          <div
            style={{
              borderRadius: 14,
              padding: "10px 12px",
              border: `1px solid ${host.error ? "rgba(255,120,120,.26)" : "rgba(255,255,255,.12)"}`,
              background: host.error ? "rgba(120,18,18,.18)" : "rgba(255,255,255,.04)",
              color: host.error ? "#ff9d9d" : theme.text || "#f5f5f7",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {host.error || infoMsg}
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <ActionCard title="1. Démarrer" sub="Crée la room de diffusion et prépare le score.">
            <SmallButton
              label={host.creating || busyAction === "start" ? "Démarrage…" : host.room ? "Cast actif" : "Démarrer le cast"}
              onClick={startCast}
              disabled={!isSignedIn || host.creating || busyAction === "start"}
              primary
            />
            <div style={{ fontSize: 12, opacity: 0.82 }}>Code room : <b style={{ letterSpacing: 2 }}>{roomCode}</b></div>
          </ActionCard>

          <ActionCard title="2. Ouvrir l’écran" sub="Ouvre la page TV dans un nouvel onglet ou sur un deuxième appareil.">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <SmallButton
                label={busyAction === "receiver" ? "Ouverture…" : "Ouvrir l’écran TV"}
                onClick={openReceiver}
                disabled={!isSignedIn || busyAction === "receiver"}
                primary
              />
              <SmallButton label="Page de saisie code" onClick={() => go("cast_join")} />
            </div>
          </ActionCard>

          <ActionCard title="3. Partager" sub="Envoie le lien ou montre le QR code à l’appareil qui doit afficher le score.">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <SmallButton label={busyAction === "share" ? "Partage…" : "Partager le lien"} onClick={shareLink} disabled={!isSignedIn || busyAction === "share"} />
              <SmallButton label={showQr ? "Masquer QR" : "Afficher QR"} onClick={() => setShowQr((v) => !v)} disabled={!isSignedIn} />
              <SmallButton label="Copier le code" onClick={copyCode} disabled={!host.room} />
            </div>
          </ActionCard>
        </div>

        {showQr && host.room ? (
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(0,0,0,.24)",
              padding: 16,
              display: "grid",
              gap: 12,
              justifyItems: "center",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 1000 }}>Scanner pour ouvrir l’écran de score</div>
            {qrUrl ? (
              <img src={qrUrl} alt="QR Cast" style={{ width: 260, height: 260, borderRadius: 16, background: "#fff", padding: 10 }} />
            ) : (
              <div style={{ padding: 28, opacity: 0.8 }}>Génération du QR…</div>
            )}
            <div style={{ fontSize: 12, opacity: 0.85, wordBreak: "break-all", textAlign: "center" }}>{joinUrl}</div>
          </div>
        ) : null}

        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,.10)",
            background: "rgba(0,0,0,.22)",
            padding: 14,
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 1000 }}>Aperçu rapide</div>
            <div style={{ fontSize: 12.5, opacity: 0.82 }}>
              Ce panneau sert à tester immédiatement le cast. Les changements sont envoyés automatiquement à l’écran distant.
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 1000, opacity: 0.82 }}>Titre</div>
            <input
              value={demo.title}
              onChange={(e) => setDemo((s) => ({ ...s, title: e.target.value }))}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.16)",
                background: "rgba(5,5,8,.96)",
                color: theme.text || "#f5f5f7",
                padding: "12px 12px",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <div
              style={{
                borderRadius: 16,
                border: demo.active === 1 ? "1px solid rgba(255,213,106,.40)" : "1px solid rgba(255,255,255,.10)",
                padding: 12,
                display: "grid",
                gap: 12,
                background: demo.active === 1 ? "rgba(255,213,106,.08)" : "rgba(255,255,255,.03)",
              }}
            >
              <input
                value={demo.leftName}
                onChange={(e) => setDemo((s) => ({ ...s, leftName: e.target.value }))}
                placeholder="Joueur 1"
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.16)",
                  background: "rgba(5,5,8,.96)",
                  color: theme.text || "#f5f5f7",
                  padding: "12px 12px",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <ScoreStepper value={demo.leftScore} onChange={(next) => setDemo((s) => ({ ...s, leftScore: next }))} />
              <SmallButton label={demo.active === 1 ? "Joueur actif" : "Mettre actif"} onClick={() => setDemo((s) => ({ ...s, active: 1 }))} />
            </div>

            <div
              style={{
                borderRadius: 16,
                border: demo.active === 2 ? "1px solid rgba(255,213,106,.40)" : "1px solid rgba(255,255,255,.10)",
                padding: 12,
                display: "grid",
                gap: 12,
                background: demo.active === 2 ? "rgba(255,213,106,.08)" : "rgba(255,255,255,.03)",
              }}
            >
              <input
                value={demo.rightName}
                onChange={(e) => setDemo((s) => ({ ...s, rightName: e.target.value }))}
                placeholder="Joueur 2"
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,.16)",
                  background: "rgba(5,5,8,.96)",
                  color: theme.text || "#f5f5f7",
                  padding: "12px 12px",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <ScoreStepper value={demo.rightScore} onChange={(next) => setDemo((s) => ({ ...s, rightScore: next }))} />
              <SmallButton label={demo.active === 2 ? "Joueur actif" : "Mettre actif"} onClick={() => setDemo((s) => ({ ...s, active: 2 }))} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SmallButton label="Remettre à zéro" onClick={() => setDemo(DEMO_INIT)} />
            <SmallButton label={busyAction === "stop" ? "Arrêt…" : "Arrêter le cast"} onClick={stopCast} disabled={!host.room || busyAction === "stop"} />
          </div>
        </div>
      </div>
    </div>
  );
}
