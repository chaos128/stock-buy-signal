"""워커 엔트리 — 마감 후 1회 실행되는 오케스트레이션.

curated 종목마다: fetch → signals → 스냅샷 저장 → 구독자 fan-out → 발화 시 이메일.
실행: engine/ 에서  uv run python main.py

(스케줄러가 거래일/마감 여부를 판정해 호출한다는 가정. 여기선 최신 봉 기준으로 처리.)
"""

from __future__ import annotations

from supabase import Client

from dispatch import dispatch_symbol
from fetch import get_daily_ohlc
from indicators import average_true_range
from notify import send_alert_email
from risk import compute_risk_levels
from signals import compute_signals
from store import (
    build_indicator_series,
    get_active_curated_symbols,
    get_client,
    snapshot_from_signal_row,
    upsert_signal_snapshot,
)


def _recipient_email(client: Client, user_id: str) -> str | None:
    try:
        return client.auth.admin.get_user_by_id(user_id).user.email
    except Exception:
        return None


def run() -> None:
    client = get_client()
    for symbol_row in get_active_curated_symbols(client):
        symbol = symbol_row["symbol"]
        context_symbol = symbol_row.get("market_context_symbol")

        ohlc = get_daily_ohlc(symbol, "2y")
        context = get_daily_ohlc(context_symbol, "2y") if context_symbol else None
        signals = compute_signals(ohlc, context)
        atr = average_true_range(ohlc)

        last = signals.iloc[-1]
        position = signals.index.get_loc(last.name)
        today = last.name.date()

        snapshot = snapshot_from_signal_row(symbol, last)
        snapshot["indicator_series"] = build_indicator_series(ohlc, signals)
        upsert_signal_snapshot(client, snapshot)

        risk = compute_risk_levels(
            float(last["close"]), float(atr.iloc[position]),
            float(last["bollinger_middle"]), float(last["bollinger_upper"]),
        )
        fired = dispatch_symbol(client, symbol, snapshot, risk, today)

        for alert in fired:
            email = _recipient_email(client, alert["user_id"])
            if email:
                send_alert_email(email, alert)

        print(f"{symbol} ({today}): 스냅샷 저장, score={snapshot['score']}, 발송 {len(fired)}건")


if __name__ == "__main__":
    run()
