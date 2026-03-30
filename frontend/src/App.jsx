import { useEffect, useRef, useState } from "react";
import { apiGet, apiGetDashboard, apiPatch, apiPost, subscribeToApiActivity } from "./api";
import { computeNetMinutesLive, minutesToHHMM, todayISO } from "./time";
import HolidaysPanel from "./components/HolidaysPanel";
import TimeTrackerView from "./components/TimeTrackerView";
import Header from "./components/Header";
import "./App.css";

export default function App() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [day, setDay] = useState(null);
  const [week, setWeek] = useState(null);
  const [settings, setSettings] = useState(null);
  const [buildInfo, setBuildInfo] = useState(null);
  const [err, setErr] = useState("");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeTab, setActiveTab] = useState("timetracker");
  const [apiBusy, setApiBusy] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

  // local editable inputs
  const [startEdit, setStartEdit] = useState("");
  const [endEdit, setEndEdit] = useState("");
  const [breakEdit, setBreakEdit] = useState("0");

  // live counter state
  const [liveNet, setLiveNet] = useState(0);
  const prevActiveTab = useRef(activeTab);

  const loadAll = async (dateStr) => {
    setErr("");
    const data = await apiGetDashboard(dateStr);
    setDay(data.day);
    setWeek(data.week);
    setSettings(data.settings);
    setStartEdit(data.day.start_time ?? "");
    setEndEdit(data.day.end_time ?? "");
    setBreakEdit(String(data.day.break_minutes ?? 0));
  };

  useEffect(() => {
    loadAll(selectedDate).catch((e) => setErr(String(e)));
  }, [selectedDate]);

  useEffect(() => {
    const previousTab = prevActiveTab.current;
    prevActiveTab.current = activeTab;

    if (previousTab === activeTab) return;
    if (activeTab !== "timetracker") return;
    loadAll(selectedDate).catch((e) => setErr(String(e)));
  }, [activeTab]);

  useEffect(() => subscribeToApiActivity(setApiBusy), []);

  useEffect(() => {
    let cancelled = false;

    fetch("/build-info.json", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setBuildInfo(data);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let showTimeoutId;
    let hideTimeoutId;

    if (apiBusy) {
      showTimeoutId = setTimeout(() => setShowLoadingOverlay(true), 0);
    } else {
      hideTimeoutId = setTimeout(() => setShowLoadingOverlay(false), 120);
    }

    return () => {
      clearTimeout(showTimeoutId);
      clearTimeout(hideTimeoutId);
    };
  }, [apiBusy]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Local ticking counter when running
  useEffect(() => {
    if (!day?.start_time) return;
    const isRunning = !day.end_time; // running if end_time is null/empty
    if (!isRunning) {
      setLiveNet(day.net_minutes ?? 0);
      return;
    }
    if (day.break_running) {
      setLiveNet(day.net_minutes ?? 0);
      return;
    }

    const tick = () => {
      const net = computeNetMinutesLive(day.start_time, day.break_minutes);
      setLiveNet(net);
    };

    // Refresh exactly on minute boundaries because UI is minute-based.
    tick();
    let minuteIntervalId = null;
    const timeoutId = setTimeout(() => {
      tick();
      minuteIntervalId = setInterval(tick, 60000);
    }, 60000 - (Date.now() % 60000));

    return () => {
      clearTimeout(timeoutId);
      if (minuteIntervalId) clearInterval(minuteIntervalId);
    };
  }, [day?.start_time, day?.end_time, day?.break_running, day?.break_minutes, day?.net_minutes]);

  const dailySoft = day?.targets?.daily_soft ?? 0;
  const dailyHard = day?.targets?.daily_hard ?? 0;

  // NEW backend returns week.weekly_soft/week.weekly_hard (preferred)
  // Backward compatible with your older structure week.targets.weekly_soft/week.weekly_hard
  const weeklySoft = week?.weekly_soft ?? week?.targets?.weekly_soft ?? 0;
  const weeklyHard = week?.weekly_hard ?? week?.targets?.weekly_hard ?? 0;

  const netToday = !day?.start_time ? 0 : day.end_time ? day.net_minutes ?? 0 : liveNet;

  const weekWithLiveToday = week
    ? {
        ...week,
        days: (week.days ?? []).map((d) =>
          d.date === selectedDate
            ? {
                ...d,
                net_minutes: netToday,
                running: !!day?.start_time && !day?.end_time,
                break_running: !!day?.break_running,
                break_minutes: day?.break_minutes ?? d.break_minutes,
              }
            : d
        ),
      }
    : null;

  const weekNet = weekWithLiveToday
    ? (weekWithLiveToday.days ?? []).reduce((sum, d) => sum + (d.net_minutes ?? 0), 0)
    : 0;

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

  const startBreak = async () => {
    try {
      const d = await apiPost(`/api/day/${selectedDate}/break/start`);
      setDay(d);
      setBreakEdit(String(d.break_minutes ?? 0));
      const w = await apiGet(`/api/week/${selectedDate}`);
      setWeek(w);
    } catch (e) {
      setErr(String(e));
    }
  };

  const endBreak = async () => {
    try {
      const d = await apiPost(`/api/day/${selectedDate}/break/end`);
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
    <div className="app-shell">
      {showLoadingOverlay && (
        <div className="loading-overlay" role="status" aria-live="polite" aria-label="Loading">
          <div className="loading-overlay__spinner" aria-hidden="true" />
          <span className="loading-overlay__label">Syncing...</span>
        </div>
      )}

      <Header activeTab={activeTab} setActiveTab={setActiveTab} buildInfo={buildInfo} />

      {activeTab === "timetracker" && (
      <div>
        <TimeTrackerView
          day={day}
          selectedDate = {selectedDate}
          setSelectedDate={setSelectedDate}
          week={weekWithLiveToday}
          windowWidth={windowWidth}
          startEdit={startEdit}
          endEdit={endEdit}
          breakEdit={breakEdit}
          onStartEdit={setStartEdit}
          onEndEdit={setEndEdit}
          onBreakEdit={setBreakEdit}
          startNow={startNow}
          endNow={endNow}
          addBreak={addBreak}
          subBreak={subBreak}
          startBreak={startBreak}
          endBreak={endBreak}
          saveManual={saveManual}
          dailySoft={dailySoft}
          dailyHard={dailyHard}
          weeklySoft={weeklySoft}
          weeklyHard={weeklyHard}
          netToday={netToday}
          weekNet={weekNet}
          loadAll={() => loadAll(selectedDate)}
          err={err}
          setErr={setErr}
        />
      </div>
      )}

      {activeTab === "holidays" && (
      <div>
        {week && (
          <HolidaysPanel
            year={new Date().getFullYear()}
          />
        )}
      </div>
      )}

      {activeTab === "timetracker" && settings && (
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 5, marginLeft: 10 }}>
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
