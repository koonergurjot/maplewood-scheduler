import { useMemo } from "react";
import type { Classification, Employee, Status } from "../types";
import { CLASSIFICATIONS } from "../types";
import EditableSelect from "./ui/EditableSelect";
import EditableText from "./ui/EditableText";
import EditableToggle from "./ui/EditableToggle";
import StatusPill from "./ui/StatusPill";

type EmployeeRowProps = {
  employee: Employee;
  onChange: (next: Employee) => void;
};

const statusOptions: { value: Status; label: string }[] = [
  { value: "FT", label: "FT" },
  { value: "PT", label: "PT" },
  { value: "Casual", label: "Casual" },
];

const classificationOptions = CLASSIFICATIONS.map((classification) => ({
  value: classification,
  label: classification,
}));

export default function EmployeeRow({ employee, onChange }: EmployeeRowProps) {
  const fullName = useMemo(() => {
    return [employee.firstName, employee.lastName]
      .map((part) => part?.trim())
      .filter((part) => !!part)
      .join(" ");
  }, [employee.firstName, employee.lastName]);

  const handleCommit = (updated: Employee) => {
    if (
      updated.firstName === employee.firstName &&
      updated.lastName === employee.lastName &&
      updated.classification === employee.classification &&
      updated.status === employee.status &&
      updated.seniorityRank === employee.seniorityRank &&
      updated.active === employee.active &&
      updated.activeLabel === employee.activeLabel
    ) {
      return;
    }

    onChange(updated);
  };

  return (
    <tr>
      <td></td>
      <td>
        <EditableText
          value={fullName}
          placeholder="Enter name"
          onSave={(value) => {
            const trimmed = value.trim();
            const [first, ...rest] = trimmed.split(/\s+/);
            handleCommit({
              ...employee,
              firstName: first ?? "",
              lastName: rest.join(" "),
            });
          }}
        />
      </td>
      <td></td>
      <td></td>
      <td>
        <EditableSelect
          value={employee.classification}
          options={classificationOptions}
          onSave={(value) => {
            handleCommit({
              ...employee,
              classification: value as Classification,
            });
          }}
        />
      </td>
      <td>
        <EditableSelect
          value={employee.status ?? ""}
          options={statusOptions}
          placeholder="Select status"
          onSave={(value) => {
            handleCommit({
              ...employee,
              status: value ? (value as Status) : undefined,
            });
          }}
        />
      </td>
      <td>
        <EditableText
          value={String(employee.seniorityRank ?? "")}
          placeholder="Rank"
          onSave={(value) => {
            const parsed = Number(value);
            const rank = Number.isFinite(parsed) && parsed > 0
              ? Math.round(parsed)
              : employee.seniorityRank;
            handleCommit({
              ...employee,
              seniorityRank: rank,
            });
          }}
          inputProps={{ type: "number", min: 1 }}
        />
      </td>
      <td>
        <EditableToggle
          value={employee.active}
          labels={{ on: "Active", off: "Inactive" }}
          renderPreview={(value) => (
            <StatusPill
              active={value}
              label={value ? "Active" : "Inactive"}
            />
          )}
          onSave={(value) => {
            handleCommit({
              ...employee,
              active: value,
              activeLabel: value ? "Active" : "Inactive",
            });
          }}
        />
      </td>
    </tr>
  );
}
