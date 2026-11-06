-- 題庫審核通過後，在 Supabase 後台 SQL Editor 執行
-- 每階段至少要有 20 題 approved，該階段的正式測驗才會開放

-- 方式一：全部通過
update public.question_keys set review_status = 'approved';

-- 方式二：只通過指定題目（把上面那行刪掉，改用這段）
-- update public.question_keys set review_status = 'approved'
-- where question_id in ('S1-01', 'S1-02');

-- 檢查各階段可用題數
select q.stage,
       count(*) filter (where k.review_status = 'approved') as approved,
       count(*) as total
from public.questions q
join public.question_keys k on k.question_id = q.id
where q.is_active
group by q.stage
order by q.stage;
