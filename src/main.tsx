import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import AnalyticsPage from "./Analytics";
import Dashboard from "./Dashboard";
import AuditLog from "./AuditLog";
import { ThemeProvider, Theme } from "./theme";
import { loadLocalSnapshot } from "./utils/persistence";
import { Analytics } from "./components/Analytics";
import "./styles/theme.css";
import "./styles/responsive.css";
import "./styles/ui-sanity.css";
import "./styles/color-map.css";
import "./styles/vacancies-redesign.css";
import "./styles/shared-ui.css";
import "./styles/search-filter-bar.css";

const initialTheme: Theme = (() => {
  if (typeof window === "undefined") return "light";
  const stored = loadLocalSnapshot<Theme>("theme");
  if (stored === "light" || stored === "dark") {
    document.documentElement.setAttribute("data-theme", stored);
    return stored;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = prefersDark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  return theme;
})();

const token = import.meta.env.VITE_CLOUDFLARE_ANALYTICS_TOKEN;
const isPreview = (import.meta.env.VITE_IS_PREVIEW ?? "").toLowerCase() === "true";
const isProduction = import.meta.env.MODE === "production";
const shouldLoadAnalytics = Boolean(isProduction && !isPreview && token);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider initialTheme={initialTheme}>
      {shouldLoadAnalytics && <Analytics token={token} />}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/audit-log" element={<AuditLog />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
