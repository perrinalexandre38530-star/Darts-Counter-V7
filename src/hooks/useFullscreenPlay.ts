import { useEffect } from "react";

export function useFullscreenPlay() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    // 🔥 Reset scroll
    window.scrollTo({ top: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // ✅ Classe fullscreen
    document.body.classList.add("dc-fullscreen-play");

    const st = document.createElement("style");
    st.setAttribute("data-dc-fullscreen-style", "1");
    st.textContent = `
      body.dc-fullscreen-play .dc-tabbar,
      body.dc-fullscreen-play .tabbar,
      body.dc-fullscreen-play .bottom-tabbar,
      body.dc-fullscreen-play .bottom-nav,
      body.dc-fullscreen-play nav[role="navigation"],
      body.dc-fullscreen-play [data-app-tabbar],
      body.dc-fullscreen-play [data-tabbar]{
        display:none !important;
        visibility:hidden !important;
        height:0 !important;
      }
    `;
    document.head.appendChild(st);

    return () => {
      document.body.classList.remove("dc-fullscreen-play");
      try {
        st.remove();
      } catch {}
    };
  }, []);
}
