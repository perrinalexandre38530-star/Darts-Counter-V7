import React from "react";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
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
    // On diffère cette synchro pour ne jamais ralentir le montage/navigation Android.
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
    return () => {
      window.removeEventListener(ORGANIZATION_WORKSPACE_EVENT, onWorkspace as EventListener);
    };
  }, [refresh, userId]);

  if (!organizations.length) return null;

  const active = workspace.kind === "organization"
    ? organizations.find((org) => org.id === workspace.organizationId) || null
    : null;
  const label = active?.profile?.acronym || active?.name || L("PERSO", "PERSONAL", "PERSONAL");
  const initial = active ? (active.profile?.acronym || active.name.slice(0, 2)).toUpperCase() : "ME";
  const top = /play|camera|viewer|cast_room/i.test(String(currentTab || "")) ? 8 : 10;

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

  return (
    <>
      <button
        type="button"
        aria-label={L("Changer d’espace", "Switch workspace", "Cambiar espacio")}
        onClick={() => setOpen((value) => !value)}
        style={{
          position: "fixed", top, left: "50%", transform: "translateX(-50%)", zIndex: 92,
          maxWidth: "min(72vw, 380px)", height: 38, borderRadius: 999,
          border: `1px solid ${active ? theme.primary : theme.borderSoft}`,
          background: "rgba(5,9,16,.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          color: theme.text, boxShadow: `0 9px 24px rgba(0,0,0,.42), 0 0 14px ${active ? theme.primary : "transparent"}22`,
          padding: "4px 11px 4px 5px", display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
        }}
      >
        <span style={{ width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${active ? theme.primary : theme.borderSoft}`, color: active ? theme.primary : theme.textSoft, fontSize: 9, fontWeight: 1000, flex: "0 0 auto" }}>{initial}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10.5, fontWeight: 1000 }}>{active ? label : L("ESPACE PERSO", "PERSONAL SPACE", "ESPACIO PERSONAL")}</span>
        <span style={{ color: theme.primary, fontSize: 10 }}>⌄</span>
      </button>

      {open ? <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 93, background: "rgba(0,0,0,.42)", backdropFilter: "blur(2px)" }} /> : null}
      {open ? (
        <div style={{ position: "fixed", top: 56, left: "50%", transform: "translateX(-50%)", zIndex: 94, width: "min(92vw, 430px)", borderRadius: 18, border: `1px solid ${theme.borderSoft}`, background: "rgba(6,10,18,.98)", boxShadow: "0 22px 54px rgba(0,0,0,.66)", padding: 9 }}>
          <div style={{ padding: "5px 8px 8px", color: theme.textSoft, fontSize: 8, fontWeight: 1000, letterSpacing: 1 }}>{L("MES ESPACES MULTISPORTS SCORING", "MY MULTISPORTS SCORING SPACES", "MIS ESPACIOS MULTISPORTS SCORING")}</div>
          <button type="button" onClick={choosePersonal} style={{ width: "100%", minHeight: 50, borderRadius: 12, border: `1px solid ${workspace.kind === "personal" ? theme.primary : theme.borderSoft}`, background: workspace.kind === "personal" ? `${theme.primary}12` : "rgba(255,255,255,.025)", color: theme.text, padding: "8px 10px", textAlign: "left", display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 9, alignItems: "center", cursor: "pointer" }}>
            <span style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${theme.borderSoft}`, display: "grid", placeItems: "center" }}>👤</span>
            <span><strong style={{ display: "block", fontSize: 11 }}>{L("Espace personnel", "Personal space", "Espacio personal")}</strong><small style={{ color: theme.textSoft, fontSize: 8.5 }}>{L("Mes profils, équipes, parties et statistiques", "My profiles, teams, games and statistics", "Mis perfiles, equipos, partidas y estadísticas")}</small></span>
            {workspace.kind === "personal" ? <span style={{ color: theme.primary }}>✓</span> : null}
          </button>
          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
            {organizations.map((org) => {
              const selected = workspace.kind === "organization" && workspace.organizationId === org.id;
              return <button key={org.id} type="button" onClick={() => chooseOrganization(org)} style={{ width: "100%", minHeight: 50, borderRadius: 12, border: `1px solid ${selected ? theme.primary : theme.borderSoft}`, background: selected ? `${theme.primary}12` : "rgba(255,255,255,.025)", color: theme.text, padding: "8px 10px", textAlign: "left", display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 9, alignItems: "center", cursor: "pointer" }}>
                <span style={{ width: 34, height: 34, borderRadius: 11, border: `1px solid ${theme.primary}55`, color: theme.primary, display: "grid", placeItems: "center", fontSize: 9, fontWeight: 1000 }}>{(org.profile?.acronym || org.name.slice(0, 2)).toUpperCase()}</span>
                <span style={{ minWidth: 0 }}><strong style={{ display: "block", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.name}</strong><small style={{ color: theme.textSoft, fontSize: 8.5 }}>{org.kind.toUpperCase()} · {org.role.toUpperCase()}</small></span>
                {selected ? <span style={{ color: theme.primary }}>✓</span> : null}
              </button>;
            })}
          </div>
          <button type="button" onClick={() => { setOpen(false); go?.("organizations", { fromWorkspace: true }); }} style={{ width: "100%", marginTop: 7, minHeight: 38, borderRadius: 11, border: `1px dashed ${theme.borderSoft}`, background: "transparent", color: theme.primary, fontWeight: 900, fontSize: 9, cursor: "pointer" }}>+ {L("GÉRER / AJOUTER UNE ORGANISATION", "MANAGE / ADD AN ORGANIZATION", "GESTIONAR / AÑADIR UNA ORGANIZACIÓN")}</button>
        </div>
      ) : null}
    </>
  );
}
