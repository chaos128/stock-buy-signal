-- SOXX 큐레이션 종목 추가 (반도체 ETF)
insert into public.curated_symbols (symbol, display_name, market, market_context_symbol)
values ('SOXX', 'iShares Semiconductor ETF', 'US', '^VIX')
on conflict (symbol) do nothing;
