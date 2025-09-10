import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Analytics from "./Analytics";
import Dashboard from "./Dashboard";
import AuditLog from "./AuditLog";
import { ThemeProvider, Theme } from "./theme";
import "./styles/theme.css";
import "./styles/responsive.css";
import "./styles/ui-sanity.css";
import "./styles/color-map.css";
import "./styles/vacancies-redesign.css";

const initialTheme: Theme = (() => {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    document.documentElement.setAttribute("data-theme", stored);
    return stored;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = prefersDark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  return theme;
})();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider initialTheme={initialTheme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/audit-log" element={<AuditLog />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
