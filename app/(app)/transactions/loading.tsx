import Skeleton from "@/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <div className="flex flex-col gap-5 w-full flex-1">
      {/* Title */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-36" />
      </div>

      {/* Search Input & Reset Button */}
      <div className="flex gap-2">
        <Skeleton className="flex-1 h-12 rounded-2xl" />
        <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
      </div>

      {/* Type Filter Segmented Control */}
      <Skeleton className="h-9 w-full rounded-lg" />

      {/* Dropdown Filters (Month, Account, Category) */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-10 ml-1" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/40 bg-white p-3 dark:bg-zinc-900 flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-24 mt-1" />
        </div>
        <div className="rounded-xl border border-border/40 bg-white p-3 dark:bg-zinc-900 flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-24 mt-1" />
        </div>
      </div>

      {/* Transactions List Grouped Skeletons */}
      <div className="flex flex-col gap-5 mt-2">
        {[1, 2].map((group) => (
          <div key={group} className="flex flex-col gap-2.5">
            {/* Group date header */}
            <Skeleton className="h-3 w-28 ml-1" />

            <div className="flex flex-col gap-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-zinc-900 border border-border/40 rounded-2xl p-4 flex justify-between items-center gap-3"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="p-4 rounded-xl shrink-0" />
                    <div className="flex flex-col gap-2 flex-1">
                      <Skeleton className="h-3.5 w-[60%]" />
                      <Skeleton className="h-3 w-[40%]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-7 w-7 rounded-lg" />
                    <Skeleton className="h-7 w-7 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
