import { useEffect, useMemo, useState } from "react";
import {
  apiCreateTimeOff,
  apiDeleteRecurringHoliday,
  apiDeleteTimeOff,
  apiGetRecurringHolidays,
  apiListTimeOff,
  apiUpsertRecurringHoliday,
} from "../api";

// Small helpers
function pad2(n) {
  return String(n).padStart(2, "0");
}
function mmddLabel(month, day) {
  return `${pad2(month)}-${pad2(day)}`;
}

/**
 * Props:
 * - week: object from /api/week/:dayStr (must include week_start, week_end)
 * - selectedDate: YYYY-MM-DD (for defaulting form values)
 * - onChanged: () => Promise<void>  (call to refresh week/day after edits)
 */
export default function HolidaysPanel({ week, selectedDate, onChanged }) {
  const [recHolidays, setRecHolidays] = useState([]);
  const [timeOff, setTimeOff] = useState([]);

  const [rhMonth, setRhMonth] = useState(1);
  const [rhDay, setRhDay] = useState(1);
  const [rhLabel, setRhLabel] = useState("");

  const [toKind, setToKind] = useState("vacation");
  const [toStart, setToStart] = useState(selectedDate);
  const [toEnd, setToEnd] = useState(selectedDate);
  const [toLabel, setToLabel] = useState("");

  const [err, setErr] = useState("");

  const weekStart = week?.week_start ?? null;
  const weekEnd = week?.week_end ?? null;

  // When selectedDate changes, update defaults
  useEffect(() => {
    setToStart(selectedDate);
    setToEnd(selectedDate);
  }, [selectedDate]);

  // Load data whenever week range changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!weekStart || !weekEnd) return;
      setErr("");

      try {
        const rh = await apiGetRecurringHolidays();
        if (!cancelled) setRecHolidays(rh.items ?? []);
      } catch (e) {
        if (!cancelled) setErr((p) => p + `\nRecurring holidays load failed: ${String(e)}`);
      }

      try {
        const to = await apiListTimeOff(weekStart, weekEnd);
        if (!cancelled) setTimeOff(to.items ?? []);
      } catch (e) {
        if (!cancelled) setErr((p) => p + `\nTime off load failed: ${String(e)}`);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [weekStart, weekEnd]);

  const recurringSorted = useMemo(() => {
    return [...recHolidays].sort((a, b) => (a.month - b.month) || (a.day - b.day));
  }, [recHolidays]);

  const timeOffSorted = useMemo(() => {
    return [...timeOff].sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
  }, [timeOff]);

  async function refreshAll() {
    // Reload panel lists + tell parent to refresh week/day
    if (weekStart && weekEnd) {
      const rh = await apiGetRecurringHolidays();
      setRecHolidays(rh.items ?? []);
      const to = await apiListTimeOff(weekStart, weekEnd);
      setTimeOff(to.items ?? []);
    }
    if (onChanged) await onChanged();
  }

  async function handleAddRecurring() {
    setErr("");
    try {
      // Basic validation
      if (rhMonth < 1 || rhMonth > 12) throw new Error("Month must be 1..12");
      if (rhDay < 1 || rhDay > 31) throw new Error("Day must be 1..31");

      const res = await apiUpsertRecurringHoliday({
        month: rhMonth,
        day: rhDay,
        label: rhLabel.trim() === "" ? null : rhLabel.trim(),
      });

      setRecHolidays(res.items ?? []);
      await refreshAll();
    } catch (e) {
      setErr(String(e));
    }
  }

  async function handleDeleteRecurring(id) {
    setErr("");
    try {
      const res = await apiDeleteRecurringHoliday(id);
      setRecHolidays(res.items ?? []);
      await refreshAll();
    } catch (e) {
      setErr(String(e));
    }
  }

  async function handleAddTimeOff() {
    setErr("");
    try {
      if (!toStart) throw new Error("Start date required");
      if (!toEnd) throw new Error("End date required");
      if (toEnd < toStart) throw new Error("End date cannot be earlier than start date");

      await apiCreateTimeOff({
        kind: toKind,
        start_date: toStart,
        end_date: toEnd,
        label: toLabel.trim() === "" ? null : toLabel.trim(),
      });

      await refreshAll();
    } catch (e) {
      setErr(String(e));
    }
  }

  async function handleDeleteTimeOff(id) {
    setErr("");
    try {
      await apiDeleteTimeOff(id);
      await refreshAll();
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <section style={{ marginTop: 18, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
      <h3 style={{ marginTop: 0 }}>Holidays & Time Off</h3>

      {err && (
        <pre style={{ background: "#fff3f3", padding: 10, borderRadius: 8, overflowX: "auto" }}>
          {err.trim()}
        </pre>
      )}

      {/* Recurring holidays */}
      <div style={{ marginTop: 10 }}>
        <h4 style={{ marginBottom: 8 }}>Recurring holidays (every year)</h4>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label>Month</label>
          <input
            type="number"
            min="1"
            max="12"
            value={rhMonth}
            onChange={(e) => setRhMonth(Number(e.target.value))}
            style={{ width: 70 }}
          />

          <label>Day</label>
          <input
            type="number"
            min="1"
            max="31"
            value={rhDay}
            onChange={(e) => setRhDay(Number(e.target.value))}
            style={{ width: 70 }}
          />

          <input
            placeholder="Label (optional)"
            value={rhLabel}
            onChange={(e) => setRhLabel(e.target.value)}
            style={{ minWidth: 260 }}
          />

          <button onClick={handleAddRecurring}>Add / Update</button>
        </div>

        <div style={{ marginTop: 10 }}>
          {recurringSorted.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No recurring holidays yet.</div>
          ) : (
            <ul style={{ paddingLeft: 18 }}>
              {recurringSorted.map((h) => (
                <li key={h.id} style={{ marginBottom: 6 }}>
                  <b>{mmddLabel(h.month, h.day)}</b>
                  {h.label ? ` — ${h.label}` : ""}
                  <button style={{ marginLeft: 10 }} onClick={() => handleDeleteRecurring(h.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      {/* Personal time off */}
      <div>
        <h4 style={{ marginBottom: 8 }}>Personal time off (your vacations / days off)</h4>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={toKind} onChange={(e) => setToKind(e.target.value)}>
            <option value="vacation">Vacation</option>
            <option value="personal">Personal day</option>
          </select>

          <input type="date" value={toStart} onChange={(e) => setToStart(e.target.value)} />
          <span>to</span>
          <input type="date" value={toEnd} onChange={(e) => setToEnd(e.target.value)} />

          <input
            placeholder="Label (optional)"
            value={toLabel}
            onChange={(e) => setToLabel(e.target.value)}
            style={{ minWidth: 220 }}
          />

          <button onClick={handleAddTimeOff}>Add</button>
        </div>

        <div style={{ marginTop: 10 }}>
          {timeOffSorted.length === 0 ? (
            <div style={{ opacity: 0.7 }}>
              No personal time off entries overlapping {weekStart} → {weekEnd}.
            </div>
          ) : (
            <ul style={{ paddingLeft: 18 }}>
              {timeOffSorted.map((it) => (
                <li key={it.id} style={{ marginBottom: 6 }}>
                  <b>{it.kind}</b>: {it.start_date} → {it.end_date}
                  {it.label ? ` — ${it.label}` : ""}
                  <button style={{ marginLeft: 10 }} onClick={() => handleDeleteTimeOff(it.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}