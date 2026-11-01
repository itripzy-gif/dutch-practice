-- Run this once in Supabase: SQL Editor → New query → paste → Run.

-- 1. The list of words/phrases
create table if not exists public.phrases (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  note text,
  audio_path text,
  created_at timestamptz not null default now(),
  recorded_at timestamptz
);

alter table public.phrases enable row level security;

drop policy if exists "app can read"   on public.phrases;
drop policy if exists "app can add"    on public.phrases;
drop policy if exists "app can update" on public.phrases;
drop policy if exists "app can delete" on public.phrases;
create policy "app can read"   on public.phrases for select using (true);
create policy "app can add"    on public.phrases for insert with check (true);
create policy "app can update" on public.phrases for update using (true);
create policy "app can delete" on public.phrases for delete using (true);

-- 2. A storage bucket for the audio files
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', true)
on conflict (id) do nothing;

drop policy if exists "app can upload recordings"  on storage.objects;
drop policy if exists "app can replace recordings" on storage.objects;
drop policy if exists "app can delete recordings"  on storage.objects;
drop policy if exists "app can list recordings"    on storage.objects;
create policy "app can upload recordings"  on storage.objects for insert with check (bucket_id = 'recordings');
create policy "app can replace recordings" on storage.objects for update using (bucket_id = 'recordings');
create policy "app can delete recordings"  on storage.objects for delete using (bucket_id = 'recordings');
create policy "app can list recordings"    on storage.objects for select using (bucket_id = 'recordings');
