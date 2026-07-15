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
    assert signal_fingerprint(_snapshot(pullback=True, regime=True)) == "trend:pullback+regime"
    assert signal_fingerprint(_snapshot(pullback=True, regime=False)) == "trend:pullback"
    assert signal_fingerprint(_snapshot(gate=False, pullback=True, regime=True)) == "dip:pullback+regime"
    assert signal_fingerprint(_snapshot(gate=False, pullback=False, regime=False)) == "dip:none"


def test_fires_when_eligible_and_no_prior_alert():
    decision = decide_alert(_snapshot(), 2, 5, None, None, TODAY)
    assert decision.should_alert is True
    assert decision.fingerprint == "trend:pullback+regime"


def test_fires_oversold_dip_when_gate_off_with_pullback():
    # 게이트 OFF + 눌림 + score>=threshold → 주황 과매도 딥으로 발화
    decision = decide_alert(_snapshot(gate=False), 2, 5, None, None, TODAY)
    assert decision.should_alert is True
    assert decision.fingerprint == "dip:pullback+regime"
    assert "과매도 딥" in decision.reason


def test_no_fire_gate_off_without_pullback():
    # 게이트 OFF 인데 눌림 없음(레짐 단독) → 딥 아님 → 억제
    decision = decide_alert(
        _snapshot(gate=False, score=1, pullback=False, regime=True), 1, 5, None, None, TODAY
    )
    assert decision.should_alert is False
    assert "pullback" in decision.reason


def test_no_fire_when_score_below_threshold():
    decision = decide_alert(_snapshot(score=1, regime=False), 2, 5, None, None, TODAY)
    assert decision.should_alert is False
    assert "score" in decision.reason


def test_throttled_same_signal_within_window():
    # 동일 컨텍스트+조합이 2일 전 발송 → throttle_days=5 내 → 억제
    decision = decide_alert(_snapshot(), 2, 5, date(2026, 7, 8), "trend:pullback+regime", TODAY)
    assert decision.should_alert is False
    assert "throttled" in decision.reason


def test_refires_after_throttle_window():
    # 동일 조합이지만 6일 전 → 기간 지남 → 재발송
    decision = decide_alert(_snapshot(), 2, 5, date(2026, 7, 4), "trend:pullback+regime", TODAY)
    assert decision.should_alert is True


def test_refires_when_signal_combo_changed():
    # 직전엔 pullback 단독이었고 지금은 pullback+regime → 조합 바뀜 → 기간 무관 재발송
    decision = decide_alert(_snapshot(), 2, 5, date(2026, 7, 9), "trend:pullback", TODAY)
    assert decision.should_alert is True
