-- 私有檔案空間：PDF B（答案解析）與原始教材 PDF
-- 只有管理者可以讀取，檔案請由 Supabase 後台 Storage 上傳

insert into storage.buckets (id, name, public)
values ('private-docs', 'private-docs', false)
on conflict (id) do update set public = false;

create policy "admin read private docs" on storage.objects
  for select to authenticated
  using (bucket_id = 'private-docs' and public.is_admin());
