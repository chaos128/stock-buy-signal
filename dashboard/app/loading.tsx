import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-2xl font-semibold text-foreground">매수 신호</h1>
        <p className="mt-1 text-sm text-muted-foreground">구독 종목의 최신 신호 상태</p>
      </div>
      <main className="mx-auto max-w-[90rem] px-6 py-6">
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
