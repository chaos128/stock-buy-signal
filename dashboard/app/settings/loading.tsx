import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-2xl font-semibold text-foreground">설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">구독 종목별 알림 민감도</p>
      </div>
      <main className="mx-auto max-w-[90rem] px-6 py-6">
        <div className="space-y-3">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </main>
    </>
  );
}
