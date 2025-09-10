import React from "react";
import { useTheme } from "../theme";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <label className="theme-toggle" title="Toggle theme">
      <input
        type="checkbox"
        checked={theme === "dark"}
        onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
      />
      {theme === "dark" ? "Dark" : "Light"} mode
    </label>
  );
}
