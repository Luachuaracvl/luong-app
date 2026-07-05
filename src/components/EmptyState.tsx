"use client";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div
        className="mb-3 flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] text-2xl"
        style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}
      >
        ◌
      </div>
      <p className="font-medium text-fg">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
