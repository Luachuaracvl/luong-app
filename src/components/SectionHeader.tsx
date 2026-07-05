"use client";

export function SectionHeader({
  title,
  description,
  action,
  compact,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${
        compact ? "section-header-compact" : "mb-4"
      }`}
    >
      <div>
        <h2 className={`font-semibold text-fg ${compact ? "section-title" : "text-base sm:text-lg"}`}>
          {title}
        </h2>
        {description && (
          <p className={`mt-0.5 text-sm text-muted ${compact ? "section-desc" : ""}`}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {action}
        </div>
      )}
    </div>
  );
}
