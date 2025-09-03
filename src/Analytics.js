import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { Bar, Line } from "react-chartjs-2";
import { authFetch, setToken } from "./utils/api";
import { Chart, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, } from "chart.js";
Chart.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);
export default function Analytics() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const controllerRef = useRef(null);
    const promptForToken = () => {
        const token = window.prompt("Enter API token");
        if (token)
            setToken(token);
        return token;
    };
    const loadData = async () => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setLoading(true);
        setError(null);
        const maxRetries = 3;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await authFetch("/api/analytics", {
                    signal: controller.signal,
                });
                const data = await response.json();
                setRows(data);
                setLoading(false);
                return;
            }
            catch (err) {
                if (err.name === "AbortError") {
                    setLoading(false);
                    controllerRef.current = null;
                    return;
                }
                if (err.status === 401) {
                    if (promptForToken()) {
                        continue;
                    }
                    err = new Error("Unauthorized");
                }
                if (attempt < maxRetries - 1) {
                    const delay = 500 * 2 ** attempt;
                    await new Promise((res) => setTimeout(res, delay));
                }
                else {
                    setError(err.message);
                    setLoading(false);
                }
            }
        }
    };
    const handleExport = async (format) => {
        try {
            const response = await authFetch(`/api/analytics/export?format=${format}`);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `analytics.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }
        catch (err) {
            if (err.status === 401) {
                if (promptForToken()) {
                    return handleExport(format);
                }
                setError("Unauthorized");
            }
            else {
                setError(err.message);
            }
        }
    };
    useEffect(() => {
        loadData();
        return () => controllerRef.current?.abort();
    }, []);
    if (loading) {
        return (_jsxs("div", { style: { padding: 20 }, children: [_jsx("h1", { children: "Analytics" }), _jsx("button", { onClick: promptForToken, className: "btn", style: { marginBottom: 10 }, children: "Set API Token" }), _jsx("p", { children: "Loading..." })] }));
    }
    if (error) {
        return (_jsxs("div", { style: { padding: 20 }, children: [_jsx("h1", { children: "Analytics" }), _jsx("button", { onClick: promptForToken, className: "btn", style: { marginBottom: 10 }, children: "Set API Token" }), _jsxs("p", { children: ["Error loading analytics: ", error] }), _jsx("button", { onClick: loadData, className: "btn", children: "Retry" })] }));
    }
    const labels = rows.map((r) => r.period);
    const posted = rows.map((r) => r.posted);
    const filled = rows.map((r) => r.awarded);
    const cancellationRate = rows.map((r) => r.cancellationRate * 100);
    const overtime = rows.map((r) => r.overtime);
    return (_jsxs("div", { style: { padding: 20 }, children: [_jsx("h1", { children: "Analytics" }), _jsx("button", { onClick: promptForToken, className: "btn", style: { marginBottom: 10 }, children: "Set API Token" }), _jsx("div", { style: { width: 600 }, children: _jsx(Bar, { data: {
                        labels,
                        datasets: [
                            {
                                label: "Posted",
                                data: posted,
                                backgroundColor: "rgba(54,162,235,0.5)",
                            },
                            {
                                label: "Filled",
                                data: filled,
                                backgroundColor: "rgba(75,192,192,0.5)",
                            },
                        ],
                    } }) }), _jsx("div", { style: { width: 600, marginTop: 40 }, children: _jsx(Line, { data: {
                        labels,
                        datasets: [
                            {
                                label: "Cancellation %",
                                data: cancellationRate,
                                borderColor: "red",
                            },
                            {
                                label: "Overtime Hours",
                                data: overtime,
                                borderColor: "orange",
                            },
                        ],
                    } }) }), _jsxs("div", { style: { marginTop: 20 }, children: [_jsx("button", { onClick: () => handleExport("csv"), className: "btn", children: "Export CSV" }), _jsx("button", { onClick: () => handleExport("pdf"), className: "btn", style: { marginLeft: 10 }, children: "Export PDF" })] })] }));
}
