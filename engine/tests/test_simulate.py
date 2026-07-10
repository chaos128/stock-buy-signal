"""트레이드 시뮬레이션 pin 테스트 — R 계산·ATR 손절을 결정론적 시나리오로 고정.

signals/ohlc 를 손으로 구성해 진입가·손절가·청산가·R 이 정확히 나오는지 검증.
"""

import pandas as pd

from backtest.simulate import BacktestParameters, simulate_trades


def test_single_winning_trade_r_math():
    # 8봉. TR 상수 2 → ATR(period=3)=2. 신호는 idx3(gate True, score2)에만.
    # 진입 idx4 시가=100, 손절=100-2*ATR(2)=96, 목표(중심선[idx3])=110.
    # idx5: 종가 102 >= 중심선[idx5]=101 → 승리 청산 102.  R=(102-100)/(100-96)=0.5
    ohlc = pd.DataFrame(
        {
            "open":  [100, 100, 100, 100, 100, 102, 102, 102],
            "high":  [101, 101, 101, 101, 101, 103, 103, 103],
            "low":   [99, 99, 99, 99, 99, 101, 101, 101],
            "close": [100, 100, 100, 100, 100, 102, 102, 102],
        },
        dtype="float64",
    )
    signals = pd.DataFrame(
        {
            "bollinger_middle": [None, None, None, 110, 110, 101, 101, 101],
            "trend_gate_passed": [True] * 8,
            "score": [0, 0, 0, 2, 0, 0, 0, 0],
        }
    )
    params = BacktestParameters(
        entry_score_threshold=2, atr_period=3, atr_multiple=2.0, min_risk_reward=0.0, max_hold_days=10
    )

    trades = simulate_trades(signals, ohlc, params)

    assert len(trades) == 1
    trade = trades[0]
    assert trade.entry_price == 100.0
    assert trade.stop_price == 96.0
    assert trade.exit_price == 102.0
    assert trade.outcome == "win"
    assert trade.r_multiple == 0.5


def test_stop_hit_is_minus_one_r():
    # 진입 후 손절가까지 하락 → -1R
    # ATR(3)=2, 진입 idx4 시가=100, 손절=96. idx5 저가 95 <= 96 → 손절 청산 96.
    ohlc = pd.DataFrame(
        {
            "open":  [100, 100, 100, 100, 100, 97, 97, 97],
            "high":  [101, 101, 101, 101, 101, 98, 98, 98],
            "low":   [99, 99, 99, 99, 99, 95, 95, 95],
            "close": [100, 100, 100, 100, 100, 97, 97, 97],
        },
        dtype="float64",
    )
    signals = pd.DataFrame(
        {
            "bollinger_middle": [None, None, None, 110, 110, 110, 110, 110],
            "trend_gate_passed": [True] * 8,
            "score": [0, 0, 0, 2, 0, 0, 0, 0],
        }
    )
    params = BacktestParameters(
        entry_score_threshold=2, atr_period=3, atr_multiple=2.0, min_risk_reward=0.0, max_hold_days=10
    )

    trades = simulate_trades(signals, ohlc, params)

    assert len(trades) == 1
    assert trades[0].outcome == "loss"
    assert trades[0].r_multiple == -1.0
