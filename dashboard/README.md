# dashboard (Next.js App Router, PWA)

시각 대시보드. Supabase read-only(유저 JWT + RLS). 구조는 **Feature-Sliced Design** (프론트 전용이라 여기에만 적용).

FSD 레이어 (위→아래, import 는 아래로만): `app → pages → widgets → features → entities → shared`

- `app/` — Next App Router(라우팅) + FSD app 레이어 흡수(`layout.tsx`=providers/스타일)
- `pages/` — 라우트별 조립 화면 (App Router라 Next Pages Router 와 충돌 없음)
- `widgets/` — signal-chart, score-panel, alert-history-table, backtest-results, watchlist-grid
- `features/` — auth, manage-subscription, edit-alert-settings
- `entities/` — symbol, signal, subscription, alert, backtest
- `shared/` — ui, api(supabase client), lib(포맷터·차트 어댑터), config

상세: [../plans/architecture.md](../plans/architecture.md) §3.1
