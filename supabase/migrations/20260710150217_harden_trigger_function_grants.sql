-- 0002 harden — 트리거 헬퍼 함수의 RPC 노출 제거
--
-- handle_new_user 는 auth.users insert 트리거 전용이라 REST(/rest/v1/rpc/...)로 호출될 이유가 없다.
-- 트리거 실행은 EXECUTE grant 와 무관하므로 revoke 해도 트리거 동작엔 영향 없음.
-- (security advisor: anon/authenticated_security_definer_function_executable 해소)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
