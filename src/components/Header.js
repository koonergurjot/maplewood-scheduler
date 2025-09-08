import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
const NavLink = ({ to, label, current, icon }) => {
    return (_jsxs(Link, { className: "navlink", "aria-current": current ? "page" : undefined, to: to, children: [icon, _jsx("span", { children: label })] }));
};
export default function Header({ current }) {
    const headerRef = useRef(null);
    useEffect(() => {
        if (headerRef.current) {
            document.documentElement.style.setProperty("--header-height", `${headerRef.current.offsetHeight}px`);
        }
    }, []);
    return (_jsxs("header", { ref: headerRef, className: "topnav", role: "banner", children: [_jsxs("div", { className: "brand", children: [_jsx("img", { src: "/maplewood-logo.svg", alt: "" }), _jsx("div", { children: "Maplewood Scheduler" })] }), _jsxs("nav", { className: "navlinks", "aria-label": "Primary", children: [_jsx(NavLink, { to: "/dashboard", label: "Dashboard", current: current === "Dashboard", icon: _jsx(DashboardIcon, {}) }), _jsx(NavLink, { to: "/calendar", label: "Calendar", current: current === "Calendar", icon: _jsx(CalendarIcon, {}) }), _jsx(NavLink, { to: "/shifts", label: "Shifts", current: current === "Shifts", icon: _jsx(ShiftIcon, {}) }), _jsx(NavLink, { to: "/audit-log", label: "Audit Log", current: current === "Audit", icon: _jsx(AuditIcon, {}) })] }), _jsx("div", { className: "right", children: _jsx(ThemeToggle, {}) })] }));
}
const DashboardIcon = () => (_jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: _jsx("path", { d: "M3 3h8v8H3V3Zm10 0h8v5h-8V3ZM3 13h8v8H3v-8Zm10 7v-9h8v9h-8Z", stroke: "currentColor", strokeWidth: "2" }) }));
const CalendarIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", stroke: "currentColor", strokeWidth: "2" }), _jsx("path", { d: "M8 2v4M16 2v4M3 10h18", stroke: "currentColor", strokeWidth: "2" })] }));
const ShiftIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [_jsx("path", { d: "M12 6v6l4 2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }), _jsx("circle", { cx: "12", cy: "12", r: "9", stroke: "currentColor", strokeWidth: "2" })] }));
const AuditIcon = () => (_jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: _jsx("path", { d: "M4 5h16M4 12h16M4 19h16", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }) }));
