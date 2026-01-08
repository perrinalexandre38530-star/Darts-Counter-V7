// src/lib/vision/opencv.ts
// Loader OpenCV.js (CDN) + cache singleton.
// Objectif: disposer de window.cv prêt, sans double-load.

declare global {
  interface Window {
    cv?: any;
  }
}

let _promise: Promise<any> | null = null;

export async function loadOpenCv(): Promise<any> {
  if (typeof window === "undefined") throw new Error("OpenCV: window absent");
  if (window.cv) return window.cv;
  if (_promise) return _promise;

  _promise = new Promise((resolve, reject) => {
    const existing = document.getElementById("opencvjs") as HTMLScriptElement | null;
    if (existing) {
      // si déjà injecté, on attend qu’il devienne prêt
      const check = () => {
        if (window.cv && window.cv.Mat) return resolve(window.cv);
        setTimeout(check, 50);
      };
      check();
      return;
    }

    const script = document.createElement("script");
    script.id = "opencvjs";
    script.async = true;

    // ✅ CDN OpenCV.js (WASM)
    // Tu peux remplacer par un self-host plus tard.
    script.src = "https://docs.opencv.org/4.x/opencv.js";

    script.onload = () => {
      // OpenCV déclenche souvent onRuntimeInitialized
      const cv = window.cv;
      if (!cv) return reject(new Error("OpenCV chargé mais window.cv absent"));

      if (cv.Mat) return resolve(cv);

      cv.onRuntimeInitialized = () => {
        try {
          resolve(window.cv);
        } catch (e) {
          reject(e);
        }
      };

      // fallback si onRuntimeInitialized n’est pas appelé
      const check = () => {
        if (window.cv && window.cv.Mat) return resolve(window.cv);
        setTimeout(check, 50);
      };
      check();
    };

    script.onerror = () => reject(new Error("Impossible de charger OpenCV (script error)"));
    document.head.appendChild(script);
  });

  return _promise;
}
