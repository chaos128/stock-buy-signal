import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-2xl font-semibold text-foreground">알림 이력</h1>
        <p className="mt-1 text-sm text-muted-foreground">내가 받은 매수 관심 신호 알림</p>
      </div>
      <main className="mx-auto max-w-[90rem] px-6 py-6">
        <div className="space-y-2 rounded-lg border border-border p-4">
          <Skeleton className="h-6 w-full" />
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </main>
    </>
  );
}
