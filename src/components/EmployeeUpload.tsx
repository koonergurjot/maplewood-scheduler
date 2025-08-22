import { useState } from "react";
import type { Employee } from "../App";
import { parseEmployees } from "../utils/parseEmployees";

type Props = {
  onEmployeesParsed: (employees: Employee[]) => void;
};

export default function EmployeeUpload({ onEmployeesParsed }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const employees = await parseEmployees(file);
      onEmployeesParsed(employees);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to parse file");
    }
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFile} />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
