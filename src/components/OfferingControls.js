import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { TIERS, tierLabel, requiresConfirmation, } from "../offering/offeringMachine";
/**
 * UI controls for managing the offering tier on a vacancy.
 * Simplified for demo/testing purposes.
 */
export default function OfferingControls({ vacancy, round }) {
    const [pendingTier, setPendingTier] = useState(null);
    const [note, setNote] = useState("");
    const tierName = `tier-${vacancy.id}`;
    const onSelect = (tier) => {
        if (requiresConfirmation(tier)) {
            setPendingTier(tier);
        }
        else {
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
    if (round.timeLeftMs <= 5 * 60000)
        countdownClass = "red";
    else if (round.timeLeftMs <= 30 * 60000)
        countdownClass = "yellow";
    return (_jsxs("div", { className: "offering-controls", children: [_jsx("div", { role: "radiogroup", "aria-label": "Offering Tier", children: TIERS.map((t) => (_jsxs("label", { style: { marginRight: "0.5rem" }, children: [_jsx("input", { type: "radio", name: tierName, checked: vacancy.offeringTier === t, onChange: () => onSelect(t) }), tierLabel(t)] }, t))) }), _jsxs("div", { className: `countdown ${countdownClass}`, "aria-live": "polite", children: [String(mins).padStart(2, "0"), ":", String(secs).padStart(2, "0")] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: vacancy.offeringAutoProgress !== false, onChange: (e) => round.onToggleAutoProgress(e.target.checked) }), " ", "Auto-advance"] }), _jsxs("label", { children: ["Round length (min)", _jsx("input", { type: "number", value: vacancy.offeringRoundMinutes ?? 120, onChange: (e) => round.setRoundMinutes(Number(e.target.value)) })] }), pendingTier && (_jsxs("div", { role: "alertdialog", "aria-modal": "true", className: "modal", children: [_jsx("p", { children: "Confirm Last Resort RN" }), _jsx("p", { children: "This tier is intended only when all other options are exhausted. Proceed?" }), _jsx("textarea", { value: note, onChange: (e) => setNote(e.target.value), placeholder: "Reason / notes" }), _jsxs("div", { children: [_jsx("button", { onClick: () => setPendingTier(null), children: "Cancel" }), _jsx("button", { onClick: confirm, children: "Confirm" })] })] }))] }));
}
