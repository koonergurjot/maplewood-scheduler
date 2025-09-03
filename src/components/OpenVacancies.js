import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import ConfirmDialog from "./ui/ConfirmDialog";
import Toast from "./ui/Toast";
import { TrashIcon } from "./ui/Icon";
import { getVacancyActiveDates } from "../lib/vacancy";

export default function OpenVacancies({ vacancies, stageDelete, undoDelete, staged, readOnly = false, }) {
  const [selected, setSelected] = useState([]);
  const [pending, setPending] = useState(null);

  const toggleSelect = (id) => {
    setSelected((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  };

  const openVacancies = vacancies.filter((v) => v.status !== "Filled" && v.status !== "Awarded");
  const allChecked = openVacancies.length > 0 && selected.length === openVacancies.length;

  const toggleAll = (checked) => {
    setSelected(checked ? openVacancies.map((v) => v.id) : []);
  };

  const confirmDelete = (ids) => {
    setPending(ids);
  };

  const handleConfirm = () => {
    if (pending) {
      stageDelete(pending);
      setSelected((ids) => ids.filter((id) => !pending.includes(id)));
      setPending(null);
    }
  };

  const handleCancel = () => setPending(null);

  const singleMessage = (v) =>
    `This will remove the vacancy for ${v.classification} – ${v.shiftDate} ${v.shiftStart}. You can undo within 10 seconds.`;

  return (
    _jsxs("div", {
      children: [
        !readOnly &&
          selected.length > 0 &&
          _jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              border: "1px solid var(--stroke)",
              padding: 8,
              borderRadius: 8,
            },
            children: [
              _jsxs("span", { children: [selected.length, " selected"] }),
              _jsx("button", {
                className: "btn btn-sm danger",
                "data-testid": "vacancy-delete-selected",
                "aria-label": "Delete selected vacancies",
                tabIndex: 0,
                onClick: () => confirmDelete(selected),
                title: "Delete selected vacancies",
                children: _jsxs("span", {
                  style: { display: "inline-flex", alignItems: "center", gap: 4 },
                  children: [
                    TrashIcon
                      ? _jsx(TrashIcon, { style: { width: 16, height: 16 }, "aria-hidden": "true" })
                      : "Delete",
                    _jsx("span", { children: "Delete selected" }),
                  ],
                }),
              }),
            ],
          }),
        _jsxs("table", {
          className: "responsive-table",
          children: [
            _jsx("thead", {
              children: _jsxs("tr", {
                children: [
                  _jsx("th", {
                    children: _jsx("input", {
                      type: "checkbox",
                      checked: allChecked,
                      onChange: (e) => toggleAll(e.target.checked),
                      "aria-label": "Select all vacancies",
                    }),
                  }),
                  _jsx("th", { children: "Role" }),
                  _jsx("th", { children: "Date" }),
                  _jsx("th", { children: "Time" }),
                  _jsx("th", { style: { textAlign: "right", minWidth: 60 }, children: "Actions" }),
                ],
              }),
            }),
            _jsxs("tbody", {
              children: [
                openVacancies.map((v) =>
                  _jsxs("tr", {
                    children: [
                      _jsx("td", {
                        children: _jsx("input", {
                          type: "checkbox",
                          checked: selected.includes(v.id),
                          onChange: () => toggleSelect(v.id),
                          "aria-label": `Select vacancy ${v.id}`,
                        }),
                      }),
                      _jsx("td", { children: v.classification }),
                      _jsx("td", {
                        children: _jsxs("div", {
                          style: { display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" },
                          children: [
                            _jsx("span", {
                              children:
                                v.startDate && v.endDate && v.startDate !== v.endDate
                                  ? `${v.startDate}–${v.endDate}`
                                  : v.shiftDate,
                            }),
                            v.startDate &&
                              v.endDate &&
                              v.startDate !== v.endDate &&
                              _jsx("span", {
                                className: "pill",
                                "data-testid": "coverage-chip",
                                children: (() => {
                                  const active = getVacancyActiveDates(v).length;
                                  const full = getVacancyActiveDates({ ...v, coverageDates: undefined }).length;
                                  return active === full
                                    ? "Coverage: all days"
                                    : `Coverage: ${active} days`;
                                })(),
                              }),
                          ],
                        }),
                      }),
                      _jsxs("td", { children: [v.shiftStart, "\u2013", v.shiftEnd] }),
                      _jsx("td", {
                        style: { textAlign: "right" },
                        children:
                          !readOnly &&
                          _jsx("button", {
                            className: "btn btn-sm",
                            title: "Delete vacancy",
                            "aria-label": "Delete vacancy",
                            "data-testid": `vacancy-delete-${v.id}`,
                            tabIndex: 0,
                            onClick: () => confirmDelete([v.id]),
                            children: TrashIcon
                              ? _jsxs(_Fragment, {
                                  children: [
                                    _jsx(TrashIcon, { style: { width: 16, height: 16 }, "aria-hidden": "true" }),
                                    _jsx("span", { className: "sr-only", children: "Delete vacancy" }),
                                  ],
                                })
                              : "Delete",
                          }),
                      }),
                    ],
                    key: v.id,
                  })
                ),
                openVacancies.length === 0 &&
                  _jsx("tr", {
                    children: _jsx("td", {
                      colSpan: 5,
                      style: { textAlign: "center" },
                      children: "No vacancies",
                    }),
                  }),
              ],
            }),
          ],
        }),
        _jsx(ConfirmDialog, {
          open: !!pending,
          title: "Delete vacancy?",
          body:
            pending && pending.length === 1
              ? singleMessage(vacancies.find((v) => v.id === pending[0]))
              : `This will remove ${pending?.length ?? 0} selected vacancies. You can undo within 10 seconds.`,
          onConfirm: handleConfirm,
          onCancel: handleCancel,
        }),
        _jsx(Toast, {
          open: !!staged,
          message: staged && staged.length > 1 ? "Vacancies deleted." : "Vacancy deleted.",
          actionLabel: "Undo",
          onAction: undoDelete,
        }),
      ],
    })
  );
}

