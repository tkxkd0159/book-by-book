export function ClubRouteLoader() {
  return (
    <section
      data-testid="club-route-loader"
      aria-label="Loading club section"
      className="overflow-hidden rounded-2xl border border-(--border) bg-(--surface-strong) p-5 shadow-[0_12px_28px_rgba(42,32,18,0.05)] sm:p-6"
    >
      <div className="space-y-5 animate-pulse">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="h-4 w-24 rounded-full bg-[color-mix(in_oklab,var(--surface)_72%,var(--border))]" />
            <div className="h-8 w-56 rounded-2xl bg-[color-mix(in_oklab,var(--surface)_88%,var(--border))]" />
            <div className="h-4 max-w-2xl rounded-full bg-[color-mix(in_oklab,var(--surface)_76%,var(--border))] sm:w-96" />
          </div>

          <div className="h-9 w-32 rounded-md bg-[color-mix(in_oklab,var(--surface)_82%,var(--border))]" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-3 rounded-2xl border border-(--border) bg-(--surface) p-4">
            <div className="h-5 w-24 rounded-full bg-[color-mix(in_oklab,var(--surface-strong)_82%,var(--border))]" />
            <div className="h-24 rounded-xl bg-[color-mix(in_oklab,var(--surface-strong)_90%,var(--border))]" />
          </div>
          <div className="space-y-3 rounded-2xl border border-(--border) bg-(--surface) p-4">
            <div className="h-5 w-32 rounded-full bg-[color-mix(in_oklab,var(--surface-strong)_82%,var(--border))]" />
            <div className="space-y-2">
              <div className="h-4 rounded-full bg-[color-mix(in_oklab,var(--surface-strong)_90%,var(--border))]" />
              <div className="h-4 rounded-full bg-[color-mix(in_oklab,var(--surface-strong)_90%,var(--border))]" />
              <div className="h-4 w-4/5 rounded-full bg-[color-mix(in_oklab,var(--surface-strong)_90%,var(--border))]" />
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-(--border) bg-(--surface) p-4 sm:col-span-2 xl:col-span-1">
            <div className="h-5 w-20 rounded-full bg-[color-mix(in_oklab,var(--surface-strong)_82%,var(--border))]" />
            <div className="space-y-2">
              <div className="h-10 rounded-xl bg-[color-mix(in_oklab,var(--surface-strong)_90%,var(--border))]" />
              <div className="h-10 rounded-xl bg-[color-mix(in_oklab,var(--surface-strong)_90%,var(--border))]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
