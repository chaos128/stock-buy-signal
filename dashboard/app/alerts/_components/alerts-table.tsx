import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { AlertRow } from "../_actions/alerts-actions";

function format(value: number | null): string {
  return value == null ? "-" : value.toFixed(2);
}

export function AlertsTable({ alerts }: { alerts: AlertRow[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-md border border-border p-8 text-center text-muted-foreground">
        아직 발생한 알림이 없습니다. 종목을 구독하면 신호 발생 시 여기에 쌓여요.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>일시</TableHead>
            <TableHead>종목</TableHead>
            <TableHead>점수</TableHead>
            <TableHead>신호</TableHead>
            <TableHead className="text-right">종가</TableHead>
            <TableHead className="text-right">손절</TableHead>
            <TableHead className="text-right">1차익절</TableHead>
            <TableHead className="text-right">R:R</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={alert.id}>
              <TableCell>{new Date(alert.triggeredAt).toLocaleDateString()}</TableCell>
              <TableCell className="font-medium">{alert.symbol}</TableCell>
              <TableCell>{alert.score}</TableCell>
              <TableCell className="space-x-1">
                {alert.pullback && <Badge variant="outline">눌림</Badge>}
                {alert.marketRegime && <Badge variant="outline">VIX</Badge>}
              </TableCell>
              <TableCell className="text-right">{format(alert.closePrice)}</TableCell>
              <TableCell className="text-right text-destructive">{format(alert.stopPrice)}</TableCell>
              <TableCell className="text-right text-primary">{format(alert.targetPrimary)}</TableCell>
              <TableCell className="text-right">
                {format(alert.riskRewardRatio)}
                {alert.riskRewardSufficient === false && (
                  <span className="ml-1 text-xs text-destructive">부족</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
