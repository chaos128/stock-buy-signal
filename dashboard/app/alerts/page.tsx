import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { getAlerts } from "./_actions/alerts-actions";
import { AlertsTable } from "./_components/alerts-table";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const result = await getAlerts();

  return (
    <>
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-2xl font-semibold text-foreground">알림 이력</h1>
        <p className="mt-1 text-sm text-muted-foreground">내가 받은 매수 관심 신호 알림</p>
      </div>
      <main className="mx-auto max-w-[90rem] px-6 py-6">
        {!result.authenticated ? (
          <div className="rounded-md border border-border p-8 text-center">
            <p className="text-muted-foreground">알림 이력은 로그인 후 볼 수 있어요.</p>
            <div className="mt-4">
              <Link href="/login" className={buttonVariants({ variant: "default", size: "sm" })}>
                로그인
              </Link>
            </div>
          </div>
        ) : result.success ? (
          <AlertsTable alerts={result.data} />
        ) : (
          <div className="rounded-md border border-border p-8 text-center text-destructive">
            불러오기 실패: {result.error}
          </div>
        )}
      </main>
    </>
  );
}
