import type { AwenaReply, AwenaRuntimeContext } from "./awena.types";

export type AwenaScreenControl = {
  kind: "heading" | "button" | "field" | "choice" | "text";
  label: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
};

export type AwenaScreenSnapshot = {
  title?: string;
  controls: AwenaScreenControl[];
  capturedAt: number;
};

function visible(el: Element) {
  if (!(el instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1 && rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
}

function cleanText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function excluded(el: Element) {
  return !!el.closest('[data-awena-overlay="1"], [data-ad-slot], .google-ad, iframe');
}

function pushUnique(list: AwenaScreenControl[], item: AwenaScreenControl) {
  const key = `${item.kind}|${item.label.toLowerCase()}|${String(item.value || "").toLowerCase()}`;
  if (list.some((entry) => `${entry.kind}|${entry.label.toLowerCase()}|${String(entry.value || "").toLowerCase()}` === key)) return;
  list.push(item);
}

export function captureAwenaScreenSnapshot(): AwenaScreenSnapshot | null {
  if (typeof document === "undefined" || typeof window === "undefined") return null;
  const controls: AwenaScreenControl[] = [];

  const headings = Array.from(document.querySelectorAll("h1,h2,h3,[data-awena-title]"))
    .filter((el) => visible(el) && !excluded(el))
    .slice(0, 12);
  for (const el of headings) {
    const label = cleanText((el as HTMLElement).innerText || el.textContent || "");
    if (label && label.length <= 120) pushUnique(controls, { kind: "heading", label });
  }

  const interactives = Array.from(document.querySelectorAll('button,[role="button"],input,select,textarea,label'))
    .filter((el) => visible(el) && !excluded(el))
    .slice(0, 120);

  for (const el of interactives) {
    const html = el as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const aria = cleanText(el.getAttribute("aria-label") || "");
    const title = cleanText(el.getAttribute("title") || "");
    const ownText = cleanText(html.innerText || el.textContent || "");

    if (tag === "input") {
      const input = el as HTMLInputElement;
      const type = String(input.type || "text").toLowerCase();
      if (["hidden","password"].includes(type)) continue;
      const label = aria || title || cleanText(input.placeholder || "") || cleanText(input.name || "") || "Champ";
      pushUnique(controls, {
        kind: type === "checkbox" || type === "radio" ? "choice" : "field",
        label,
        value: type === "checkbox" || type === "radio" ? undefined : cleanText(input.value || ""),
        checked: type === "checkbox" || type === "radio" ? input.checked : undefined,
        disabled: input.disabled,
      });
      continue;
    }

    if (tag === "select") {
      const select = el as HTMLSelectElement;
      const label = aria || title || cleanText(select.name || "") || "Liste";
      const selected = cleanText(select.selectedOptions?.[0]?.textContent || select.value || "");
      pushUnique(controls, { kind: "field", label, value: selected, disabled: select.disabled });
      continue;
    }

    if (tag === "textarea") {
      const textarea = el as HTMLTextAreaElement;
      const label = aria || title || cleanText(textarea.placeholder || "") || "Texte";
      pushUnique(controls, { kind: "field", label, value: cleanText(textarea.value || ""), disabled: textarea.disabled });
      continue;
    }

    const label = aria || title || ownText;
    if (!label || label.length > 120) continue;
    pushUnique(controls, { kind: tag === "label" ? "text" : "button", label, disabled: (el as HTMLButtonElement).disabled });
  }

  const title = controls.find((item) => item.kind === "heading")?.label;
  return {
    title,
    controls: controls.slice(0, 70),
    capturedAt: Date.now(),
  };
}

function norm(value: string) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function snapshotFrom(context: AwenaRuntimeContext): AwenaScreenSnapshot | null {
  const raw = context.extra?.awenaScreenSnapshot;
  if (!raw || typeof raw !== "object") return null;
  const snapshot = raw as AwenaScreenSnapshot;
  return Array.isArray(snapshot.controls) ? snapshot : null;
}

function listControls(snapshot: AwenaScreenSnapshot) {
  const buttons = snapshot.controls.filter((item) => item.kind === "button").slice(0, 18);
  const fields = snapshot.controls.filter((item) => item.kind === "field" || item.kind === "choice").slice(0, 18);

  const parts: string[] = [];
  if (fields.length) {
    parts.push(`## OPTIONS / CHAMPS VISIBLES\n${fields.map((item) => {
      const state = item.checked != null ? (item.checked ? "activé" : "désactivé") : item.value ? `valeur actuelle : ${item.value}` : "";
      return `- **${item.label}**${state ? ` — ${state}` : ""}${item.disabled ? " — indisponible" : ""}`;
    }).join("\n")}`);
  }
  if (buttons.length) {
    parts.push(`## ACTIONS VISIBLES\n${buttons.map((item) => `- **${item.label}**${item.disabled ? " — indisponible" : ""}`).join("\n")}`);
  }
  return parts.join("\n\n");
}

export function answerAwenaLiveScreenQuestion(question: string, context: AwenaRuntimeContext): AwenaReply | null {
  const q = norm(question);
  const snapshot = snapshotFrom(context);
  if (!snapshot) return null;

  const asksVisible =
    /que vois tu|qu y a t il|quoi sur cet ecran|boutons visibles|boutons ici|options visibles|options ici|champs visibles|choix disponibles|quels boutons|quelles options|quels reglages/.test(q);
  if (!asksVisible) return null;

  const detail = listControls(snapshot);
  if (!detail) {
    return { text: "Je vois l'écran actuel, mais je n'ai pas détecté de contrôle exploitable dans la zone visible." };
  }
  return {
    text: `## CE QUE JE VOIS${snapshot.title ? ` — ${snapshot.title.toUpperCase()}` : ""}\nJe me base ici sur les contrôles réellement visibles à l'écran.\n\n${detail}\n\n> Si tu me donnes le nom exact d'une option, je peux essayer de t'expliquer son rôle avec ma base de connaissances.`,
  };
}

export function visibleConfigurationAppendix(context: AwenaRuntimeContext): string {
  const snapshot = snapshotFrom(context);
  if (!snapshot) return "";
  const detail = listControls(snapshot);
  return detail ? `\n\n## CONTRÔLES VISIBLES SUR TON ÉCRAN\n${detail.replace(/^## OPTIONS \/ CHAMPS VISIBLES\n/, "")}` : "";
}
