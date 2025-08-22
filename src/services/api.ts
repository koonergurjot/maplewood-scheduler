const API_BASE = '/api';

export async function fetchState() {
  const res = await fetch(`${API_BASE}/state`);
  if (!res.ok) throw new Error('Failed to load state');
  return res.json();
}

export async function saveState(state: any) {
  const res = await fetch(`${API_BASE}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error('Failed to save state');
  return res.json();
}

// Individual helpers
export async function getEmployees() {
  const res = await fetch(`${API_BASE}/employees`);
  if (!res.ok) throw new Error('Failed to load employees');
  return res.json();
}

export async function putEmployees(list: any) {
  const res = await fetch(`${API_BASE}/employees`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(list),
  });
  if (!res.ok) throw new Error('Failed to save employees');
  return res.json();
}

export async function getVacations() {
  const res = await fetch(`${API_BASE}/vacations`);
  if (!res.ok) throw new Error('Failed to load vacations');
  return res.json();
}

export async function putVacations(list: any) {
  const res = await fetch(`${API_BASE}/vacations`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(list),
  });
  if (!res.ok) throw new Error('Failed to save vacations');
  return res.json();
}

export async function getVacancies() {
  const res = await fetch(`${API_BASE}/vacancies`);
  if (!res.ok) throw new Error('Failed to load vacancies');
  return res.json();
}

export async function putVacancies(list: any) {
  const res = await fetch(`${API_BASE}/vacancies`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(list),
  });
  if (!res.ok) throw new Error('Failed to save vacancies');
  return res.json();
}
