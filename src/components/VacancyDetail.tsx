import OfferingControls from './OfferingControls';
import { useOfferingRound, Vacancy } from '../offering/useOfferingRound';

// Dummy store placeholder for demo/testing
function useVacancyStore() {
  return {
    updateVacancy: (_id: string, _patch: Partial<Vacancy>) => {},
    currentUser: 'demo-user',
  };
}

export default function VacancyDetail({ vacancy }: { vacancy: Vacancy }) {
  const { updateVacancy, currentUser } = useVacancyStore();
  const round = useOfferingRound(vacancy, (patch) => updateVacancy(vacancy.id, patch), currentUser);
  return (
    <div>
      <h2>Vacancy Detail</h2>
      <OfferingControls vacancy={vacancy} round={round} />
    </div>
  );
}
