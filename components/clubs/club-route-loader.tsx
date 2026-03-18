export function ClubRouteLoader() {
  return (
    <section
      data-testid="club-route-loader"
      aria-label="Loading club section"
      className="club-route-loader relative overflow-hidden rounded-3xl border border-(--border) bg-(--surface-strong) px-6 py-10 shadow-[0_18px_42px_rgba(42,32,18,0.08)] sm:px-8 sm:py-12"
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-28 rounded-full bg-[#fff3d0]/80 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 right-12 h-24 w-24 rounded-full bg-[#d8eee7]/70 blur-3xl" />

      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
        <div className="club-route-loader-stage" aria-hidden>
          <div className="club-route-loader-book">
            <div className="club-route-loader-cover club-route-loader-cover-left" />
            <div className="club-route-loader-cover club-route-loader-cover-right" />
            <div className="club-route-loader-spine" />
            <div className="club-route-loader-paper club-route-loader-paper-left" />
            <div className="club-route-loader-paper club-route-loader-paper-right" />
            <span className="club-route-loader-turn-page club-route-loader-turn-page-1" />
            <span className="club-route-loader-turn-page club-route-loader-turn-page-2" />
            <span className="club-route-loader-turn-page club-route-loader-turn-page-3" />
            <span className="club-route-loader-turn-page club-route-loader-turn-page-4" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-lg font-semibold">Opening the next chapter...</p>
          <p className="text-sm text-(--muted)">
            Turning through the club shelves.
          </p>
        </div>
      </div>
    </section>
  );
}
