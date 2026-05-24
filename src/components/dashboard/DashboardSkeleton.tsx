export function DashboardSkeleton() {
  return (
    <div className="dashboard-grid animate-pulse" aria-hidden>
      <div className="dashboard-area-kpis grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-white shadow-card" />
        ))}
      </div>
      <div className="dashboard-area-charts grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-white shadow-card" />
        <div className="h-64 rounded-xl bg-white shadow-card" />
      </div>
      <div className="dashboard-area-table h-64 rounded-xl bg-white shadow-card" />
    </div>
  );
}

export function DashboardLoadingOverlay() {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-label="Loading billing data"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-blue" />
        <p className="text-sm font-medium text-gray-600">Updating dashboard…</p>
      </div>
    </div>
  );
}
