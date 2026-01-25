import * as React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useLang } from "../contexts/LangContext";

export default function ModeNotReady(props: { go?: (t: any, p?: any) => void; params?: any }) {
  const { t } = useLang();

  const title = props?.params?.title || t("modeNotReady.title", "Bientôt disponible");
  const body =
    props?.params?.body ||
    t(
      "modeNotReady.body",
      "Ce mode de jeu est listé dans l'application, mais il n'est pas encore implémenté. Reviens bientôt."
    );

  const infoTitle = t("modeNotReady.infoTitle", "Mode en développement");
  const infoBody = t(
    "modeNotReady.infoBody",
    "Astuce : tu peux déjà tester les autres modes disponibles. Ce mode sera activé dès que la logique de score et l'écran de jeu seront prêts."
  );

  return (
    <div className="page">
      <PageHeader
        title={title}
        left={<BackDot onClick={() => (props?.go ? props.go("games") : window.history.back())} />}
        right={<InfoDot title={infoTitle} text={infoBody} />}
        subtitle={t("modeNotReady.subtitle", "À venir")}
      />

      <div style={{ padding: 16 }}>
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 16,
            padding: 14,
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>{t("modeNotReady.cardTitle", "Work in progress")}</div>
          <div style={{ opacity: 0.92, lineHeight: 1.35 }}>{body}</div>
        </div>

        <button
          className="btn-primary"
          style={{ width: "100%", marginTop: 14 }}
          onClick={() => (props?.go ? props.go("games") : window.history.back())}
        >
          {t("modeNotReady.back", "Retour aux modes")}
        </button>
      </div>
    </div>
  );
}
