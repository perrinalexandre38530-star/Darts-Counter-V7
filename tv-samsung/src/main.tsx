import * as React from "react";
import { createRoot } from "react-dom/client";
import SamsungTvApp from "../../src/tv/samsung/SamsungTvApp";
import "../../src/tv/samsung/samsung-tv.css";

const root = document.getElementById("root");
if (!root) throw new Error("Samsung TV root element missing");

createRoot(root).render(
  <React.StrictMode>
    <SamsungTvApp />
  </React.StrictMode>
);
