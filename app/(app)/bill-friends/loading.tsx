import Skeleton from "@/components/ui/skeleton";

export default function BillFriendsLoading() {
  return (
    <div className="flex flex-col gap-5 w-full flex-1">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-border/40 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5">
            <Skeleton className="size-5 rounded-md" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-24 mt-1" />
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-border/40 rounded-2xl p-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5">
            <Skeleton className="size-5 rounded-md" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-5 w-24 mt-1" />
        </div>
      </div>

      {/* Tabs */}
      <Skeleton className="h-9 w-full rounded-lg" />

      {/* Friends lists grouped skeletons */}
      <div className="flex flex-col gap-4 mt-1">
        {[1, 2].map((group) => (
          <div key={group} className="flex flex-col gap-2.5">
            {/* Friend header */}
            <div className="flex items-center gap-2 px-1">
              <Skeleton className="size-6 rounded-full shrink-0" />
              <Skeleton className="h-3.5 w-16" />
              <div className="flex-1 border-b border-dashed border-border/30" />
            </div>

            {/* Friend bills */}
            {[1].map((bill) => (
              <div
                key={bill}
                className="bg-white dark:bg-zinc-900 border border-border/40 rounded-2xl p-4 flex justify-between items-center gap-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="p-4 rounded-xl shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-3.5 w-[50%]" />
                    <Skeleton className="h-3 w-[30%]" />
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
        ))}
      </div>
    </div>
  );
}
