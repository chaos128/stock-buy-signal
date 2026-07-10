"""fan-out + 재알림 스로틀 — 종목 스냅샷을 구독자별로 판정해 alerts 생성.

핵심 결정(decide_alert)은 순수 함수 → 네트워크·유저 없이 단위 테스트 가능.
DB 래퍼/오케스트레이션은 그 위에 얇게.

발송 규칙:
  - 추세 게이트 통과 AND score >= subscription.score_threshold 여야 발송 후보
  - edge-trigger + 스로틀: 동일 신호조합(fingerprint)이 throttle_days 내면 억제.
    조합이 바뀌거나 기간이 지나면 재발송. (기간은 근사로 달력일 사용)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from supabase import Client

MACRO_CHECK_NOTE = (
    "관심 신호일 뿐 매매 권유가 아닙니다. 종가 기준이라 실제 체결가는 다를 수 있고, "
    "진입 전 하락 원인이 일시적 노이즈인지 구조적 레짐 전환인지 뉴스·매크로를 직접 확인하세요."
)


def signal_fingerprint(snapshot: dict) -> str:
    """켜진 신호 조합을 문자열로. 동일 조합 재알림 억제 판정에 사용."""
    active = []
    if snapshot.get("pullback_signal"):
        active.append("pullback")
    if snapshot.get("market_regime_signal"):
        active.append("regime")
    if snapshot.get("breadth_signal"):
        active.append("breadth")
    return "+".join(active) if active else "none"


@dataclass(frozen=True)
class AlertDecision:
    should_alert: bool
    reason: str
    fingerprint: str


def decide_alert(
    snapshot: dict,
    score_threshold: int,
    throttle_days: int,
    last_alert_date: date | None,
    last_fingerprint: str | None,
    today: date,
) -> AlertDecision:
    """발송 여부 판정 (순수)."""
    fingerprint = signal_fingerprint(snapshot)

    if not snapshot.get("trend_gate_passed"):
        return AlertDecision(False, "trend gate off", fingerprint)
    if int(snapshot.get("score", 0)) < score_threshold:
        return AlertDecision(False, f"score {snapshot.get('score')} < {score_threshold}", fingerprint)

    # 스로틀: 동일 신호조합이 throttle_days 내 이미 발송됐으면 억제
    if last_alert_date is not None and last_fingerprint == fingerprint:
        days_since = (today - last_alert_date).days
        if days_since < throttle_days:
            return AlertDecision(
                False, f"throttled ({days_since}d < {throttle_days}d, same signal '{fingerprint}')", fingerprint
            )

    return AlertDecision(True, "fire", fingerprint)


def build_alert_record(subscription: dict, snapshot: dict) -> dict:
    """발송 확정된 신호 → alerts insert dict. (손절/익절/RR 은 risk.py 연동 시 채움)"""
    return {
        "user_id": subscription["user_id"],
        "subscription_id": subscription["id"],
        "symbol": subscription["symbol"],
        "score": int(snapshot["score"]),
        "active_signals": {
            "trend_gate_passed": bool(snapshot.get("trend_gate_passed")),
            "pullback_signal": bool(snapshot.get("pullback_signal")),
            "market_regime_signal": bool(snapshot.get("market_regime_signal")),
            "close_price": snapshot.get("close_price"),
            "relative_strength_index_14": snapshot.get("relative_strength_index_14"),
            "bollinger_lower": snapshot.get("bollinger_lower"),
        },
        "close_price": snapshot.get("close_price"),
        "macro_check_note": MACRO_CHECK_NOTE,
    }


# --- DB 래퍼 ---

def get_active_subscriptions(client: Client, symbol: str) -> list[dict]:
    return (
        client.table("subscriptions")
        .select("*")
        .eq("symbol", symbol)
        .eq("is_active", True)
        .execute()
        .data
    )


def get_alert_state(client: Client, subscription_id: str) -> dict | None:
    rows = client.table("alert_state").select("*").eq("subscription_id", subscription_id).execute().data
    return rows[0] if rows else None


def upsert_alert_state(client: Client, subscription_id: str, user_id: str, alert_date: date, fingerprint: str) -> None:
    client.table("alert_state").upsert(
        {
            "subscription_id": subscription_id,
            "user_id": user_id,
            "last_alert_date": alert_date.isoformat(),
            "last_signal_fingerprint": fingerprint,
        }
    ).execute()


def dispatch_symbol(client: Client, symbol: str, snapshot: dict, today: date) -> list[dict]:
    """한 종목 스냅샷을 구독자별로 판정 → 발송 대상 alert 레코드 목록 생성/기록.

    반환: 이번에 새로 만든 alerts 레코드(발송할 대상). 실제 이메일 전송은 notify 가 담당.
    """
    fired: list[dict] = []
    for subscription in get_active_subscriptions(client, symbol):
        state = get_alert_state(client, subscription["id"])
        decision = decide_alert(
            snapshot=snapshot,
            score_threshold=subscription["score_threshold"],
            throttle_days=subscription["throttle_days"],
            last_alert_date=date.fromisoformat(state["last_alert_date"]) if state and state.get("last_alert_date") else None,
            last_fingerprint=state["last_signal_fingerprint"] if state else None,
            today=today,
        )
        if not decision.should_alert:
            continue
        record = build_alert_record(subscription, snapshot)
        inserted = client.table("alerts").insert(record).execute().data[0]
        upsert_alert_state(client, subscription["id"], subscription["user_id"], today, decision.fingerprint)
        fired.append(inserted)
    return fired
