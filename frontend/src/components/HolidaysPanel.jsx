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

function toIsoDate(date) {
  return date.toISOString().split('T')[0];
}

function expandIsoRange(startIso, endIso) {
  const out = [];
  const start = new Date(startIso);
  const end = new Date(endIso);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(toIsoDate(new Date(d)));
  }
  return out;
}

function buildIsoFromYearlyKey(year, key) {
  const [m, d] = key.split('-').map(Number);
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function toYearlyKey(iso) {
  const [, month, day] = iso.split('-');
  return `${Number(month)}-${Number(day)}`;
}

function getContiguousIsoSegments(isos) {
  if (!isos.length) return [];
  const sorted = [...new Set(isos)].sort();
  const segments = [];

  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const nextExpected = new Date(prev);
    nextExpected.setDate(nextExpected.getDate() + 1);
    const expectedIso = toIsoDate(nextExpected);

    if (cur === expectedIso) {
      prev = cur;
      continue;
    }

    segments.push({ start, end: prev });
    start = cur;
    prev = cur;
  }

  segments.push({ start, end: prev });
  return segments;
}

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

export default function HolidaysPanel({ year: propYear }) {
  const nowYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(propYear || nowYear);

  const [editMode, setEditMode] = useState(null); // null | 'personal' | 'yearly'
  const [selected, setSelected] = useState([]);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const [holidays, setHolidays] = useState([]);
  const [timeOffs, setTimeOffs] = useState([]);
  const [personalDays, setPersonalDays] = useState([]);
  const [recurringIdByYearlyKey, setRecurringIdByYearlyKey] = useState({});

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal, selectedYear]);

  async function loadAll() {
    try {
      const fromDate = `${selectedYear}-01-01`;
      const toDate = `${selectedYear}-12-31`;
      const [recRes, toRes] = await Promise.all([apiGetRecurringHolidays(), apiListTimeOff(fromDate, toDate)]);
      const rec = recRes.items || [];
      const tos = toRes.items || [];

      const hols = [];
      const recurringByKey = {};
      rec.forEach(r => {
        try {
          if (!r.date) return;
          const iso = r.date;
          const [year, month, day] = iso.split('-');
          const d = new Date(year, month - 1, day);
          if (d.getFullYear() === selectedYear) {
            hols.push(iso);
            recurringByKey[toYearlyKey(iso)] = r.id;
          }
        } catch {}
      });

      const pDays = [];
      tos.forEach(t => {
        const s = new Date(t.start_date);
        const e = new Date(t.end_date);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          if (d.getFullYear() === selectedYear) pDays.push(toIsoDate(new Date(d)));
        }
      });

      setHolidays(hols);
      setTimeOffs(tos);
      setPersonalDays(pDays);
      setRecurringIdByYearlyKey(recurringByKey);
    } catch (err) {
      console.error(err);
    }
  }

  function startEdit(mode) {
    if (selectedYear !== nowYear) return;
    setEditMode(mode);
    if (mode === 'personal') {
      setSelected([...new Set(personalDays)]);
      return;
    }
    if (mode === 'yearly') {
      setSelected([...new Set(holidays.map(toYearlyKey))]);
      return;
    }
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
      setSelected(prev => (exists ? prev.filter(x => x !== iso) : [...prev, iso]));
    } else if (editMode === 'yearly') {
      const key = `${month + 1}-${day}`;
      const exists = selected.includes(key);
      setSelected(prev => (exists ? prev.filter(x => x !== key) : [...prev, key]));
    }
  }

  async function submitEdit(yearlyLabel) {
    if (!editMode) return;
    try {
      if (editMode === 'personal') {
        const selectedSet = new Set(selected);
        const currentSet = new Set(personalDays);
        const toAdd = [...selectedSet].filter(iso => !currentSet.has(iso));
        const toRemoveSet = new Set([...currentSet].filter(iso => !selectedSet.has(iso)));

        const personalRows = timeOffs.filter(t => t.kind === 'personal');
        const deleteIds = [];
        const keepSegments = [];

        personalRows.forEach(row => {
          const allDays = expandIsoRange(row.start_date, row.end_date);
          const needsChange = allDays.some(iso => toRemoveSet.has(iso));
          if (!needsChange) return;

          deleteIds.push(row.id);
          const remainingDays = allDays.filter(iso => !toRemoveSet.has(iso));
          getContiguousIsoSegments(remainingDays).forEach(seg => {
            keepSegments.push({ start: seg.start, end: seg.end, label: row.label });
          });
        });

        await Promise.all([...new Set(deleteIds)].map(id => apiDeleteTimeOff(id)));
        await Promise.all(
          keepSegments.map(seg => apiCreateTimeOff({
            start_date: seg.start,
            end_date: seg.end,
            kind: 'personal',
            label: seg.label || undefined,
          }))
        );
        await Promise.all(
          toAdd.map(iso => apiCreateTimeOff({ start_date: iso, end_date: iso, kind: 'personal', label: undefined }))
        );
      } else if (editMode === 'yearly') {
        const selectedSet = new Set(selected);
        const currentSet = new Set(holidays.map(toYearlyKey));
        const toAdd = [...selectedSet].filter(k => !currentSet.has(k));
        const toRemove = [...currentSet].filter(k => !selectedSet.has(k));

        await Promise.all(
          toRemove
            .map(k => recurringIdByYearlyKey[k])
            .filter(Boolean)
            .map(id => apiDeleteRecurringHoliday(id))
        );
        await Promise.all(
          toAdd.map(k => {
            const date = buildIsoFromYearlyKey(selectedYear, k);
            return apiUpsertRecurringHoliday({ date, label: yearlyLabel || undefined });
          })
        );
      }

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
          year={selectedYear}
          holidays={holidays}
          personalDays={personalDays}
          editMode={editMode}
          selected={selected}
          onToggleDay={toggleSelection}
          editable={selectedYear === nowYear}
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
          selectedYear={selectedYear}
          nowYear={nowYear}
          onChangeYear={(y) => { setSelectedYear(y); setRefreshSignal(s => s + 1); if (y !== nowYear) cancelEdit(); }}
        />
      </div>
    </div>
  );
}

function Sidebar({ timeOffs = [], onUpdated, refreshSignal, startEdit, cancelEdit, submitEdit, editMode, selectedCount, selectedYear, nowYear }) {
  const { onChangeYear } = arguments[0];
  const [tStart, setTStart] = useState('');
  const [tEnd, setTEnd] = useState('');
  const [tLabel, setTLabel] = useState('');
  const [rLabel, setRLabel] = useState('');

  useEffect(() => {
    // refresh timeOffs when signaled
    // parent already provides `timeOffs`, but keep this for parity with earlier behavior
  }, [refreshSignal]);

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

  const editable = selectedYear === nowYear;

  return (
    <aside className="sidebar">
      <div className="year-selector">
        <label>Year</label>
        <select value={selectedYear} onChange={e => onChangeYear(Number(e.target.value))}>
          {Array.from({ length: 6 }, (_, i) => nowYear - i).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <h3>Manage Holidays</h3>

      <section className="panel-section">
        <h4>Edit Mode</h4>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => startEdit('personal')} disabled={!editable}>
            Edit personal holidays
          </button>
          <button onClick={() => startEdit('yearly')} disabled={!editable}>
            Edit yearly holidays
          </button>
        </div>

        {!editable && <div style={{ color: '#888', marginBottom: 8 }}>Editing disabled for years other than {nowYear}.</div>}

        {editMode && (
          <div style={{ marginBottom: 8 }}>
            <div>
              Mode: <strong>{editMode}</strong>
            </div>
            <div>Selected: {selectedCount}</div>
            {editMode === 'yearly' && (
              <div className="form-row">
                <label>Label</label>
                <input value={rLabel} onChange={e => setRLabel(e.target.value)} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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

function CalendarView({ year, holidays, personalDays, editMode, selected, onToggleDay, editable }) {
  const days = getDaysInYear(year);
  const todayIso = new Date().toISOString().split('T')[0];

  return (
    <div className="year-calendar">
      {Array.from({ length: 12 }, (_, month) => {
        const monthDays = days.filter(d => d.getMonth() === month);

        return (
          <div key={month} className="month">
            <div className="montTitle">{new Date(year, month).toLocaleString('default', { month: 'long' })}</div>

            <div className="weekday-headers">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="weekday">
                  {day}
                </div>
              ))}
            </div>

            <div className="days-grid">
              {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="day empty"></div>
              ))}

              {monthDays.map(d => {
                const iso = d.toISOString().split('T')[0];
                const isHoliday = holidays.includes(iso);
                const isPersonal = personalDays.includes(iso);
                const isBoth = isHoliday && isPersonal;
                const isToday = iso === todayIso;

                let extraClass = '';
                let removeClass = '';
                if (editMode === 'personal' && selected && selected.includes(iso)) extraClass = 'selected-personal';
                if (editMode === 'yearly') {
                  const key = `${month + 1}-${d.getDate()}`;
                  if (selected && selected.includes(key)) extraClass = 'selected-yearly';
                }
                if (editMode === 'personal' && isPersonal && (!selected || !selected.includes(iso))) {
                  removeClass = 'edit-removing';
                }
                if (editMode === 'yearly') {
                  const key = `${month + 1}-${d.getDate()}`;
                  if (isHoliday && (!selected || !selected.includes(key))) removeClass = 'edit-removing';
                }

                const clickable = editable && !!editMode && onToggleDay;

                return (
                  <div
                    key={iso}
                    className={`day ${isBoth ? 'both' : isHoliday ? 'holiday' : isPersonal ? 'personal' : ''} ${extraClass} ${removeClass} ${isToday ? 'current-day' : ''}`}
                    onClick={() => clickable && onToggleDay({ iso, month, day: d.getDate() })}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
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
