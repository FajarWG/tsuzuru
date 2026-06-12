import Skeleton from "@/components/ui/skeleton";

export default function ChartsLoading() {
  return (
    <div className="flex flex-col gap-5 w-full flex-1">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-52" />
        </div>
      </div>

      {/* Segment controls */}
      <Skeleton className="h-9 w-full rounded-lg" />

      {/* Main Chart box skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
        {/* Large chart container placeholder */}
        <Skeleton className="h-48 w-full rounded-xl mt-2" />
      </div>

      {/* Side Breakdown Box skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
        <Skeleton className="h-4 w-44" />
        <div className="flex justify-center py-4">
          <Skeleton className="size-36 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-3.5 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
