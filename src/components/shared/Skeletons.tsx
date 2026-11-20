export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800 ${className}`}
    />
  );
}

export function LandingSkeleton() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-between px-6 py-6">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-5 dark:border-neutral-800/80">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-8 w-8" />
          <SkeletonBlock className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2.5">
          <SkeletonBlock className="h-9 w-24" />
          <SkeletonBlock className="h-9 w-28" />
        </div>
      </div>

      <div className="my-14 space-y-10">
        <div className="max-w-2xl space-y-4">
          <SkeletonBlock className="h-6 w-48 rounded-full" />
          <SkeletonBlock className="h-12 w-full rounded-xl" />
          <SkeletonBlock className="h-12 w-4/5 rounded-xl" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-2/3" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 rounded-2xl border border-neutral-200 bg-neutral-100/70 p-5 dark:border-neutral-800/80 dark:bg-neutral-900/40"
            />
          ))}
        </div>
      </div>

      <div className="h-8 border-t border-neutral-200 dark:border-neutral-800/80" />
    </div>
  );
}