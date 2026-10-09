import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { appliquerTheme } from "./theme";
import "./styles/index.css";

appliquerTheme(window.location.search, document.documentElement);

createRoot(document.getElementById("racine")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
