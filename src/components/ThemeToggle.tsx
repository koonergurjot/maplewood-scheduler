
import React from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      return (document.documentElement.getAttribute("data-theme") as any) ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light");
    }
    return "light";
  });

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

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
