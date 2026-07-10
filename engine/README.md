# engine (Python)

신호 소스 오브 트루스. 마감 후 1회 실행되어 종목별 신호를 계산하고 구독자에게 fan-out + 이메일 발송.

계획 모듈 (아직 미구현):
- `fetch.py` — yfinance: 큐레이션 종목 + 시장 환경 심볼(^VIX) 일봉
- `indicators.py` — SMA200, Bollinger(20,2), RSI(14), VIX SMA20
- `signals.py` — 층별 boolean + score (순수 함수 — backtest 와 공유)
- `risk.py` — 손절/익절/손익비
- `event_calendar.py` — FOMC/CPI/고용 D-1 게이트
- `dispatch.py` — 종목 스냅샷 → 구독자 fan-out (임계치/스로틀)
- `notify.py` — 발송 인터페이스 (Resend 구현)
- `store.py` — Supabase (service-role) read/write
- `main.py` — 워커 엔트리
