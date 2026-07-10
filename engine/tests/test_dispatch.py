"""dispatch 결정 로직 단위 테스트 — 순수 함수라 네트워크/유저 불필요."""

from datetime import date

from dispatch import AlertDecision, decide_alert, signal_fingerprint

TODAY = date(2026, 7, 10)


def _snapshot(gate=True, score=2, pullback=True, regime=True):
    return {
        "trend_gate_passed": gate,
        "score": score,
        "pullback_signal": pullback,
        "market_regime_signal": regime,
    }


def test_fingerprint():
    assert signal_fingerprint(_snapshot(pullback=True, regime=True)) == "pullback+regime"
    assert signal_fingerprint(_snapshot(pullback=True, regime=False)) == "pullback"
    assert signal_fingerprint(_snapshot(pullback=False, regime=False)) == "none"


def test_fires_when_eligible_and_no_prior_alert():
    decision = decide_alert(_snapshot(), 2, 5, None, None, TODAY)
    assert decision.should_alert is True
    assert decision.fingerprint == "pullback+regime"


def test_no_fire_when_gate_off():
    decision = decide_alert(_snapshot(gate=False), 2, 5, None, None, TODAY)
    assert decision.should_alert is False
    assert "gate" in decision.reason


def test_no_fire_when_score_below_threshold():
    decision = decide_alert(_snapshot(score=1, regime=False), 2, 5, None, None, TODAY)
    assert decision.should_alert is False
    assert "score" in decision.reason


def test_throttled_same_signal_within_window():
    # 동일 조합(pullback+regime)이 2일 전 발송 → throttle_days=5 내 → 억제
    decision = decide_alert(_snapshot(), 2, 5, date(2026, 7, 8), "pullback+regime", TODAY)
    assert decision.should_alert is False
    assert "throttled" in decision.reason


def test_refires_after_throttle_window():
    # 동일 조합이지만 6일 전 → 기간 지남 → 재발송
    decision = decide_alert(_snapshot(), 2, 5, date(2026, 7, 4), "pullback+regime", TODAY)
    assert decision.should_alert is True


def test_refires_when_signal_combo_changed():
    # 직전엔 pullback 단독이었고 지금은 pullback+regime → 조합 바뀜 → 기간 무관 재발송
    decision = decide_alert(_snapshot(), 2, 5, date(2026, 7, 9), "pullback", TODAY)
    assert decision.should_alert is True
