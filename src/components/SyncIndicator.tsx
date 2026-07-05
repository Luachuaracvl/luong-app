"use client";

export function SyncIndicator({
  syncing,
  label,
}: {
  syncing: boolean;
  label?: string;
}) {
  if (!syncing && !label) return null;

  return (
    <div
      className="sync-indicator"
      role="status"
      aria-live="polite"
    >
      {syncing ? (
        <>
          <span className="sync-dot" />
          Đang đồng bộ...
        </>
      ) : (
        <>
          <span className="text-success">✓</span>
          {label ?? "Đã lưu"}
        </>
      )}
    </div>
  );
}
