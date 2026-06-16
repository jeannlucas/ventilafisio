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
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
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
