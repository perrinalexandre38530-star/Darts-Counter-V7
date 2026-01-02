// ============================================
// src/pages/AvatarCreator.tsx
// Création d'avatar "Option C" façon CHAPA DARTS
// OPTION B : IA EXTERNE (OpenArt / autre site)
// - Médaillon noir + double anneau doré (ou BLEU pour les BOTS)
// - Texte haut : "DARTS COUNTER" plaqué contre l’anneau intérieur (extérieur)
// - Texte bas : nom choisi, plaqué contre l’anneau intérieur (extérieur)
// - Import de photo (y compris caricature faite ailleurs) + zoom
// - Export en PNG (dataURL) via <canvas>
// - Optionnel : callback onSave pour l’intégrer au profil actif
// - + Bouton pour ouvrir un site externe de caricature (OpenArt)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type Props = {
  size?: number; // taille du médaillon en px
  overlaySrc?: string; // pas utilisé ici mais gardé pour compat
  defaultName?: string;
  onSave?: (payload: { pngDataUrl: string; name: string }) => void;
  onBack?: () => void; // callback pour bouton Retour
  /** Quand true => médaillon BOT en bleu (ring + textes) */
  isBotMode?: boolean;
};

const GOLD = "#F6C256";
const BLACK = "#000000";
const BOT_RING = "#00b4ff"; // bleu spécifique BOTS

// --- Géométrie du médaillon (calée sur ton modèle) ---
const R_OUTER = 248; // rayon du grand anneau (centre du stroke)
const R_INNER = 188; // rayon de l’anneau intérieur (centre du stroke)
const STROKE = 18; // épaisseur des anneaux

// Cercle avatar = bord interne de l’anneau intérieur → il "touche" l’anneau
const R_AVATAR = R_INNER - STROKE / 2;

// Texte haut collé au CERCLE INTÉRIEUR, côté extérieur
const R_TEXT = R_INNER + STROKE / 2 + 4;

// Offsets verticaux
const TEXT_DY_TOP = -6;

// Texte bas (nom)
const NAME_RADIUS = R_INNER + 6;
const TEXT_DY_BOTTOM = 40; // valeur que tu avais trouvée

export default function AvatarCreator({
  size = 512,
  overlaySrc, // eslint-disable-line @typescript-eslint/no-unused-vars
  defaultName = "",
  onSave,
  onBack,
  isBotMode = false,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [name, setName] = React.useState(defaultName);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1.15); // zoom dans le médaillon
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const svgRef = React.useRef<SVGSVGElement | null>(null);

  // Image utilisée dans le médaillon
  const avatarImage = photoUrl;

  // Back unifié : si onBack fourni (App), on l’utilise, sinon history.back()
  const handleBack = React.useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  }, [onBack]);

  // ---------------- Import photo (caricature ou non) ----------------
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const maxMb = 8;
    if (f.size > maxMb * 1024 * 1024) {
      setError(
        t(
          "avatar.error.tooBig",
          `L’image est trop lourde (max ${maxMb} Mo).`
        )
      );
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(String(reader.result));
      setStatus(
        t(
          "avatar.status.photoLoaded",
          "Image importée, ajuste le zoom puis enregistre ton médaillon."
        )
      );
    };
    reader.readAsDataURL(f);
  }

  // ---------------- Export SVG -> PNG ----------------
  async function handleSave() {
    if (!avatarImage) {
      setError(
        t(
          "avatar.error.noAvatar",
          "Importe d’abord une image (caricature ou photo) avant d’enregistrer."
        )
      );
      return;
    }
    const svg = svgRef.current;
    if (!svg) return;

    try {
      setBusy(true);
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgStr], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = "anonymous";

      const pngDataUrl: string = await new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas non dispo"));
            return;
          }
          ctx.fillStyle = "black";
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = (err) => {
          URL.revokeObjectURL(url);
          reject(err);
        };
        img.src = url;
      });

      if (onSave) {
        onSave({ pngDataUrl, name: name || "PLAYER" });
        setStatus(
          t(
            "avatar.status.savedToProfile",
            "Avatar enregistré sur le profil."
          )
        );
      } else {
        const a = document.createElement("a");
        a.href = pngDataUrl;
        a.download = `avatar-darts-counter-${name || "player"}.png`;
        a.click();
        setStatus(
          t(
            "avatar.status.downloaded",
            "Avatar généré et téléchargé."
          )
        );
      }
    } catch (e) {
      console.warn(e);
      setError(
        t(
          "avatar.error.saveFailed",
          "Impossible d’enregistrer l’avatar pour le moment."
        )
      );
    } finally {
      setBusy(false);
    }
  }

  // Couleur principale UI (titres, etc.)
  const primary = theme.primary ?? GOLD;

  // Couleur du RING du médaillon :
  // - doré par défaut
  // - BLEU spécial quand on est en mode BOT
  const RING_COLOR = isBotMode ? BOT_RING : GOLD;

  // Calcul taille de l’image dans le clip (zoom)
  const avatarImgSize = R_AVATAR * 2 * zoom;

  // URL externe vers un outil de caricature (OpenArt ou équivalent)
  const OPEN_ART_URL =
    "https://openart.ai/create"; // à remplacer par ton preset caricature exact

  function openOpenArt() {
    window.open(OPEN_ART_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="container"
      style={{
        padding: 8,
        paddingBottom: 96,
        color: theme.text,
        maxWidth: 820,
        margin: "0 auto",
      }}
    >
      {/* Bouton Retour sobre */}
      <button
        type="button"
        onClick={handleBack}
        style={{
          marginBottom: 8,
          fontSize: 11,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.35)",
          background: "transparent",
          color: theme.textSoft,
          cursor: "pointer",
        }}
      >
        ← {t("avatar.back", "Retour")}
      </button>

      <h2
        style={{
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginBottom: 4,
          color: primary,
        }}
      >
        {t("avatar.title", "Création d’avatar")}
      </h2>
      <p
        style={{
          fontSize: 12,
          opacity: 0.8,
          marginBottom: 10,
        }}
      >
        {t(
          "avatar.subtitle.optionB",
          "Génère d’abord une caricature cartoon avec un site externe, puis importe-la dans le médaillon Darts Counter."
        )}
      </p>

      {/* Étape 1 : lien vers l’outil de caricature externe */}
      <div
        style={{
          marginBottom: 14,
          padding: 10,
          borderRadius: 16,
          background:
            "linear-gradient(135deg, rgba(157,89,255,0.25), rgba(22,16,48,0.9))",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 12px 26px rgba(0,0,0,0.65)",
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {t("avatar.step1.title", "Étape 1 — Crée ta caricature")}
        </div>
        <div style={{ opacity: 0.85, marginBottom: 8 }}>
          {t(
            "avatar.step1.text",
            "Clique sur le bouton ci-dessous pour ouvrir un site externe (OpenArt ou autre) qui transforme ta photo en caricature cartoon humoristique. Télécharge ensuite l’image générée sur ton appareil."
          )}
        </div>
        <button
          type="button"
          onClick={openOpenArt}
          style={{
            borderRadius: 999,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            background:
              "linear-gradient(135deg, #B06CFF, #7C3AED, #4C1D95)",
            color: "#FFF",
          }}
        >
          🎨 {t("avatar.step1.btn", "Ouvrir l’atelier caricature (OpenArt)")}
        </button>
        <div
          style={{
            marginTop: 6,
            opacity: 0.75,
            fontSize: 11,
          }}
        >
          {t(
            "avatar.step1.help",
            "Une fois ta caricature téléchargée, reviens ici et importe-la comme image de départ."
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {/* Prévisualisation médaillon */}
        <div
          style={{
            flex: "0 0 auto",
            width: "min(100%, 360px)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: size,
              aspectRatio: "1 / 1",
              background:
                "radial-gradient(circle at 30% 0%, rgba(255,220,120,.22), transparent 60%), #05050a",
              borderRadius: 24,
              padding: 12,
              boxShadow: "0 20px 40px rgba(0,0,0,.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <svg
              ref={svgRef}
              viewBox="-256 -256 512 512"
              width="100%"
              height="100%"
            >
              <defs>
                <clipPath id="avatarClip">
                  <circle r={R_AVATAR} cx={0} cy={0} />
                </clipPath>
              </defs>

              {/* Fond noir global */}
              <circle r={R_OUTER + STROKE} fill={BLACK} />

              {/* Grand anneau (doré ou bleu BOT) */}
              <circle
                r={R_OUTER}
                fill="none"
                stroke={RING_COLOR}
                strokeWidth={STROKE}
              />

              {/* Anneau intérieur (doré ou bleu BOT) */}
              <circle
                r={R_INNER}
                fill="none"
                stroke={RING_COLOR}
                strokeWidth={STROKE}
              />

              {/* Cercle noir de fond pour l’avatar (colle à l’anneau intérieur) */}
              <circle r={R_AVATAR} fill={BLACK} />

              {/* Image avatar, clipée dans le cercle avatar */}
              {avatarImage ? (
                <g clipPath="url(#avatarClip)">
                  <image
                    href={avatarImage}
                    x={-avatarImgSize / 2}
                    y={-avatarImgSize / 2}
                    width={avatarImgSize}
                    height={avatarImgSize}
                    preserveAspectRatio="xMidYMid slice"
                  />
                </g>
              ) : (
                <g clipPath="url(#avatarClip)">
                  {/* Placeholder simple si rien n’est importé */}
                  <circle r={R_AVATAR} fill="#22232b" />
                  <text
                    x={0}
                    y={6}
                    textAnchor="middle"
                    fontFamily="'Montserrat','system-ui',sans-serif"
                    fontSize={16}
                    fill="#999"
                  >
                    {t(
                      "avatar.placeholder.noImage",
                      "Importe ici ta caricature"
                    )}
                  </text>
                </g>
              )}

              {/* Texte haut : DARTS COUNTER */}
              <path
                id="arcTop"
                d={`
                  M ${-R_TEXT} ${TEXT_DY_TOP}
                  A ${R_TEXT} ${R_TEXT} 0 0 1 ${R_TEXT} ${TEXT_DY_TOP}
                `}
                fill="none"
              />
              <text
                fontFamily="'Montserrat','system-ui',sans-serif"
                fontSize={40}
                fontWeight={800}
                letterSpacing={4}
                fill={RING_COLOR}
              >
                <textPath
                  href="#arcTop"
                  startOffset="50%"
                  textAnchor="middle"
                >
                  DARTS COUNTER
                </textPath>
              </text>

              {/* Texte bas : nom */}
              <path
                id="arcBottom"
                d={`
                  M ${-NAME_RADIUS} ${TEXT_DY_BOTTOM}
                  A ${NAME_RADIUS} ${NAME_RADIUS} 0 0 0 ${NAME_RADIUS} ${TEXT_DY_BOTTOM}
                `}
                fill="none"
              />
              <text
                fontFamily="'Montserrat','system-ui',sans-serif"
                fontSize={40}
                fontWeight={800}
                letterSpacing={4}
                fill={RING_COLOR}
              >
                <textPath
                  href="#arcBottom"
                  startOffset="50%"
                  textAnchor="middle"
                >
                  {(name || "PLAYER").toUpperCase()}
                </textPath>
              </text>
            </svg>
          </div>
        </div>

        {/* Panneau contrôles */}
        <div
          style={{
            flex: "1 1 260px",
            minWidth: 260,
            maxWidth: 360,
            padding: 12,
            borderRadius: 18,
            background: theme.card,
            border: `1px solid ${theme.borderSoft}`,
            boxShadow: "0 18px 36px rgba(0,0,0,.55)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Nom */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 12,
            }}
          >
            <span style={{ color: theme.textSoft }}>
              {t("avatar.label.name", "Nom affiché en bas du médaillon")}
            </span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("avatar.placeholder.name", "Ex : NINZALEX")}
            />
          </label>

          {/* Zoom */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 12,
            }}
          >
            <span style={{ color: theme.textSoft }}>
              {t(
                "avatar.label.zoom",
                "Zoom (pince les doigts ou utilise le slider)"
              )}
            </span>
            <input
              type="range"
              min={1}
              max={2.4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <span
              className="subtitle"
              style={{ fontSize: 11, color: theme.textSoft }}
            >
              {t(
                "avatar.help.zoom",
                "Ajuste le zoom pour bien centrer le visage dans le médaillon."
              )}
            </span>
          </div>

          {/* Import photo */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 4,
              fontSize: 12,
            }}
          >
            <span style={{ color: theme.textSoft }}>
              {t(
                "avatar.label.photo",
                "Image de départ (caricature ou photo)"
              )}
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label
                className="btn sm"
                style={{
                  cursor: "pointer",
                  borderRadius: 999,
                  paddingInline: 12,
                }}
              >
                {t("avatar.btn.import", "Importer une image")}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </label>
              {photoUrl && (
                <button
                  className="btn sm"
                  type="button"
                  onClick={() => {
                    setPhotoUrl(null);
                    setStatus(null);
                    setError(null);
                  }}
                >
                  {t("avatar.btn.clear", "Effacer l’image")}
                </button>
              )}
            </div>
            <span
              className="subtitle"
              style={{ fontSize: 11, color: theme.textSoft }}
            >
              {t(
                "avatar.help.photo",
                "Utilise de préférence une caricature déjà générée (OpenArt, autre site), ou une photo bien centrée."
              )}
            </span>
          </div>

          {/* Messages statut / erreurs */}
          {status && !error && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11.5,
                color: "#8fe6aa",
              }}
            >
              {status}
            </div>
          )}
          {error && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11.5,
                color: "#ff8a8a",
              }}
            >
              {error}
            </div>
          )}

          {/* Enregistrer */}
          <div style={{ marginTop: 10 }}>
            <button
              className="btn ok"
              type="button"
              onClick={handleSave}
              disabled={busy || !avatarImage}
              style={{
                width: "100%",
                borderRadius: 999,
                fontWeight: 800,
                opacity: busy ? 0.75 : 1,
              }}
            >
              {busy
                ? t("avatar.btn.saving", "Génération du PNG…")
                : t("avatar.btn.save", "Enregistrer l’avatar")}
            </button>
            <div
              className="subtitle"
              style={{ fontSize: 11, marginTop: 4, color: theme.textSoft }}
            >
              {onSave
                ? t(
                    "avatar.help.saveToProfile",
                    "L’avatar sera enregistré sur ton profil actif et utilisable partout dans l’application."
                  )
                : t(
                    "avatar.help.download",
                    "Sans profil cible, l’avatar sera téléchargé en PNG. Tu pourras ensuite l’importer comme avatar."
                  )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
