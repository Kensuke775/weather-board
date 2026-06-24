import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function runDelete(
  deletePromise: PromiseLike<{ error: unknown }>,
  label: string,
) {
  const { error } = await deletePromise;
  if (error) {
    return new Response(`${label}の取得に失敗`, { status: 400 });
  }
  return null;
}

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const authHeader = req.headers.get("Authorization");
  if (authHeader === null) {
    return new Response("トークンが認証されていません。", { status: 401 });
  }
  const { data: { user }, error: authError } = await supabaseClient.auth
    .getUser(
      authHeader.replace("Bearer ", ""),
    );
  if (authError || !user) {
    return new Response("認証に失敗しました。", { status: 401 });
  }

  const { data: userLogs, error: userLogsError } = await supabaseClient
    .from("weather_logs")
    .select("id")
    .eq("user_id", user.id);
  if (userLogsError) {
    return new Response("weather_logsの取得に失敗", { status: 400 });
  }

  const { data: userLogHistory, error: userLogHistoryError } =
    await supabaseClient
      .from("weather_log_history")
      .select("id")
      .in(
        "weather_log_id",
        userLogs.map((item: { id: string }) => item.id),
      );

  if (userLogHistoryError) {
    return new Response("weather_log_historyの取得に失敗", { status: 400 });
  }
  let error = await runDelete(
    supabaseClient.from("weather_log_history_activities").delete().in(
      "weather_log_history_id",
      userLogHistory.map((item: { id: string }) => item.id),
    ),
    "weather_log_history_activities",
  );
  if (error) return error;

  error = await runDelete(
    supabaseClient.from("weather_log_activities").delete().in(
      "weather_log_id",
      userLogs.map((item: { id: string }) => item.id),
    ),
    "weather_log_activities",
  );
  if (error) return error;

  error = await runDelete(
    supabaseClient.from("weather_log_history").delete().in(
      "weather_log_id",
      userLogs.map((item: { id: string }) => item.id),
    ),
    "weather_log_history",
  );
  if (error) return error;

  error = await runDelete(
    supabaseClient.from("comments").delete().in(
      "weather_log_id",
      userLogs.map((item: { id: string }) => item.id),
    ),
    "comments",
  );
  if (error) return error;

  error = await runDelete(
    supabaseClient.from("comments").delete().eq("user_id", user.id),
    "comments",
  );
  if (error) return error;

  error = await runDelete(
    supabaseClient.from("room_members").delete().eq("user_id", user.id),
    "room_members",
  );
  if (error) return error;

  error = await runDelete(
    supabaseClient.from("activity_tags").delete().eq("user_id", user.id),
    "activity_tags",
  );
  if (error) return error;

  error = await runDelete(
    supabaseClient.from("profiles").delete().eq("user_id", user.id),
    "profiles",
  );
  if (error) return error;

  error = await runDelete(
    supabaseClient.from("notifications").delete().or(
      `from_user_id.eq.${user.id},to_user_id.eq.${user.id}`,
    ),
    "notifications",
  );
  if (error) return error;

  error = await runDelete(
    supabaseClient.from("ai_analyses").delete().eq("user_id", user.id),
    "ai_analyses",
  );
  if (error) return error;

  error = await runDelete(
    supabaseClient.from("weather_logs").delete().eq("user_id", user.id),
    "weather_logs",
  );
  if (error) return error;

  error = await runDelete(
    supabaseClient.auth.admin.deleteUser(user.id),
    "ユーザーの削除",
  );
  if (error) return error;

  return new Response(
    JSON.stringify({ ok: true }),
    { headers: { "Content-Type": "application/json" } },
  );
});
