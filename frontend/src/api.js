import { captureFrontendException } from "./sentry.js";

let activeRequestCount = 0;
const listeners = new Set();

function notifyApiActivity() {
    const isBusy = activeRequestCount > 0;
    listeners.forEach((listener) => listener(isBusy));
}

function beginApiRequest() {
    activeRequestCount += 1;
    notifyApiActivity();
}

function endApiRequest() {
    activeRequestCount = Math.max(0, activeRequestCount - 1);
    notifyApiActivity();
}

export function subscribeToApiActivity(listener) {
    listeners.add(listener);
    listener(activeRequestCount > 0);

    return () => {
        listeners.delete(listener);
    };
}

async function logFetch(method, path, options = {}) {
    const start = performance.now();
    beginApiRequest();

    try {
        const res = await fetch(path, options);
        const duration = Math.round(performance.now() - start);

        const text = await res.text();
        let data;

        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            console.error("❌ API returned non-JSON:", {
                method,
                path,
                status: res.status,
                response: text,
            });
            throw new Error("Non-JSON response from API");
        }

        console.info(
            `API ${method} ${path} -> ${res.status} (${duration}ms)`
        );

        if (!res.ok) {
            console.error("❌ API error payload:", data);
            const requestId = data?.request_id || res.headers.get("X-Request-ID");
            const detail = data?.detail || "API error";
            const message = requestId
                ? `${detail} (request ${requestId})`
                : detail;
            throw new Error(message);
        }

        return data;
    } catch (err) {
        console.error("❌ API ${method} ${path} failed", err);
        captureFrontendException(err, { method, path });
        throw err
    } finally {
        endApiRequest();
    }
}

export async function apiGet(path) {
    return logFetch("GET", path)
}

export async function apiGetDashboard(dateStr) {
    return apiGet(`/api/dashboard/${dateStr}`);
}

export async function apiPost(path, body) {
    return logFetch("POST", path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json"} : undefined,
        body: body ? JSON.stringify(body) : undefined
    });
}

export async function apiPatch(path, body) {
    return logFetch("PATCH", path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

export async function apiDelete(path, body) {
    return logFetch("DELETE", path, {
       method: "DELETE",
       headers: body ? { "Content-Type": "application/json"} : undefined,
       body: body ? JSON.stringify(body) : undefined
    });
}

export async function apiGetRecurringHolidays() {
    return apiGet("/api/recurring-holidays");
}

export async function apiUpsertRecurringHoliday(payload) {
    return apiPost("/api/recurring-holidays", payload)
}

export async function apiDeleteRecurringHoliday(id) {
    return apiDelete(`/api/recurring-holidays/${id}`)
}

export async function apiListTimeOff(fromDate, toDate) {
    const qs = new URLSearchParams();
    if (fromDate) qs.set("from_date", fromDate);
    if (toDate) qs.set("to_date", toDate);
    return apiGet(`/api/time-off?${qs.toString()}`);
}

export async function apiCreateTimeOff(payload) {
    return apiPost("/api/time-off", payload)
}

export async function apiDeleteTimeOff(id) {
    return apiDelete(`/api/time-off/${id}`);
}

export async function apiGetCalendarYear(year) {
    return apiGet(`/api/calendar/year/${year}`);
}

