type ServiceUnavailableProps = {
  onRetry?: () => void;
};

export default function ServiceUnavailable({
  onRetry,
}: ServiceUnavailableProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center p-8">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center">
        <h1 className="text-2xl font-semibold">Service is not available</h1>
        <p className="mt-2 text-neutral-600">Please try again in a few minutes.</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Try again
          </button>
        ) : null}
      </div>
    </main>
  );
}
