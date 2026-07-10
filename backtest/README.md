# backtest (Python)

`engine.signals` 순수 함수를 과거 데이터에 리플레이해 엣지가 실재하는지 검증.

계획 모듈 (아직 미구현):
- `run.py` — 과거 리플레이 + 정의된 청산 규칙으로 트레이드 시뮬
- `metrics.py` — 승률, 평균R, 기대값, 최대낙폭(MDD), 거래횟수
- `sensitivity.py` — 파라미터(RSI 40, BB 2σ, SMA 200) 민감도 스윕 + out-of-sample 분할
