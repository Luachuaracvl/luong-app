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
      className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-sm font-medium text-slate-700 shadow-lg backdrop-blur-md lg:bottom-6"
      role="status"
      aria-live="polite"
    >
      {syncing ? (
        <>
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
          Đang đồng bộ...
        </>
      ) : (
        <>
          <span className="text-emerald-500">✓</span>
          {label ?? "Đã lưu"}
        </>
      )}
    </div>
  );
}
