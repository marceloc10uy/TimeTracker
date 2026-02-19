import { minutesToHHMM } from "../time";
import './TimeTrackerView.css';

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
                fontSize: 14
            }}
            title={off.source ? `source: ${off.source}` : undefined}
        >
            {off.kind}
            {label}
        </span>
    );
}

export default function TimeTrackerView({
    day,
    selectedDate,
    setSelectedDate,
    week,
    startEdit,
    endEdit,
    breakEdit,
    onStartEdit,
    onEndEdit,
    onBreakEdit,
    startNow,
    endNow,
    addBreak,
    subBreak,
    startBreak,
    endBreak,
    saveManual,
    dailySoft,
    dailyHard,
    weeklySoft,
    weeklyHard,
    netToday,
    weekNet,
    loadAll,
    err,
    setErr
}) {
    return (
        <div>
            {/* Date/Refresh controls - centered */}
            <div style={{ display: "flex", justifyContent: "flex-start", width: "100%" }}>
                <div style={{ width: "100%", maxWidth: 920, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14, padding: "0 18px", boxSizing: "border-box" }}>
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
                            {day.end_time ? `End ${day.end_time}` : day.break_running ? "On break…" : "Running…"}
                        </div>
                    )}
                </div>
            </div>

            {/* Error message - centered */}
            {err && (
                <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                    <div
                        style={{
                            width: "100%",
                            maxWidth: 920,
                            marginBottom: 12,
                            padding: 10,
                            borderRadius: 10,
                            background: "rgba(255,0,0,0.12)",
                            border: "1px solid rgba(255,0,0,0.2)",
                            boxSizing: "border-box",
                        }}
                    >
                        {err}
                    </div>
                </div>
            )}

            {/* Centered content wrapper */}
            <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <div className="main-cards-layout">
                    <div className="left-column">
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
                                <button
                                    onClick={startBreak}
                                    disabled={!day?.start_time || !!day?.end_time || !!day?.break_running}
                                    style={{ padding: "10px 14px", borderRadius: 12, cursor: "pointer" }}
                                >
                                    Start break
                                </button>
                                <button
                                    onClick={endBreak}
                                    disabled={!day?.break_running}
                                    style={{ padding: "10px 14px", borderRadius: 12, cursor: "pointer" }}
                                >
                                    End break
                                </button>
                            </div>
                            {day?.break_running && (
                                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                                    Break in progress. Work timer paused.
                                </div>
                            )}

                            <div
                                style={{
                                    marginTop: 14,
                                    display: "grid",
                                    gridAutoFlow: "column",
                                    gap: 12,
                                    width: 'fit-content',
                                    justifyContent: "start",
                                    alignItems: "center",
                                }}
                            >
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <label style={{ fontSize: 12, opacity: 0.8 }}>Start time</label>
                                    <input
                                        type="time"
                                        value={startEdit}
                                        onChange={(e) => onStartEdit(e.target.value)}
                                        style={{ padding: "6px 8px", borderRadius: 10, fontSize: 13, width: 100, height: 20 }}
                                    />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <label style={{ fontSize: 12, opacity: 0.8 }}>End time</label>
                                    <input
                                        type="time"
                                        value={endEdit}
                                        onChange={(e) => onEndEdit(e.target.value)}
                                        style={{ padding: "6px 8px", borderRadius: 10, fontSize: 13, width: 100, height: 20 }}
                                    />
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <label style={{ fontSize: 12, opacity: 0.8 }}>Break</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={breakEdit}
                                        onChange={(e) => onBreakEdit(e.target.value)}
                                        style={{ padding: "6px 8px", borderRadius: 10, fontSize: 13, width: 100, height: 20 }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: 20 }}>
                                <button onClick={saveManual} style={{ padding: "10px 14px", borderRadius: 12, cursor: "pointer" }}>
                                    Save manual changes
                                </button>
                            </div>
                        </Card>

                        <Card title="Break Chips">
                            <div style={{ marginTop: 14 }}>
                                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
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
                    </div>

                    <div className="right-column">
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
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

