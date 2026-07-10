# stock-buy-signal

QQQ(및 향후 다른 종목) 점수제 매수 신호 알림 + 백테스트 검증. 멀티테넌트 서비스(v1 비공개 베타).

전략·신호 상세: [plans/buy-signal-alert-spec.md](./plans/buy-signal-alert-spec.md)
아키텍처·스키마·결정: [plans/architecture.md](./plans/architecture.md)

## 구조 (monorepo)

| 디렉토리 | 역할 | 스택 |
|---|---|---|
| `engine/` | 신호 계산·지표 + fan-out + 이메일 발송 (신호 소스 오브 트루스) | Python (uv) |
| `engine/backtest/` | 과거 리플레이 + 검증 지표 (`engine.signals` 재사용) | Python |
| `dashboard/` | 시각 대시보드 (Feature-Sliced Design) | Next.js (App Router) PWA |
| `supabase/migrations/` | DB 스키마 + RLS (git 소스 오브 트루스) | SQL |

## 데이터 흐름

스케줄 워커(마감 후 1회) → `engine`이 종목별 신호 1회 계산 → Supabase write → 구독자별 fan-out → 이메일
대시보드는 Supabase read-only(유저 JWT + RLS).
