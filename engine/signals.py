"""층별 신호 판정 — 순수 함수.

입력: 심볼 OHLC(최소 close) + 시장 컨텍스트 OHLC(VIX: close/high, 선택) + 파라미터
출력: 날짜별 지표값 + 층별 boolean + score 를 담은 DataFrame

라이브 잡은 마지막 행을 쓰고, 백테스트는 전체 DataFrame 을 리플레이한다(같은 로직 공유).

층 정의(spec 기준):
  층1 trend_gate      : close > SMA(200)              (필수 게이트, 점수에서는 제외)
  층2 pullback        : close <= BollingerLower(20,2) AND RSI(14) <= 40
  층3 market_regime   : VIX_close > SMA(VIX,20) AND (VIX 되밀림)
                        되밀림 = 당일 고점 대비 종가 하락 OR 전일 대비 하락
  층4 breadth         : v2 (미구현)
  score = 층2·3 중 참 개수 (층1 게이트, 층4 제외)
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from indicators import (
    bollinger_bands,
    relative_strength_index,
    simple_moving_average,
)


@dataclass(frozen=True)
class SignalParameters:
    """신호 파라미터. 백테스트 민감도 스윕에서 이 값들을 바꿔가며 검증한다."""

    trend_period: int = 200
    bollinger_period: int = 20
    bollinger_num_std: float = 2.0
    rsi_period: int = 14
    rsi_threshold: float = 40.0
    market_context_ma_period: int = 20


def compute_signals(
    symbol_ohlc: pd.DataFrame,
    market_context_ohlc: pd.DataFrame | None = None,
    params: SignalParameters = SignalParameters(),
) -> pd.DataFrame:
    """심볼/컨텍스트 시계열 → 날짜별 지표 + 층별 신호 + score."""
    close = symbol_ohlc["close"]
    result = pd.DataFrame(index=symbol_ohlc.index)
    result["close"] = close

    # --- 지표 ---
    result["sma_trend"] = simple_moving_average(close, params.trend_period)
    lower, middle, upper = bollinger_bands(
        close, params.bollinger_period, params.bollinger_num_std
    )
    result["bollinger_lower"] = lower
    result["bollinger_middle"] = middle
    result["bollinger_upper"] = upper
    result["rsi"] = relative_strength_index(close, params.rsi_period)

    # --- 층1: 추세 게이트 (NaN 비교는 False 로 처리됨 → 초기 구간 자동 게이트 오프) ---
    result["trend_gate_passed"] = close > result["sma_trend"]

    # --- 층2: 눌림 ---
    result["pullback_signal"] = (close <= result["bollinger_lower"]) & (
        result["rsi"] <= params.rsi_threshold
    )

    # --- 층3: 시장 환경(VIX 레짐) — 상대 기준 ---
    if market_context_ohlc is not None:
        context_close = market_context_ohlc["close"]
        context_high = market_context_ohlc["high"]
        context_ma = simple_moving_average(
            context_close, params.market_context_ma_period
        )
        spike = context_close > context_ma
        # 되밀림: 당일 고점 대비 종가 하락 OR 전일 대비 하락 전환.
        # NOTE: "close < high" 는 대개 참이라 조건이 느슨함 → 백테스트에서 재검토 대상.
        reversal = (context_close < context_high) | (
            context_close < context_close.shift(1)
        )
        regime = (spike & reversal).reindex(result.index).fillna(False)
        result["market_context_close"] = context_close.reindex(result.index)
        result["market_context_ma"] = context_ma.reindex(result.index)
        result["market_regime_signal"] = regime.astype(bool)
    else:
        result["market_context_close"] = pd.NA
        result["market_context_ma"] = pd.NA
        result["market_regime_signal"] = False

    # --- score: 층2·3 중 참 개수 ---
    result["score"] = result["pullback_signal"].astype(int) + result[
        "market_regime_signal"
    ].astype(int)

    return result
