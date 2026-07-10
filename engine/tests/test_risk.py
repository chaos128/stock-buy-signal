"""risk.py 핀 테스트 — 손절/익절/R:R 계산 고정."""

from risk import compute_risk_levels


def test_risk_reward_sufficient():
    # 기준가 100, ATR 5, 2×ATR → 손절 90 (위험 10). 1차익절 115 → 보상 15 → R:R 1.5 → 충분
    levels = compute_risk_levels(100.0, 5.0, 115.0, 125.0, atr_multiple=2.0, min_risk_reward=1.5)
    assert levels.stop_price == 90.0
    assert levels.target_primary == 115.0
    assert levels.target_secondary == 125.0
    assert levels.risk_reward_ratio == 1.5
    assert levels.risk_reward_sufficient is True


def test_risk_reward_insufficient():
    # 1차익절 108 → 보상 8 / 위험 10 → R:R 0.8 → 부족
    levels = compute_risk_levels(100.0, 5.0, 108.0, 120.0, atr_multiple=2.0, min_risk_reward=1.5)
    assert levels.risk_reward_ratio == 0.8
    assert levels.risk_reward_sufficient is False
