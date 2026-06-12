import Skeleton from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-5 w-full flex-1">
      {/* Header */}
      <div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-3 w-56 mt-2" />
      </div>

      {/* Tabs list */}
      <Skeleton className="h-10 w-full rounded-2xl" />

      {/* Settings Card Content Skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
        {/* Title */}
        <div className="flex justify-between items-center pb-2 border-b border-border/20">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>

        {/* List of items */}
        <div className="flex flex-col divide-y divide-border/40">
          {[1, 2, 3].map((i) => (
            <div key={i} className="py-3 flex items-center justify-between gap-3">
              <div className="flex flex-col gap-2 flex-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
