// =============================================================
// src/components/DartSetsPanel.tsx
// Panneau "Mes fléchettes" pour un profil
// - Header néon + bouton "CRÉER"
// - Carrousel horizontal avec une carte par set
// - Barre d'actions globale (Scanner / Editer / Suppr / Favori)
// - Création et édition en blocs flottants
// - Scanner (sheet) pour associer des visuels
// - Intégration presets cartoon (dartPresets) pour le visuel
// - Upload photo perso pour un set (stockée dans dartSetsStore)
// ✅ FIX MOBILE: compression image + rendu <img> (évite backgroundImage + quota localStorage)
// ✅ FIX FIT: photos en "cover" pour remplir le cadre comme un preset
// =============================================================

import React from "react";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import DartSetScannerSheet from "./DartSetScannerSheet";

import {
  type DartSet,
  getDartSetsForProfile,
  createDartSet,
  deleteDartSet,
  setFavoriteDartSet,
  updateDartSet,
} from "../lib/dartSetsStore";

import { dartPresets } from "../lib/dartPresets";

type Props = {
  profile: Profile;
};

type FormState = {
  name: string;
  brand: string;
  weightGrams: string;
  notes: string;
  bgColor: string;
  scope: "private" | "public";

  // Gestion du visuel
  kind: "plain" | "preset" | "photo";
  presetId: string | null;

  // Photo perso (base64) utilisée à la création
  photoDataUrl: string | null;
};

const DEFAULT_BG = "#101020";

// Poids possibles 10 g → 32 g
const WEIGHT_OPTIONS = Array.from({ length: 23 }, (_, i) => 10 + i);

/**
 * ✅ FIX MOBILE:
 * Convertit un File -> dataURL compressé (resize + jpeg)
 * - maxEdge: 512 (carré conseillé)
 * - quality: 0.82 (bon compromis)
 */
async function fileToCompressedDataUrl(
  file: File,
  opts?: {
    maxEdge?: number;
    quality?: number;
    mime?: "image/jpeg" | "image/webp";
  }
): Promise<string> {
  const maxEdge = opts?.maxEdge ?? 512;
  const quality = opts?.quality ?? 0.82;
  const mime = opts?.mime ?? "image/jpeg";

  // 1) charge l'image
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  // 2) dessine sur canvas
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const w = img.naturalWidth || img.width || 1;
  const h = img.naturalHeight || img.height || 1;

  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;

  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, tw, th);

  // 3) export compressé
  const out = canvas.toDataURL(mime, quality);

  // fallback si bizarrement plus gros (rare)
  return out && out.length < dataUrl.length ? out : dataUrl;
}

// ----------------------------------------------------------
// Composant d’affichage de fléchette / visuel
// ✅ FIX FIT: support rectangulaire (width/height) + cover réel
// ----------------------------------------------------------
const DartImage: React.FC<{
  url: string;
  width?: number | string;
  height?: number | string;
  angleDeg?: number;
  fit?: "cover" | "contain";
  bg?: string;
  radius?: number;
}> = ({
  url,
  width = 72,
  height = 72,
  angleDeg = 0,
  fit = "contain",
  bg = "transparent",
  radius = 12,
}) => {
  const [broken, setBroken] = React.useState(false);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        background: bg,
        display: "block",
      }}
    >
      {!url || broken ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize:
              typeof width === "number" ? Math.max(18, Math.round(width * 0.33)) : 22,
          }}
        >
          🎯
        </div>
      ) : (
        <img
          src={url}
          alt=""
          onError={() => setBroken(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit, // ✅ cover = remplit VRAIMENT le cadre
            transform: angleDeg ? `rotate(${angleDeg}deg)` : undefined,
            transformOrigin: "center center",
            display: "block",
          }}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------------
// Upload d’image perso pour un set (édition uniquement)
// - Sauvegarde thumbImageUrl + mainImageUrl + kind: "photo"
// ✅ FIX MOBILE: compression + message quota
// ----------------------------------------------------------
type DartSetImageUploaderProps = {
  dartSet: DartSet | null;
  onUpdated: (updated: DartSet) => void;
};

const DartSetImageUploader: React.FC<DartSetImageUploaderProps> = ({
  dartSet,
  onUpdated,
}) => {
  const { lang } = useLang();

  if (!dartSet) return null;

  const labelMain =
    lang === "fr"
      ? "Photo du set"
      : lang === "es"
      ? "Foto del set"
      : lang === "de"
      ? "Foto des Sets"
      : "Set photo";

  const btnLabel =
    lang === "fr"
      ? "Choisir une photo"
      : lang === "es"
      ? "Elegir foto"
      : lang === "de"
      ? "Foto wählen"
      : "Choose photo";

  const helper =
    lang === "fr"
      ? "Photo compressée automatiquement (mobile-friendly). Stockage local."
      : "Photo is auto-compressed (mobile-friendly). Stored locally.";

  const currentUrl = (dartSet as any).thumbImageUrl || (dartSet as any).mainImageUrl || "";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await fileToCompressedDataUrl(file, {
        maxEdge: 512,
        quality: 0.82,
        mime: "image/jpeg",
      });

      const res = await Promise.resolve(
        updateDartSet(dartSet.id, {
          mainImageUrl: compressed,
          thumbImageUrl: compressed,
          kind: "photo",
          presetId: undefined,
        } as any)
      );

      if (!res) {
        alert(
          lang === "fr"
            ? "Impossible d’enregistrer la photo (stockage plein ?)."
            : "Unable to save photo (storage full?)."
        );
        return;
      }

      const updated: DartSet = {
        ...dartSet,
        mainImageUrl: compressed,
        thumbImageUrl: compressed,
        // @ts-expect-error champs libres nouvelle archi
        kind: "photo",
        presetId: undefined,
      };

      onUpdated(updated);
    } catch (err) {
      console.warn("[DartSetImageUploader] update error", err);
      alert(
        lang === "fr"
          ? "Erreur : impossible d’enregistrer la photo (quota mobile ?)."
          : "Error: unable to save photo (mobile quota?)."
      );
    }
  };

  const isPhoto = (dartSet as any)?.kind === "photo";

  return (
    <div
      style={{
        gridColumn: "1 / span 2",
        marginTop: 6,
        paddingTop: 6,
        borderTop: "1px dashed rgba(255,255,255,.14)",
        display: "flex",
        gap: 10,
        alignItems: "center",
      }}
    >
      {/* Aperçu actuel */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,.25)",
          background: dartSet.bgColor || DEFAULT_BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {currentUrl ? (
          <DartImage
            url={currentUrl}
            width={64}
            height={64}
            angleDeg={0}
            fit={isPhoto ? "cover" : "contain"}
            bg={dartSet.bgColor || DEFAULT_BG}
            radius={14}
          />
        ) : (
          <span style={{ fontSize: 26 }}>🎯</span>
        )}
      </div>

      {/* Texte + bouton upload */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,.7)",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {labelMain}
        </div>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(127,196,255,.9)",
            background:
              "radial-gradient(circle at 0% 0%, rgba(127,196,255,.35), rgba(8,18,32,.95))",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
            cursor: "pointer",
            width: "fit-content",
          }}
        >
          <span style={{ marginRight: 6 }}>📷</span>
          {btnLabel}
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
        </label>

        <div style={{ fontSize: 10, color: "rgba(255,255,255,.45)", maxWidth: 260 }}>{helper}</div>
      </div>
    </div>
  );
};

const createEmptyForm = (primary: string): FormState => ({
  name: "",
  brand: "",
  weightGrams: "",
  notes: "",
  bgColor: primary || DEFAULT_BG,
  scope: "private",
  kind: "plain",
  presetId: null,
  photoDataUrl: null,
});

const DartSetsPanel: React.FC<Props> = ({ profile }) => {
  const { palette } = useTheme();
  const { lang } = useLang();

  const primary = palette?.primary || "#f5c35b";

  const [sets, setSets] = React.useState<DartSet[]>([]);
  const [form, setForm] = React.useState<FormState>(createEmptyForm(primary));
  const [isCreating, setIsCreating] = React.useState(false);

  // Edition
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<FormState | null>(null);

  // Scanner
  const [scannerTarget, setScannerTarget] = React.useState<DartSet | null>(null);

  // Carrousel
  const [activeIndex, setActiveIndex] = React.useState(0);

  function sortSets(list: DartSet[]): DartSet[] {
    return list
      .slice()
      .sort((a, b) => {
        const favA = a.isFavorite ? 1 : 0;
        const favB = b.isFavorite ? 1 : 0;
        if (favA !== favB) return favB - favA;
        const luA = a.lastUsedAt || 0;
        const luB = b.lastUsedAt || 0;
        return luB - luA;
      });
  }

  // ✅ loader tolérant (getDartSetsForProfile peut être sync OU async)
  const loadSets = React.useCallback(async () => {
    if (!profile?.id) return;
    try {
      const all = await Promise.resolve(getDartSetsForProfile(profile.id) as any);
      const sorted = sortSets((all || []) as DartSet[]);
      setSets(sorted);
      setActiveIndex((idx) => (sorted.length === 0 ? 0 : Math.min(idx, sorted.length - 1)));
    } catch (err) {
      console.warn("[DartSetsPanel] load error", err);
    }
  }, [profile?.id]);

  React.useEffect(() => {
    loadSets();
  }, [loadSets]);

  const reloadSets = React.useCallback(() => {
    void loadSets();
  }, [loadSets]);

  const hasSets = sets.length > 0;
  const activeSet: DartSet | null =
    hasSets && activeIndex >= 0 && activeIndex < sets.length ? sets[activeIndex] : null;

  // ------------------------------------------------------------------
  // Handlers formulaires
  // ------------------------------------------------------------------

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleEditChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
    };

  // ✅ FIX MOBILE: compression dès la sélection
  const handleCreatePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await fileToCompressedDataUrl(file, {
        maxEdge: 512,
        quality: 0.82,
        mime: "image/jpeg",
      });

      setForm((prev) => ({
        ...prev,
        kind: "photo",
        presetId: null,
        photoDataUrl: compressed,
      }));
    } catch (err) {
      console.warn("[DartSetsPanel] create photo read error", err);
      alert(lang === "fr" ? "Impossible de charger la photo." : "Unable to load photo.");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    const name = form.name.trim() || "Mes fléchettes";
    const brand = form.brand.trim();
    const notes = form.notes.trim();
    const weight = parseInt(form.weightGrams, 10);
    const weightGrams = Number.isFinite(weight) ? weight : undefined;
    const scope = form.scope;

    const chosenPreset = form.presetId ? dartPresets.find((p) => p.id === form.presetId) : undefined;

    let kind: "plain" | "preset" | "photo" = "plain";
    let mainImageUrl = "";
    let thumbImageUrl: string | undefined = undefined;
    let presetId: string | undefined = undefined;

    if (form.photoDataUrl) {
      kind = "photo";
      mainImageUrl = form.photoDataUrl;
      thumbImageUrl = form.photoDataUrl;
      presetId = undefined;
    } else if (chosenPreset) {
      kind = "preset";
      mainImageUrl = chosenPreset.imgUrlMain;
      thumbImageUrl = chosenPreset.imgUrlThumb;
      presetId = chosenPreset.id;
    }

    try {
      const payload = {
        profileId: profile.id,
        name,
        brand: brand || undefined,
        weightGrams,
        notes: notes || undefined,
        mainImageUrl,
        thumbImageUrl,
        bgColor: form.bgColor || DEFAULT_BG,
        scope,
        kind,
        presetId,
      } as any;

      const created = await Promise.resolve(createDartSet(payload));

      if (!created) {
        alert(lang === "fr" ? "Création impossible (stockage plein ?)" : "Creation failed (storage full?)");
        return;
      }

      reloadSets();
      setForm(createEmptyForm(primary));
      setIsCreating(false);
    } catch (err) {
      console.warn("[DartSetsPanel] create error", err);
      alert(
        lang === "fr"
          ? "Erreur : création impossible (quota mobile ?). Essaie une photo plus petite."
          : "Error: creation failed (mobile quota?). Try a smaller photo."
      );
    }
  };

  const handleStartEdit = (set: DartSet | null) => {
    if (!set) return;
    setIsCreating(false);

    const kind: "plain" | "preset" | "photo" = ((set as any).kind as any) || "plain";
    const presetId: string | null = ((set as any).presetId as any) || null;

    setEditingId(set.id);
    setEditForm({
      name: set.name || "",
      brand: set.brand || "",
      weightGrams: set.weightGrams ? String(set.weightGrams) : "",
      notes: set.notes || "",
      bgColor: set.bgColor || primary || DEFAULT_BG,
      scope: set.scope || "private",
      kind,
      presetId,
      photoDataUrl: null,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !editingId || !editForm) return;

    const name = editForm.name.trim() || "Mes fléchettes";
    const brand = editForm.brand.trim();
    const notes = editForm.notes.trim();
    const weight = parseInt(editForm.weightGrams, 10);
    const weightGrams = Number.isFinite(weight) ? weight : undefined;
    const scope = editForm.scope;

    const chosenPreset = editForm.presetId ? dartPresets.find((p) => p.id === editForm.presetId) : undefined;

    let kind: "plain" | "preset" | "photo" = editForm.kind;

    if (chosenPreset && kind !== "photo") kind = "preset";
    else if (!chosenPreset && kind === "preset") kind = "plain";

    try {
      const res = await Promise.resolve(
        updateDartSet(editingId, {
          name,
          brand: brand || undefined,
          weightGrams,
          notes: notes || undefined,
          bgColor: editForm.bgColor || DEFAULT_BG,
          scope,
          ...(chosenPreset && kind === "preset"
            ? {
                mainImageUrl: chosenPreset.imgUrlMain,
                thumbImageUrl: chosenPreset.imgUrlThumb,
              }
            : {}),
          kind,
          presetId: chosenPreset ? chosenPreset.id : undefined,
        } as any)
      );

      if (!res) {
        alert(lang === "fr" ? "Mise à jour impossible (stockage plein ?)" : "Update failed (storage full?)");
        return;
      }

      reloadSets();
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      console.warn("[DartSetsPanel] update error", err);
      alert(lang === "fr" ? "Erreur : mise à jour impossible (quota mobile ?)." : "Error: update failed (mobile quota?).");
    }
  };

  const handleDelete = (set: DartSet | null) => {
    if (!set) return;
    if (!window.confirm("Supprimer ce jeu de fléchettes ?")) return;
    deleteDartSet(set.id);
    reloadSets();
    if (editingId === set.id) {
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleSetFavorite = (set: DartSet | null) => {
    if (!profile?.id || !set) return;
    setFavoriteDartSet(profile.id, set.id);
    reloadSets();
  };

  // ------------------------------------------------------------------
  // Carrousel
  // ------------------------------------------------------------------

  const goPrev = () => {
    if (!hasSets) return;
    setActiveIndex((idx) => (idx <= 0 ? sets.length - 1 : idx - 1));
  };

  const goNext = () => {
    if (!hasSets) return;
    setActiveIndex((idx) => (idx >= sets.length - 1 ? 0 : idx + 1));
  };

  // ------------------------------------------------------------------
  // Libellés
  // ------------------------------------------------------------------

  const title =
    lang === "fr" ? "MES FLÉCHETTES" : lang === "es" ? "MIS DARDOS" : lang === "de" ? "MEINE DARTS" : "MY DARTS";

  const subtitle =
    lang === "fr"
      ? "Associe tes stats à chaque jeu de fléchettes."
      : lang === "es"
      ? "Asocia tus estadísticas a cada juego de dardos."
      : lang === "de"
      ? "Verknüpfe deine Statistiken mit jedem Dart-Set."
      : "Link your stats to each dart set.";

  const labelCreate = lang === "fr" ? "Créer" : lang === "es" ? "Crear" : lang === "de" ? "Neu" : "Create";

  const labelScanner = lang === "fr" ? "Scanner" : "Scan";
  const labelEdit = lang === "fr" ? "Éditer" : lang === "es" ? "Editar" : lang === "de" ? "Bearbeiten" : "Edit";
  const labelDelete = lang === "fr" ? "Suppr." : lang === "es" ? "Eliminar" : lang === "de" ? "Löschen" : "Delete";
  const labelFav = lang === "fr" ? "Favori" : lang === "es" ? "Favorito" : lang === "de" ? "Favorit" : "Favorite";

  const visualLabel =
    lang === "fr" ? "Visuel preset" : lang === "es" ? "Visual preset" : lang === "de" ? "Visual-Preset" : "Preset visual";

  const uploadLabel =
    lang === "fr"
      ? "Charger une photo"
      : lang === "es"
      ? "Subir foto"
      : lang === "de"
      ? "Foto hochladen"
      : "Upload photo";

  // ------------------------------------------------------------------
  // Helper UI : sélecteur de preset (SANS "AUCUN VISUEL")
  // - texte complet sous le preset : clamp 2 lignes
  // - re-cliquer sur un preset sélectionné → le désélectionne
  // ------------------------------------------------------------------

  const renderPresetPicker = (
    currentPresetId: string | null,
    setFormState:
      | React.Dispatch<React.SetStateAction<FormState | null>>
      | React.Dispatch<React.SetStateAction<FormState>>
  ) => {
    const togglePreset = (presetId: string) => {
      setFormState((prev: any) => {
        if (!prev) return prev;
        const nextPresetId = prev.presetId === presetId ? null : presetId;
        return {
          ...prev,
          presetId: nextPresetId,
          kind: nextPresetId ? "preset" : prev.photoDataUrl ? "photo" : "plain",
          photoDataUrl: nextPresetId ? null : prev.photoDataUrl ?? null,
        };
      });
    };

    return (
      <div style={{ gridColumn: "1 / span 2", marginTop: 4 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginBottom: 4 }}>{visualLabel}</div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {dartPresets.map((preset) => {
            const isSelected = currentPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => togglePreset(preset.id)}
                style={{
                  flexShrink: 0,
                  minWidth: 112,
                  padding: 6,
                  borderRadius: 14,
                  border: isSelected ? "1px solid rgba(245,195,91,.95)" : "1px solid rgba(255,255,255,.2)",
                  background: isSelected
                    ? "radial-gradient(circle at 0% 0%, rgba(245,195,91,.35), rgba(10,10,22,.95))"
                    : "rgba(4,4,10,.9)",
                  color: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  alignItems: "stretch",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: 60,
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "radial-gradient(circle at 30% 20%, #20232c, #070912 70%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={preset.imgUrlThumb}
                    alt={preset.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                </div>

                <div
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    lineHeight: "12px",
                    textAlign: "center",
                    whiteSpace: "normal",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical" as any,
                    WebkitLineClamp: 2,
                    wordBreak: "break-word",
                  }}
                >
                  {preset.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 12,
        background: "linear-gradient(135deg, rgba(8,8,16,.96), rgba(8,12,24,.96))",
        boxShadow: "0 0 22px rgba(0,0,0,.7)",
        border: "1px solid rgba(255,255,255,.08)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Header néon */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ position: "relative", paddingLeft: 2 }}>
          <div
            style={{
              position: "absolute",
              inset: -6,
              borderRadius: 999,
              background: "radial-gradient(circle at 0% 0%, rgba(245,195,91,.35), transparent 60%)",
              opacity: 0.9,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              fontSize: 13,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#fff",
              textShadow: "0 0 6px rgba(245,195,91,.8), 0 0 14px rgba(245,195,91,.5)",
            }}
          >
            {title}
          </div>
          <div style={{ position: "relative", marginTop: 2, fontSize: 10, color: "rgba(255,255,255,.55)" }}>
            {subtitle}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setEditForm(null);
            setForm(createEmptyForm(primary));
            setIsCreating((x) => !x);
          }}
          style={{
            position: "relative",
            fontSize: 11,
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,.16)",
            background: "linear-gradient(135deg, rgba(12,8,0,1), rgba(80,50,10,1))",
            color: "#fff",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1.6,
            boxShadow: "0 0 10px rgba(245,195,91,.6), 0 0 24px rgba(245,195,91,.35)",
          }}
        >
          {labelCreate}
        </button>
      </div>

      {/* Bloc flottant : création */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          style={{
            marginTop: 4,
            padding: 10,
            borderRadius: 14,
            background: "linear-gradient(145deg, rgba(12,12,28,.98), rgba(20,20,40,.98))",
            border: "1px solid rgba(255,255,255,.08)",
            boxShadow: "0 0 20px rgba(0,0,0,.8)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <div style={{ gridColumn: "1 / span 2" }}>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.6,
                color: "rgba(245,195,91,.9)",
                marginBottom: 4,
              }}
            >
              {lang === "fr"
                ? "Créer un nouveau set"
                : lang === "es"
                ? "Crear un nuevo set"
                : lang === "de"
                ? "Neues Set erstellen"
                : "Create new set"}
            </div>
          </div>

          <div style={{ gridColumn: "1 / span 2" }}>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Nom du set</label>
            <input
              value={form.name}
              onChange={handleChange("name")}
              placeholder="Ex : Noir 22g Target"
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Marque</label>
            <input
              value={form.brand}
              onChange={handleChange("brand")}
              placeholder="Target, Winmau..."
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Poids (g)</label>
            <select
              value={form.weightGrams}
              onChange={handleChange("weightGrams")}
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
              }}
            >
              <option value="">
                {lang === "fr" ? "Choisir..." : lang === "es" ? "Elegir..." : lang === "de" ? "Wählen..." : "Select..."}
              </option>
              {WEIGHT_OPTIONS.map((w) => (
                <option key={w} value={String(w)}>
                  {w} g
                </option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: "1 / span 2" }}>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Notes (optionnel)</label>
            <textarea
              value={form.notes}
              onChange={handleChange("notes")}
              rows={2}
              placeholder="Grip, longueur, feeling..."
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
                resize: "vertical",
              }}
            />
          </div>

          {/* Sélecteur visuel : presets uniquement */}
          {renderPresetPicker(form.presetId, setForm as any)}

          {/* Utilisable (centré) */}
          <div style={{ gridColumn: "1 / span 2", marginTop: 4, display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginBottom: 4 }}>Utilisable :</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, scope: "private" }))}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: form.scope === "private" ? "1px solid #f5c35b" : "1px solid rgba(255,255,255,.15)",
                    background: form.scope === "private" ? "rgba(245,195,91,.25)" : "rgba(255,255,255,.05)",
                    color: "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                    minWidth: 92,
                  }}
                >
                  Privé
                </button>

                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, scope: "public" }))}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: form.scope === "public" ? "1px solid #7ee6a5" : "1px solid rgba(255,255,255,.15)",
                    background: form.scope === "public" ? "rgba(127,230,165,.25)" : "rgba(255,255,255,.05)",
                    color: "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                    minWidth: 92,
                  }}
                >
                  Public
                </button>
              </div>
            </div>
          </div>

          {/* Couleur de fond (centré) */}
          <div style={{ gridColumn: "1 / span 2", marginTop: 4, display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Couleur de fond</label>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
                <input
                  type="color"
                  value={form.bgColor}
                  onChange={handleChange("bgColor")}
                  style={{
                    width: 140,
                    padding: 0,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.2)",
                    background: "transparent",
                    height: 32,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Photo + Enregistrer (centré) */}
          <div style={{ gridColumn: "1 / span 2", marginTop: 6, display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginBottom: 6 }}>
                Photo perso (compressée automatiquement)
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <label
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(127,196,255,.9)",
                    background: "radial-gradient(circle at 0% 0%, rgba(127,196,255,.35), rgba(8,18,32,.95))",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 160,
                  }}
                >
                  <span style={{ marginRight: 6 }}>📷</span>
                  {uploadLabel}
                  <input type="file" accept="image/*" onChange={handleCreatePhotoUpload} style={{ display: "none" }} />
                </label>

                <button
                  type="submit"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: "none",
                    background: "radial-gradient(circle at 0% 0%, rgba(127,226,169,.45), rgba(8,40,24,.92))",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 1.4,
                    minWidth: 160,
                  }}
                >
                  {lang === "fr" ? "Enregistrer" : lang === "es" ? "Guardar" : lang === "de" ? "Speichern" : "Save"}
                </button>
              </div>

              {form.photoDataUrl && (
                <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,.28)",
                      overflow: "hidden",
                      background: "#050509",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <DartImage url={form.photoDataUrl} width={54} height={54} angleDeg={0} fit="cover" radius={14} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Bloc flottant : édition */}
      {editingId && editForm && (
        <form
          onSubmit={handleUpdate}
          style={{
            marginTop: 4,
            padding: 10,
            borderRadius: 14,
            background: "linear-gradient(145deg, rgba(10,10,24,.98), rgba(18,28,40,.98))",
            border: "1px solid rgba(255,255,255,.1)",
            boxShadow: "0 0 20px rgba(0,0,0,.8)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <div style={{ gridColumn: "1 / span 2" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.6, color: "rgba(127,196,255,.95)", marginBottom: 4 }}>
              {lang === "fr" ? "Modifier ce set" : lang === "es" ? "Editar este set" : lang === "de" ? "Set bearbeiten" : "Edit this set"}
            </div>
          </div>

          <div style={{ gridColumn: "1 / span 2" }}>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Nom du set</label>
            <input
              value={editForm.name}
              onChange={handleEditChange("name")}
              placeholder="Ex : Noir 22g Target"
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Marque</label>
            <input
              value={editForm.brand}
              onChange={handleEditChange("brand")}
              placeholder="Target, Winmau..."
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Poids (g)</label>
            <select
              value={editForm.weightGrams}
              onChange={handleEditChange("weightGrams")}
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
              }}
            >
              <option value="">
                {lang === "fr" ? "Choisir..." : lang === "es" ? "Elegir..." : lang === "de" ? "Wählen..." : "Select..."}
              </option>
              {WEIGHT_OPTIONS.map((w) => (
                <option key={w} value={String(w)}>
                  {w} g
                </option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: "1 / span 2" }}>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Notes (optionnel)</label>
            <textarea
              value={editForm.notes}
              onChange={handleEditChange("notes")}
              rows={2}
              placeholder="Grip, longueur, feeling..."
              style={{
                width: "100%",
                marginTop: 2,
                padding: "6px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(6,6,14,.96)",
                color: "#fff",
                fontSize: 12,
                resize: "vertical",
              }}
            />
          </div>

          {renderPresetPicker(editForm.presetId, setEditForm as any)}

          <DartSetImageUploader
            dartSet={sets.find((s) => s.id === editingId) || null}
            onUpdated={(updated) => setSets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
          />

          <div style={{ gridColumn: "1 / span 2", marginTop: 4 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginBottom: 4 }}>Utilisable :</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setEditForm((prev) => (prev ? { ...prev, scope: "private" } : prev))}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: editForm.scope === "private" ? "1px solid #f5c35b" : "1px solid rgba(255,255,255,.15)",
                  background: editForm.scope === "private" ? "rgba(245,195,91,.25)" : "rgba(255,255,255,.05)",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Privé
              </button>

              <button
                type="button"
                onClick={() => setEditForm((prev) => (prev ? { ...prev, scope: "public" } : prev))}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: editForm.scope === "public" ? "1px solid #7ee6a5" : "1px solid rgba(255,255,255,.15)",
                  background: editForm.scope === "public" ? "rgba(127,230,165,.25)" : "rgba(255,255,255,.05)",
                  color: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Public
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>Couleur de fond</label>
            <input
              type="color"
              value={editForm.bgColor}
              onChange={handleEditChange("bgColor")}
              style={{
                width: "100%",
                marginTop: 2,
                padding: 0,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.25)",
                background: "transparent",
                height: 32,
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.25)",
                background: "rgba(255,255,255,.05)",
                color: "#fff",
                fontSize: 12,
              }}
            >
              {lang === "fr" ? "Annuler" : lang === "es" ? "Cancelar" : lang === "de" ? "Abbrechen" : "Cancel"}
            </button>

            <button
              type="submit"
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background: "radial-gradient(circle at 0% 0%, rgba(127,226,169,.5), rgba(8,40,24,.95))",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1.4,
              }}
            >
              {lang === "fr" ? "Mettre à jour" : lang === "es" ? "Actualizar" : lang === "de" ? "Aktualisieren" : "Update"}
            </button>
          </div>
        </form>
      )}

      {/* Carrousel */}
      {hasSets ? (
        <>
          <div
            style={{
              marginTop: 4,
              padding: 8,
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(8,8,18,.98), rgba(12,16,30,.98))",
              border: "1px solid rgba(255,255,255,.06)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={goPrev}
              style={{
                position: "absolute",
                left: 4,
                top: "50%",
                transform: "translateY(-50%)",
                width: 26,
                height: 26,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.4)",
                background: "rgba(0,0,0,.6)",
                color: "#fff",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              ◀
            </button>

            <button
              type="button"
              onClick={goNext}
              style={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                width: 26,
                height: 26,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,.4)",
                background: "rgba(0,0,0,.6)",
                color: "#fff",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              ▶
            </button>

            {activeSet && (
              <div style={{ marginInline: 30, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 10, alignItems: "center" }}>
                  <div
                    style={{
                      width: 80,
                      height: 70,
                      borderRadius: 14,
                      background: activeSet.bgColor || DEFAULT_BG,
                      border: "1px solid rgba(255,255,255,.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {activeSet.thumbImageUrl || activeSet.mainImageUrl ? (
                      <DartImage
                        url={activeSet.thumbImageUrl || activeSet.mainImageUrl!}
                        width={80}
                        height={70}
                        angleDeg={0}
                        fit={(activeSet as any)?.kind === "photo" ? "cover" : "contain"} // ✅ PHOTO => cover
                        bg={activeSet.bgColor || DEFAULT_BG}
                        radius={14}
                      />
                    ) : (
                      <span style={{ fontSize: 24 }}>🎯</span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#fff",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                        }}
                      >
                        {activeSet.name}
                      </div>
                      {activeSet.isFavorite && (
                        <span
                          style={{
                            fontSize: 16,
                            textShadow: "0 0 4px rgba(245,195,91,.9), 0 0 10px rgba(245,195,91,.7)",
                            color: "rgba(245,195,91,1)",
                          }}
                        >
                          ★
                        </span>
                      )}
                    </div>

                    {activeSet.brand && (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.75)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {activeSet.brand}
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(255,255,255,.8)", flexWrap: "wrap" }}>
                      {typeof activeSet.weightGrams === "number" && (
                        <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,.25)", fontSize: 10 }}>
                          {activeSet.weightGrams} g
                        </span>
                      )}

                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: activeSet.scope === "public" ? "1px solid rgba(127,230,165,.8)" : "1px solid rgba(255,255,255,.25)",
                          background: activeSet.scope === "public" ? "rgba(127,230,165,.18)" : "rgba(255,255,255,.06)",
                          color: activeSet.scope === "public" ? "rgba(180,255,210,.98)" : "rgba(220,220,255,.9)",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                          fontSize: 10,
                        }}
                      >
                        {activeSet.scope === "public"
                          ? lang === "fr"
                            ? "Public"
                            : lang === "es"
                            ? "Público"
                            : lang === "de"
                            ? "Öffentlich"
                            : "Public"
                          : lang === "fr"
                          ? "Privé"
                          : lang === "es"
                          ? "Privado"
                          : lang === "de"
                          ? "Privat"
                          : "Private"}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 4 }}>
                  {sets.map((s, idx) => (
                    <div
                      key={s.id}
                      style={{
                        width: idx === activeIndex ? 10 : 6,
                        height: 6,
                        borderRadius: 999,
                        background: idx === activeIndex ? "rgba(245,195,91,.9)" : "rgba(255,255,255,.25)",
                        transition: "all .18s",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 12,
              background: "rgba(8,8,18,.95)",
              border: "1px solid rgba(255,255,255,.05)",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 6,
            }}
          >
            {[
              { key: "scan", label: labelScanner, onClick: () => activeSet && setScannerTarget(activeSet), disabled: !activeSet },
              { key: "edit", label: labelEdit, onClick: () => handleStartEdit(activeSet), disabled: !activeSet },
              { key: "delete", label: labelDelete, onClick: () => handleDelete(activeSet), disabled: !activeSet },
              { key: "fav", label: labelFav, onClick: () => handleSetFavorite(activeSet), disabled: !activeSet },
            ].map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={btn.onClick}
                disabled={btn.disabled}
                style={{
                  padding: "6px 4px",
                  borderRadius: 999,
                  border:
                    btn.key === "scan"
                      ? "1px solid rgba(127,226,169,.8)"
                      : btn.key === "delete"
                      ? "1px solid rgba(255,120,120,.8)"
                      : btn.key === "fav"
                      ? "1px solid rgba(245,195,91,.9)"
                      : "1px solid rgba(127,196,255,.8)",
                  background: btn.disabled
                    ? "rgba(40,40,50,.7)"
                    : btn.key === "scan"
                    ? "radial-gradient(circle at 0% 0%, rgba(127,226,169,.4), rgba(8,28,18,.95))"
                    : btn.key === "delete"
                    ? "radial-gradient(circle at 0% 0%, rgba(255,120,120,.4), rgba(40,8,8,.95))"
                    : btn.key === "fav"
                    ? "radial-gradient(circle at 0% 0%, rgba(245,195,91,.45), rgba(40,28,8,.95))"
                    : "radial-gradient(circle at 0% 0%, rgba(127,196,255,.45), rgba(8,20,40,.95))",
                  color: btn.disabled ? "rgba(140,140,160,.8)" : "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 1.1,
                  opacity: btn.disabled ? 0.5 : 1,
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,255,255,.45)" }}>
          {lang === "fr"
            ? "Tu n'as pas encore enregistré de jeu de fléchettes. Crée ton premier set pour commencer à comparer tes stats."
            : lang === "es"
            ? "Aún no has registrado ningún juego de dardos. Crea tu primer set para empezar a comparar tus estadísticas."
            : lang === "de"
            ? "Du hast noch keine Dart-Sets gespeichert. Erstelle dein erstes Set, um deine Statistiken zu vergleichen."
            : "You haven't saved any dart sets yet. Create your first set to start comparing your stats."}
        </div>
      )}

      {scannerTarget && (
        <DartSetScannerSheet
          dartSet={scannerTarget}
          onClose={() => setScannerTarget(null)}
          onUpdated={(updated) => {
            setSets((prev) => sortSets(prev.map((s) => (s.id === updated.id ? updated : s))));
          }}
        />
      )}
    </div>
  );
};

export default DartSetsPanel;
