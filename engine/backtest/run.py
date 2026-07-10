"""백테스트 실행 — QQQ 전체 이력에 신호+청산 규칙 시뮬 후 지표 출력.

실행: engine/ 에서  uv run python -m backtest.run
"""

from __future__ import annotations

import pandas as pd

from backtest.metrics import compute_metrics
from backtest.simulate import BacktestParameters, simulate_trades
from fetch import get_daily_ohlc
from signals import SignalParameters, compute_signals


def main() -> None:
    qqq = get_daily_ohlc("QQQ", period="max")
    vix = get_daily_ohlc("^VIX", period="max")
    print(f"QQQ: {len(qqq)}일 {qqq.index.min().date()} ~ {qqq.index.max().date()}")

    signals = compute_signals(qqq, vix, params=SignalParameters())
    eligible = (signals["trend_gate_passed"]) & (signals["score"] >= 2)
    print(f"진입 대상 신호일(게이트 통과 & score>=2): {int(eligible.sum())}일")

    trades = simulate_trades(signals, qqq, params=BacktestParameters())
    metrics = compute_metrics(trades)

    print("\n===== 성과 =====")
    print(f"거래 횟수      : {metrics.trade_count}")
    print(f"승률           : {metrics.win_rate:.1%}")
    print(f"평균 R (기대값): {metrics.average_r:+.2f}R")
    print(f"평균 이익      : {metrics.average_win_r:+.2f}R")
    print(f"평균 손실      : {metrics.average_loss_r:+.2f}R")
    print(f"누적 R         : {metrics.total_r:+.2f}R")
    print(f"최대낙폭       : {metrics.max_drawdown_r:.2f}R")

    print("\n===== 트레이드 =====")
    rows = [
        {
            "entry": trade.entry_date.date(),
            "exit": trade.exit_date.date(),
            "entry_px": round(trade.entry_price, 2),
            "stop": round(trade.stop_price, 2),
            "exit_px": round(trade.exit_price, 2),
            "R": round(trade.r_multiple, 2),
            "outcome": trade.outcome,
        }
        for trade in trades
    ]
    if rows:
        print(pd.DataFrame(rows).to_string(index=False))


if __name__ == "__main__":
    main()
