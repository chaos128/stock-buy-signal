"""main.run 오케스트레이션 테스트 — 저장소·발송을 메모리로 바꿔 누락 거래일 보충만 검증."""

import os

os.environ.setdefault("RESEND_API_KEY", "test")  # notify 가 import 시점에 읽는다

import numpy as np
import pandas as pd
import pytest

import main
from signals import compute_signals
from store import snapshot_from_signal_row

DAYS = pd.bdate_range("2025-01-01", periods=260)


def _ohlc(seed):
    close = pd.Series(
        100 + np.random.default_rng(seed).normal(0, 1, len(DAYS)).cumsum(), index=DAYS
    )
    return pd.DataFrame({"open": close, "high": close + 1, "low": close - 1, "close": close})


def _days(snapshots):
    return [snapshot["captured_at"][:10] for snapshot in snapshots]


@pytest.fixture
def harness(monkeypatch):
    frames = {"QQQ": _ohlc(1), "^VIX": _ohlc(2)}
    state = {"latest_stored": None, "upserted": [], "dispatched": []}
    monkeypatch.setattr(main, "get_client", lambda: None)
    monkeypatch.setattr(
        main,
        "get_active_curated_symbols",
        lambda client: [{"symbol": "QQQ", "market_context_symbol": "^VIX"}],
    )
    monkeypatch.setattr(main, "get_daily_ohlc", lambda symbol, period: frames[symbol])
    monkeypatch.setattr(
        main,
        "get_latest_snapshot_day",
        lambda client, symbol: state["latest_stored"],
        raising=False,
    )
    monkeypatch.setattr(
        main, "upsert_signal_snapshot", lambda client, snapshot: state["upserted"].append(snapshot)
    )
    monkeypatch.setattr(
        main,
        "dispatch_symbol",
        lambda client, symbol, snapshot, risk, today: state["dispatched"].append(today) or [],
    )
    return frames, state


def test_fills_trading_days_skipped_since_last_snapshot(harness):
    # 데이터 지연으로 DAYS[-4] 를 다시 저장하고 끝난 실행 뒤, 두 거래일이 비어 있는 상황
    _, state = harness
    state["latest_stored"] = DAYS[-4]
    main.run()
    assert _days(state["upserted"]) == [day.strftime("%Y-%m-%d") for day in DAYS[-3:]]
    # 알림은 최신 봉만 — 지난 날짜 신호를 지금 보내지 않는다
    assert state["dispatched"] == [DAYS[-1].date()]


def test_backfilled_snapshot_matches_that_days_run(harness):
    frames, state = harness
    state["latest_stored"] = DAYS[-3]
    main.run()
    day = DAYS[-2]
    that_day = compute_signals(frames["QQQ"].loc[:day], frames["^VIX"].loc[:day])
    expected = snapshot_from_signal_row("QQQ", that_day.iloc[-1])
    backfilled = state["upserted"][0]
    assert {key: backfilled[key] for key in expected} == expected
    assert backfilled["indicator_series"][-1]["date"] == day.strftime("%Y-%m-%d")


@pytest.mark.parametrize("latest_stored", [None, DAYS[-1]], ids=["first-run", "already-stored"])
def test_saves_only_latest_bar_when_nothing_skipped(harness, latest_stored):
    # 첫 실행은 과거 10년을 채우지 않고, 최신 봉이 이미 저장돼 있으면 그 봉만 갱신한다
    _, state = harness
    state["latest_stored"] = latest_stored
    main.run()
    assert _days(state["upserted"]) == [DAYS[-1].strftime("%Y-%m-%d")]
    assert state["dispatched"] == [DAYS[-1].date()]
