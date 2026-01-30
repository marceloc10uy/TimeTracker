async function logFetch(method, path, options = {}) {
    const start = performance.now();

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
            throw new Error(data?.detail || "API error");
        }

        return data;
    } catch (err) {
        console.error("❌ API ${method} ${path} failed", err);
        throw err
    }
}

export async function apiGet(path) {
    return logFetch("GET", path)
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

