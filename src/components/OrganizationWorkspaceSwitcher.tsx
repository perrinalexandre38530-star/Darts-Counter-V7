import React from "react";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import ResilientUserImage from "./ResilientUserImage";
import { onlineAvatarMediaKey } from "../lib/userMediaFallback";
import { useFloatingCornerAvoidance } from "./useFloatingCornerAvoidance";
import {
  listMyOrganizations,
  listOrganizationGroups,
  loadOrganizationLocalState,
  setActiveOrganization,
  type OrganizationRecord,
} from "../organizations/organizationService";
import {
  ORGANIZATION_WORKSPACE_EVENT,
  enterOrganizationWorkspace,
  enterPersonalWorkspace,
  loadOrganizationWorkspace,
  type OrganizationWorkspace,
} from "../organizations/organizationWorkspace";

export default function OrganizationWorkspaceSwitcher({
  go,
  currentTab,
}: {
  go?: (tab: any, params?: any) => void;
  currentTab?: string;
}) {
  const auth = useAuthOnline() as any;
  const { theme } = useTheme();
  const { lang } = useLang();
  const userId = String(auth?.userId || auth?.user?.id || "") || null;
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const [organizations, setOrganizations] = React.useState<OrganizationRecord[]>(() => loadOrganizationLocalState(userId).organizations);
  const [workspace, setWorkspace] = React.useState<OrganizationWorkspace>(() => loadOrganizationWorkspace(userId));
  const [open, setOpen] = React.useState(false);
  const floating = useFloatingCornerAvoidance({ side: "left", size: 54, baseInset: 8, baseTop: 8, collisionKey: currentTab });

  const refresh = React.useCallback(async () => {
    const result = await listMyOrganizations(userId);
    setOrganizations(result.organizations);
    const current = loadOrganizationWorkspace(userId);
    if (current.kind === "organization" && !result.organizations.some((org) => org.id === current.organizationId)) {
      enterPersonalWorkspace(userId);
      setWorkspace({ kind: "personal" });
      return;
    }
    setWorkspace(current);
    // Les groupes d'organisation deviennent des vues liées dans Teams côté PERSO.
    // Cette synchro reste différée pour ne pas ralentir le montage/navigation Android.
    const syncTeams = () => { void Promise.allSettled(result.organizations.map((org) => listOrganizationGroups(userId, org.id))); };
    const idle = (window as any).requestIdleCallback;
    if (typeof idle === "function") idle(syncTeams, { timeout: 1800 });
    else window.setTimeout(syncTeams, 650);
  }, [userId]);

  React.useEffect(() => { void refresh(); }, [refresh]);
  React.useEffect(() => {
    const onWorkspace = (event: Event) => {
      const detail = (event as CustomEvent<OrganizationWorkspace>)?.detail;
      setWorkspace(detail?.kind ? detail : loadOrganizationWorkspace(userId));
      void refresh();
    };
    window.addEventListener(ORGANIZATION_WORKSPACE_EVENT, onWorkspace as EventListener);
    return () => window.removeEventListener(ORGANIZATION_WORKSPACE_EVENT, onWorkspace as EventListener);
  }, [refresh, userId]);

  if (!organizations.length) return null;

  const active = workspace.kind === "organization"
    ? organizations.find((org) => org.id === workspace.organizationId) || null
    : null;

  const userLabel = String(
    auth?.profile?.displayName ||
    auth?.profile?.nickname ||
    auth?.user?.user_metadata?.full_name ||
    auth?.user?.user_metadata?.name ||
    auth?.user?.email?.split?.("@")?.[0] ||
    L("Mon compte", "My account", "Mi cuenta")
  ).trim();
  const userInitials = userLabel.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase() || "ME";
  const avatarPrimary = String(
    auth?.profile?.avatarUrl ||
    auth?.user?.user_metadata?.avatar_url ||
    auth?.user?.user_metadata?.picture ||
    ""
  ).trim();
  const activeBadge = active ? String(active.profile?.acronym || active.name.slice(0, 2)).toUpperCase().slice(0, 3) : "ME";
  const activeLabel = active?.name || L("Espace personnel", "Personal space", "Espacio personal");

  const choosePersonal = () => {
    enterPersonalWorkspace(userId);
    setActiveOrganization(userId, null);
    setWorkspace({ kind: "personal" });
    setOpen(false);
    go?.("home", { workspaceKind: "personal" });
  };
  const chooseOrganization = (org: OrganizationRecord) => {
    setActiveOrganization(userId, org.id);
    enterOrganizationWorkspace(userId, org.id);
    setWorkspace({ kind: "organization", organizationId: org.id });
    setOpen(false);
    go?.("organization_home", { organizationId: org.id, workspaceMode: true });
  };

  const avatarFallback = (
    <span style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: theme.primary, fontSize: 13, fontWeight: 1000, background: "rgba(5,9,16,.96)" }}>
      {userInitials}
    </span>
  );

  return (
    <>
      <button
        ref={floating.ref as any}
        data-mss-floating-control="workspace-switch"
        type="button"
        aria-label={`${L("Changer d’espace", "Switch workspace", "Cambiar espacio")} · ${activeLabel}`}
        title={`${activeLabel} · ${L("Changer d’espace", "Switch workspace", "Cambiar espacio")}`}
        onClick={() => setOpen((value) => !value)}
        style={{
          position: "fixed",
          top: `calc(env(safe-area-inset-top, 0px) + ${floating.top}px)`,
          left: `calc(env(safe-area-inset-left, 0px) + ${floating.inset}px)`,
          zIndex: 88,
          width: 54,
          height: 54,
          padding: 2,
          borderRadius: 999,
          border: `1px solid ${active ? theme.primary : theme.borderSoft}`,
          background: "rgba(5,9,16,.9)",
          color: theme.text,
          boxShadow: `0 0 0 2px rgba(0,0,0,.32), 0 0 12px ${active ? theme.primary : "rgba(255,255,255,.15)"}55, 0 10px 24px rgba(0,0,0,.55)`,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          overflow: "visible",
        }}
      >
        <span style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", display: "block", background: "#050914" }}>
          <ResilientUserImage
            mediaKey={onlineAvatarMediaKey(userId || "account")}
            kind="online_avatar"
            primarySrc={avatarPrimary}
            mirrorR2={false}
            fallbackNode={avatarFallback}
            alt=""
            aria-hidden="true"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </span>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: -4,
            bottom: -3,
            minWidth: 20,
            height: 20,
            padding: "0 4px",
            borderRadius: 999,
            border: `2px solid rgba(5,9,16,.96)`,
            background: active ? theme.primary : "#142033",
            color: active ? "#061014" : theme.text,
            display: "grid",
            placeItems: "center",
            fontSize: 7.5,
            lineHeight: 1,
            fontWeight: 1000,
            boxShadow: "0 4px 10px rgba(0,0,0,.5)",
          }}
        >
          {activeBadge}
        </span>
      </button>

      {open ? <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 93, background: "rgba(0,0,0,.38)", backdropFilter: "blur(2px)" }} /> : null}
      {open ? (
        <div
          style={{
            position: "fixed",
            top: `calc(env(safe-area-inset-top, 0px) + ${floating.top + 62}px)`,
            left: "max(8px, env(safe-area-inset-left, 0px))",
            zIndex: 94,
            width: "min(92vw, 430px)",
            maxHeight: `calc(100dvh - ${floating.top + 82}px - env(safe-area-inset-bottom, 0px))`,
            overflowY: "auto",
            borderRadius: 18,
            border: `1px solid ${theme.borderSoft}`,
            background: "rgba(6,10,18,.985)",
            boxShadow: "0 22px 54px rgba(0,0,0,.66)",
            padding: 9,
          }}
        >
          <div style={{ padding: "5px 8px 8px", color: theme.textSoft, fontSize: 8, fontWeight: 1000, letterSpacing: 1 }}>
            {L("MES ESPACES MULTISPORTS SCORING", "MY MULTISPORTS SCORING SPACES", "MIS ESPACIOS MULTISPORTS SCORING")}
          </div>
          <button type="button" onClick={choosePersonal} style={{ width: "100%", minHeight: 54, borderRadius: 12, border: `1px solid ${workspace.kind === "personal" ? theme.primary : theme.borderSoft}`, background: workspace.kind === "personal" ? `${theme.primary}12` : "rgba(255,255,255,.025)", color: theme.text, padding: "8px 10px", textAlign: "left", display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 9, alignItems: "center", cursor: "pointer" }}>
            <span style={{ width: 38, height: 38, borderRadius: 999, overflow: "hidden", border: `1px solid ${theme.borderSoft}`, display: "grid", placeItems: "center" }}>
              <ResilientUserImage mediaKey={onlineAvatarMediaKey(userId || "account")} kind="online_avatar" primarySrc={avatarPrimary} mirrorR2={false} fallbackNode={avatarFallback} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </span>
            <span><strong style={{ display: "block", fontSize: 11 }}>{userLabel}</strong><small style={{ color: theme.textSoft, fontSize: 8.5 }}>{L("Espace personnel · profils, équipes, parties et statistiques", "Personal space · profiles, teams, games and statistics", "Espacio personal · perfiles, equipos, partidas y estadísticas")}</small></span>
            {workspace.kind === "personal" ? <span style={{ color: theme.primary }}>✓</span> : null}
          </button>
          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
            {organizations.map((org) => {
              const selected = workspace.kind === "organization" && workspace.organizationId === org.id;
              return (
                <button key={org.id} type="button" onClick={() => chooseOrganization(org)} style={{ width: "100%", minHeight: 52, borderRadius: 12, border: `1px solid ${selected ? theme.primary : theme.borderSoft}`, background: selected ? `${theme.primary}12` : "rgba(255,255,255,.025)", color: theme.text, padding: "8px 10px", textAlign: "left", display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 9, alignItems: "center", cursor: "pointer" }}>
                  <span style={{ width: 38, height: 38, borderRadius: 999, border: `1px solid ${theme.primary}55`, color: theme.primary, display: "grid", placeItems: "center", fontSize: 9, fontWeight: 1000 }}>{(org.profile?.acronym || org.name.slice(0, 2)).toUpperCase()}</span>
                  <span style={{ minWidth: 0 }}><strong style={{ display: "block", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.name}</strong><small style={{ color: theme.textSoft, fontSize: 8.5 }}>{org.kind.toUpperCase()} · {org.role.toUpperCase()}</small></span>
                  {selected ? <span style={{ color: theme.primary }}>✓</span> : null}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => { setOpen(false); go?.("organizations", { fromWorkspace: true }); }} style={{ width: "100%", marginTop: 7, minHeight: 38, borderRadius: 11, border: `1px dashed ${theme.borderSoft}`, background: "transparent", color: theme.primary, fontWeight: 900, fontSize: 9, cursor: "pointer" }}>+ {L("GÉRER / AJOUTER UNE ORGANISATION", "MANAGE / ADD AN ORGANIZATION", "GESTIONAR / AÑADIR UNA ORGANIZACIÓN")}</button>
        </div>
      ) : null}
    </>
  );
}
