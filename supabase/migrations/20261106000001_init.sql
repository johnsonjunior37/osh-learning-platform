-- 職業安全衛生學習與測驗平台：資料庫結構、RLS 與測驗函式
-- 原則：
--   1. 學員端（anon）不能直接讀寫任何資料表，只能透過 Edge Function
--   2. Edge Function 以 service role 呼叫本檔的 SECURITY DEFINER 函式
--   3. 分數一律由資料庫依正式答案計算，前端只送出選項
--   4. 管理者以 Supabase Auth 登入，並需列在 admins 表中才能讀取

create extension if not exists pgcrypto;

-- ============ 資料表 ============

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  created_at timestamptz not null default now()
);

create table public.questions (
  id text primary key,
  stage smallint not null check (stage between 1 and 5),
  type text not null check (type in ('concept', 'practice', 'scenario')),
  difficulty smallint not null check (difficulty between 1 and 3),
  stem text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  source_pages int[] not null,
  is_active boolean not null default true
);

create table public.question_keys (
  question_id text primary key references public.questions (id) on delete cascade,
  answer char(1) not null check (answer in ('A', 'B', 'C', 'D')),
  explanation text not null,
  needs_verification boolean not null default false,
  review_status text not null default 'draft' check (review_status in ('draft', 'approved'))
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  stage smallint not null check (stage between 1 and 5),
  question_order text[] not null,
  token_hash text not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score smallint check (score between 0 and 100),
  correct_count smallint,
  total_count smallint not null,
  passed boolean
);
create index quiz_attempts_stage_idx on public.quiz_attempts (stage, submitted_at desc);
create index quiz_attempts_participant_idx on public.quiz_attempts (participant_id);

create table public.attempt_answers (
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id text not null references public.questions (id),
  selected char(1) check (selected in ('A', 'B', 'C', 'D')),
  is_correct boolean not null,
  primary key (attempt_id, question_id)
);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

-- ============ 權限 ============

alter table public.participants enable row level security;
alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.admins enable row level security;
alter table public.rate_limits enable row level security;

-- 學員端完全不可直接存取資料表
revoke all on all tables in schema public from anon;
-- 登入者只保留 SELECT（再由 RLS 限定為管理者），刪除只開放學員資料以便個資刪除
revoke all on all tables in schema public from authenticated;
grant select on public.participants, public.questions, public.question_keys,
  public.quiz_attempts, public.attempt_answers, public.admins to authenticated;
grant delete on public.participants to authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "admin read participants" on public.participants for select to authenticated using (public.is_admin());
create policy "admin delete participants" on public.participants for delete to authenticated using (public.is_admin());
create policy "admin read questions" on public.questions for select to authenticated using (public.is_admin());
create policy "admin read keys" on public.question_keys for select to authenticated using (public.is_admin());
create policy "admin read attempts" on public.quiz_attempts for select to authenticated using (public.is_admin());
create policy "admin read answers" on public.attempt_answers for select to authenticated using (public.is_admin());
create policy "read own admin row" on public.admins for select to authenticated using (user_id = auth.uid());
-- rate_limits 沒有任何 policy：只有 service role 可用

-- ============ 管理者檢視 ============

create view public.admin_attempts_view with (security_invoker = true) as
select a.id as attempt_id, p.id as participant_id, p.name, a.stage,
       a.started_at, a.submitted_at, a.score, a.correct_count, a.total_count, a.passed
from public.quiz_attempts a
join public.participants p on p.id = a.participant_id
where a.submitted_at is not null;

create view public.stage_stats_view with (security_invoker = true) as
select s.stage,
       count(a.id)::int as attempts,
       count(a.id) filter (where a.passed)::int as passed,
       round(100.0 * count(a.id) filter (where a.passed) / nullif(count(a.id), 0), 1) as pass_rate,
       round(avg(a.score), 1) as avg_score
from generate_series(1, 5) as s(stage)
left join public.quiz_attempts a on a.stage = s.stage and a.submitted_at is not null
group by s.stage
order by s.stage;

revoke all on public.admin_attempts_view, public.stage_stats_view from anon;
grant select on public.admin_attempts_view, public.stage_stats_view to authenticated;

-- ============ 限流 ============

create function public.hit_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into public.rate_limits as r (key, window_start, count) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning count into v_count;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return v_count <= p_limit;
end;
$$;

-- ============ 測驗函式（僅 service role 可呼叫） ============

-- 建立測驗：回傳打亂順序、不含答案的題目
create function public.start_attempt(p_name text, p_stage int, p_token_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g'));
  v_participant uuid;
  v_attempt uuid;
  v_order text[];
  v_started timestamptz;
  v_questions jsonb;
begin
  if char_length(v_name) < 1 or char_length(v_name) > 30 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  if p_stage is null or p_stage not between 1 and 5 then
    raise exception 'invalid_stage' using errcode = '22023';
  end if;
  if p_token_hash is null or char_length(p_token_hash) <> 64 then
    raise exception 'invalid_token' using errcode = '22023';
  end if;

  select array_agg(q.id order by random()) into v_order
  from public.questions q
  join public.question_keys k on k.question_id = q.id
  where q.stage = p_stage and q.is_active and k.review_status = 'approved';

  if v_order is null or array_length(v_order, 1) < 20 then
    raise exception 'bank_not_ready' using errcode = 'P0001';
  end if;

  insert into public.participants (name) values (v_name) returning id into v_participant;
  insert into public.quiz_attempts (participant_id, stage, question_order, token_hash, total_count)
  values (v_participant, p_stage, v_order, p_token_hash, array_length(v_order, 1))
  returning id, started_at into v_attempt, v_started;

  select jsonb_agg(jsonb_build_object('id', q.id, 'stem', q.stem, 'options', q.options) order by o.ord)
  into v_questions
  from unnest(v_order) with ordinality as o(id, ord)
  join public.questions q on q.id = o.id;

  return jsonb_build_object(
    'attemptId', v_attempt, 'name', v_name, 'stage', p_stage,
    'startedAt', v_started, 'questions', v_questions
  );
end;
$$;

-- 組出成績與解析（內部使用）
create function public.attempt_result(p_attempt_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'attemptId', a.id, 'name', p.name, 'stage', a.stage,
    'startedAt', a.started_at, 'submittedAt', a.submitted_at,
    'score', a.score, 'correctCount', a.correct_count, 'total', a.total_count,
    'wrongCount', a.total_count - a.correct_count, 'passed', a.passed,
    'review', (
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'stem', q.stem, 'options', q.options,
        'selected', aa.selected, 'answer', k.answer, 'isCorrect', aa.is_correct,
        'explanation', k.explanation, 'pages', to_jsonb(q.source_pages),
        'needsVerification', k.needs_verification
      ) order by o.ord)
      from unnest(a.question_order) with ordinality as o(id, ord)
      join public.questions q on q.id = o.id
      join public.question_keys k on k.question_id = q.id
      left join public.attempt_answers aa on aa.attempt_id = a.id and aa.question_id = q.id
    )
  )
  from public.quiz_attempts a
  join public.participants p on p.id = a.participant_id
  where a.id = p_attempt_id;
$$;

-- 提交與評分：同一交易內鎖定紀錄，避免重複提交
create function public.submit_attempt(p_attempt_id uuid, p_token_hash text, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a public.quiz_attempts%rowtype;
  v_correct int;
  v_total int;
  v_score int;
begin
  select * into a from public.quiz_attempts where id = p_attempt_id for update;
  if not found or a.token_hash is distinct from p_token_hash then
    raise exception 'attempt_not_found' using errcode = 'P0002';
  end if;
  if a.submitted_at is not null then
    raise exception 'already_submitted' using errcode = 'P0001';
  end if;
  if now() - a.started_at > interval '2 hours' then
    raise exception 'attempt_expired' using errcode = 'P0001';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'invalid_answers' using errcode = '22023';
  end if;

  insert into public.attempt_answers (attempt_id, question_id, selected, is_correct)
  select a.id, o.id,
         case when p_answers ->> o.id in ('A', 'B', 'C', 'D') then p_answers ->> o.id end,
         coalesce(p_answers ->> o.id = k.answer, false)
  from unnest(a.question_order) as o(id)
  join public.question_keys k on k.question_id = o.id;

  select count(*) filter (where is_correct), count(*) into v_correct, v_total
  from public.attempt_answers where attempt_id = a.id;

  v_score := round(100.0 * v_correct / v_total);

  update public.quiz_attempts
  set submitted_at = now(), correct_count = v_correct, score = v_score, passed = v_score >= 80
  where id = a.id;

  return public.attempt_result(a.id);
end;
$$;

-- 已提交的測驗才可取回解析
create function public.get_attempt_review(p_attempt_id uuid, p_token_hash text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  a public.quiz_attempts%rowtype;
begin
  select * into a from public.quiz_attempts where id = p_attempt_id;
  if not found or a.token_hash is distinct from p_token_hash then
    raise exception 'attempt_not_found' using errcode = 'P0002';
  end if;
  if a.submitted_at is null then
    raise exception 'not_submitted' using errcode = 'P0001';
  end if;
  return public.attempt_result(a.id);
end;
$$;

-- 管理者查看單次作答明細
create function public.admin_attempt_detail(p_attempt_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return public.attempt_result(p_attempt_id);
end;
$$;

revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
revoke all on function public.start_attempt(text, int, text) from public, anon, authenticated;
revoke all on function public.attempt_result(uuid) from public, anon, authenticated;
revoke all on function public.submit_attempt(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.get_attempt_review(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_attempt_detail(uuid) from public, anon;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
grant execute on function public.start_attempt(text, int, text) to service_role;
grant execute on function public.submit_attempt(uuid, text, jsonb) to service_role;
grant execute on function public.get_attempt_review(uuid, text) to service_role;
grant execute on function public.admin_attempt_detail(uuid) to authenticated;
