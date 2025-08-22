export type OfferingTier = 'CASUALS' | 'OT_FULL_TIME' | 'OT_CASUALS' | 'LAST_RESORT_RN';

export const TIERS: OfferingTier[] = ['CASUALS', 'OT_FULL_TIME', 'OT_CASUALS', 'LAST_RESORT_RN'];

/**
 * Return the next tier in the offering sequence or null if at the end.
 */
export function nextTier(tier: OfferingTier): OfferingTier | null {
  const idx = TIERS.indexOf(tier);
  return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

/**
 * Human readable labels for each tier.
 */
export function tierLabel(tier: OfferingTier): string {
  switch (tier) {
    case 'CASUALS':
      return 'Casuals';
    case 'OT_FULL_TIME':
      return 'OT – Full-Time';
    case 'OT_CASUALS':
      return 'OT – Casuals';
    case 'LAST_RESORT_RN':
      return 'Last Resort – RN';
    default:
      return tier;
  }
}

/**
 * Whether switching to the given tier requires a confirmation modal.
 */
export function requiresConfirmation(tier: OfferingTier): boolean {
  return tier === 'LAST_RESORT_RN';
}
