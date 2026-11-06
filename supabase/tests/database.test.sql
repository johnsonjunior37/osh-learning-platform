-- 資料庫權限與評分測試
-- 由 scripts/test-db.sh 執行：需要已套用 migration 與 seed（題目為 draft 狀態）
\set ON_ERROR_STOP on

create temp table t_ctx (k text primary key, v text);
grant all on t_ctx to public;

create or replace function pg_temp.expect_error(p_sql text, p_match text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FAIL: 預期錯誤 [%]，但執行成功：%', p_match, p_sql;
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  if position(p_match in sqlerrm) = 0 then
    raise exception 'FAIL: 預期錯誤 [%]，實際為 [%]：%', p_match, sqlerrm, p_sql;
  end if;
end $$;

create or replace function pg_temp.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'FAIL: %', p_msg; end if;
  raise notice 'PASS: %', p_msg;
end $$;

-- 測試帳號
insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'admin@example.com'),
                              ('00000000-0000-0000-0000-00000000000b', 'user@example.com');
insert into public.admins values ('00000000-0000-0000-0000-00000000000a');

-- ===== 1. 學員端 anon：不可直接存取任何資料表或測驗函式 =====
set role anon;
select pg_temp.expect_error('select * from public.questions', 'permission denied');
select pg_temp.expect_error('select * from public.question_keys', 'permission denied');
select pg_temp.expect_error('select * from public.quiz_attempts', 'permission denied');
select pg_temp.expect_error('select * from public.participants', 'permission denied');
select pg_temp.expect_error('select * from public.attempt_answers', 'permission denied');
select pg_temp.expect_error('select * from public.admin_attempts_view', 'permission denied');
select pg_temp.expect_error($q$insert into public.quiz_attempts (participant_id, stage, question_order, token_hash, total_count) values (gen_random_uuid(), 1, '{}', 'x', 20)$q$, 'permission denied');
select pg_temp.expect_error($q$select public.start_attempt('測試', 1, repeat('a', 64))$q$, 'permission denied');
select pg_temp.expect_error($q$select public.submit_attempt(gen_random_uuid(), repeat('a', 64), '{}')$q$, 'permission denied');
select pg_temp.ok(true, 'anon 無法讀取、寫入資料表或呼叫測驗函式');
reset role;

-- ===== 2. 題庫未審核前不可開始測驗 =====
set role service_role;
select pg_temp.expect_error($q$select public.start_attempt('王小明', 1, repeat('a', 64))$q$, 'bank_not_ready');
reset role;
select pg_temp.ok(true, '題目為 draft 時無法開始正式測驗');
update public.question_keys set review_status = 'approved';

-- ===== 3. 開始測驗：輸入驗證、不回傳答案 =====
set role service_role;
select pg_temp.expect_error($q$select public.start_attempt('   ', 1, repeat('a', 64))$q$, 'invalid_name');
select pg_temp.expect_error($q$select public.start_attempt(repeat('名', 31), 1, repeat('a', 64))$q$, 'invalid_name');
select pg_temp.expect_error($q$select public.start_attempt('王小明', 6, repeat('a', 64))$q$, 'invalid_stage');
select pg_temp.expect_error($q$select public.start_attempt('王小明', 1, 'short')$q$, 'invalid_token');

insert into t_ctx select 'start1', public.start_attempt(E'  王小明\n ', 1, repeat('1', 64))::text;
select pg_temp.ok((select (v::jsonb ->> 'name') = '王小明' from t_ctx where k = 'start1'), '姓名去除空白與控制字元');
select pg_temp.ok((select jsonb_array_length(v::jsonb -> 'questions') = 20 from t_ctx where k = 'start1'), '開始測驗回傳 20 題');
select pg_temp.ok((select position('"answer"' in v) = 0 and position('explanation' in v) = 0 from t_ctx where k = 'start1'),
  '開始測驗的回應不含答案與解析');
select pg_temp.ok((select bool_and(q ->> 'id' like 'S1-%') from t_ctx, jsonb_array_elements(v::jsonb -> 'questions') q where k = 'start1'),
  '只發出所選階段的題目');
reset role;

-- ===== 4. 提交前不可取得解析；錯誤 token 不可存取 =====
set role service_role;
select pg_temp.expect_error(format($q$select public.get_attempt_review(%L, repeat('1', 64))$q$,
  (select v::jsonb ->> 'attemptId' from t_ctx where k = 'start1')), 'not_submitted');
select pg_temp.expect_error(format($q$select public.submit_attempt(%L, repeat('9', 64), '{}')$q$,
  (select v::jsonb ->> 'attemptId' from t_ctx where k = 'start1')), 'attempt_not_found');
select pg_temp.ok(true, '提交前無法取得解析，錯誤 token 無法提交');
reset role;

-- ===== 5. 全對 100 分 =====
insert into t_ctx
select 'answers_all', jsonb_object_agg(k.question_id, k.answer)::text
from public.question_keys k join public.questions q on q.id = k.question_id where q.stage = 1;

set role service_role;
insert into t_ctx select 'submit1', public.submit_attempt(
  (select (v::jsonb ->> 'attemptId')::uuid from t_ctx where k = 'start1'), repeat('1', 64),
  (select v::jsonb from t_ctx where k = 'answers_all'))::text;
select pg_temp.ok((select (v::jsonb ->> 'score')::int = 100 and (v::jsonb ->> 'passed')::boolean
  and (v::jsonb ->> 'correctCount')::int = 20 and (v::jsonb ->> 'wrongCount')::int = 0 from t_ctx where k = 'submit1'),
  '全部答對：100 分、通過');
select pg_temp.ok((select jsonb_array_length(v::jsonb -> 'review') = 20 and position('explanation' in v) > 0 from t_ctx where k = 'submit1'),
  '提交後回傳 20 題解析');
select pg_temp.expect_error(format($q$select public.submit_attempt(%L, repeat('1', 64), '{}')$q$,
  (select v::jsonb ->> 'attemptId' from t_ctx where k = 'start1')), 'already_submitted');
select pg_temp.ok(true, '同一次測驗不可重複提交');
select pg_temp.ok((select (public.get_attempt_review((v::jsonb ->> 'attemptId')::uuid, repeat('1', 64)) ->> 'score')::int = 100
  from t_ctx where k = 'start1'), '提交後可憑 token 取回解析');
reset role;

-- ===== 6. 80 分通過、75 分未通過、未作答與無效選項算錯 =====
create or replace function pg_temp.run_with_correct(p_tag text, p_correct int, p_extra jsonb default '{}') returns jsonb
language plpgsql as $$
declare
  s jsonb; ans jsonb := '{}'; i int := 0; qid text; key text;
begin
  s := public.start_attempt('測試' || p_tag, 2, repeat(p_tag, 64));
  for qid in select q ->> 'id' from jsonb_array_elements(s -> 'questions') q loop
    select answer into key from public.question_keys where question_id = qid;
    i := i + 1;
    if i <= p_correct then
      ans := ans || jsonb_build_object(qid, key);
    elsif i % 2 = 0 then
      ans := ans || jsonb_build_object(qid, case key when 'A' then 'B' else 'A' end);
    end if; -- 奇數題不作答
  end loop;
  return public.submit_attempt((s ->> 'attemptId')::uuid, repeat(p_tag, 64), ans || p_extra);
end $$;
grant execute on function pg_temp.run_with_correct(text, int, jsonb) to service_role;

set role service_role;
insert into t_ctx select 'r16', pg_temp.run_with_correct('2', 16)::text;
insert into t_ctx select 'r15', pg_temp.run_with_correct('3', 15)::text;
insert into t_ctx select 'r0', pg_temp.run_with_correct('4', 0, '{"S1-01":"A","S9-99":"A"}')::text;
reset role;
select pg_temp.ok((select (v::jsonb ->> 'score')::int = 80 and (v::jsonb ->> 'passed')::boolean from t_ctx where k = 'r16'), '答對 16 題：80 分、通過');
select pg_temp.ok((select (v::jsonb ->> 'score')::int = 75 and not (v::jsonb ->> 'passed')::boolean from t_ctx where k = 'r15'), '答對 15 題：75 分、未通過');
select pg_temp.ok((select (v::jsonb ->> 'score')::int = 0 from t_ctx where k = 'r0'), '全錯或未作答：0 分，其他階段題目不計分');
select pg_temp.ok((select count(*) = 10 from t_ctx, jsonb_array_elements(v::jsonb -> 'review') r where k = 'r0' and r -> 'selected' = 'null'::jsonb),
  '未作答題目記錄為未選');

set role service_role;
create temp table t_e as select public.start_attempt('無效選項', 3, repeat('5', 64)) as s;
select pg_temp.ok(
  (public.submit_attempt(((select s from t_e) ->> 'attemptId')::uuid, repeat('5', 64),
     jsonb_build_object((select s from t_e) -> 'questions' -> 0 ->> 'id', 'E')) ->> 'score')::int = 0,
  '無效選項不計分');
reset role;

-- ===== 7. 重新測驗建立獨立紀錄 =====
select pg_temp.ok((select count(*) = 5 from public.quiz_attempts), '每次測驗都是獨立紀錄');

-- ===== 8. 一般登入者看不到成績 =====
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select pg_temp.ok((select count(*) = 0 from public.quiz_attempts), '非管理者讀不到測驗紀錄');
select pg_temp.ok((select count(*) = 0 from public.participants), '非管理者讀不到學員姓名');
select pg_temp.ok((select count(*) = 0 from public.question_keys), '非管理者讀不到正式答案');
select pg_temp.ok((select count(*) = 0 from public.admin_attempts_view), '非管理者讀不到成績檢視');
select pg_temp.expect_error($q$select public.admin_attempt_detail(gen_random_uuid())$q$, 'forbidden');
select pg_temp.expect_error($q$update public.quiz_attempts set score = 100$q$, 'permission denied');
delete from public.participants;
reset role;
select pg_temp.ok((select count(*) = 5 from public.participants), '非管理者無法刪除學員資料');

-- ===== 9. 管理者可查詢、統計、看明細 =====
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select pg_temp.ok((select count(*) = 5 from public.admin_attempts_view), '管理者可看到所有已提交紀錄');
select pg_temp.ok((select attempts = 1 and passed = 1 and avg_score = 100 from public.stage_stats_view where stage = 1), '階段一統計正確');
select pg_temp.ok((select attempts = 3 and passed = 1 and pass_rate = 33.3 from public.stage_stats_view where stage = 2), '階段二通過率正確');
select pg_temp.ok((select jsonb_array_length(public.admin_attempt_detail(attempt_id) -> 'review') = 20
  from public.admin_attempts_view where stage = 1), '管理者可看單次作答明細');
select pg_temp.expect_error($q$update public.quiz_attempts set score = 0$q$, 'permission denied');
select pg_temp.expect_error($q$insert into public.question_keys values ('S1-01', 'A', 'x', false, 'approved')$q$, 'permission denied');
select pg_temp.ok(true, '管理者也不能修改分數或答案');
delete from public.participants where name = '無效選項';
select pg_temp.ok((select count(*) = 4 from public.admin_attempts_view), '管理者可刪除學員資料，測驗紀錄一併刪除');
reset role;

-- ===== 10. 限流 =====
set role service_role;
select pg_temp.ok(public.hit_rate_limit('ip:test', 3, 3600) and public.hit_rate_limit('ip:test', 3, 3600)
  and public.hit_rate_limit('ip:test', 3, 3600) and not public.hit_rate_limit('ip:test', 3, 3600), '超過次數後限流');
reset role;

-- ===== 11. 過期的測驗不可提交 =====
set role service_role;
create temp table t_x as select public.start_attempt('逾時', 4, repeat('6', 64)) as s;
reset role;
update public.quiz_attempts set started_at = now() - interval '3 hours' where id = ((select s from t_x) ->> 'attemptId')::uuid;
set role service_role;
select pg_temp.expect_error(format($q$select public.submit_attempt(%L, repeat('6', 64), '{}')$q$, (select s from t_x) ->> 'attemptId'), 'attempt_expired');
select pg_temp.ok(true, '超過 2 小時的測驗不可提交');
reset role;

\echo '全部資料庫測試通過'
