import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
export default function ThemeToggle() {
    const [theme, setTheme] = React.useState(() => {
        if (typeof document !== "undefined") {
            return document.documentElement.getAttribute("data-theme") ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light");
        }
        return "light";
    });
    React.useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);
    return (_jsxs("label", { className: "theme-toggle", title: "Toggle theme", children: [_jsx("input", { type: "checkbox", checked: theme === "dark", onChange: (e) => setTheme(e.target.checked ? "dark" : "light") }), theme === "dark" ? "Dark" : "Light", " mode"] }));
}
