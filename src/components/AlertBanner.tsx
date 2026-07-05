"use client";

export function AlertBanner({
  type,
  message,
  onDismiss,
}: {
  type: "success" | "error";
  message: string;
  onDismiss?: () => void;
}) {
  if (!message) return null;

  return (
    <div
      className={`alert mb-5 ${type === "success" ? "alert-success" : "alert-error"}`}
      role="alert"
    >
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="alert-dismiss"
          aria-label="Đóng"
        >
          ✕
        </button>
      )}
    </div>
  );
}
