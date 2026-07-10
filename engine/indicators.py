"""기술적 지표 계산 — 직접 구현.

전부 pandas Series(종가 등)를 입력받아 Series 를 반환하는 순수 함수.
TradingView 와 값이 맞도록 두 가지 관례를 명시적으로 따른다:
  1. Bollinger 표준편차는 모집단(ddof=0). pandas 기본값(ddof=1, 표본)과 다르므로 주의.
  2. RSI 는 Wilder 스무딩(RMA)을 SMA 로 시드. ewm(adjust=False)의 시드와 달라
     짧은 구간에서 값이 어긋나므로, 시드를 명시한 재귀 구현을 쓴다.
"""

from __future__ import annotations

import pandas as pd


def simple_moving_average(series: pd.Series, period: int) -> pd.Series:
    """단순 이동평균(SMA). 앞의 (period-1) 개는 NaN."""
    return series.rolling(window=period).mean()


def bollinger_bands(
    close: pd.Series, period: int = 20, num_std: float = 2.0
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """볼린저 밴드 → (lower, middle, upper).

    middle = SMA(period)
    upper/lower = middle ± num_std * 표준편차(모집단, ddof=0)
    """
    middle = close.rolling(window=period).mean()
    # ddof=0: 모집단 표준편차 (TradingView 관례). pandas 기본은 ddof=1 이므로 명시.
    standard_deviation = close.rolling(window=period).std(ddof=0)
    upper = middle + num_std * standard_deviation
    lower = middle - num_std * standard_deviation
    return lower, middle, upper


def _wilder_average(values: pd.Series, period: int) -> pd.Series:
    """Wilder 스무딩(RMA) — RSI 의 평균 상승/하락폭 계산용.

    `values` 는 diff 로 만든 상승폭/하락폭 Series 라 iloc[0] 은 NaN(사용 안 함).
    - 시드: iloc[1..period] 의 단순평균을 iloc[period] 에 배치
    - 이후: avg[i] = (avg[i-1] * (period-1) + values[i]) / period
    앞부분(iloc[0..period-1])은 정의되지 않으므로 NaN.
    """
    result = pd.Series(index=values.index, dtype="float64")
    length = len(values)
    if length <= period:
        return result  # 데이터 부족 → 전부 NaN

    seed = values.iloc[1 : period + 1].mean()
    result.iloc[period] = seed
    previous = seed
    for position in range(period + 1, length):
        previous = (previous * (period - 1) + values.iloc[position]) / period
        result.iloc[position] = previous
    return result


def relative_strength_index(close: pd.Series, period: int = 14) -> pd.Series:
    """RSI(Wilder). 첫 값은 iloc[period] 부터 정의됨(그 앞은 NaN).

    - 하락이 전혀 없으면(avg_loss == 0) RSI = 100
    - 상승이 전혀 없으면(avg_gain == 0) RSI = 0
    """
    delta = close.diff()
    gain = delta.clip(lower=0.0)          # 상승폭(음수는 0)
    loss = (-delta).clip(lower=0.0)       # 하락폭(양수는 0)

    average_gain = _wilder_average(gain, period)
    average_loss = _wilder_average(loss, period)

    relative_strength = average_gain / average_loss
    rsi = 100.0 - 100.0 / (1.0 + relative_strength)
    # avg_loss == 0 → 분모 0 → RSI 100 으로 확정(inf 연산 회피)
    rsi = rsi.mask(average_loss == 0, 100.0)
    return rsi


def average_true_range(ohlc: pd.DataFrame, period: int = 14) -> pd.Series:
    """ATR(Wilder) — 변동성 기반 손절폭 산정에 사용.

    True Range = max(high-low, |high-이전종가|, |low-이전종가|)
    ATR = TR 의 Wilder 스무딩(RMA). 첫 봉은 이전 종가가 없어 TR 을 NaN 처리(시드 제외).
    첫 값은 iloc[period] 부터 정의됨.
    """
    high = ohlc["high"]
    low = ohlc["low"]
    previous_close = ohlc["close"].shift(1)

    true_range = pd.concat(
        [
            high - low,
            (high - previous_close).abs(),
            (low - previous_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    true_range.iloc[0] = float("nan")  # 이전 종가 없음 → 시드에서 제외

    return _wilder_average(true_range, period)
