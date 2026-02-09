import { useEffect } from "react";

type Props = {
  type: "success" | "error";
  message: string;
  onClose: () => void;
};

export function SaveToast({ type, message, onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: type === "success" ? "#1f8f4a" : "#a83232",
        color: "white",
        padding: "12px 20px",
        borderRadius: 10,
        zIndex: 9999,
        boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
        fontWeight: 600,
      }}
    >
      {message}
    </div>
  );
}
