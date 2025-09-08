import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from "react";
export default function BlocksAndSingles({ vacancies, onAwardBundle, onDeleteBundle, onDeleteSingle, }) {
    const { blocks, singles } = useMemo(() => {
        const groups = new Map();
        const singles = [];
        for (const v of vacancies) {
            if (v.bundleId) {
                const arr = groups.get(v.bundleId) || [];
                arr.push(v);
                groups.set(v.bundleId, arr);
            }
            else {
                singles.push(v);
            }
        }
        const blocks = Array.from(groups.entries()).filter(([, arr]) => arr.length >= 2);
        for (const [id, arr] of groups) {
            if (arr.length < 2)
                singles.push(...arr);
        }
        blocks.sort((a, b) => a[1][0].shiftDate.localeCompare(b[1][0].shiftDate));
        singles.sort((a, b) => a.shiftDate === b.shiftDate
            ? a.shiftStart.localeCompare(b.shiftStart)
            : a.shiftDate.localeCompare(b.shiftDate));
        return { blocks, singles };
    }, [vacancies]);
    return (_jsx("table", { className: "vacancies", children: _jsxs("tbody", { children: [blocks.map(([id, items]) => (_jsxs("tr", { children: [_jsxs("td", { children: [_jsxs("strong", { children: ["Block: ", items[0].shiftDate, " \u2013 ", items[items.length - 1].shiftDate] }), " ", "(", items.length, " days)"] }), _jsxs("td", { children: [_jsx("button", { className: "btn btn-sm", onClick: () => onAwardBundle(id), children: "Award" }), _jsx("button", { className: "btn btn-sm danger", onClick: () => onDeleteBundle(id), style: { marginLeft: 8 }, children: "Delete" })] })] }, id))), singles.map((v) => (_jsxs("tr", { children: [_jsxs("td", { children: [v.shiftDate, " \u2022 ", v.shiftStart, "\u2013", v.shiftEnd, " \u2022 ", v.classification] }), _jsx("td", { children: _jsx("button", { className: "btn btn-sm danger", onClick: () => onDeleteSingle(v.id), children: "Delete" }) })] }, v.id)))] }) }));
}
