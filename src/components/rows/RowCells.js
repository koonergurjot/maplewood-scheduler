import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { fmtCountdown, deadlineFor, pickWindowMinutes } from "../../lib/vacancy";
import { minutesBetween } from "../../lib/dates";
export function CellSelect({ checked, onChange, ariaLabel = "Select row" }) {
    return _jsx("td", { className: "cell-select", children: _jsx("input", { type: "checkbox", checked: checked, onChange: onChange, "aria-label": ariaLabel }) });
}
export function CellDetails({ title, subtitle, rightTag }) {
    return (_jsx("td", { className: "cell-details", children: _jsxs("div", { className: "cell-details__wrap", children: [_jsxs("div", { className: "cell-details__left", children: [_jsx("div", { className: "cell-details__title", children: title }), subtitle && _jsx("div", { className: "cell-details__subtitle", children: subtitle })] }), rightTag && _jsx("div", { className: "cell-details__tag", children: rightTag })] }) }));
}
export function CellCountdown({ source, settings }) {
    const now = Date.now();
    const deadline = deadlineFor(source, settings).getTime();
    const msLeft = deadline - now;
    const winMin = pickWindowMinutes(source, settings);
    const sinceKnownMin = minutesBetween(new Date(), new Date(source.knownAt));
    const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin));
    let cdClass = "cd-green";
    if (msLeft <= 0)
        cdClass = "cd-red";
    else if (pct < 0.25)
        cdClass = "cd-yellow";
    return _jsx("td", { className: "cell-countdown", style: { whiteSpace: "nowrap", textAlign: "center", verticalAlign: "middle" }, children: _jsx("div", { className: `countdown ${cdClass}`, children: fmtCountdown(msLeft) }) });
}
export function CellActions({ children }) {
    return _jsx("td", { className: "cell-actions", style: { textAlign: "center", verticalAlign: "middle" }, children: children });
}
