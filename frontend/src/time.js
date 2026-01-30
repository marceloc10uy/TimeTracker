export function pad2(n) {
    return String(n).padStart(2, "0");
}

export function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function minutesToHHMM(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
}

//Assumes same-day (no midnight crossing)
export function computeNetMinutesLive(startHHMM, breakMinutes) {
    if (!startHHMM) return 0;
    const [sh, sm] = startHHMM.split(":").map(Number);
    const start = new Date();
    start.setHours(sh, sm, 0, 0);
    const now = new Date();
    const gross = Math.max(0, Math.floor((now - start) / 60000));
    return Math.max(0, gross - (breakMinutes ?? 0));
}