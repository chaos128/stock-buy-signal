import { signOut } from "@/features/auth/api/sign-out";
import { createClient } from "@/shared/api/supabase/server";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export async function HomeView() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: symbols } = await supabase
    .from("curated_symbols")
    .select("symbol, display_name")
    .eq("is_active", true);

  const { data: snapshots } = await supabase
    .from("signal_snapshots")
    .select("symbol, close_price, score, captured_at")
    .order("captured_at", { ascending: false });

  // 종목별 최신 스냅샷
  const latestBySymbol = new Map<string, NonNullable<typeof snapshots>[number]>();
  for (const snapshot of snapshots ?? []) {
    if (!latestBySymbol.has(snapshot.symbol)) {
      latestBySymbol.set(snapshot.symbol, snapshot);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">매수 신호</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <form action={signOut}>
            <Button variant="outline" size="sm">
              로그아웃
            </Button>
          </form>
        </div>
      </header>

      <div className="grid gap-3">
        {(symbols ?? []).map((symbol) => {
          const latest = latestBySymbol.get(symbol.symbol);
          return (
            <Card key={symbol.symbol}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {symbol.symbol}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {symbol.display_name}
                    </span>
                  </span>
                  {latest && <span className="text-sm">score {latest.score}</span>}
                </CardTitle>
              </CardHeader>
              {latest && (
                <CardContent className="text-sm text-muted-foreground">
                  종가 {latest.close_price?.toFixed(2) ?? "-"} ·{" "}
                  {new Date(latest.captured_at).toLocaleDateString()}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
