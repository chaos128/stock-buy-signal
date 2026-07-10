"""실데이터 sanity check (버그 확인용, 엣지 검증 아님).

spec 수용 기준: 2026-06-08~10 급락 구간에서 신호가 켜지고, 2026-07 초 눌림에서는
꺼져 있는지로 층 로직이 실데이터에서 말이 되는지 눈으로 확인한다.
실행: uv run python sanity_check.py
"""

import pandas as pd

from fetch import get_daily_ohlc
from signals import compute_signals

pd.set_option("display.width", 200)
pd.set_option("display.max_columns", 20)

COLUMNS = [
    "close",
    "sma_trend",
    "bollinger_lower",
    "rsi",
    "market_context_close",
    "market_context_ma",
    "trend_gate_passed",
    "pullback_signal",
    "market_regime_signal",
    "score",
]


def main() -> None:
    qqq = get_daily_ohlc("QQQ", period="2y")
    vix = get_daily_ohlc("^VIX", period="2y")
    print(f"QQQ rows: {len(qqq)}  range: {qqq.index.min().date()} ~ {qqq.index.max().date()}")
    print(f"VIX rows: {len(vix)}  range: {vix.index.min().date()} ~ {vix.index.max().date()}")

    signals = compute_signals(qqq, vix)  # 기본 파라미터(200/20/2σ/14/40/20)
    view = signals[COLUMNS].round(2)

    print("\n===== 2026-06-05 ~ 2026-06-12 (급락 구간 — 신호 켜질 것으로 기대) =====")
    print(view.loc["2026-06-05":"2026-06-12"])

    print("\n===== 2026-07-01 ~ 2026-07-10 (초 눌림 — 꺼져 있을 것으로 기대) =====")
    print(view.loc["2026-07-01":"2026-07-10"])

    # 전 구간에서 각 신호가 실제로 언제 켜지는지 — 로직이 트리거되긴 하는지 확인
    print("\n===== 전 구간 신호 발생일 (2y) =====")
    print(f"pullback 켜진 날: {int(signals['pullback_signal'].sum())}일")
    print(view[signals["pullback_signal"]])
    print(f"\nscore>=2 인 날: {int((signals['score'] >= 2).sum())}일")
    print(view[signals["score"] >= 2])
    print(f"\nmarket_regime 켜진 날: {int(signals['market_regime_signal'].sum())}일")


if __name__ == "__main__":
    main()
