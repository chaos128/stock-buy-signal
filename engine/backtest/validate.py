"""백테스트 검증 — 민감도 스윕 / out-of-sample / 층3 기여도.

엣지가 실재하는지(curve-fitting 배제) 확인. 데이터는 한 번만 받고 재사용.
실행: engine/ 에서  uv run python -m backtest.validate
"""

from __future__ import annotations

import pandas as pd

from backtest.metrics import compute_metrics
from backtest.simulate import BacktestParameters, Trade, simulate_trades
from fetch import get_daily_ohlc
from signals import SignalParameters, compute_signals


def _row(label: str, trades: list[Trade]) -> dict:
    metrics = compute_metrics(trades)
    return {
        "variant": label,
        "trades": metrics.trade_count,
        "win%": round(metrics.win_rate * 100, 1),
        "avgR": round(metrics.average_r, 2),
        "totalR": round(metrics.total_r, 1),
        "MDD_R": round(metrics.max_drawdown_r, 2),
    }


def _run(qqq, vix, signal_params, bt_params) -> list[Trade]:
    signals = compute_signals(qqq, vix, signal_params)
    return simulate_trades(signals, qqq, bt_params)


def main() -> None:
    qqq = get_daily_ohlc("QQQ", "max")
    vix = get_daily_ohlc("^VIX", "max")

    # ---- 1) 파라미터 민감도 스윕 (인접값에서 성과 안정성) ----
    print("===== 1) 민감도 스윕 =====")
    sweep = []
    for rsi_threshold in (35.0, 40.0, 45.0):
        sweep.append(_row(
            f"RSI<={rsi_threshold:g}",
            _run(qqq, vix, SignalParameters(rsi_threshold=rsi_threshold), BacktestParameters()),
        ))
    for num_std in (1.5, 2.0, 2.5):
        sweep.append(_row(
            f"BB {num_std:g}σ",
            _run(qqq, vix, SignalParameters(bollinger_num_std=num_std), BacktestParameters()),
        ))
    for atr_multiple in (1.5, 2.0, 2.5):
        sweep.append(_row(
            f"ATR x{atr_multiple:g}",
            _run(qqq, vix, SignalParameters(), BacktestParameters(atr_multiple=atr_multiple)),
        ))
    print(pd.DataFrame(sweep).to_string(index=False))

    # ---- 2) out-of-sample: 진입일 기준 분할 ----
    print("\n===== 2) Out-of-sample (진입일 2016-01-01 기준 분할) =====")
    base_trades = _run(qqq, vix, SignalParameters(), BacktestParameters())
    split = pd.Timestamp("2016-01-01")
    train = [t for t in base_trades if t.entry_date < split]
    test = [t for t in base_trades if t.entry_date >= split]
    print(pd.DataFrame([
        _row("train 1999-2015", train),
        _row("test  2016-2026", test),
    ]).to_string(index=False))

    # ---- 3) 층3(VIX regime) 기여도 ----
    print("\n===== 3) 층3(VIX regime) 기여도 =====")
    pullback_only = simulate_trades(
        compute_signals(qqq, None, SignalParameters()),  # VIX 없음 → regime off
        qqq,
        BacktestParameters(entry_score_threshold=1),      # pullback 단독
    )
    pullback_plus_regime = base_trades                     # pullback + regime (score>=2)
    print(pd.DataFrame([
        _row("층2 only (pullback)", pullback_only),
        _row("층2+3 (pullback+VIX)", pullback_plus_regime),
    ]).to_string(index=False))

    # ---- 4) 추세 게이트별 성과 (파랑 게이트ON / 주황 게이트OFF / 전체) ----
    # 주황(역추세 딥)을 알림으로 낼 가치가 있는지 = 게이트OFF 코호트의 엣지로 판정.
    print("\n===== 4) 추세 게이트별 성과 (score>=2) =====")
    print(pd.DataFrame([
        _row("파랑 게이트ON", _run(qqq, vix, SignalParameters(), BacktestParameters(trend_filter="on"))),
        _row("주황 게이트OFF", _run(qqq, vix, SignalParameters(), BacktestParameters(trend_filter="off"))),
        _row("전체 (게이트무시)", _run(qqq, vix, SignalParameters(), BacktestParameters(trend_filter="any"))),
    ]).to_string(index=False))


if __name__ == "__main__":
    main()
