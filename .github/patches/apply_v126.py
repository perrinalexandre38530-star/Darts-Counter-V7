from pathlib import Path

path = Path("src/pages/Settings.tsx")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"V126 patch failed at {label}: expected 1 occurrence, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    'import StatsSystemDiagnosticsPanel from "../components/stats/StatsSystemDiagnosticsPanel";\n',
    'import StatsSystemDiagnosticsPanel from "../components/stats/StatsSystemDiagnosticsPanel";\nimport BackupDiagnosticsPanel from "../components/settings/BackupDiagnosticsPanel";\n',
    "diagnostics import",
)

replace_once(
    '    const [diagnosticView, setDiagnosticView] = React.useState<"menu" | "account" | "stats" | "profile" | "freeze" | "runtime">("menu");',
    '    const [diagnosticView, setDiagnosticView] = React.useState<"menu" | "account" | "stats" | "backups" | "profile" | "freeze" | "runtime">("menu");',
    "diagnostic view union",
)

replace_once(
    '      id: "account" | "stats" | "profile" | "freeze" | "runtime";',
    '      id: "account" | "stats" | "backups" | "profile" | "freeze" | "runtime";',
    "diagnostic card union",
)

replace_once(
'''      {
        id: "stats", icon: "📊", title: "Statistiques",
        subtitle: "Pipeline complet : History → X01 → identité joueur → index → cache → Centre Stats.",
        accent: "#ffd36a",
        badge: lastStatsDiag?.summary ? `${lastStatsDiag.summary.ok || 0} OK · ${lastStatsDiag.summary.fail || 0} échec` : "V124 · PIPELINE STATS",
      },
      {
        id: "profile", icon: "👤", title: "Profil / Avatar",''',
'''      {
        id: "stats", icon: "📊", title: "Statistiques",
        subtitle: "History → X01 → joueur → index → cache → Centre Stats.",
        accent: "#ffd36a",
        badge: lastStatsDiag?.summary ? `${lastStatsDiag.summary.ok || 0} OK · ${lastStatsDiag.summary.fail || 0} échec` : "V124 · PIPELINE STATS",
      },
      {
        id: "backups", icon: "💾", title: "Sauvegardes / restaurations",
        subtitle: "NAS, Google Drive, R2, mémoire locale, SD / fichier et mode incrémental.",
        accent: "#67e8f9",
        badge: "BACKUP / RESTORE",
      },
      {
        id: "profile", icon: "👤", title: "Profil / Avatar",''',
    "backup card",
)

replace_once(
    '          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>',
    '          <div style={{ display: "grid", gap: 7 }}>',
    "diagnostic menu grid",
)

replace_once(
'''                style={{
                  minWidth: 0, minHeight: 156, textAlign: "left", cursor: "pointer", color: theme.text,
                  borderRadius: 18, border: `1px solid ${card.accent}35`,
                  padding: 13, position: "relative", overflow: "hidden",
                  background: `radial-gradient(circle at 92% 8%, ${card.accent}1e, transparent 38%), rgba(255,255,255,.025)`,
                  boxShadow: "0 10px 26px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.035)",
                }}''',
'''                style={{
                  width: "100%", minWidth: 0, minHeight: 70, textAlign: "left", cursor: "pointer", color: theme.text,
                  borderRadius: 12, border: `1px solid ${theme.borderSoft}`,
                  padding: "9px 10px", overflow: "hidden",
                  background: "rgba(0,0,0,.22)",
                  display: "flex", alignItems: "center", gap: 10,
                }}''',
    "simple diagnostic card style",
)

replace_once(
'''                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, display: "grid", placeItems: "center", fontSize: 21, background: `${card.accent}12`, border: `1px solid ${card.accent}35` }}>{card.icon}</div>
                  <span style={{ borderRadius: 999, padding: "4px 7px", border: `1px solid ${card.accent}35`, background: `${card.accent}0d`, color: card.accent, fontSize: 8.5, fontWeight: 1000, letterSpacing: .35, whiteSpace: "nowrap" }}>{card.badge}</span>
                </div>
                <div style={{ marginTop: 11, fontSize: 13.5, fontWeight: 1000, color: theme.text }}>{card.title}</div>
                <div style={{ marginTop: 5, color: theme.textSoft, fontSize: 10.5, lineHeight: 1.42 }}>{card.subtitle}</div>
                <div style={{ marginTop: 10, color: card.accent, fontSize: 9.5, fontWeight: 950 }}>OUVRIR LE DIAGNOSTIC →</div>''',
'''                <div style={{ width: 34, height: 34, flex: "0 0 auto", borderRadius: 9, display: "grid", placeItems: "center", fontSize: 18, background: "rgba(255,255,255,.04)", color: card.accent }}>{card.icon}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 950, color: theme.text }}>{card.title}</div>
                  <div style={{ marginTop: 2, color: theme.textSoft, fontSize: 9.8, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{card.subtitle}</div>
                </div>
                <div style={{ flex: "0 0 auto", color: theme.textSoft, fontSize: 20, lineHeight: 1 }}>›</div>''',
    "simple diagnostic card content",
)

replace_once(
'''        {diagnosticView === "stats" ? (
          <StatsSystemDiagnosticsPanel
            profileId={diagnosticProfileId}
            profileName={diagnosticProfileName}
            uiSnapshot={statsUiSnapshot}
            embedded
          />
        ) : null}

        {diagnosticView === "profile" ? (''',
'''        {diagnosticView === "stats" ? (
          <StatsSystemDiagnosticsPanel
            profileId={diagnosticProfileId}
            profileName={diagnosticProfileName}
            uiSnapshot={statsUiSnapshot}
            embedded
          />
        ) : null}

        {diagnosticView === "backups" ? <BackupDiagnosticsPanel theme={theme} /> : null}

        {diagnosticView === "profile" ? (''',
    "backup diagnostics render",
)

# V126: the selector itself stays intentionally plain. Status chips live inside each
# diagnostic so this screen remains readable on a narrow phone.
path.write_text(text, encoding="utf-8")
print("V126 Settings patch applied")
