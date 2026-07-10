-- 0001 init — 매수 신호 알림: 초기 스키마 + RLS
--
-- 데이터 두 부류:
--   공유(shared)      : 인증 유저는 read만. write 는 엔진(service-role)이 RLS 우회 → write 정책 불필요.
--   유저 소유(owned)  : 본인 행만 (RLS: user_id = auth.uid()).

-- ============================================================
-- 1) 공유 데이터
-- ============================================================

-- 서비스가 허용한 종목 (큐레이션 소수)
create table public.curated_symbols (
  symbol                 text primary key,               -- 예: 'QQQ'
  display_name           text not null,
  market                 text not null default 'US',     -- 'US' / 'KR'(v2)
  market_context_symbol  text,                           -- 시장 환경 지표 심볼 (US -> '^VIX')
  is_active              boolean not null default true,
  created_at             timestamptz not null default now()
);

-- 종목별 매 실행 신호 스냅샷 (전 구독자 공유, 유저 무관)
create table public.signal_snapshots (
  id                                uuid primary key default gen_random_uuid(),
  symbol                            text not null references public.curated_symbols(symbol) on delete cascade,
  captured_at                       timestamptz not null default now(),
  close_price                       numeric,
  simple_moving_average_200         numeric,
  bollinger_lower                   numeric,
  bollinger_middle                  numeric,
  bollinger_upper                   numeric,
  relative_strength_index_14        numeric,
  market_context_close              numeric,               -- 예: VIX 종가
  market_context_moving_average_20  numeric,               -- 예: VIX SMA20
  trend_gate_passed                 boolean not null default false,   -- 층1 게이트
  pullback_signal                   boolean not null default false,   -- 층2
  market_regime_signal              boolean not null default false,   -- 층3
  breadth_signal                    boolean,                          -- 층4 (v2, 현재 null)
  score                             integer not null default 0,       -- 층2~4 충족 개수
  indicator_series                  jsonb,                            -- 최근 ~250봉 OHLCV+지표 (차트용)
  unique (symbol, captured_at)
);
create index signal_snapshots_symbol_captured_idx
  on public.signal_snapshots (symbol, captured_at desc);

-- 백테스트 검증 결과 (대시보드 표시용, 공유)
create table public.backtest_results (
  id                uuid primary key default gen_random_uuid(),
  symbol            text not null references public.curated_symbols(symbol) on delete cascade,
  run_at            timestamptz not null default now(),
  parameters        jsonb not null,                        -- RSI/BB/SMA 파라미터 세트
  period_start      date not null,
  period_end        date not null,
  is_out_of_sample  boolean not null default false,
  win_rate          numeric,
  average_r         numeric,
  expectancy        numeric,
  max_drawdown      numeric,
  trade_count       integer,
  equity_curve      jsonb
);

-- ============================================================
-- 2) 유저 소유 데이터
-- ============================================================

-- 유저 프로필 (auth.users 1:1) — 알림 전역 설정 + 수신거부 토큰
create table public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  notifications_enabled  boolean not null default true,
  unsubscribe_token      uuid not null default gen_random_uuid(),  -- 원클릭 수신거부 링크용
  created_at             timestamptz not null default now()
);

-- 유저별 종목 구독 + 알림 설정
create table public.subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  symbol           text not null references public.curated_symbols(symbol) on delete cascade,
  score_threshold  integer not null default 3,             -- 발송 임계치
  throttle_days    integer not null default 5,             -- 동일 신호 재알림 억제일
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (user_id, symbol)
);
-- 엔진 fan-out: 특정 종목의 활성 구독 조회용
create index subscriptions_symbol_active_idx
  on public.subscriptions (symbol) where is_active;

-- edge-trigger 발송 이벤트
create table public.alerts (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  subscription_id         uuid not null references public.subscriptions(id) on delete cascade,
  symbol                  text not null,
  triggered_at            timestamptz not null default now(),
  score                   integer not null,
  active_signals          jsonb not null,                  -- 켜진 신호 목록 + 각 지표 현재값
  close_price             numeric,
  stop_price              numeric,
  target_primary          numeric,
  target_secondary        numeric,
  risk_reward_ratio       numeric,
  risk_reward_sufficient  boolean,
  event_calendar_warning  text,                            -- FOMC/CPI/고용 D-1 경고 (없으면 null)
  macro_check_note        text,                            -- 항상 "매크로 확인 필요" 문구
  email_sent_at           timestamptz
);
create index alerts_user_triggered_idx
  on public.alerts (user_id, triggered_at desc);

-- 재알림 스로틀 (구독당 1행)
create table public.alert_state (
  subscription_id          uuid primary key references public.subscriptions(id) on delete cascade,
  user_id                  uuid not null references auth.users(id) on delete cascade,
  last_alert_date          date,
  last_signal_fingerprint  text                            -- 켜진 신호 조합 해시
);

-- ============================================================
-- 3) 신규 유저 -> profiles 자동 생성 트리거
-- ============================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 4) RLS
-- ============================================================
alter table public.curated_symbols  enable row level security;
alter table public.signal_snapshots enable row level security;
alter table public.backtest_results enable row level security;
alter table public.profiles         enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.alerts           enable row level security;
alter table public.alert_state      enable row level security;

-- 공유 데이터: 인증 유저 read 전용. (write 는 service-role 이 RLS 우회)
create policy "authenticated read curated_symbols"
  on public.curated_symbols for select to authenticated using (true);
create policy "authenticated read signal_snapshots"
  on public.signal_snapshots for select to authenticated using (true);
create policy "authenticated read backtest_results"
  on public.backtest_results for select to authenticated using (true);

-- 유저 소유: 본인 행만. auth.uid() 는 (select ...) 로 감싸 initplan 캐싱(성능 권장).
create policy "own profile read" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "own profile update" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "own subscriptions all" on public.subscriptions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own alerts read" on public.alerts
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "own alert_state read" on public.alert_state
  for select to authenticated using ((select auth.uid()) = user_id);

-- ============================================================
-- 5) 시드 — 큐레이션 종목 (v1: QQQ)
-- ============================================================
insert into public.curated_symbols (symbol, display_name, market, market_context_symbol)
values ('QQQ', 'Invesco QQQ Trust', 'US', '^VIX');
