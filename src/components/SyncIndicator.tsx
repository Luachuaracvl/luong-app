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
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-300" />
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
