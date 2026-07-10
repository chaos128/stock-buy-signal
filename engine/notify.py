"""이메일 발송 — Resend.

alert 레코드(dispatch.build_alert_record 결과) → HTML/텍스트 이메일 → Resend 전송.
발송부를 여기로 격리해 두면 나중에 채널 교체(텔레그램 등)가 쉬움.

테스트 발송: engine/ 에서  uv run python notify.py <받는이메일>
(Resend 테스트 발신주소 onboarding@resend.dev 는 Resend 가입 이메일로만 배달됨)
"""

from __future__ import annotations

import os

import resend
from dotenv import load_dotenv

load_dotenv()
resend.api_key = os.environ["RESEND_API_KEY"]


def _format(value) -> str:
    return f"{value:,.2f}" if isinstance(value, (int, float)) else "-"


def render_alert_html(alert: dict) -> str:
    signals = alert.get("active_signals", {})
    active_layers = []
    if signals.get("pullback_signal"):
        active_layers.append("눌림(BB하단+RSI)")
    if signals.get("market_regime_signal"):
        active_layers.append("VIX 레짐")
    layers_text = ", ".join(active_layers) if active_layers else "-"

    rr = alert.get("risk_reward_ratio")
    rr_warning = (
        "" if alert.get("risk_reward_sufficient")
        else '<p style="color:#c0392b;margin:4px 0;">⚠ R:R 부족 — 손익비가 목표(1.5) 미만</p>'
    )

    return f"""\
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
  <h2 style="margin:0 0 4px;">📈 {alert['symbol']} 매수 관심 신호</h2>
  <p style="margin:0 0 16px;color:#555;">정렬 점수 <b>{alert.get('score')}</b> · 켜진 신호: {layers_text}</p>

  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:6px 0;color:#666;">종가(기준)</td><td style="text-align:right;"><b>{_format(alert.get('close_price'))}</b></td></tr>
    <tr><td style="padding:6px 0;color:#666;">RSI(14)</td><td style="text-align:right;">{_format(signals.get('relative_strength_index_14'))}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">BB 하단</td><td style="text-align:right;">{_format(signals.get('bollinger_lower'))}</td></tr>
    <tr><td style="padding:6px 0;border-top:1px solid #eee;color:#666;">손절 후보</td><td style="text-align:right;border-top:1px solid #eee;color:#c0392b;">{_format(alert.get('stop_price'))}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">1차 익절(중심선)</td><td style="text-align:right;color:#27ae60;">{_format(alert.get('target_primary'))}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">2차 익절(상단)</td><td style="text-align:right;color:#27ae60;">{_format(alert.get('target_secondary'))}</td></tr>
    <tr><td style="padding:6px 0;color:#666;">손익비(R:R)</td><td style="text-align:right;">{_format(rr)}</td></tr>
  </table>
  {rr_warning}

  <p style="margin:16px 0;padding:12px;background:#fff8e1;border-radius:8px;font-size:13px;color:#7a5c00;">
    {alert.get('macro_check_note', '')}
  </p>

  <p style="font-size:12px;color:#999;margin-top:20px;">
    수신을 원치 않으면 <a href="{alert.get('unsubscribe_url', '#')}" style="color:#999;">구독 해지</a>.
  </p>
</div>"""


def send_alert_email(to_email: str, alert: dict) -> dict:
    subject = f"[{alert['symbol']} 매수 관심 신호] 정렬 점수 {alert.get('score')}"
    return resend.Emails.send(
        {
            "from": os.environ["RESEND_FROM_EMAIL"],
            "to": [to_email],
            "subject": subject,
            "html": render_alert_html(alert),
        }
    )


def _sample_alert() -> dict:
    """최근 실제 발화 신호로 샘플 alert 레코드 구성(테스트 발송용)."""
    from dispatch import build_alert_record
    from fetch import get_daily_ohlc
    from indicators import average_true_range
    from risk import compute_risk_levels
    from signals import compute_signals
    from store import snapshot_from_signal_row

    qqq = get_daily_ohlc("QQQ", "2y")
    vix = get_daily_ohlc("^VIX", "2y")
    signals = compute_signals(qqq, vix)
    atr = average_true_range(qqq)

    fired = signals[(signals["trend_gate_passed"]) & (signals["score"] >= 2)]
    row = fired.iloc[-1] if not fired.empty else signals.iloc[-1]
    position = signals.index.get_loc(row.name)

    snapshot = snapshot_from_signal_row("QQQ", row)
    risk = compute_risk_levels(
        float(row["close"]), float(atr.iloc[position]),
        float(row["bollinger_middle"]), float(row["bollinger_upper"]),
    )
    fake_subscription = {"user_id": "sample", "id": "sample", "symbol": "QQQ"}
    record = build_alert_record(fake_subscription, snapshot, risk)
    print(f"sample from {row.name.date()} — score {record['score']}, close {record['close_price']:.2f}")
    return record


if __name__ == "__main__":
    import sys

    recipient = sys.argv[1]
    response = send_alert_email(recipient, _sample_alert())
    print(f"sent to {recipient}: {response}")
