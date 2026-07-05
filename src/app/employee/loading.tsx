export default function EmployeeLoading() {
  return (
    <div className="app-shell">
      <div className="main-area flex flex-1 flex-col lg:ml-60">
        <div className="topbar">
          <div className="skeleton h-6 w-48 rounded-lg" />
        </div>
        <main className="page-content space-y-4">
          <div className="skeleton h-36 w-full rounded-[var(--radius-lg)]" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="skeleton h-24 rounded-[var(--radius-lg)]" />
            <div className="skeleton h-24 rounded-[var(--radius-lg)]" />
          </div>
        </main>
      </div>
    </div>
  );
}
