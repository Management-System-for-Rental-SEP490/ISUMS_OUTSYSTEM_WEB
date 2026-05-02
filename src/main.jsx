import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// Side-effect import — sets up i18next + resolves initial language from the
// ?lang= query param in the magic-link URL (BE email passes the contract's
// agreed language so the tenant sees the correct locale on first load).
import "./i18n";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
