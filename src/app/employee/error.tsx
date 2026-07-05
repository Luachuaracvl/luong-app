"use client";

export default function EmployeeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4">
      <div className="card max-w-md text-center">
        <p className="text-lg font-semibold text-fg">Không tải được trang nhân viên</p>
        <p className="mt-2 text-sm text-muted">Đã xảy ra lỗi. Thử tải lại trang.</p>
        <button type="button" className="btn btn-primary mt-4 w-full" onClick={reset}>
          Thử lại
        </button>
      </div>
    </div>
  );
}
