"""층별 신호 테스트 — 각 층을 명확히 on/off 하는 합성 시나리오.

지표 수학 자체는 test_indicators 에서 핀 고정했으므로, 여기서는 "층 로직"
(게이트/AND 조합/score 합산)이 의도대로 켜지고 꺼지는지를 검증한다.
작은 파라미터를 써서 시나리오를 짧게 구성.
"""

import pandas as pd

from signals import SignalParameters, compute_signals

# 짧은 시나리오용 파라미터. bollinger_num_std=1.0 으로 낮춰 밴드 터치를 명확히 만든다.
TEST_PARAMS = SignalParameters(
    trend_period=3,
    bollinger_period=5,
    bollinger_num_std=1.0,
    rsi_period=5,
    rsi_threshold=40.0,
    market_context_ma_period=3,
)


def _symbol(closes):
    return pd.DataFrame({"close": [float(value) for value in closes]})


def _context(closes, highs):
    return pd.DataFrame(
        {"close": [float(v) for v in closes], "high": [float(v) for v in highs]}
    )


def test_trend_gate_on_and_off():
    rising = compute_signals(_symbol([1, 2, 3, 4, 5, 6]), params=TEST_PARAMS)
    falling = compute_signals(_symbol([6, 5, 4, 3, 2, 1]), params=TEST_PARAMS)
    # 상승: close(6) > SMA3(=5) → 게이트 통과
    assert bool(rising["trend_gate_passed"].iloc[-1]) is True
    # 하락: close(1) < SMA3(=2) → 게이트 오프
    assert bool(falling["trend_gate_passed"].iloc[-1]) is False


def test_pullback_fires_on_sharp_drop():
    # 상승하다 마지막 봉 급락 → RSI 낮고 밴드 하단 이탈
    result = compute_signals(_symbol([100, 101, 102, 103, 104, 105, 96]), params=TEST_PARAMS)
    assert bool(result["pullback_signal"].iloc[-1]) is True


def test_pullback_off_on_steady_rise():
    # 꾸준히 상승 → RSI 높고 밴드 상단 → 눌림 아님
    result = compute_signals(_symbol([100, 101, 102, 103, 104, 105, 106]), params=TEST_PARAMS)
    assert bool(result["pullback_signal"].iloc[-1]) is False


def test_market_regime_fires_on_vix_spike_reversal():
    symbol = _symbol([100, 101, 102, 103, 104])
    # VIX 마지막 급등(종가 20 > MA3=13.3) + 되밀림(종가 20 < 당일 고점 25)
    context = _context([10, 10, 10, 10, 20], [11, 11, 11, 11, 25])
    result = compute_signals(symbol, context, params=TEST_PARAMS)
    assert bool(result["market_regime_signal"].iloc[-1]) is True


def test_market_regime_off_when_vix_below_average():
    symbol = _symbol([100, 101, 102, 103, 104])
    # VIX 마지막 종가 10 < MA3(=16.7) → 스파이크 아님
    context = _context([20, 20, 20, 20, 10], [21, 21, 21, 21, 11])
    result = compute_signals(symbol, context, params=TEST_PARAMS)
    assert bool(result["market_regime_signal"].iloc[-1]) is False


def test_score_counts_layers_independent_of_gate():
    # 마지막 봉: 심볼 급락(pullback) + VIX 급등·되밀림(regime) 동시
    symbol = _symbol([100, 101, 102, 103, 104, 105, 96])
    context = _context([10, 10, 10, 10, 10, 10, 20], [11, 11, 11, 11, 11, 11, 25])
    result = compute_signals(symbol, context, params=TEST_PARAMS)

    assert bool(result["pullback_signal"].iloc[-1]) is True
    assert bool(result["market_regime_signal"].iloc[-1]) is True
    assert int(result["score"].iloc[-1]) == 2
    # 이 시나리오는 추세 게이트는 꺼져 있음(급락으로 close < SMA3) — score 는 게이트와 독립
    assert bool(result["trend_gate_passed"].iloc[-1]) is False


def test_no_market_context_scores_pullback_only():
    result = compute_signals(_symbol([100, 101, 102, 103, 104, 105, 96]), params=TEST_PARAMS)
    assert bool(result["market_regime_signal"].iloc[-1]) is False
    assert int(result["score"].iloc[-1]) == 1
