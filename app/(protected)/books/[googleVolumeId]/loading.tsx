function PulseBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-(--border)/60 ${className}`}
      aria-hidden
    />
  );
}

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <section className="relative overflow-hidden rounded-2xl border-2 border-(--border) bg-(--surface-strong) p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-(--accent)/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-4 h-56 w-56 rounded-full bg-[#c78d42]/10 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[220px_1fr]">
          <PulseBlock className="mx-auto aspect-2/3 w-full max-w-55 rounded-xl" />

          <div className="space-y-5">
            <div className="space-y-3">
              <PulseBlock className="h-6 w-36" />
              <PulseBlock className="h-10 w-11/12" />
              <PulseBlock className="h-6 w-8/12" />
              <PulseBlock className="h-5 w-7/12" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <PulseBlock className="h-16 w-full" />
              <PulseBlock className="h-16 w-full" />
              <PulseBlock className="h-16 w-full" />
              <PulseBlock className="h-16 w-full" />
              <PulseBlock className="h-16 w-full sm:col-span-2 xl:col-span-2" />
            </div>

            <div className="flex flex-wrap gap-2">
              <PulseBlock className="h-8 w-24 rounded-full" />
              <PulseBlock className="h-8 w-32 rounded-full" />
              <PulseBlock className="h-8 w-28 rounded-full" />
            </div>

            <div className="flex gap-2">
              <PulseBlock className="h-10 w-32" />
              <PulseBlock className="h-10 w-44" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-(--border)/90 bg-(--surface-strong) p-7 sm:p-8">
        <PulseBlock className="h-7 w-40" />
        <div className="mt-5 space-y-3">
          <PulseBlock className="h-4 w-full" />
          <PulseBlock className="h-4 w-full" />
          <PulseBlock className="h-4 w-10/12" />
          <PulseBlock className="h-4 w-9/12" />
        </div>
      </section>
    </div>
  );
}
