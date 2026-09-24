-- Supabase Free プランの自動 pause を防ぐための keep-alive 用テーブルと関数。
-- .github/workflows/supabase-keep-alive.yml から anon キーで ping_keep_alive() を毎日呼び、
-- 1行だけの keep_alive.pinged_at を更新する（読み取りだけの ping では pause を防げなかったため書き込みにする）。
create table public.keep_alive (
  id int primary key default 1 check (id = 1),
  pinged_at timestamptz not null default now()
);

-- RLS 有効・ポリシーなし：テーブルへの直接の読み書きは全ロールで拒否する。
-- 書き込みは下の security definer 関数経由のみ。
alter table public.keep_alive enable row level security;

create or replace function public.ping_keep_alive()
returns void
language sql
security definer
set search_path = public
as $$
  insert into keep_alive (id, pinged_at)
  values (1, now())
  on conflict (id) do update set pinged_at = excluded.pinged_at;
$$;

grant execute on function public.ping_keep_alive() to anon;
