import { TrendingUp } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/api-client/auth-actions";
import { Button, buttonVariants } from "@/components/ui/button";

// 상단 고정 navbar (backoffice 셸 패턴). 로그인 여부와 무관하게 항상 렌더.
export function Navigation({ userEmail }: { userEmail: string | null }) {
  return (
    <>
      <nav className="fixed z-50 w-full border-b border-border bg-card">
        <div className="px-4 py-4 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <TrendingUp className="h-5 w-5 text-primary-foreground" />
                </div>
                <Link href="/" className="text-xl font-semibold text-foreground">
                  매수 신호
                </Link>
              </div>
              {userEmail && (
                <>
                  <Link
                    href="/alerts"
                    className="hidden text-sm font-medium text-foreground hover:text-primary sm:inline"
                  >
                    알림 이력
                  </Link>
                  <Link
                    href="/settings"
                    className="hidden text-sm font-medium text-foreground hover:text-primary sm:inline"
                  >
                    설정
                  </Link>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {userEmail ? (
                <>
                  <span className="hidden text-sm text-muted-foreground sm:inline">
                    {userEmail}
                  </span>
                  <form action={signOut}>
                    <Button type="submit" variant="secondary" size="sm">
                      로그아웃
                    </Button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  로그인
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      <div className="h-16" />
    </>
  );
}
