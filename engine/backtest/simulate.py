"""트레이드 시뮬레이션 — engine.signals 를 과거에 리플레이.

전략(spec 기준, long-only 평균회귀):
  진입  : 신호일(추세게이트 통과 AND score>=임계치) 다음 봉 시가
  손절  : 진입가 − atr_multiple × ATR (변동성 기반). 최근 저점을 손절로 쓰면
          눌림 저점 바로 다음 봉 진입 시 위험이 거의 0이 되어 R 이 왜곡됨 → ATR 사용.
  목표  : BB 중심선(20일선) 복귀 — 종가가 그날의 중심선 이상이면 청산(동적)
  R:R   : (목표-진입)/(진입-손절) >= min_risk_reward 인 신호만 진입
  보유  : 최대 max_hold_days (미충족 시 종가 청산 = timeout)
한 번에 한 포지션(중복 진입 없음). R = (청산가-진입가)/(진입가-손절가), 손절 = -1R.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from indicators import average_true_range


@dataclass(frozen=True)
class BacktestParameters:
    entry_score_threshold: int = 2
    atr_period: int = 14
    atr_multiple: float = 2.0     # 손절폭 = atr_multiple × ATR
    min_risk_reward: float = 1.5
    max_hold_days: int = 20


@dataclass(frozen=True)
class Trade:
    entry_date: pd.Timestamp
    entry_price: float
    stop_price: float
    target_price: float
    exit_date: pd.Timestamp
    exit_price: float
    r_multiple: float
    outcome: str  # "win" | "loss" | "timeout"


def simulate_trades(
    signals: pd.DataFrame,
    ohlc: pd.DataFrame,
    params: BacktestParameters = BacktestParameters(),
) -> list[Trade]:
    """signals(compute_signals 결과) + ohlc(open/high/low/close) → 트레이드 목록."""
    index = signals.index
    count = len(index)

    open_price = ohlc["open"]
    high = ohlc["high"]
    low = ohlc["low"]
    close = ohlc["close"]
    middle = signals["bollinger_middle"]
    gate = signals["trend_gate_passed"]
    score = signals["score"]
    atr = average_true_range(ohlc, params.atr_period)

    trades: list[Trade] = []
    position = 0  # 현재 탐색 위치(정수 인덱스)

    while position < count - 1:
        eligible = bool(gate.iloc[position]) and int(score.iloc[position]) >= params.entry_score_threshold
        if not eligible:
            position += 1
            continue

        signal_atr = atr.iloc[position]
        if pd.isna(signal_atr) or signal_atr <= 0:  # ATR 미정의 구간 → 스킵
            position += 1
            continue

        entry_index = position + 1
        entry_price = float(open_price.iloc[entry_index])
        stop_price = entry_price - params.atr_multiple * float(signal_atr)
        target_price = float(middle.iloc[position])

        risk = entry_price - stop_price
        reward = target_price - entry_price
        # 진입가가 손절 이하이거나(이상치) 목표가 진입 이하, 또는 R:R 부족 → 스킵
        if risk <= 0 or reward <= 0 or (reward / risk) < params.min_risk_reward:
            position = entry_index
            continue

        exit_index = None
        exit_price = None
        outcome = None
        last_hold = min(count - 1, entry_index + params.max_hold_days)
        for step in range(entry_index, last_hold + 1):
            if float(low.iloc[step]) <= stop_price:       # 손절 우선(보수적)
                exit_index, exit_price, outcome = step, stop_price, "loss"
                break
            if float(close.iloc[step]) >= float(middle.iloc[step]):  # 중심선 복귀
                exit_index, exit_price, outcome = step, float(close.iloc[step]), "win"
                break
        if exit_index is None:
            exit_index, exit_price, outcome = last_hold, float(close.iloc[last_hold]), "timeout"

        r_multiple = (exit_price - entry_price) / risk
        trades.append(
            Trade(
                entry_date=index[entry_index],
                entry_price=entry_price,
                stop_price=stop_price,
                target_price=target_price,
                exit_date=index[exit_index],
                exit_price=exit_price,
                r_multiple=r_multiple,
                outcome=outcome,
            )
        )
        position = exit_index + 1  # 청산 후 다음 봉부터 재탐색

    return trades
