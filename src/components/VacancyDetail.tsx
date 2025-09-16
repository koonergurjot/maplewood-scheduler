import { useCallback, useState } from "react";
import OfferingControls from "./OfferingControls";
import ConfirmDialog from "./ui/ConfirmDialog";
import { useOfferingRound } from "../offering/useOfferingRound";
import type { Vacancy } from "../types";

interface VacancyDetailProps {
  vacancy: Vacancy;
  onUpdate: (id: string, patch: Partial<Vacancy>) => void;
  onDelete: (id: string) => void;
  currentUser?: string;
  readOnly?: boolean;
}

export default function VacancyDetail({
  vacancy,
  onUpdate,
  onDelete,
  currentUser = "system",
  readOnly = false,
}: VacancyDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleUpdate = useCallback(
    (patch: Partial<Vacancy>) => {
      onUpdate(vacancy.id, patch);
    },
    [onUpdate, vacancy.id],
  );

  const round = useOfferingRound(vacancy, handleUpdate, currentUser);

  const handleDelete = () => {
    onDelete(vacancy.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2>Vacancy Detail</h2>
        {!readOnly && (
          <button
            className="btn danger"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete vacancy permanently"
            aria-label="Delete vacancy"
          >
            Delete
          </button>
        )}
      </div>
      
      <div style={{ marginBottom: 16 }}>
        <p><strong>Date:</strong> {vacancy.shiftDate}</p>
        <p><strong>Time:</strong> {vacancy.shiftStart} - {vacancy.shiftEnd}</p>
        <p><strong>Classification:</strong> {vacancy.classification}</p>
        <p><strong>Wing:</strong> {vacancy.wing || 'N/A'}</p>
        <p><strong>Status:</strong> {vacancy.status}</p>
        <p><strong>Reason:</strong> {vacancy.reason}</p>
      </div>

      <OfferingControls vacancy={vacancy} round={round} />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete vacancy?"
        body="This action permanently deletes the vacancy. This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
