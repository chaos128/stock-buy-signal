"""데이터 수집 — yfinance 로 일봉 OHLC 조회.

컬럼은 소문자로 정규화(open/high/low/close/volume ...). 인덱스는 거래일 DatetimeIndex.
"""

from __future__ import annotations

import pandas as pd
import yfinance as yf


def get_daily_ohlc(symbol: str, period: str = "2y") -> pd.DataFrame:
    """심볼의 일봉 OHLC. 예: get_daily_ohlc("QQQ"), get_daily_ohlc("^VIX")."""
    ticker = yf.Ticker(symbol)
    frame = ticker.history(period=period, interval="1d", auto_adjust=True)
    frame = frame.rename(columns=str.lower)
    # 인덱스를 tz-naive 날짜로 정규화. yfinance 는 심볼(주식 vs 지수)마다 타임존/시각이
    # 달라 서로 다른 심볼을 reindex 로 맞출 때 어긋난다. 날짜 기준으로 통일해 정렬 보장.
    frame.index = pd.to_datetime(frame.index.date)
    return frame
