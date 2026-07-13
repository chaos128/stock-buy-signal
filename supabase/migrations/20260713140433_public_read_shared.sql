-- 0005 — 공개 조회 허용
--
-- 로그인 없이도 신호를 볼 수 있게 shared 테이블 read 를 anon 역할에도 허용한다.
-- (구독/알림 등 유저 소유 테이블은 여전히 authenticated + user_id RLS 유지)
-- ⚠️ 규제(유사투자자문업): 공개 배포에 가까워짐 — 공개 게이트에서 재검토 대상.

drop policy "authenticated read curated_symbols" on public.curated_symbols;
create policy "public read curated_symbols"
  on public.curated_symbols for select to anon, authenticated using (true);

drop policy "authenticated read signal_snapshots" on public.signal_snapshots;
create policy "public read signal_snapshots"
  on public.signal_snapshots for select to anon, authenticated using (true);

drop policy "authenticated read backtest_results" on public.backtest_results;
create policy "public read backtest_results"
  on public.backtest_results for select to anon, authenticated using (true);
