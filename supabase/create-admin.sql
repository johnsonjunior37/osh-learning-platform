-- 設定管理者
-- 步驟一：在 Supabase 後台 Authentication → Users → Add user 建立帳號（Email + 密碼）
-- 步驟二：把下面的 Email 換成該帳號，在 SQL Editor 執行

insert into public.admins (user_id)
select id from auth.users where email = 'admin@example.com'
on conflict do nothing;

-- 確認
select a.user_id, u.email from public.admins a join auth.users u on u.id = a.user_id;

-- 移除管理者
-- delete from public.admins where user_id = (select id from auth.users where email = 'admin@example.com');
