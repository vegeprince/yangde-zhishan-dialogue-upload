-- 暘德至善班：班員對話成果上傳模組
-- 在 Supabase Dashboard > SQL Editor 執行整份 SQL。
-- 建立私有 Storage bucket，公開訪客只能新增圖片，不能讀取/列出/刪除。
-- 管理端需由管理者在 Authentication > Users 建立帳號；請關閉公開註冊。

create extension if not exists pgcrypto;

create table if not exists public.dialogue_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  class_name text not null check (char_length(class_name) between 1 and 80),
  student_name text not null check (char_length(student_name) between 1 and 100),
  topic text not null default '同學交流與心得分享',
  reflection text check (reflection is null or char_length(reflection) <= 2000),
  image_paths text[] not null check (array_length(image_paths, 1) between 1 and 8)
);

alter table public.dialogue_submissions enable row level security;

drop policy if exists "Public can submit dialogue outcomes" on public.dialogue_submissions;
create policy "Public can submit dialogue outcomes"
on public.dialogue_submissions for insert
to anon, authenticated
with check (
  char_length(class_name) between 1 and 80
  and char_length(student_name) between 1 and 100
  and array_length(image_paths, 1) between 1 and 8
);

drop policy if exists "Authenticated admins can view submissions" on public.dialogue_submissions;
create policy "Authenticated admins can view submissions"
on public.dialogue_submissions for select
to authenticated
using (auth.role() = 'authenticated');

drop policy if exists "Authenticated admins can delete submissions" on public.dialogue_submissions;
create policy "Authenticated admins can delete submissions"
on public.dialogue_submissions for delete
to authenticated
using (auth.role() = 'authenticated');

-- Create or update the private bucket. The app validates MIME type and size client-side;
-- the bucket also enforces a 8 MB maximum and image MIME allow-list.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dialogue-screenshots', 'dialogue-screenshots', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Visitors can upload dialogue screenshots" on storage.objects;
create policy "Visitors can upload dialogue screenshots"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'dialogue-screenshots'
  and (storage.foldername(name))[1] is not null
);

drop policy if exists "Authenticated admins can view dialogue screenshots" on storage.objects;
create policy "Authenticated admins can view dialogue screenshots"
on storage.objects for select
to authenticated
using (bucket_id = 'dialogue-screenshots');

drop policy if exists "Authenticated admins can delete dialogue screenshots" on storage.objects;
create policy "Authenticated admins can delete dialogue screenshots"
on storage.objects for delete
to authenticated
using (bucket_id = 'dialogue-screenshots');

-- Important:
-- 1) Supabase Dashboard > Authentication > Sign In / Providers: disable public sign-ups.
-- 2) Authentication > Users > Add user: create the admin email/password yourself.
-- 3) Never put the service_role/secret key in Vercel environment variables or frontend code.
-- 4) This baseline allows any authenticated account to read/delete records. Keep public signup
--    disabled and create admin users only. For multiple staff accounts, tighten policies with a
--    dedicated admin role/allowlist before adding those accounts.