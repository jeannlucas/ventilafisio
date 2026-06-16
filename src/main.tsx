import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { HospitalProvider } from "./lib/hospital";
import App from "./App";
import { T, font } from "./lib/theme";

// Estilos globais mínimos
const style = document.createElement("style");
style.textContent = `
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  #root { margin: 0; min-height: 100%; display: flex; flex-direction: column; }
  body { background: ${T.bg}; font-family: ${font}; -webkit-font-smoothing: antialiased; }
  a { color: ${T.accent}; }
  input::placeholder { color: ${T.dim}; }
  .vf-row { display: grid; gap: 12px; grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr)); }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
  @media (max-width: 560px) {
    .vf-row { grid-template-columns: 1fr !important; }
    main { padding-left: 14px !important; padding-right: 14px !important; }
    button, select, input, textarea { min-height: 44px; }
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <HospitalProvider>
          <App />
        </HospitalProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
