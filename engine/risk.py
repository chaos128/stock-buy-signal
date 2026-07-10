"""손절 / 익절 / 손익비 계산 — 순수 함수.

알림은 종가 기준 "관심 신호"이므로 종가를 기준가로 후보 레벨을 계산한다.
  손절     = 기준가 − atr_multiple × ATR   (백테스트와 동일 규칙)
  1차 익절 = BB 중심선(평균회귀 기본 목표)
  2차 익절 = BB 상단
  R:R      = (1차익절 − 기준가) / (기준가 − 손절)
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RiskLevels:
    reference_price: float
    stop_price: float
    target_primary: float
    target_secondary: float
    risk_reward_ratio: float
    risk_reward_sufficient: bool


def compute_risk_levels(
    reference_price: float,
    atr: float,
    bollinger_middle: float,
    bollinger_upper: float,
    *,
    atr_multiple: float = 2.0,
    min_risk_reward: float = 1.5,
) -> RiskLevels:
    stop_price = reference_price - atr_multiple * atr
    risk = reference_price - stop_price
    reward = bollinger_middle - reference_price
    risk_reward_ratio = (reward / risk) if risk > 0 else 0.0
    return RiskLevels(
        reference_price=reference_price,
        stop_price=stop_price,
        target_primary=bollinger_middle,
        target_secondary=bollinger_upper,
        risk_reward_ratio=risk_reward_ratio,
        risk_reward_sufficient=risk_reward_ratio >= min_risk_reward,
    )
