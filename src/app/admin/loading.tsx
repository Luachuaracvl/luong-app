export default function AdminLoading() {
  return (
    <div className="app-shell">
      <div className="main-area flex flex-1 flex-col lg:ml-60">
        <div className="topbar">
          <div className="skeleton h-6 w-40 rounded-lg" />
        </div>
        <main className="page-content space-y-4">
          <div className="skeleton h-32 w-full rounded-[var(--radius-lg)]" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-24 rounded-[var(--radius-lg)]" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
