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
// ✅ PATCH CLOUD: sync dartsets -> __appStore.update (pour IDB + push cloud)
// =============================================================

import React from "react";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

import DartSetScannerSheet from "./DartSetScannerSheet";
import AvatarLite from "./profile/AvatarLite";

import {
  type DartSet,
  getAllDartSets, // ✅ PATCH B
  getAllSelectableDartSets,
  getDartSetsForProfile,
  createDartSet,
  deleteDartSet,
  updateDartSet,
  getDartSetMainImageSrc,
  getDartSetThumbImageSrc,
} from "../lib/dartSetsStore";

import { dartPresets } from "../lib/dartPresets";

type Props = {
  profile: Profile;
  availableProfiles?: Profile[];
  showAllOwners?: boolean;
};

type FormState = {
  name: string;
  brand: string;
  weightGrams: string;
  notes: string;
  bgColor: string;
  scope: "private" | "public";
  privateProfileId: string;

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
            fontSize: typeof width === "number" ? Math.max(18, Math.round(width * 0.33)) : 22,
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
  onAfterChange?: () => void; // ✅ PATCH B (pour sync app store)
};

const DartSetImageUploader: React.FC<DartSetImageUploaderProps> = ({
  dartSet,
  onUpdated,
  onAfterChange,
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

  const currentUrl = getDartSetThumbImageSrc(dartSet) || getDartSetMainImageSrc(dartSet) || "";

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
          // ✅ NAS BACKUP FIX: garder une copie source uploadable.
          // mainImageUrl/thumbImageUrl peuvent être remplacés plus tard par /media/:id,
          // mais photoDataUrl permet au push NAS d'uploader la photo importée.
          photoDataUrl: compressed,
          mainImageDataUrl: compressed,
          photoThumbDataUrl: compressed,
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
        photoDataUrl: compressed,
        mainImageDataUrl: compressed,
        photoThumbDataUrl: compressed,
        // @ts-expect-error champs libres nouvelle archi
        kind: "photo",
        presetId: undefined,
      };

      onUpdated(updated);
      try {
        onAfterChange?.(); // ✅ PATCH B
      } catch {}
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

const createEmptyForm = (primary: string, privateProfileId: string): FormState => ({
  name: "",
  brand: "",
  weightGrams: "",
  notes: "",
  bgColor: primary || DEFAULT_BG,
  scope: "private",
  privateProfileId,
  kind: "plain",
  presetId: null,
  photoDataUrl: null,
});


const DartSetActionIcon: React.FC<{ name: "create" | "scan" | "edit" | "fav" | "delete"; size?: number }> = ({ name, size = 22 }) => {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  switch (name) {
    case "create":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M12 5v14" />
          <path {...p} d="M5 12h14" />
        </svg>
      );
    case "scan":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M4 8V5a1 1 0 0 1 1-1h3" />
          <path {...p} d="M16 4h3a1 1 0 0 1 1 1v3" />
          <path {...p} d="M20 16v3a1 1 0 0 1-1 1h-3" />
          <path {...p} d="M8 20H5a1 1 0 0 1-1-1v-3" />
          <path {...p} d="M7 12h10" />
          <path {...p} d="M9 8v8" />
          <path {...p} d="M15 8v8" />
        </svg>
      );
    case "edit":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M4 20h4" />
          <path {...p} d="M6 18 17.5 6.5a2.1 2.1 0 0 1 3 3L9 21l-4 1 1-4Z" />
          <path {...p} d="m15.5 8.5 3 3" />
        </svg>
      );
    case "fav":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="m12 3.8 2.45 4.95 5.45.8-3.95 3.85.95 5.43L12 16.25l-4.9 2.58.95-5.43L4.1 9.55l5.45-.8L12 3.8Z" />
        </svg>
      );
    case "delete":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path {...p} d="M4 7h16" />
          <path {...p} d="M9 7V4h6v3" />
          <path {...p} d="M7 7l1 13h8l1-13" />
          <path {...p} d="M10 11v5" />
          <path {...p} d="M14 11v5" />
        </svg>
      );
    default:
      return null;
  }
};

const DartSetsPanel: React.FC<Props> = ({ profile, availableProfiles = [], showAllOwners = false }) => {
  const { palette } = useTheme();
  const { lang } = useLang();

  const primary = palette?.primary || "#f5c35b";

  const [sets, setSets] = React.useState<DartSet[]>([]);
  const [form, setForm] = React.useState<FormState>(createEmptyForm(primary, String(profile?.id || "")));
  const [isCreating, setIsCreating] = React.useState(false);

  // Edition
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<FormState | null>(null);

  // Scanner
  const [scannerTarget, setScannerTarget] = React.useState<DartSet | null>(null);

  // Carrousel
  const [activeIndex, setActiveIndex] = React.useState(0);
  const lastSyncedSigRef = React.useRef("");
  const syncTimerRef = React.useRef<number | null>(null);
  const activeSetIdRef = React.useRef<string | null>(null);
  const keepActiveDartSetIdRef = React.useRef<string | null>(null);

  const ownersById = React.useMemo(() => {
    const map = new Map<string, any>();
    (availableProfiles || []).forEach((p: any) => {
      if (!p) return;
      map.set(String(p.id || ""), p);
    });
    if (profile?.id) map.set(String(profile.id), profile as any);
    return map;
  }, [availableProfiles, profile]);


  // ✅ PATCH B — helper: pousse TOUS les dartsets dans le store global (=> IDB => push cloud)
  const syncAllDartSetsToAppStore = React.useCallback((reason: string = "dartsets_mutation") => {
    try {
      const all = getAllDartSets();
      const sig = JSON.stringify((all || []).map((s: any) => [
        s?.id,
        s?.profileId,
        s?.updatedAt || 0,
        s?.lastUsedAt || 0,
        !!s?.isFavorite,
        s?.kind || "",
        s?.presetId || "",
        s?.mainImageUrl || "",
        s?.thumbImageUrl || "",
        s?.mainImageAssetId || "",
        s?.thumbImageAssetId || "",
        s?.photoAssetId || "",
      ]));
      if (lastSyncedSigRef.current === sig) return;
      lastSyncedSigRef.current = sig;
      if (syncTimerRef.current != null && typeof window !== "undefined") {
        window.clearTimeout(syncTimerRef.current);
      }
      if (typeof window === "undefined") return;
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null;
        try {
          const u = (window as any).__appStore?.update;
          if (typeof u === "function") {
            u((s: any) => {
              const prev = Array.isArray((s || {}).dartSets) ? (s || {}).dartSets : [];
              const prevSig = JSON.stringify(prev.map((x: any) => [
                x?.id,
                x?.profileId,
                x?.updatedAt || 0,
                x?.lastUsedAt || 0,
                !!x?.isFavorite,
                x?.kind || "",
                x?.presetId || "",
                x?.mainImageUrl || "",
                x?.thumbImageUrl || "",
                x?.mainImageAssetId || "",
                x?.thumbImageAssetId || "",
                x?.photoAssetId || "",
              ]));
              if (prevSig === sig) return s;
              return { ...(s || {}), dartSets: all };
            });
          }
        } catch (e) {
          console.warn("[DartSetsPanel] syncAllDartSetsToAppStore error", e);
        }
      }, 1200);
    } catch (e) {
      console.warn("[DartSetsPanel] syncAllDartSetsToAppStore error", e);
    }
  }, []);


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
    if (!profile?.id && !showAllOwners) return;
    try {
      const all = showAllOwners
        ? await Promise.resolve(getAllSelectableDartSets() as any)
        : await Promise.resolve(getDartSetsForProfile(profile.id) as any);
      const sorted = sortSets((all || []) as DartSet[]);
      const requestedActiveId = keepActiveDartSetIdRef.current || activeSetIdRef.current;
      keepActiveDartSetIdRef.current = null;
      setSets(sorted);
      setActiveIndex((idx) => {
        if (requestedActiveId) {
          const nextIndex = sorted.findIndex((s) => String(s.id) === String(requestedActiveId));
          if (nextIndex >= 0) return nextIndex;
        }
        return sorted.length === 0 ? 0 : Math.min(idx, sorted.length - 1);
      });

    } catch (err) {
      console.warn("[DartSetsPanel] load error", err);
    }
  }, [profile?.id, showAllOwners, syncAllDartSetsToAppStore]);

  React.useEffect(() => {
    loadSets();
  }, [loadSets]);

  React.useEffect(() => {
    return () => {
      if (syncTimerRef.current != null && typeof window !== "undefined") {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, []);

  const reloadSets = React.useCallback(() => {
    void loadSets();
  }, [loadSets]);

  const hasSets = sets.length > 0;
  const activeSet: DartSet | null =
    hasSets && activeIndex >= 0 && activeIndex < sets.length ? sets[activeIndex] : null;

  React.useEffect(() => {
    activeSetIdRef.current = activeSet?.id ? String(activeSet.id) : null;
  }, [activeSet?.id]);
  const activeOwner = React.useMemo(() => {
    if (!activeSet || String(activeSet.scope || "private") !== "private") return null;
    const ownerId = String((activeSet as any)?.profileId || "");
    if (!ownerId) return null;
    return ownersById.get(ownerId) || null;
  }, [activeSet, ownersById]);

  const ownerLabel = React.useCallback((owner: any) => {
    if (!owner) return lang === "fr" ? "Profil" : "Profile";
    return String(
      owner?.name ||
      owner?.displayName ||
      owner?.nickname ||
      owner?.surname ||
      owner?.id ||
      (lang === "fr" ? "Profil" : "Profile")
    );
  }, [lang]);

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
    const targetProfileId = scope === "private" ? String(form.privateProfileId || profile.id || "") : String(profile.id || "");

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
        profileId: targetProfileId,
        name,
        brand: brand || undefined,
        weightGrams,
        notes: notes || undefined,
        mainImageUrl,
        thumbImageUrl,
        // ✅ NAS BACKUP FIX: la source base64 reste disponible jusqu'au push média NAS.
        // exportCloudSnapshot la supprimera après upload, mais mediaSync doit d'abord la lire.
        photoDataUrl: kind === "photo" ? form.photoDataUrl : undefined,
        mainImageDataUrl: kind === "photo" ? form.photoDataUrl : undefined,
        photoThumbDataUrl: kind === "photo" ? form.photoDataUrl : undefined,
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
      setForm(createEmptyForm(primary, String(profile?.id || "")));
      setIsCreating(false);

      // ✅ PATCH B
      syncAllDartSetsToAppStore();
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
      privateProfileId: String((set as any).profileId || profile.id || ""),
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
    const nextOwnerProfileId = scope === "private" ? String(editForm.privateProfileId || profile.id || "") : String(profile.id || "");

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
          profileId: nextOwnerProfileId,
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

      // ✅ PATCH B
      syncAllDartSetsToAppStore();
    } catch (err) {
      console.warn("[DartSetsPanel] update error", err);
      alert(lang === "fr" ? "Erreur : mise à jour impossible (quota mobile ?)." : "Error: update failed (mobile quota?).");
    }
  };

  const handleDelete = (set: DartSet | null) => {
    if (!set) return;
    if (!window.confirm("Supprimer ce jeu de fléchettes ?")) return;
    const ok = deleteDartSet(set.id);
    if (!ok) {
      alert(lang === "fr" ? "Suppression impossible (stockage plein ?)" : "Delete failed (storage full?)");
      reloadSets();
      return;
    }
    reloadSets();

    // ✅ PATCH B
    syncAllDartSetsToAppStore();

    if (editingId === set.id) {
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleToggleFavorite = (set: DartSet | null) => {
    if (!profile?.id || !set) return;

    // Bascule ON/OFF non exclusive :
    // un clic ajoute le set visible aux favoris, un second clic le retire.
    // Important : on garde ce même set affiché après le tri, même s'il remonte
    // au début de la liste des favoris.
    keepActiveDartSetIdRef.current = String(set.id);
    const ok = updateDartSet(set.id, { isFavorite: !set.isFavorite } as any);

    if (!ok) {
      keepActiveDartSetIdRef.current = null;
      alert(lang === "fr" ? "Impossible de modifier le favori." : "Unable to update favorite.");
      reloadSets();
      return;
    }

    reloadSets();
    syncAllDartSetsToAppStore();
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
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        borderRadius: 16,
        padding: "clamp(8px, 2.6vw, 12px)",
        background: "linear-gradient(135deg, rgba(8,8,16,.96), rgba(8,12,24,.96))",
        boxShadow: "0 0 22px rgba(0,0,0,.7)",
        border: "1px solid rgba(255,255,255,.08)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        overflow: "hidden",
      }}
    >
      {/* Titre + actions type bottomNav */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch" }}>
        <div
          style={{
            textAlign: "center",
            fontSize: 18,
            lineHeight: "22px",
            fontWeight: 950,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: primary,
            textShadow: `0 0 8px ${primary}, 0 0 18px ${primary}99`,
          }}
        >
          {title}
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: "clamp(5px, 1.6vw, 9px)",
            overflow: "hidden",
            padding: "4px 0 6px",
          }}
        >
          {[
            {
              key: "create",
              label: labelCreate,
              iconName: "create" as const,
              tone: primary,
              active: isCreating,
              disabled: false,
              onClick: () => {
                setEditingId(null);
                setEditForm(null);
                setForm(createEmptyForm(primary, String(profile?.id || "")));
                setIsCreating((x) => !x);
              },
            },
            {
              key: "scan",
              label: labelScanner,
              iconName: "scan" as const,
              tone: "#7fe2a9",
              active: !!scannerTarget,
              disabled: !activeSet,
              onClick: () => activeSet && setScannerTarget(activeSet),
            },
            {
              key: "edit",
              label: labelEdit,
              iconName: "edit" as const,
              tone: "#7fc4ff",
              active: !!editingId,
              disabled: !activeSet,
              onClick: () => handleStartEdit(activeSet),
            },
            {
              key: "fav",
              label: labelFav,
              iconName: "fav" as const,
              tone: primary,
              active: !!activeSet?.isFavorite,
              disabled: !activeSet,
              onClick: () => handleToggleFavorite(activeSet),
            },
            {
              key: "delete",
              label: labelDelete,
              iconName: "delete" as const,
              tone: "#ff7878",
              active: false,
              disabled: !activeSet,
              onClick: () => handleDelete(activeSet),
            },
          ].map((btn) => (
            <button
              key={btn.key}
              type="button"
              className={`tab pill ${btn.active ? "is-active" : ""}`}
              onClick={btn.onClick}
              disabled={btn.disabled}
              title={btn.label}
              style={{
                width: "100%",
                minWidth: 0,
                maxWidth: "none",
                color: btn.disabled
                  ? "rgba(150,150,170,.55)"
                  : btn.key === "delete"
                  ? "#ff7878"
                  : btn.active
                  ? btn.tone
                  : "rgba(230,230,238,.76)",
                opacity: btn.disabled ? 0.42 : 1,
                cursor: btn.disabled ? "default" : "pointer",
              }}
            >
              <span
                className="pill-inner"
                style={{
                  minHeight: "clamp(48px, 12.5vw, 58px)",
                  padding: "clamp(6px, 1.8vw, 8px) clamp(3px, 1.4vw, 6px)",
                  borderColor: btn.active ? btn.tone : "rgba(255,255,255,.14)",
                  boxShadow: btn.active
                    ? `0 0 0 1px ${btn.tone}55, 0 0 14px ${btn.tone}AA`
                    : "inset 0 -1px 0 rgba(255,255,255,.04), 0 2px 0 rgba(0,0,0,.2)",
                  background: btn.active
                    ? `linear-gradient(180deg, ${btn.tone}2A, ${btn.tone}16)`
                    : "rgba(255,255,255,.04)",
                }}
              >
                <span
                  className="tab-icon"
                  style={{
                    color: btn.disabled
                      ? "rgba(150,150,170,.55)"
                      : btn.key === "delete"
                      ? "#ff7878"
                      : btn.active
                      ? btn.tone
                      : "rgba(255,255,255,.92)",
                    filter: btn.disabled
                      ? "none"
                      : btn.key === "delete"
                      ? "drop-shadow(0 0 6px rgba(255,80,80,.65))"
                      : btn.active
                      ? `drop-shadow(0 0 7px ${btn.tone})`
                      : "none",
                  }}
                >
                  <DartSetActionIcon name={btn.iconName} size={19} />
                </span>
                <span
                  className="tab-label"
                  style={{
                    fontSize: "clamp(8px, 2.2vw, 10px)",
                    lineHeight: "10px",
                    fontWeight: 750,
                    letterSpacing: 0.15,
                    color: btn.disabled
                      ? "rgba(150,150,170,.55)"
                      : btn.key === "delete"
                      ? "#ff7878"
                      : btn.active
                      ? btn.tone
                      : "rgba(220,220,230,.78)",
                  }}
                >
                  {btn.label}
                </span>
              </span>
            </button>
          ))}
        </div>
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

          {form.scope === "private" && availableProfiles.length > 0 && (
            <div style={{ gridColumn: "1 / span 2", marginTop: 2, display: "flex", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: 420 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginBottom: 4, textAlign: "center" }}>
                  {lang === "fr" ? "Set privé associé à" : "Private set assigned to"}
                </div>
                <select
                  value={form.privateProfileId}
                  onChange={handleChange("privateProfileId")}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "rgba(6,6,14,.96)", color: "#fff", fontSize: 12 }}
                >
                  {availableProfiles.map((p: any) => (
                    <option key={String((p as any).id)} value={String((p as any).id)}>
                      {String((p as any).name || (p as any).displayName || (p as any).nickname || (p as any).id)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

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
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.6,
                color: "rgba(127,196,255,.95)",
                marginBottom: 4,
              }}
            >
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
            onAfterChange={syncAllDartSetsToAppStore} // ✅ PATCH B (save photo)
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

          {editForm.scope === "private" && availableProfiles.length > 0 && (
            <div style={{ gridColumn: "1 / span 2", marginTop: 4 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginBottom: 4 }}>
                {lang === "fr" ? "Set privé associé à" : "Private set assigned to"}
              </div>
              <select
                value={editForm.privateProfileId}
                onChange={handleEditChange("privateProfileId")}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "rgba(6,6,14,.96)", color: "#fff", fontSize: 12 }}
              >
                {availableProfiles.map((p: any) => (
                  <option key={String((p as any).id)} value={String((p as any).id)}>
                    {String((p as any).name || (p as any).displayName || (p as any).nickname || (p as any).id)}
                  </option>
                ))}
              </select>
            </div>
          )}

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

      {/* Carrousel premium */}
      {hasSets ? (
        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            marginTop: 2,
            padding: "clamp(8px, 2vw, 10px) clamp(4px, 1.5vw, 8px) 12px",
            borderRadius: 18,
            background: "linear-gradient(180deg, rgba(8,10,22,.98), rgba(4,6,14,.99))",
            border: "1px solid rgba(255,255,255,.07)",
            position: "relative",
            overflow: "hidden",
            boxShadow: "inset 0 0 22px rgba(255,255,255,.025), 0 0 20px rgba(0,0,0,.65)",
          }}
        >
          <button
            type="button"
            onClick={goPrev}
            style={{
              position: "absolute",
              left: 4,
              top: "38%",
              transform: "translateY(-50%)",
              width: "clamp(26px, 7vw, 30px)",
              height: "clamp(26px, 7vw, 30px)",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.35)",
              background: "rgba(0,0,0,.58)",
              color: "#fff",
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              boxShadow: "0 0 14px rgba(0,0,0,.8)",
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
              top: "38%",
              transform: "translateY(-50%)",
              width: "clamp(26px, 7vw, 30px)",
              height: "clamp(26px, 7vw, 30px)",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.35)",
              background: "rgba(0,0,0,.58)",
              color: "#fff",
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              boxShadow: "0 0 14px rgba(0,0,0,.8)",
            }}
          >
            ▶
          </button>

          {activeSet && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
              <div
                style={{
                  position: "relative",
                  width: "min(100%, clamp(190px, 62vw, 250px))",
                  maxWidth: "calc(100vw - 110px)",
                  aspectRatio: "1 / 1",
                  borderRadius: 24,
                  background: activeSet.bgColor || DEFAULT_BG,
                  border: `1px solid ${primary}55`,
                  boxShadow: `0 0 18px ${primary}22, inset 0 0 22px rgba(255,255,255,.05)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {getDartSetMainImageSrc(activeSet) || getDartSetThumbImageSrc(activeSet) ? (
                  <DartImage
                    url={(getDartSetMainImageSrc(activeSet) || getDartSetThumbImageSrc(activeSet)) as string}
                    width="100%"
                    height="100%"
                    angleDeg={0}
                    fit={(activeSet as any)?.kind === "photo" ? "cover" : "contain"}
                    bg={activeSet.bgColor || DEFAULT_BG}
                    radius={24}
                  />
                ) : (
                  <span style={{ fontSize: 56 }}>🎯</span>
                )}

                {activeSet.scope === "private" && activeOwner ? (
                  <div
                    title={ownerLabel(activeOwner)}
                    style={{
                      position: "absolute",
                      right: 8,
                      bottom: 8,
                      width: 38,
                      height: 38,
                      borderRadius: 999,
                      padding: 2,
                      background: "rgba(2,4,10,.78)",
                      border: `1px solid ${primary}bb`,
                      boxShadow: `0 0 12px ${primary}88`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AvatarLite
                      src={(activeOwner as any).avatarDataUrl || (activeOwner as any).avatarUrl || (activeOwner as any).avatar || null}
                      size={32}
                      label={ownerLabel(activeOwner).slice(0, 1)}
                    />
                  </div>
                ) : null}

                {activeSet.isFavorite && (
                  <div
                    style={{
                      position: "absolute",
                      left: 9,
                      top: 8,
                      color: "#f5c35b",
                      fontSize: 22,
                      lineHeight: "22px",
                      textShadow: "0 0 7px rgba(245,195,91,.95), 0 0 16px rgba(245,195,91,.7)",
                    }}
                  >
                    ★
                  </div>
                )}
              </div>

              <div
                style={{
                  width: "100%",
                  maxWidth: "min(320px, calc(100vw - 74px))",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    maxWidth: "100%",
                    fontSize: 18,
                    lineHeight: "22px",
                    fontWeight: 950,
                    color: "#fff",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    textShadow: "0 0 10px rgba(255,255,255,.18)",
                  }}
                >
                  {activeSet.name}
                </div>

                <div
                  style={{
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 6,
                  }}
                >
                  {[
                    {
                      label: lang === "fr" ? "Marque" : "Brand",
                      value: activeSet.brand || "—",
                    },
                    {
                      label: lang === "fr" ? "Poids" : "Weight",
                      value: typeof activeSet.weightGrams === "number" ? `${activeSet.weightGrams} g` : "—",
                    },
                    {
                      label: lang === "fr" ? "Accès" : "Scope",
                      value:
                        activeSet.scope === "public"
                          ? lang === "fr"
                            ? "Public"
                            : "Public"
                          : lang === "fr"
                          ? "Privé"
                          : "Private",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        minWidth: 0,
                        padding: "6px 5px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,.045)",
                        border: "1px solid rgba(255,255,255,.08)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 8,
                          lineHeight: "10px",
                          letterSpacing: 0.8,
                          textTransform: "uppercase",
                          color: "rgba(255,255,255,.45)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 11,
                          lineHeight: "14px",
                          fontWeight: 800,
                          color: "#fff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 1, maxWidth: "100%", flexWrap: "wrap" }}>
                {sets.map((s, idx) => (
                  <div
                    key={s.id}
                    style={{
                      width: idx === activeIndex ? 12 : 6,
                      height: 6,
                      borderRadius: 999,
                      background: idx === activeIndex ? primary : "rgba(255,255,255,.25)",
                      boxShadow: idx === activeIndex ? `0 0 8px ${primary}` : "none",
                      transition: "all .18s",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            marginTop: 4,
            padding: 14,
            borderRadius: 16,
            textAlign: "center",
            fontSize: 12,
            color: "rgba(255,255,255,.58)",
            background: "rgba(8,8,18,.75)",
            border: "1px solid rgba(255,255,255,.06)",
          }}
        >
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
            // ✅ PATCH B — après scan update
            syncAllDartSetsToAppStore();
          }}
        />
      )}
    </div>
  );
};

export default DartSetsPanel;
