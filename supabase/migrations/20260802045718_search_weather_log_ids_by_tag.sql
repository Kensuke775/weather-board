-- タグ名の部分一致検索で、該当する weather_log_id 一覧を1回のクエリで返す関数。
-- app/(tabs)/index.tsx の fetchFeedPage で、activity_tags → weather_log_activities と
-- 2段階に分けてラウンドトリップしていた処理を、DB側のJOINにまとめて1回に集約する。
create or replace function search_weather_log_ids_by_tag(search_term text)
returns table (weather_log_id uuid)
language sql
stable
as $$
  select distinct wla.weather_log_id
  from weather_log_activities wla
  join activity_tags at on at.id = wla.activity_tag_id
  where at.tag_name ilike '%' || search_term || '%'
    and wla.weather_log_id is not null;
$$;
