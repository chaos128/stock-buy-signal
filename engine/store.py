"""Supabase 저장소 접근 — 엔진 전용(service-role/secret key 로 RLS 우회).

.env 에서 SUPABASE_URL / SUPABASE_SECRET_KEY 를 읽는다.
signals 컬럼명 → DB 컬럼명 매핑 포함(pandas/numpy 값은 네이티브로 변환, NaN→None).

연결 검증: engine/ 에서  uv run python store.py
"""

from __future__ import annotations

import math
import os

import pandas as pd
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()


def get_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SECRET_KEY"]
    return create_client(url, key)


def _number(value) -> float | None:
    """numpy/pandas 수치 → float, NaN/NA → None (JSON/Postgres 안전)."""
    try:
        if value is None or pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(value, float) and math.isnan(value):
        return None
    return float(value)


def snapshot_from_signal_row(symbol: str, row: pd.Series) -> dict:
    """compute_signals 결과의 한 행(마지막 봉 등) → signal_snapshots insert dict."""
    return {
        "symbol": symbol,
        "captured_at": pd.Timestamp(row.name).isoformat(),
        "close_price": _number(row["close"]),
        "simple_moving_average_200": _number(row["sma_trend"]),
        "bollinger_lower": _number(row["bollinger_lower"]),
        "bollinger_middle": _number(row["bollinger_middle"]),
        "bollinger_upper": _number(row["bollinger_upper"]),
        "relative_strength_index_14": _number(row["rsi"]),
        "market_context_close": _number(row["market_context_close"]),
        "market_context_moving_average_20": _number(row["market_context_ma"]),
        "trend_gate_passed": bool(row["trend_gate_passed"]),
        "pullback_signal": bool(row["pullback_signal"]),
        "market_regime_signal": bool(row["market_regime_signal"]),
        "score": int(row["score"]),
    }


def build_indicator_series(
    ohlc: pd.DataFrame, signals: pd.DataFrame, lookback: int = 250
) -> list[dict]:
    """최근 lookback 봉의 OHLC + 지표를 차트용 리스트로. (signal_snapshots.indicator_series)"""
    tail = signals.tail(lookback)
    series: list[dict] = []
    for date, row in tail.iterrows():
        bar = ohlc.loc[date]
        series.append(
            {
                "date": pd.Timestamp(date).strftime("%Y-%m-%d"),
                "open": _number(bar["open"]),
                "high": _number(bar["high"]),
                "low": _number(bar["low"]),
                "close": _number(row["close"]),
                "bollinger_lower": _number(row["bollinger_lower"]),
                "bollinger_middle": _number(row["bollinger_middle"]),
                "bollinger_upper": _number(row["bollinger_upper"]),
                "rsi": _number(row["rsi"]),
                "market_context_close": _number(row["market_context_close"]),
            }
        )
    return series


def get_active_curated_symbols(client: Client) -> list[dict]:
    return client.table("curated_symbols").select("*").eq("is_active", True).execute().data


def upsert_signal_snapshot(client: Client, snapshot: dict) -> dict:
    # (symbol, captured_at) 유니크 → 같은 날 재실행 시 갱신(멱등)
    return (
        client.table("signal_snapshots")
        .upsert(snapshot, on_conflict="symbol,captured_at")
        .execute()
        .data[0]
    )


def _verify_roundtrip() -> None:
    from fetch import get_daily_ohlc
    from signals import compute_signals

    client = get_client()

    symbols = get_active_curated_symbols(client)
    print(f"curated_symbols(active): {[symbol['symbol'] for symbol in symbols]}")

    qqq = get_daily_ohlc("QQQ", "2y")
    vix = get_daily_ohlc("^VIX", "2y")
    signals = compute_signals(qqq, vix)
    snapshot = snapshot_from_signal_row("QQQ", signals.iloc[-1])
    print(f"write snapshot: {snapshot['captured_at']} close={snapshot['close_price']} score={snapshot['score']}")

    inserted = upsert_signal_snapshot(client, snapshot)
    row_id = inserted["id"]
    read_back = client.table("signal_snapshots").select("*").eq("id", row_id).execute().data[0]
    print(f"read back: close={read_back['close_price']} rsi={read_back['relative_strength_index_14']}")

    client.table("signal_snapshots").delete().eq("id", row_id).execute()
    print("cleaned up test row — roundtrip OK ✓")


if __name__ == "__main__":
    _verify_roundtrip()
