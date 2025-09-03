import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "./utils/api";
export default function Agreement() {
    const navigate = useNavigate();
    const [uploaded, setUploaded] = useState(false);
    const [query, setQuery] = useState("");
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [limit, setLimit] = useState(5);
    const [context, setContext] = useState(1);
    const [results, setResults] = useState([]);
    const onUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const form = new FormData();
        form.append("file", file);
        await authFetch("/api/collective-agreement/upload", {
            method: "POST",
            body: form,
        });
        setUploaded(true);
    };
    const search = async () => {
        const res = await authFetch(`/api/collective-agreement/search?q=${encodeURIComponent(query)}&caseSensitive=${caseSensitive}&limit=${limit}&context=${context}`);
        const data = await res.json();
        const matches = (data.matches ?? []);
        setResults(matches);
    };
    return (_jsxs("div", { className: "container", children: [_jsx("div", { className: "nav", children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("button", { className: "btn", onClick: () => navigate("/"), children: "Back" }), _jsx("div", { className: "title", children: "Collective Agreement" })] }) }), _jsxs("div", { className: "card", style: { padding: 16 }, children: [!uploaded && (_jsx("div", { children: _jsx("input", { type: "file", onChange: onUpload }) })), uploaded && (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [_jsx("input", { placeholder: "Search policy\u2026", value: query, onChange: (e) => setQuery(e.target.value) }), _jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [_jsxs("label", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("input", { type: "checkbox", checked: caseSensitive, onChange: (e) => setCaseSensitive(e.target.checked) }), "Case sensitive"] }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 4 }, children: ["Max results", _jsx("input", { type: "number", min: 1, value: limit, onChange: (e) => setLimit(parseInt(e.target.value, 10) || 1), style: { width: 60 } })] }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 4 }, children: ["Context lines", _jsx("input", { type: "number", min: 0, value: context, onChange: (e) => setContext(parseInt(e.target.value, 10) || 0), style: { width: 60 } })] })] }), _jsx("button", { className: "btn", onClick: search, children: "Search" }), _jsx("ul", { children: results.map((r, i) => (_jsxs("li", { children: [_jsx("div", { children: r.line }), _jsxs("small", { children: ["Line ", r.lineNumber, ": ", r.context.join(" — ")] })] }, i))) })] }))] })] }));
}
