import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="border-b border-border bg-card px-6 py-4">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-2 h-4 w-44" />
      </div>
      <main className="mx-auto max-w-[90rem] space-y-6 px-6 py-6">
        {/* 신호 층 카드 */}
        <div className="space-y-3 rounded-lg border border-border p-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
        {/* 차트 영역 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-7 w-10" />
            ))}
          </div>
          <Skeleton className="h-[560px] w-full" />
        </div>
        {/* 전략별 수익 비교표 */}
        <Skeleton className="h-56 w-full rounded-lg" />
      </main>
    </>
  );
}
