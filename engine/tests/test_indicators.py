"""지표 핀 테스트 — 손으로 계산한 기준값에 고정.

라이브러리 결과에 맞추는 순환 테스트가 아니라, 작은 series 에서 사람이 직접
계산한 값과 비교한다. 특히 RSI 는 Wilder 스무딩(시드 포함)을 손으로 전개해 검증.
"""

import math

import pandas as pd
import pytest

from indicators import (
    average_true_range,
    bollinger_bands,
    relative_strength_index,
    simple_moving_average,
)


def test_simple_moving_average():
    series = pd.Series([1, 2, 3, 4, 5], dtype="float64")
    sma = simple_moving_average(series, period=3)

    assert math.isnan(sma.iloc[0])
    assert math.isnan(sma.iloc[1])
    assert sma.iloc[2] == pytest.approx(2.0)  # (1+2+3)/3
    assert sma.iloc[3] == pytest.approx(3.0)  # (2+3+4)/3
    assert sma.iloc[4] == pytest.approx(4.0)  # (3+4+5)/3


def test_bollinger_bands_uses_population_std():
    # [1,2,3] 의 모집단 표준편차 = sqrt(((1-2)^2+0+(3-2)^2)/3) = sqrt(2/3) = 0.816497
    series = pd.Series([1, 2, 3, 4, 5], dtype="float64")
    lower, middle, upper = bollinger_bands(series, period=3, num_std=2.0)

    population_std = math.sqrt(2.0 / 3.0)
    assert middle.iloc[2] == pytest.approx(2.0)
    assert upper.iloc[2] == pytest.approx(2.0 + 2.0 * population_std)
    assert lower.iloc[2] == pytest.approx(2.0 - 2.0 * population_std)
    # 마지막 창 [3,4,5]: 평균 4, 같은 표준편차
    assert middle.iloc[4] == pytest.approx(4.0)
    assert upper.iloc[4] == pytest.approx(4.0 + 2.0 * population_std)


def test_rsi_wilder_hand_computed():
    # period=3, close = [10,11,10,11,12,11]
    # deltas:        +1, -1, +1, +1, -1
    # gains:          1,  0,  1,  1,  0   / losses: 0, 1, 0, 0, 1
    # 시드(iloc3): avg_gain=(1+0+1)/3=0.66667, avg_loss=(0+1+0)/3=0.33333 → RS=2   → RSI=66.667
    # iloc4:       avg_gain=(0.66667*2+1)/3,   avg_loss=(0.33333*2+0)/3           → RSI=77.778
    # iloc5:       avg_gain=(.77778*2+0)/3,    avg_loss=(.22222*2+1)/3            → RSI=51.852
    close = pd.Series([10, 11, 10, 11, 12, 11], dtype="float64")
    rsi = relative_strength_index(close, period=3)

    assert math.isnan(rsi.iloc[2])  # period 전은 미정의
    assert rsi.iloc[3] == pytest.approx(66.6667, abs=1e-3)
    assert rsi.iloc[4] == pytest.approx(77.7778, abs=1e-3)
    assert rsi.iloc[5] == pytest.approx(51.8519, abs=1e-3)


def test_rsi_edges():
    increasing = pd.Series([1, 2, 3, 4, 5], dtype="float64")
    decreasing = pd.Series([5, 4, 3, 2, 1], dtype="float64")

    # 하락 없음 → RSI 100
    assert relative_strength_index(increasing, period=3).iloc[-1] == pytest.approx(100.0)
    # 상승 없음 → RSI 0
    assert relative_strength_index(decreasing, period=3).iloc[-1] == pytest.approx(0.0)


def test_average_true_range_hand_computed():
    # period=3.  TR[1..3] = 2,2,2 → 시드 ATR(iloc3)=2.0
    # idx4: h=15,l=11,prev_close=12 → TR=max(4,3,1)=4 → ATR=(2*2+4)/3=2.6667
    ohlc = pd.DataFrame(
        {
            "high": [10, 11, 12, 13, 15],
            "low": [8, 9, 10, 11, 11],
            "close": [9, 10, 11, 12, 14],
        },
        dtype="float64",
    )
    atr = average_true_range(ohlc, period=3)
    assert math.isnan(atr.iloc[2])
    assert atr.iloc[3] == pytest.approx(2.0)
    assert atr.iloc[4] == pytest.approx(8.0 / 3.0, abs=1e-6)
