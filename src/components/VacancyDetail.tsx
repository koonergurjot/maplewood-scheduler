import { useState } from "react";
import OfferingControls from "./OfferingControls";
import ConfirmDialog from "./ui/ConfirmDialog";
import { useOfferingRound } from "../offering/useOfferingRound";
import type { Vacancy } from "../types";

// Dummy store placeholder for demo/testing
function useVacancyStore() {
  return {
    updateVacancy: (_id: string, _patch: Partial<Vacancy>) => {},
    deleteVacancy: (_id: string) => {},
    currentUser: "demo-user",
  };
}

interface VacancyDetailProps {
  vacancy: Vacancy;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

export default function VacancyDetail({ vacancy, onDelete, readOnly = false }: VacancyDetailProps) {
  const { updateVacancy, deleteVacancy, currentUser } = useVacancyStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const round = useOfferingRound(
    vacancy,
    (patch) => updateVacancy(vacancy.id, patch),
    currentUser,
  );

  const handleDelete = () => {
    if (onDelete) {
      onDelete(vacancy.id);
    } else {
      deleteVacancy(vacancy.id);
    }
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
