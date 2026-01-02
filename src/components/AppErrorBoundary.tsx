// ============================================
// src/components/AppErrorBoundary.tsx
// Catch global React errors + JS errors
// Affiche un écran d'erreur lisible sur mobile
// ============================================

import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
  stack?: string;
};

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    message: undefined,
    stack: undefined,
  };

  componentDidCatch(error: any, info: React.ErrorInfo) {
    console.error("[AppErrorBoundary] React error:", error, info);

    this.setState({
      hasError: true,
      message: error?.message || "Erreur inconnue",
      stack: (error?.stack || "") + "\n\n" + (info?.componentStack || ""),
    });
  }

  componentDidMount() {
    // Erreurs JS globales
    window.addEventListener("error", this.handleWindowError as any);
    // Promesses non gérées
    window.addEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection as any
    );
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleWindowError as any);
    window.removeEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection as any
    );
  }

  handleWindowError = (event: ErrorEvent) => {
    console.error("[AppErrorBoundary] window error:", event.error || event);
    this.setState({
      hasError: true,
      message:
        event?.error?.message ||
        event?.message ||
        "Erreur JavaScript globale",
      stack: event?.error?.stack || "",
    });
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason: any = event?.reason;
    console.error("[AppErrorBoundary] unhandled rejection:", reason);
    this.setState({
      hasError: true,
      message:
        reason?.message ||
        (typeof reason === "string" ? reason : "Erreur de promesse"),
      stack: reason?.stack || "",
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleClear = () => {
    this.setState({ hasError: false, message: undefined, stack: undefined });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const msg = this.state.message || "Erreur";

    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 16,
          background: "#000",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          boxSizing: "border-box",
        }}
      >
        <h1
          style={{
            fontSize: 20,
            marginBottom: 8,
            color: "#ff6b6b",
          }}
        >
          ⚠️ Crash détecté
        </h1>
        <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 10 }}>
          Fais une capture d'écran de cette page et envoie-la-moi dans ChatGPT.
        </p>

        <div
          style={{
            marginBottom: 10,
            padding: 8,
            borderRadius: 8,
            background: "#1c1c1c",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 4,
              color: "#ffd166",
            }}
          >
            Message
          </div>
          <div style={{ fontSize: 12 }}>{msg}</div>
        </div>

        {this.state.stack ? (
          <div
            style={{
              marginBottom: 12,
              padding: 8,
              borderRadius: 8,
              background: "#111",
              border: "1px solid rgba(255,255,255,0.12)",
              maxHeight: "45vh",
              overflow: "auto",
              fontSize: 11,
              whiteSpace: "pre-wrap",
            }}
          >
            {this.state.stack}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-start",
            marginTop: 8,
          }}
        >
          <button
            onClick={this.handleReload}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 999,
              border: "none",
              background:
                "linear-gradient(135deg, #ffc63a 0%, #ff8f00 50%, #ff4a4a 100%)",
              color: "#000",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            🔄 Recharger l'application
          </button>
          <button
            onClick={this.handleClear}
            style={{
              padding: 10,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.3)",
              background: "transparent",
              color: "#fff",
              fontSize: 12,
            }}
          >
            Masquer l'erreur
          </button>
        </div>
      </div>
    );
  }
}