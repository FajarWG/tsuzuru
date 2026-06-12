import Skeleton from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5 w-full flex-1">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="size-10 rounded-full" />
      </div>

      {/* Balance Summary Card Skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-44" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-lg" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-lg" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>

      {/* Budget Progress Card Skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
        <Skeleton className="h-3.5 w-48" />
        <div className="grid grid-cols-1 gap-3">
          {/* Item 1 */}
          <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
            <Skeleton className="p-4 rounded-lg shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-2.5 w-full" />
            </div>
          </div>
          {/* Item 2 */}
          <div className="flex items-start gap-3 p-3 bg-muted/30 border border-border/30 rounded-xl">
            <Skeleton className="p-4 rounded-lg shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2.5 w-[90%]" />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Insights Card Skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-border/40 shadow-sm rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-4" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
