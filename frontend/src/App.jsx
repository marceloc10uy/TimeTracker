import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "./api";
import { computeNetMinutesLive, minutesToHHMM, todayISO } from "./time";
import HolidaysPanel from "./components/HolidaysPanel";

function Card({ title, children }) {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.04)",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Chip({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid rgba(0,0,0,0.15)",
        background: "white",
        color: "#111",
        padding: "8px 12px",
        borderRadius: 999,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Progress({ value, soft, hard }) {
  const pct = hard > 0 ? Math.min(100, Math.round((value / hard) * 100)) : 0;
  const softPct = hard > 0 ? Math.min(100, Math.round((soft / hard) * 100)) : 0;

  const statusText =
    value > hard
      ? `Over HARD by ${minutesToHHMM(value - hard)}`
      : value > soft
      ? `Over soft by ${minutesToHHMM(value - soft)} • Hard remaining ${minutesToHHMM(hard - value)}`
      : `Soft remaining ${minutesToHHMM(soft - value)}`;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Soft {minutesToHHMM(soft)} • Hard {minutesToHHMM(hard)} • Current {minutesToHHMM(value)}
      </div>
      <div
        style={{
          position: "relative",
          height: 12,
          borderRadius: 8,
          background: "rgba(0,0,0,0.08)",
          overflow: "hidden",
          marginTop: 6,
        }}
      >
        <div style={{ height: "100%", width: `${pct}%`, background: "rgba(0,0,0,0.55)" }} />
        <div
          style={{
            position: "absolute",
            left: `${softPct}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: "rgba(255,255,255,0.9)",
          }}
        />
      </div>
      <div style={{ fontSize: 12, marginTop: 6 }}>{statusText}</div>
    </div>
  );
}

function OffBadge({ off }) {
  if (!off) return "-";
  const label = off.label ? `: ${off.label}` : "";
  return (
    <span
      style={{
        padding: "2px 8px",
        border: "1px solid rgba(0,0,0,0.2)",
        borderRadius: 999,
        fontSize: 12,
        background: "white",
        whiteSpace: "nowrap",
      }}
      title={off.source ? `source: ${off.source}` : undefined}
    >
      {off.kind}
      {label}
    </span>
  );
}

export default function App() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [day, setDay] = useState(null);
  const [week, setWeek] = useState(null);
  const [settings, setSettings] = useState(null);
  const [err, setErr] = useState("");

  // local editable inputs
  const [startEdit, setStartEdit] = useState("");
  const [endEdit, setEndEdit] = useState("");
  const [breakEdit, setBreakEdit] = useState("0");

  // live counter state
  const [liveNet, setLiveNet] = useState(0);

  const loadAll = async (dateStr) => {
    setErr("");
    const [d, w, s] = await Promise.all([
      apiGet(`/api/day/${dateStr}`),
      apiGet(`/api/week/${dateStr}`),
      apiGet(`/api/settings`),
    ]);
    setDay(d);
    setWeek(w);
    setSettings(s);
    setStartEdit(d.start_time ?? "");
    setEndEdit(d.end_time ?? "");
    setBreakEdit(String(d.break_minutes ?? 0));
  };

  useEffect(() => {
    loadAll(selectedDate).catch((e) => setErr(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Local ticking counter when running
  useEffect(() => {
    if (!day?.start_time) return;
    const isRunning = !day.end_time; // running if end_time is null/empty
    if (!isRunning) {
      setLiveNet(day.net_minutes ?? 0);
      return;
    }

    const tick = () => {
      const net = computeNetMinutesLive(day.start_time, day.break_minutes);
      setLiveNet(net);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [day?.start_time, day?.end_time, day?.break_minutes, day?.net_minutes]);

  const dailySoft = day?.targets?.daily_soft ?? 0;
  const dailyHard = day?.targets?.daily_hard ?? 0;

  // NEW backend returns week.weekly_soft/week.weekly_hard (preferred)
  // Backward compatible with your older structure week.targets.weekly_soft/week.weekly_hard
  const weeklySoft = week?.weekly_soft ?? week?.targets?.weekly_soft ?? 0;
  const weeklyHard = week?.weekly_hard ?? week?.targets?.weekly_hard ?? 0;

  const netToday = !day?.start_time ? 0 : day.end_time ? day.net_minutes ?? 0 : liveNet;
  const weekNet = week?.week_net_minutes ?? 0;

  const startNow = async () => {
    try {
      const d = await apiPost(`/api/day/${selectedDate}/start-now`);
      setDay(d);
      setStartEdit(d.start_time ?? "");
      const w = await apiGet(`/api/week/${selectedDate}`);
      setWeek(w);
    } catch (e) {
      setErr(String(e));
    }
  };

  const endNow = async () => {
    try {
      const d = await apiPost(`/api/day/${selectedDate}/end-now`);
      setDay(d);
      setEndEdit(d.end_time ?? "");
      const w = await apiGet(`/api/week/${selectedDate}`);
      setWeek(w);
    } catch (e) {
      setErr(String(e));
    }
  };

  const addBreak = async (m) => {
    try {
      const d = await apiPost(`/api/day/${selectedDate}/break/add`, { minutes: m });
      setDay(d);
      setBreakEdit(String(d.break_minutes ?? 0));
      const w = await apiGet(`/api/week/${selectedDate}`);
      setWeek(w);
    } catch (e) {
      setErr(String(e));
    }
  };

  const subBreak = async (m) => {
    try {
      const d = await apiPost(`/api/day/${selectedDate}/break/subtract`, { minutes: m });
      setDay(d);
      setBreakEdit(String(d.break_minutes ?? 0));
      const w = await apiGet(`/api/week/${selectedDate}`);
      setWeek(w);
    } catch (e) {
      setErr(String(e));
    }
  };

  const saveManual = async () => {
    try {
      const payload = {
        start_time: startEdit === "" ? null : startEdit,
        end_time: endEdit === "" ? null : endEdit,
        break_minutes: breakEdit === "" ? 0 : Number(breakEdit),
      };
      const d = await apiPatch(`/api/day/${selectedDate}`, payload);
      setDay(d);
      const w = await apiGet(`/api/week/${selectedDate}`);
      setWeek(w);
    } catch (e) {
      setErr(String(e));
    }
  };

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: 18,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto",
      }}
    >
      <h2 style={{ marginTop: 4 }}>Time Tracker</h2>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <label style={{ fontSize: 14 }}>
          Date{" "}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ marginLeft: 8, padding: 8, borderRadius: 10 }}
          />
        </label>

        <button
          onClick={async () => {
            try {
              await loadAll(selectedDate);
            } catch (e) {
              setErr(String(e));
            }
          }}
        >
          Refresh
        </button>

        {day && (
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            {day.start_time ? `Start ${day.start_time}` : "Not started"} •{" "}
            {day.end_time ? `End ${day.end_time}` : "Running…"}
          </div>
        )}
      </div>

      {err && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 10,
            background: "rgba(255,0,0,0.12)",
            border: "1px solid rgba(255,0,0,0.2)",
          }}
        >
          {err}
        </div>
      )}

      <Card title="Today">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={startNow}
            disabled={!!day?.start_time}
            style={{ padding: "10px 14px", borderRadius: 12, cursor: "pointer" }}
          >
            Start now
          </button>
          <button
            onClick={endNow}
            disabled={!day?.start_time}
            style={{ padding: "10px 14px", borderRadius: 12, cursor: "pointer" }}
          >
            End now
          </button>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            width: "100%",
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Start time</div>
            <input
              type="time"
              value={startEdit}
              onChange={(e) => setStartEdit(e.target.value)}
              style={{ padding: 10, borderRadius: 12, width: "100%" }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>End time</div>
            <input
              type="time"
              value={endEdit}
              onChange={(e) => setEndEdit(e.target.value)}
              style={{ padding: 10, borderRadius: 12, width: "100%" }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Break total (minutes)</div>
            <input
              type="number"
              min="0"
              value={breakEdit}
              onChange={(e) => setBreakEdit(e.target.value)}
              style={{ padding: 10, borderRadius: 12, width: "100%" }}
            />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <button onClick={saveManual} style={{ padding: "10px 14px", borderRadius: 12, cursor: "pointer" }}>
            Save manual changes
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>Break chips</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Chip label="+5" onClick={() => addBreak(5)} />
            <Chip label="+10" onClick={() => addBreak(10)} />
            <Chip label="+15" onClick={() => addBreak(15)} />
            <Chip label="+30" onClick={() => addBreak(30)} />
            <Chip label="+60" onClick={() => addBreak(60)} />
            <div style={{ width: 10 }} />
            <Chip label="-5" onClick={() => subBreak(5)} />
            <Chip label="-10" onClick={() => subBreak(10)} />
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 14 }}>
          <b>Net today:</b> {minutesToHHMM(netToday)}
        </div>

        <Progress value={netToday} soft={dailySoft} hard={dailyHard} />
      </Card>

      <Card title="This week (Mon–Fri)">
        <div style={{ fontSize: 13, opacity: 0.9 }}>
          Week: {week?.week_start} → {week?.week_end}
          {typeof week?.working_days === "number" ? (
            <span style={{ marginLeft: 8, opacity: 0.85 }}>
              • Working days: <b>{week.working_days}</b>
            </span>
          ) : null}
        </div>

        <Progress value={weekNet} soft={weeklySoft} hard={weeklyHard} />

        <div style={{ marginTop: 10, fontSize: 13 }}>
          {typeof week?.status?.pace_hard_per_day === "number" && (
            <div>
              Pace (hard): <b>{minutesToHHMM(week.status.pace_hard_per_day)}</b> per remaining weekday
            </div>
          )}
          {typeof week?.status?.pace_soft_per_day === "number" && (
            <div style={{ opacity: 0.85 }}>
              Pace (soft): {minutesToHHMM(week.status.pace_soft_per_day)} per remaining weekday
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.85 }}>
                <th style={{ padding: "8px 6px" }}>Date</th>
                <th style={{ padding: "8px 6px" }}>Off</th>
                <th style={{ padding: "8px 6px" }}>Start</th>
                <th style={{ padding: "8px 6px" }}>End</th>
                <th style={{ padding: "8px 6px" }}>Break</th>
                <th style={{ padding: "8px 6px" }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {week?.days?.map((d) => (
                <tr
                  key={d.date}
                  style={{
                    borderTop: "1px solid rgba(0,0,0,0.08)",
                    opacity: d.is_off ? 0.6 : 1,
                  }}
                >
                  <td style={{ padding: "8px 6px" }}>{d.date}</td>
                  <td style={{ padding: "8px 6px" }}>
                    {d.is_off ? <OffBadge off={d.off} /> : "-"}
                  </td>
                  <td style={{ padding: "8px 6px" }}>{d.start_time ?? "-"}</td>
                  <td style={{ padding: "8px 6px" }}>{d.end_time ?? (d.running ? "…" : "-")}</td>
                  <td style={{ padding: "8px 6px" }}>{d.break_minutes}m</td>
                  <td style={{ padding: "8px 6px" }}>{minutesToHHMM(d.net_minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ✅ Holidays module */}
        {week && (
          <HolidaysPanel
            week={week}
            selectedDate={selectedDate}
            onChanged={async () => {
              await loadAll(selectedDate);
            }}
          />
        )}
      </Card>

      {/* Keeping your existing footer, but guard it better */}
      {settings && (
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {settings.settings ? (
            <>
              Settings: daily soft {minutesToHHMM(settings.settings.daily_soft_minutes)} • daily hard{" "}
              {minutesToHHMM(settings.settings.daily_hard_minutes)} • workdays/week{" "}
              {settings.settings.workdays_per_week} • weekly hard{" "}
              {minutesToHHMM(settings.derived?.weekly_hard_minutes ?? 0)} • weekly soft{" "}
              {minutesToHHMM(settings.derived?.weekly_soft_minutes ?? 0)}
            </>
          ) : (
            <>Settings loaded.</>
          )}
        </div>
      )}
    </div>
  );
}