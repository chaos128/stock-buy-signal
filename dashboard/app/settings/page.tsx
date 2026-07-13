import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { getSubscriptionSettings } from "./_actions/settings-actions";
import { SubscriptionSettingsRow } from "./_components/subscription-settings-row";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const result = await getSubscriptionSettings();

  return (
    <>
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-2xl font-semibold text-foreground">설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">구독 종목별 알림 민감도</p>
      </div>
      <main className="mx-auto max-w-[90rem] px-6 py-6">
        {!result.authenticated ? (
          <div className="rounded-md border border-border p-8 text-center">
            <p className="text-muted-foreground">설정은 로그인 후 변경할 수 있어요.</p>
            <div className="mt-4">
              <Link href="/login" className={buttonVariants({ variant: "default", size: "sm" })}>
                로그인
              </Link>
            </div>
          </div>
        ) : !result.success ? (
          <div className="rounded-md border border-border p-8 text-center text-destructive">
            불러오기 실패: {result.error}
          </div>
        ) : result.data.length === 0 ? (
          <div className="rounded-md border border-border p-8 text-center text-muted-foreground">
            구독한 종목이 없어요. 홈에서 종목을 구독하면 여기서 민감도를 조절할 수 있어요.
          </div>
        ) : (
          <div className="space-y-3">
            {result.data.map((setting) => (
              <SubscriptionSettingsRow key={setting.id} setting={setting} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
