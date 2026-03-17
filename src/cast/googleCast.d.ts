export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "google-cast-launcher": any;
    }
  }

  interface Window {
    __onGCastApiAvailable?: (available: boolean) => void;
    cast?: any;
    chrome?: any;
  }
}
