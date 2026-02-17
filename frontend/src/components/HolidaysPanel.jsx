import './HolidaysPanel.css';
import React, { useEffect, useState } from 'react';
import {
  apiGetRecurringHolidays,
  apiUpsertRecurringHoliday,
  apiDeleteRecurringHoliday,
  apiListTimeOff,
  apiCreateTimeOff,
  apiDeleteTimeOff,
} from '../api.js';

function getDaysInYear(year) {
  const days = [];
  for (let month = 0; month < 12; month++) {
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
  }
  return days;
}



export default function HolidaysPanel({ year }) {
  const [editMode, setEditMode] = useState(null); // null | 'personal' | 'yearly'
  const [selected, setSelected] = useState([]); // array of ISO strings or 'M-D' keys for yearly
  const [refreshSignal, setRefreshSignal] = useState(0);

  const [holidays, setHolidays] = useState([]); // ISO strings for official recurring holidays
  const [timeOffs, setTimeOffs] = useState([]); // raw time-off items from backend
  const [personalDays, setPersonalDays] = useState([]); // ISO strings expanded from timeOffs

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal, year]);

  async function loadAll() {
    try {
      const [recRes, toRes] = await Promise.all([apiGetRecurringHolidays(), apiListTimeOff()]);
      const rec = recRes.items || [];
      const tos = toRes.items || [];

      // compute holidays (convert month/day into ISO strings for this year)
      const hols = [];
      rec.forEach(r => {
        try {
          const d = new Date(year, r.month - 1, r.day);
          if (d.getFullYear() === year && d.getMonth() === r.month - 1 && d.getDate() === r.day) {
            hols.push(d.toISOString().split('T')[0]);
          }
        } catch { /* ignore invalid dates like Feb 29 on non-leap years */ }
      });

      // expand time-offs into per-day ISO list
      const pDays = [];
      tos.forEach(t => {
        const s = new Date(t.start_date);
        const e = new Date(t.end_date);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          pDays.push(new Date(d).toISOString().split('T')[0]);
        }
      });

      setHolidays(hols);
      setTimeOffs(tos);
      setPersonalDays(pDays);
    } catch (err) {
      console.error(err);
    }
  }

  function startEdit(mode) {
    setEditMode(mode);
    setSelected([]);
  }

  function cancelEdit() {
    setEditMode(null);
    setSelected([]);
  }

  function toggleSelection({ iso, month, day }) {
    if (!editMode) return;

    if (editMode === 'personal') {
      const exists = selected.includes(iso);
      setSelected(prev => exists ? prev.filter(x => x !== iso) : [...prev, iso]);
    } else if (editMode === 'yearly') {
      const key = `${month + 1}-${day}`;
      const exists = selected.includes(key);
      setSelected(prev => exists ? prev.filter(x => x !== key) : [...prev, key]);
    }
  }

  async function submitEdit(yearlyLabel) {
    if (!editMode) return;
    try {
      if (editMode === 'personal') {
        // create single-day time-offs for each selected ISO
        await Promise.all(selected.map(iso => apiCreateTimeOff({ start_date: iso, end_date: iso, kind: 'personal', label: undefined })));
      } else if (editMode === 'yearly') {
        // upsert recurring holiday for each selected month-day
        await Promise.all(selected.map(k => {
          const [m, d] = k.split('-').map(Number);
          return apiUpsertRecurringHoliday({ month: m, day: d, label: yearlyLabel || undefined });
        }));
      }

      // clear and refresh sidebar lists
      setSelected([]);
      setEditMode(null);
      setRefreshSignal(s => s + 1);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="holidays-container">
      <CalendarLegend />
      <div className="calendar-and-sidebar">
        <CalendarView
          year={year}
          holidays={holidays}
          personalDays={personalDays}
          editMode={editMode}
          selected={selected}
          onToggleDay={toggleSelection}
        />
        <Sidebar
          timeOffs={timeOffs}
          onUpdated={() => setRefreshSignal(s => s + 1)}
          refreshSignal={refreshSignal}
          startEdit={startEdit}
          cancelEdit={cancelEdit}
          submitEdit={submitEdit}
          editMode={editMode}
          selectedCount={selected.length}
        />
      </div>
    </div>
  );
}

function Sidebar({ timeOffs = [], onUpdated, refreshSignal, startEdit, cancelEdit, submitEdit, editMode, selectedCount }) {
  const [tStart, setTStart] = useState('');
  const [tEnd, setTEnd] = useState('');
  const [tLabel, setTLabel] = useState('');
  const [rLabel, setRLabel] = useState('');

  async function addTimeOff(e) {
    e.preventDefault();
    try {
      const payload = { start_date: tStart, end_date: tEnd, kind: 'personal', label: tLabel || undefined };
      await apiCreateTimeOff(payload);
      setTStart('');
      setTEnd('');
      setTLabel('');
      onUpdated?.();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteTimeOff(id) {
    try {
      await apiDeleteTimeOff(id);
      onUpdated?.();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <aside className="sidebar">
      <h3>Manage Holidays</h3>

      <section className="panel-section">
        <h4>Edit Mode</h4>

        <div style={{display: 'flex', gap: 8, marginBottom: 8}}>
          <button onClick={() => startEdit('personal')}>Add personal holidays</button>
          <button onClick={() => startEdit('yearly')}>Add yearly holidays</button>
        </div>

        {editMode && (
          <div style={{marginBottom: 8}}>
            <div>Mode: <strong>{editMode}</strong></div>
            <div>Selected: {selectedCount}</div>
            {editMode === 'yearly' && (
              <div className="form-row">
                <label>Label</label>
                <input value={rLabel} onChange={e => setRLabel(e.target.value)} />
              </div>
            )}
            <div style={{display: 'flex', gap: 8, marginTop: 8}}>
              <button onClick={() => submitEdit(rLabel)}>Submit changes</button>
              <button onClick={() => { setRLabel(''); cancelEdit(); }}>Cancel</button>
            </div>
          </div>
        )}

      </section>

      <section className="panel-section">
        <h4>Personal Time Off</h4>
        <form className="form" onSubmit={addTimeOff}>
          <div className="form-row">
            <label>Start</label>
            <input type="date" value={tStart} onChange={e => setTStart(e.target.value)} />
          </div>
          <div className="form-row">
            <label>End</label>
            <input type="date" value={tEnd} onChange={e => setTEnd(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Label</label>
            <input value={tLabel} onChange={e => setTLabel(e.target.value)} />
          </div>
          <button type="submit">Add Time Off</button>
        </form>

        <ul className="items-list">
          {timeOffs.map(t => (
            <li key={t.id}>
              {t.start_date} → {t.end_date} {t.label ? `- ${t.label}` : ''}
              <button className="small" onClick={() => deleteTimeOff(t.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function CalendarView({ year, holidays, personalDays, editMode, selected, onToggleDay }) {
  const days = getDaysInYear(year);
  const todayIso = new Date().toISOString().split("T")[0];

  return (
    <div className="year-calendar">
      {Array.from({ length: 12 }, (_, month) => {
        const monthDays = days.filter(d => d.getMonth() === month);

        return (
          <div key={month} className="month">
            <div className='montTitle'>
              {new Date(year, month).toLocaleString("default", { month: "long" })}
            </div>

            {/* Weekday headers */}
            <div className="weekday-headers">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="days-grid">
              {/* Add empty slots before the first day */}
              {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="day empty"></div>
              ))}

              {monthDays.map(d => {
                const iso = d.toISOString().split("T")[0];
                const isHoliday = holidays.includes(iso);
                const isPersonal = personalDays.includes(iso);
                const isBoth = isHoliday && isPersonal;
                const isToday = iso === todayIso;

                // selection handling when editMode is active
                let extraClass = '';
                if (editMode === 'personal' && selected && selected.includes(iso)) extraClass = 'selected-personal';
                if (editMode === 'yearly') {
                  const key = `${month + 1}-${d.getDate()}`;
                  if (selected && selected.includes(key)) extraClass = 'selected-yearly';
                }

                return (
                  <div
                    key={iso}
                    className={`day ${ isBoth ? "both" : isHoliday ? "holiday" : isPersonal ? "personal" : "" } ${extraClass} ${isToday ? 'current-day' : ''}`}
                    onClick={() => onToggleDay && onToggleDay({ iso, month, day: d.getDate() })}
                    role={editMode ? 'button' : undefined}
                    tabIndex={editMode ? 0 : undefined}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Injected props helper: since CalendarView is defined as a function, we attach a small helper
// The parent will set CalendarView._injectedProps before rendering to provide editMode, selected, onToggleDay


function CalendarLegend() {
  return (
    <div className="calendar-legend">
      <div className="legend-item">
        <span className="legend-color holiday"></span>
        <span>Official holiday</span>
      </div>
      <div className="legend-item">
        <span className="legend-color personal"></span>
        <span>My holiday</span>
      </div>
      <div className="legend-item">
        <span className="legend-color both"></span>
        <span>Both</span>
      </div>
      <div className="legend-item">
        <span className="legend-color current-day"></span>
        <span>Current Day</span>
      </div>
    </div>
  );
}

