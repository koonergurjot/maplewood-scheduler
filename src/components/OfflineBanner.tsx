import useOfflineStatus from "../hooks/useOfflineStatus";

export default function OfflineBanner() {
  const { isOffline } = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
      style={{
        margin: "16px 24px",
        padding: "12px 16px",
        borderRadius: 12,
        borderLeft: "4px solid var(--warn)",
        background: "var(--cardAlt)",
        boxShadow: "inset 0 0 0 1px rgba(180, 83, 9, 0.2)",
        color: "var(--text)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        lineHeight: 1.45,
      }}
    >
      <span style={{ fontWeight: 700 }}>Working offline.</span>
      <span>We'll sync your changes once you're back online.</span>
    </div>
  );
}
