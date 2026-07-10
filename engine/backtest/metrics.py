"""백테스트 성과 지표 — 트레이드 목록 → 승률/평균R/기대값/MDD 등.

포지션당 1R 리스크(손절폭)를 1 단위로 놓고 R 배수로 성과를 집계한다.
equity(누적 R) 기준 최대낙폭(MDD)도 R 단위.
"""

from __future__ import annotations

from dataclasses import dataclass

from backtest.simulate import Trade


@dataclass(frozen=True)
class BacktestMetrics:
    trade_count: int
    win_rate: float           # R>0 비율
    average_r: float          # 트레이드당 평균 R (= 기대값, R 단위)
    average_win_r: float
    average_loss_r: float
    total_r: float            # 누적 R
    max_drawdown_r: float     # 누적 R 기준 최대낙폭


def compute_metrics(trades: list[Trade]) -> BacktestMetrics:
    count = len(trades)
    if count == 0:
        return BacktestMetrics(0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)

    r_values = [trade.r_multiple for trade in trades]
    wins = [r for r in r_values if r > 0]
    losses = [r for r in r_values if r <= 0]

    win_rate = len(wins) / count
    average_r = sum(r_values) / count
    average_win_r = (sum(wins) / len(wins)) if wins else 0.0
    average_loss_r = (sum(losses) / len(losses)) if losses else 0.0

    # 누적 R equity 곡선의 최대낙폭
    equity = 0.0
    peak = 0.0
    max_drawdown = 0.0
    for r in r_values:
        equity += r
        peak = max(peak, equity)
        max_drawdown = max(max_drawdown, peak - equity)

    return BacktestMetrics(
        trade_count=count,
        win_rate=win_rate,
        average_r=average_r,
        average_win_r=average_win_r,
        average_loss_r=average_loss_r,
        total_r=sum(r_values),
        max_drawdown_r=max_drawdown,
    )
