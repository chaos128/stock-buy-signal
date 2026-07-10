"""전체 파이프라인 e2e 검증 (실제 Supabase). 이메일 발송은 생략(테스트 할당량 회피).

테스트 유저+구독 생성 → 실제 발화 신호를 dispatch → alert/alert_state 생성 확인 →
재실행 시 스로틀 확인 → user_id→email 해석 확인 → 정리(유저 삭제 = cascade).
실행: engine/ 에서  uv run python e2e_check.py
"""

from datetime import date

from dispatch import dispatch_symbol, get_alert_state
from fetch import get_daily_ohlc
from indicators import average_true_range
from risk import compute_risk_levels
from signals import compute_signals
from store import get_client, snapshot_from_signal_row

TEST_EMAIL = "chaos0128@gmail.com"


def main() -> None:
    client = get_client()

    # 실제 발화 신호(게이트 통과 & score>=2)의 마지막 날로 발화 스냅샷 구성
    qqq = get_daily_ohlc("QQQ", "2y")
    vix = get_daily_ohlc("^VIX", "2y")
    signals = compute_signals(qqq, vix)
    atr = average_true_range(qqq)
    fired_rows = signals[(signals["trend_gate_passed"]) & (signals["score"] >= 2)]
    row = fired_rows.iloc[-1]
    position = signals.index.get_loc(row.name)
    snapshot = snapshot_from_signal_row("QQQ", row)
    risk = compute_risk_levels(
        float(row["close"]), float(atr.iloc[position]),
        float(row["bollinger_middle"]), float(row["bollinger_upper"]),
    )
    print(f"firing snapshot: {row.name.date()} score={snapshot['score']} R:R={risk.risk_reward_ratio:.2f}")

    user = client.auth.admin.create_user({"email": TEST_EMAIL, "email_confirm": True}).user
    print(f"created test user {user.id}")
    try:
        subscription = client.table("subscriptions").insert(
            {"user_id": user.id, "symbol": "QQQ", "score_threshold": 2, "throttle_days": 5}
        ).execute().data[0]
        print(f"created subscription {subscription['id']}")

        today = date(2026, 3, 13)

        fired_first = dispatch_symbol(client, "QQQ", snapshot, risk, today)
        assert len(fired_first) == 1, f"expected 1 fired, got {len(fired_first)}"
        state = get_alert_state(client, subscription["id"])
        assert state and state["last_signal_fingerprint"]
        print(f"✓ 1차 발화: alert 생성, fingerprint={state['last_signal_fingerprint']}")

        fired_second = dispatch_symbol(client, "QQQ", snapshot, risk, today)
        assert len(fired_second) == 0, f"expected throttled 0, got {len(fired_second)}"
        print("✓ 2차: 스로틀로 억제 (0건)")

        from main import _recipient_email
        assert _recipient_email(client, user.id) == TEST_EMAIL
        print(f"✓ user_id → email 해석: {TEST_EMAIL}")

        print("\ne2e OK ✓ (이메일 발송은 할당량 회피로 생략)")
    finally:
        client.auth.admin.delete_user(user.id)
        print("cleaned up test user (+ subscriptions/alerts/alert_state cascade)")


if __name__ == "__main__":
    main()
