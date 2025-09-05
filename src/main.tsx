import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Analytics from "./Analytics";
import Dashboard from "./Dashboard";
import AuditLog from "./AuditLog";
import "./styles/responsive.css";
import "./styles/ui-sanity.css";
import "./styles/color-map.css";
import "./styles/vacancies-redesign.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/audit-log" element={<AuditLog />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
