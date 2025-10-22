import { useMemo } from "react";
import type { ExcelHeaderPreviewRow } from "../App";
import Button from "./ui/Button";
import Modal from "./ui/Modal";

interface HeaderRowPickerModalProps {
  open: boolean;
  rows: ExcelHeaderPreviewRow[];
  totalRows: number;
  selectedIndex: number | null;
  isSubmitting?: boolean;
  onSelect: (index: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const formatCellValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}`;
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  return String(value);
};

export function HeaderRowPickerModal({
  open,
  rows,
  totalRows,
  selectedIndex,
  isSubmitting = false,
  onSelect,
  onConfirm,
  onCancel,
}: HeaderRowPickerModalProps) {
  const columnCount = useMemo(() => {
    if (!rows.length) return 0;
    const longest = rows.reduce(
      (max, row) => Math.max(max, row.values.length),
      0,
    );
    return Math.min(6, Math.max(longest, 1));
  }, [rows]);

  const hasMoreRows = totalRows > rows.length;

  return (
    <Modal
      open={open}
      title="Select Header Row"
      onClose={onCancel}
      footer={
        <div className="header-picker__footer">
          <Button onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={selectedIndex === null || isSubmitting}
          >
            {isSubmitting ? "Loading…" : "Use Selected Row"}
          </Button>
        </div>
      }
    >
      <div className="header-picker">
        <p className="header-picker__intro">
          We couldn’t detect the column headers automatically. Choose the row
          that contains your column names.
        </p>
        {rows.length > 0 ? (
          <div className="header-picker__table-wrapper">
            <table className="header-picker__table">
              <thead>
                <tr>
                  <th className="header-picker__col-select">Header</th>
                  <th className="header-picker__col-index">Row</th>
                  {Array.from({ length: columnCount }, (_, columnIndex) => (
                    <th key={columnIndex}>{`Column ${columnIndex + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isSelected = selectedIndex === row.index;
                  return (
                    <tr
                      key={row.index}
                      className={`header-picker__row${
                        isSelected ? " header-picker__row--active" : ""
                      }`}
                    >
                      <td className="header-picker__col-select">
                        <label className="header-picker__selector">
                          <input
                            type="radio"
                            name="headerRow"
                            checked={isSelected}
                            onChange={() => onSelect(row.index)}
                            disabled={isSubmitting}
                          />
                          <span className="header-picker__selector-label">
                            Select
                          </span>
                        </label>
                      </td>
                      <td className="header-picker__col-index">
                        Row {row.index + 1}
                      </td>
                      {Array.from({ length: columnCount }, (_, columnIndex) => (
                        <td key={columnIndex} className="header-picker__cell">
                          {formatCellValue(row.values[columnIndex])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="header-picker__empty">No preview available.</div>
        )}
        {hasMoreRows && (
          <div className="header-picker__note">
            Showing first {rows.length} of {totalRows} rows.
          </div>
        )}
      </div>
    </Modal>
  );
}

export default HeaderRowPickerModal;
