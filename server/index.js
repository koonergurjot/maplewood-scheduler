import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const dataFile = path.join(process.cwd(), 'server', 'data.json');
let data = { employees: [], vacations: [], vacancies: [], bids: [], settings: null };
try {
  const raw = fs.readFileSync(dataFile, 'utf-8');
  data = JSON.parse(raw);
} catch {}

function saveData() {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

app.get('/api/state', (req, res) => {
  res.json(data);
});

app.put('/api/state', (req, res) => {
  data = req.body;
  saveData();
  res.json({ ok: true });
});

// individual endpoints
app.get('/api/employees', (req, res) => res.json(data.employees));
app.put('/api/employees', (req, res) => {
  data.employees = req.body;
  saveData();
  res.json({ ok: true });
});

app.get('/api/vacations', (req, res) => res.json(data.vacations));
app.put('/api/vacations', (req, res) => {
  data.vacations = req.body;
  saveData();
  res.json({ ok: true });
});

app.get('/api/vacancies', (req, res) => res.json(data.vacancies));
app.put('/api/vacancies', (req, res) => {
  data.vacancies = req.body;
  saveData();
  res.json({ ok: true });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API listening on ${port}`);
});
