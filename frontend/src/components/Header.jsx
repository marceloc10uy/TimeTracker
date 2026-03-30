export default function Header({ activeTab, setActiveTab, buildInfo }) {
    const buildLabel = buildInfo
        ? `Build ${buildInfo.version} | ${buildInfo.commit} | ${buildInfo.built_at}`
        : "Build info unavailable";

    return (
        <div style={{ width: "100vw", marginTop: 30  }}>
            <h2 style={{ marginTop: 4, textAlign: "center" }}>Time Tracker</h2>
            <div
                style={{
                    textAlign: "center",
                    fontSize: 12,
                    opacity: 0.65,
                    marginTop: 6,
                    marginBottom: 14,
                }}
            >
                {buildLabel}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14 }}>
                <button
                    onClick={() => setActiveTab("timetracker")}
                    style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: activeTab === "timetracker" ? "2px solid currentColor" : "1px solid rgba(0,0,0,0.2)",
                        background: activeTab === "timetracker" ? "rgba(0,0,0,0.1)" : "transparent",
                        cursor: "pointer",
                        fontWeight: activeTab === "timetracker" ? "600" : "400",
                    }}
                >
                    Time Tracker
                </button>
                <button
                    onClick={() => setActiveTab("holidays")}
                    style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        border: activeTab === "holidays" ? "2px solid currentColor" : "1px solid rgba(0,0,0,0.2)",
                        background: activeTab === "holidays" ? "rgba(0,0,0,0.1)" : "transparent",
                        cursor: "pointer",
                        fontWeight: activeTab === "holidays" ? "600" : "400",
                    }}
                >
                    Holidays
                </button>
            </div>

        </div>
    );




}
