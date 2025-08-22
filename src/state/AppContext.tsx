import { createContext, useContext, useState, ReactNode } from 'react';
import type { Employee, Vacancy, Settings } from '../App';

// Default settings mirror App's initial values
const defaultSettings: Settings = {
  responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
  theme: 'dark',
  fontScale: 1,
};

const LS_KEY = 'maplewood-scheduler-v3';
const loadState = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

interface AppContextType {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  vacancies: Vacancy[];
  setVacancies: React.Dispatch<React.SetStateAction<Vacancy[]>>;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  awardVacancy: (vacId: string, payload: { empId?: string; reason?: string; overrideUsed?: boolean }) => void;
  resetKnownAt: (vacId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const persisted = loadState();
  const [employees, setEmployees] = useState<Employee[]>(persisted?.employees ?? []);
  const [vacancies, setVacancies] = useState<Vacancy[]>(persisted?.vacancies ?? []);
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings, ...(persisted?.settings ?? {}) });

  const awardVacancy = (vacId: string, payload: { empId?: string; reason?: string; overrideUsed?: boolean }) => {
    if (!payload.empId) { alert('Pick an employee to award.'); return; }
    setVacancies(prev => prev.map(v => v.id === vacId ? ({
      ...v,
      status: 'Awarded',
      awardedTo: payload.empId,
      awardedAt: new Date().toISOString(),
      awardReason: payload.reason ?? '',
      overrideUsed: !!payload.overrideUsed,
    }) : v));
  };

  const resetKnownAt = (vacId: string) => {
    setVacancies(prev => prev.map(v => v.id === vacId ? ({ ...v, knownAt: new Date().toISOString() }) : v));
  };

  return (
    <AppContext.Provider value={{ employees, setEmployees, vacancies, setVacancies, settings, setSettings, awardVacancy, resetKnownAt }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

