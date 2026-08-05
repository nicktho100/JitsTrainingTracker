"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { TrainingOverview, TrainingSession } from "../db";

type Props = {
  initialOverview: TrainingOverview;
  userName: string;
  signOutPath: string;
};

type ApiError = { error?: string };

function todayInLocalTime(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function displayHours(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

async function responseOrThrow(response: Response): Promise<void> {
  if (response.ok) return;
  const body = (await response.json().catch(() => ({}))) as ApiError;
  throw new Error(body.error ?? "Something went wrong. Please try again.");
}

export function TrainingDashboard({ initialOverview, userName, signOutPath }: Props) {
  const [overview, setOverview] = useState(initialOverview);
  const [selectedDate, setSelectedDate] = useState(todayInLocalTime());
  const [trained, setTrained] = useState(false);
  const [hours, setHours] = useState("1");
  const [loadingDay, setLoadingDay] = useState(false);
  const [savingDay, setSavingDay] = useState(false);
  const [savingYear, setSavingYear] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);
  const [yearlyInputs, setYearlyInputs] = useState({
    "2024": initialOverview.yearlyTotals["2024"].toString(),
    "2025": initialOverview.yearlyTotals["2025"].toString(),
  });

  const currentYearHours = overview.dailyTotals[String(overview.currentYear)] ?? 0;
  const today = useMemo(() => todayInLocalTime(), []);

  async function refreshOverview() {
    const response = await fetch("/api/overview", { cache: "no-store" });
    await responseOrThrow(response);
    const nextOverview = (await response.json()) as TrainingOverview;
    setOverview(nextOverview);
    setYearlyInputs({
      "2024": nextOverview.yearlyTotals["2024"].toString(),
      "2025": nextOverview.yearlyTotals["2025"].toString(),
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function loadDay() {
      setLoadingDay(true);
      setStatus("");
      setIsError(false);
      try {
        const response = await fetch(`/api/day/${selectedDate}`, { cache: "no-store" });
        await responseOrThrow(response);
        const session = (await response.json()) as TrainingSession | null;
        if (!cancelled) {
          setTrained(Boolean(session));
          setHours(session ? displayHours(session.hours) : "1");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "Could not load this day.");
          setIsError(true);
        }
      } finally {
        if (!cancelled) setLoadingDay(false);
      }
    }
    void loadDay();
    return () => { cancelled = true; };
  }, [selectedDate]);

  async function saveDaily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingDay(true);
    setStatus("");
    setIsError(false);
    try {
      const numericHours = Number(hours);
      if (trained && (!Number.isFinite(numericHours) || numericHours < 0.25 || numericHours > 24)) {
        throw new Error("Enter a training duration between 0.25 and 24 hours.");
      }
      const response = await fetch(`/api/day/${selectedDate}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trained, hours: trained ? numericHours : null }),
      });
      await responseOrThrow(response);
      await refreshOverview();
      setStatus(trained ? `${displayDate(selectedDate)} saved.` : `${displayDate(selectedDate)} cleared.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save this entry.");
      setIsError(true);
    } finally {
      setSavingDay(false);
    }
  }

  async function saveYear(year: 2024 | 2025) {
    setSavingYear(year);
    setStatus("");
    setIsError(false);
    try {
      const numericHours = Number(yearlyInputs[String(year) as "2024" | "2025"]);
      if (!Number.isFinite(numericHours) || numericHours < 0 || numericHours > 5000) {
        throw new Error("Yearly backfill must be between 0 and 5,000 hours.");
      }
      const response = await fetch(`/api/yearly/${year}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: numericHours }),
      });
      await responseOrThrow(response);
      await refreshOverview();
      setStatus(`${year} backfill saved.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save the yearly total.");
      setIsError(true);
    } finally {
      setSavingYear(null);
    }
  }

  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">M</div>
            <div>
              <div className="brand-copy">MAT TIME</div>
              <div className="brand-subtitle">Jiu-Jitsu training log</div>
            </div>
          </div>
          <div className="account" title={userName}>
            {userName}
            <br />
            <a href={signOutPath}>Sign out</a>
          </div>
        </header>

        <section className="hero">
          <div className="eyebrow">Private training history</div>
          <h1>Small sessions add up.</h1>
          <p>Log the time you spend on the mat. Your history is saved securely and available wherever you sign in.</p>
        </section>

        <section className="summary-grid" aria-label="Training totals">
          <StatCard label="2024 backfill" value={overview.yearlyTotals["2024"]} />
          <StatCard label="2025 backfill" value={overview.yearlyTotals["2025"]} />
          <StatCard label={`${overview.currentYear} on the mat`} value={currentYearHours} />
          <StatCard label="All time" value={overview.allTimeHours} featured />
        </section>

        <section className="work-grid">
          <div className="card">
            <h2>Daily log</h2>
            <p className="card-lead">Choose a day, mark whether you trained, and record the total time.</p>
            <form onSubmit={saveDaily}>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="training-date">Date</label>
                  <input id="training-date" type="date" min="2026-01-01" max={today} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="training-hours">Hours trained</label>
                  <input id="training-hours" type="number" min="0.25" max="24" step="0.25" inputMode="decimal" disabled={!trained || loadingDay} value={hours} onChange={(event) => setHours(event.target.value)} />
                </div>
              </div>

              <label className="training-toggle">
                <input type="checkbox" checked={trained} disabled={loadingDay} onChange={(event) => setTrained(event.target.checked)} />
                <span>
                  <span className="toggle-text">I trained on this day</span>
                  <span className="toggle-hint">Uncheck to clear an existing entry.</span>
                </span>
              </label>

              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={savingDay || loadingDay}>{savingDay ? "Saving..." : "Save day"}</button>
                <span className={`status${isError ? " error" : ""}`} aria-live="polite">{loadingDay ? "Loading day..." : status}</span>
              </div>
            </form>
          </div>

          <aside>
            <div className="card">
              <h2>Recent sessions</h2>
              <p className="card-lead">Your most recently logged training days.</p>
              {overview.recentSessions.length ? (
                <div className="recent-list">
                  {overview.recentSessions.map((session) => (
                    <div className="session-row" key={session.date}>
                      <span className="session-date">{displayDate(session.date)}</span>
                      <span className="session-hours">{displayHours(session.hours)} hr{session.hours === 1 ? "" : "s"}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="empty">No daily sessions yet. Your first saved class will show up here.</p>}
            </div>

            <div className="card backfill">
              <h2>Year backfill</h2>
              <p className="card-lead">Add one total for each historical year. Daily logging begins in 2026.</p>
              <div className="backfill-form">
                {([2024, 2025] as const).map((year) => (
                  <div className="backfill-row" key={year}>
                    <label htmlFor={`year-${year}`}>{year}</label>
                    <input id={`year-${year}`} type="number" min="0" max="5000" step="0.25" inputMode="decimal" value={yearlyInputs[String(year) as "2024" | "2025"]} onChange={(event) => setYearlyInputs((inputs) => ({ ...inputs, [year]: event.target.value }))} />
                    <button className="small-button" type="button" disabled={savingYear !== null} onClick={() => void saveYear(year)}>{savingYear === year ? "Saving..." : "Save"}</button>
                  </div>
                ))}
              </div>
              <p className="inline-note">These totals are kept separate from your daily sessions, so your history stays accurate.</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, featured = false }: { label: string; value: number; featured?: boolean }) {
  return (
    <div className={`stat-card${featured ? " featured" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{displayHours(value)}<span className="stat-unit">hours</span></div>
    </div>
  );
}
