import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Analytics from "./Analytics";
import Agreement from "./Agreement";
import "./styles/responsive.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/agreement" element={<Agreement />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
