import { env } from "cloudflare:workers";

export type TrainingSession = { date: string; hours: number };

export type TrainingOverview = {
  yearlyTotals: Record<"2024" | "2025", number>;
  dailyTotals: Record<string, number>;
  allTimeHours: number;
  currentYear: number;
  recentSessions: TrainingSession[];
};

function getDb(): D1Database {
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  }
  return env.DB;
}

async function ensureSchema(): Promise<D1Database> {
  const db = getDb();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS yearly_totals (
      owner_id TEXT NOT NULL,
      year INTEGER NOT NULL CHECK(year IN (2024, 2025)),
      hours REAL NOT NULL CHECK(hours >= 0 AND hours <= 5000),
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (owner_id, year)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS training_sessions (
      owner_id TEXT NOT NULL,
      training_date TEXT NOT NULL,
      hours REAL NOT NULL CHECK(hours > 0 AND hours <= 24),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (owner_id, training_date)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS training_sessions_owner_date_idx ON training_sessions(owner_id, training_date DESC)"),
  ]);
  return db;
}

export async function getOverview(ownerId: string): Promise<TrainingOverview> {
  const db = await ensureSchema();
  const [yearly, daily, allTime, sessions] = await Promise.all([
    db.prepare("SELECT year, hours FROM yearly_totals WHERE owner_id = ?").bind(ownerId).all<{ year: number; hours: number }>(),
    db.prepare("SELECT substr(training_date, 1, 4) AS year, SUM(hours) AS hours FROM training_sessions WHERE owner_id = ? GROUP BY substr(training_date, 1, 4)").bind(ownerId).all<{ year: string; hours: number }>(),
    db.prepare("SELECT COALESCE((SELECT SUM(hours) FROM yearly_totals WHERE owner_id = ?), 0) + COALESCE((SELECT SUM(hours) FROM training_sessions WHERE owner_id = ?), 0) AS hours").bind(ownerId, ownerId).first<{ hours: number }>(),
    db.prepare("SELECT training_date AS date, hours FROM training_sessions WHERE owner_id = ? ORDER BY training_date DESC LIMIT 6").bind(ownerId).all<TrainingSession>(),
  ]);

  const yearlyTotals = { "2024": 0, "2025": 0 };
  yearly.results.forEach((row) => {
    if (row.year === 2024 || row.year === 2025) {
      yearlyTotals[String(row.year) as "2024" | "2025"] = Number(row.hours);
    }
  });

  const dailyTotals: Record<string, number> = {};
  daily.results.forEach((row) => { dailyTotals[row.year] = Number(row.hours); });

  return {
    yearlyTotals,
    dailyTotals,
    allTimeHours: Number(allTime?.hours ?? 0),
    currentYear: new Date().getUTCFullYear(),
    recentSessions: sessions.results.map((row) => ({ date: row.date, hours: Number(row.hours) })),
  };
}

export async function getDailySession(ownerId: string, date: string): Promise<TrainingSession | null> {
  const db = await ensureSchema();
  const session = await db.prepare("SELECT training_date AS date, hours FROM training_sessions WHERE owner_id = ? AND training_date = ?").bind(ownerId, date).first<TrainingSession>();
  return session ? { date: session.date, hours: Number(session.hours) } : null;
}

export async function saveDailySession(ownerId: string, date: string, hours: number | null): Promise<void> {
  const db = await ensureSchema();
  if (hours === null) {
    await db.prepare("DELETE FROM training_sessions WHERE owner_id = ? AND training_date = ?").bind(ownerId, date).run();
    return;
  }
  await db.prepare("INSERT INTO training_sessions (owner_id, training_date, hours) VALUES (?, ?, ?) ON CONFLICT(owner_id, training_date) DO UPDATE SET hours = excluded.hours, updated_at = CURRENT_TIMESTAMP").bind(ownerId, date, hours).run();
}

export async function saveYearlyTotal(ownerId: string, year: number, hours: number): Promise<void> {
  const db = await ensureSchema();
  await db.prepare("INSERT INTO yearly_totals (owner_id, year, hours) VALUES (?, ?, ?) ON CONFLICT(owner_id, year) DO UPDATE SET hours = excluded.hours, updated_at = CURRENT_TIMESTAMP").bind(ownerId, year, hours).run();
}
