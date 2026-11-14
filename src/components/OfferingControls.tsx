import { useState } from "react";
import {
  TIERS,
  tierLabel,
  OfferingTier,
  requiresConfirmation,
} from "../offering/offeringMachine";
import { UseOfferingRound, Vacancy } from "../offering/useOfferingRound";

interface Props {
  vacancy: Vacancy;
  round: UseOfferingRound;
}

/**
 * UI controls for managing the offering tier on a vacancy.
 * Simplified for demo/testing purposes.
 */
export default function OfferingControls({ vacancy, round }: Props) {
  const [pendingTier, setPendingTier] = useState<OfferingTier | null>(null);
  const [note, setNote] = useState("");
  const tierName = `tier-${vacancy.id}`;

  const onSelect = (tier: OfferingTier) => {
    if (requiresConfirmation(tier)) {
      setPendingTier(tier);
    } else {
      round.onManualChangeTier(tier);
    }
  };

  const confirm = () => {
    if (pendingTier) {
      round.onManualChangeTier(pendingTier, note || undefined);
      setPendingTier(null);
      setNote("");
    }
  };

  const mins = Math.max(0, Math.floor(round.timeLeftMs / 60000));
  const secs = Math.max(0, Math.floor((round.timeLeftMs % 60000) / 1000));

  let countdownClass = "";
  if (round.timeLeftMs <= 5 * 60000) countdownClass = "red";
  else if (round.timeLeftMs <= 30 * 60000) countdownClass = "yellow";

  return (
    <div className="offering-controls">
      <div role="radiogroup" aria-label="Offering Tier">
        {TIERS.map((t) => (
          <label key={t} style={{ marginRight: "0.5rem" }}>
            <input
              type="radio"
              name={tierName}
              checked={vacancy.offeringTier === t}
              onChange={() => onSelect(t)}
            />
            {tierLabel(t)}
          </label>
        ))}
      </div>
      <div className={`countdown ${countdownClass}`} aria-live="polite">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </div>
      <label>
        <input
          type="checkbox"
          checked={vacancy.offeringAutoProgress !== false}
          onChange={(e) => round.onToggleAutoProgress(e.target.checked)}
        />{" "}
        Auto-advance
      </label>
      <label>
        Round length (min)
        <input
          type="number"
          value={vacancy.offeringRoundMinutes ?? 120}
          onChange={(e) => round.setRoundMinutes(Number(e.target.value))}
        />
      </label>
      {pendingTier && (
        <div role="alertdialog" aria-modal="true" role="dialog" aria-modal="true" className="modal">
          <p>Confirm Last Resort RN</p>
          <p>
            This tier is intended only when all other options are exhausted.
            Proceed?
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason / notes"
          />
          <div>
            <button onClick={() => setPendingTier(null)}>Cancel</button>
            <button onClick={confirm}>Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
}
