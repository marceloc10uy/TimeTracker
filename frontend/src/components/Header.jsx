export default function Header({ activeTab, setActiveTab, testFrontendSentry, testBackendSentry, frontendSentryStatus }) {

    return (
        <div style={{ width: "100vw", marginTop: 30  }}>
            <h2 style={{ marginTop: 4, textAlign: "center" }}>Time Tracker</h2>

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

            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(0,0,0,0.15)",
                    background: "rgba(0,0,0,0.04)",
                    fontSize: 13,
                }}>
                    Frontend Sentry: {frontendSentryStatus?.enabled ? "enabled" : frontendSentryStatus?.dsnPresent ? "dsn found, not initialized" : "disabled"}
                </div>
                <button
                    onClick={testFrontendSentry}
                    style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "1px solid rgba(180,0,0,0.35)",
                        background: "rgba(180,0,0,0.08)",
                        cursor: "pointer",
                    }}
                >
                    Test Frontend Sentry
                </button>
                <button
                    onClick={testBackendSentry}
                    style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "1px solid rgba(180,0,0,0.35)",
                        background: "rgba(180,0,0,0.08)",
                        cursor: "pointer",
                    }}
                >
                    Test Backend Sentry
                </button>
            </div>
        </div>
    );




}
