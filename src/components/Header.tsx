
import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

type HeaderProps = {
  current?: string;
};

const NavLink: React.FC<{ to: string; label: string; current?: boolean; icon?: React.ReactNode }> = ({ to, label, current, icon }) => {
  return (
    <Link className="navlink" aria-current={current ? "page" : undefined} to={to}>
      {icon}
      <span>{label}</span>
    </Link>
  );
};

export default function Header({ current }: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (headerRef.current) {
      document.documentElement.style.setProperty(
        "--header-height",
        `${headerRef.current.offsetHeight}px`
      );
    }
  }, []);

  return (
    <header ref={headerRef} className="topnav" role="banner">
      <div className="brand">
        <img src="/maplewood-logo.svg" alt="" />
        <div>Maplewood Scheduler</div>
      </div>
      <nav className="navlinks" aria-label="Primary">
        <NavLink to="/dashboard" label="Dashboard" current={current === "Dashboard"} icon={<DashboardIcon />} />
        <NavLink to="/calendar" label="Calendar" current={current === "Calendar"} icon={<CalendarIcon />} />
        <NavLink to="/shifts" label="Shifts" current={current === "Shifts"} icon={<ShiftIcon />} />
        <NavLink to="/audit-log" label="Audit Log" current={current === "Audit"} icon={<AuditIcon />} />
      </nav>
      <div className="right">
        <ThemeToggle />
      </div>
    </header>
  );
}

const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 3h8v8H3V3Zm10 0h8v5h-8V3ZM3 13h8v8H3v-8Zm10 7v-9h8v9h-8Z" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const ShiftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const AuditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 5h16M4 12h16M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
