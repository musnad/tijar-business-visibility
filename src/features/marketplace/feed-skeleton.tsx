export function FeedSkeleton() {
  return (
    <div className="animate-pulse border-b border-border bg-white pb-3" aria-hidden>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="size-11 rounded-full bg-zinc-200" />
        <div className="min-w-0 flex-1">
          <span className="block h-4 w-36 rounded bg-zinc-200" />
          <span className="mt-1 block h-3 w-24 rounded bg-zinc-100" />
        </div>
        <span className="h-10 w-20 rounded-full bg-zinc-200" />
      </div>
      <div className="aspect-[4/5] w-full bg-zinc-100" />
      <div className="px-3 pt-3">
        <span className="block h-3 w-4/5 rounded bg-zinc-100" />
        <span className="mt-3 block h-24 rounded-2xl bg-zinc-50" />
      </div>
    </div>
  );
}
