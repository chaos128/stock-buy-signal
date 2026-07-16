import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { getSymbolDetail } from "./_actions/symbol-actions";
import { PriceChart } from "./_components/price-chart";
import { ScoreBreakdown } from "./_components/score-breakdown";

export default async function SymbolPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const result = await getSymbolDetail(decodeURIComponent(symbol).toUpperCase());

  if (!result.success) {
    if (result.error.includes("찾을 수 없")) {
      notFound();
    }
    return (
      <main className="mx-auto max-w-[90rem] px-6 py-6">
        <div className="rounded-md border border-border p-8 text-center text-destructive">
          {result.error}
        </div>
      </main>
    );
  }

  const detail = result.data;
  const savedRange = (await cookies()).get("chart-range")?.value;

  return (
    <>
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{detail.symbol}</h1>
          <span className="text-sm text-muted-foreground">{detail.displayName}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail.capturedAt
            ? `기준 ${new Date(detail.capturedAt).toLocaleDateString()}`
            : "데이터 없음"}
        </p>
      </div>
      <main className="mx-auto max-w-[90rem] space-y-6 px-6 py-6">
        <ScoreBreakdown detail={detail} />
        {detail.bars.length > 0 ? (
          <PriceChart bars={detail.bars} initialRange={savedRange} />
        ) : (
          <div className="rounded-md border border-border p-8 text-center text-muted-foreground">
            차트 데이터가 없습니다.
          </div>
        )}
      </main>
    </>
  );
}
