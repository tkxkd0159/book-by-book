function PulseBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-(--border)/60 ${className}`}
      aria-hidden
    />
  );
}

function SearchResultCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-(--border)/90 bg-(--surface-strong) p-5 shadow-[0_10px_24px_rgba(42,32,18,0.06)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-(--accent)/60 via-[#cb8b39]/45 to-(--accent)/60" />
      <div className="grid grid-cols-[92px_1fr] gap-4 pt-1">
        <PulseBlock className="aspect-2/3 w-23 rounded-lg" />
        <div className="space-y-3">
          <PulseBlock className="h-5 w-11/12" />
          <PulseBlock className="h-4 w-8/12" />
          <div className="flex gap-2">
            <PulseBlock className="h-6 w-24 rounded-full" />
            <PulseBlock className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <PulseBlock className="mt-4 h-10 w-full" />
      <div className="mt-4 flex gap-2">
        <PulseBlock className="h-9 w-1/2" />
        <PulseBlock className="h-9 w-1/2" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-7" aria-busy="true" aria-live="polite">
      <section className="relative overflow-hidden rounded-2xl border border-(--border) bg-(--surface-strong) p-6 shadow-[0_12px_30px_rgba(42,32,18,0.06)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-(--accent)/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-8 h-44 w-44 rounded-full bg-[#c78d42]/10 blur-2xl" />
        <div className="relative space-y-3">
          <PulseBlock className="h-10 w-72 sm:w-96" />
          <PulseBlock className="h-4 w-full max-w-3xl" />
          <PulseBlock className="h-4 w-5/6 max-w-2xl" />
          <div className="flex gap-2">
            <PulseBlock className="h-6 w-36 rounded-full" />
            <PulseBlock className="h-6 w-40 rounded-full" />
            <PulseBlock className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-(--border) bg-(--surface-strong) p-4 shadow-[0_6px_20px_rgba(42,32,18,0.04)] sm:p-6">
        <PulseBlock className="mb-3 h-4 w-28" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <PulseBlock className="h-11 w-full grow" />
          <PulseBlock className="h-11 w-full sm:w-28" />
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <SearchResultCardSkeleton />
        <SearchResultCardSkeleton />
        <SearchResultCardSkeleton />
      </div>
    </div>
  );
}
