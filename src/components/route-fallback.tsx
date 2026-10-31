export function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] flex-col gap-3 p-4" aria-busy="true">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-200" />
      <div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />
      <div className="h-24 animate-pulse rounded-2xl bg-zinc-50" />
    </div>
  );
}
