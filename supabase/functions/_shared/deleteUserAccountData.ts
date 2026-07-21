import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// アカウント削除（本人操作／ゲスト自動削除）で共通して使う、
// あるユーザーに紐づくデータをまとめて削除する処理。
// delete-account と cleanup-expired-guests の両方から呼ばれる。
export async function deleteUserAccountData(
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<{ error: string | null }> {
  const { data: userLogs, error: userLogsError } = await supabaseClient
    .from("weather_logs")
    .select("id")
    .eq("user_id", userId);
  if (userLogsError) {
    return { error: "weather_logsの取得に失敗" };
  }
  const userLogIds = userLogs.map((item: { id: string }) => item.id);

  const { data: userLogHistory, error: userLogHistoryError } =
    await supabaseClient
      .from("weather_log_history")
      .select("id")
      .in("weather_log_id", userLogIds);
  if (userLogHistoryError) {
    return { error: "weather_log_historyの取得に失敗" };
  }
  const userLogHistoryIds = userLogHistory.map((item: { id: string }) => item.id);

  const steps: [string, PromiseLike<{ error: { message: string } | null }>][] = [
    [
      "weather_log_history_activities",
      supabaseClient.from("weather_log_history_activities").delete().in(
        "weather_log_history_id",
        userLogHistoryIds,
      ),
    ],
    [
      "weather_log_activities",
      supabaseClient.from("weather_log_activities").delete().in(
        "weather_log_id",
        userLogIds,
      ),
    ],
    [
      "weather_log_history",
      supabaseClient.from("weather_log_history").delete().in(
        "weather_log_id",
        userLogIds,
      ),
    ],
    [
      "comments (投稿への紐付け)",
      supabaseClient.from("comments").delete().in("weather_log_id", userLogIds),
    ],
    ["comments (自分の投稿分)", supabaseClient.from("comments").delete().eq("user_id", userId)],
    ["room_members", supabaseClient.from("room_members").delete().eq("user_id", userId)],
    ["activity_tags", supabaseClient.from("activity_tags").delete().eq("user_id", userId)],
    [
      "follows",
      supabaseClient.from("follows").delete().or(
        `follower_id.eq.${userId},followed_id.eq.${userId}`,
      ),
    ],
    ["post_reactions", supabaseClient.from("post_reactions").delete().eq("from_user_id", userId)],
    [
      "comment_reactions",
      supabaseClient.from("comment_reactions").delete().eq("from_user_id", userId),
    ],
    ["reports", supabaseClient.from("reports").delete().eq("reporter_id", userId)],
    // direct_messages は conversations への ON DELETE CASCADE で連動削除される。
    [
      "conversations",
      supabaseClient.from("conversations").delete().or(
        `user_a_id.eq.${userId},user_b_id.eq.${userId}`,
      ),
    ],
    ["profiles", supabaseClient.from("profiles").delete().eq("user_id", userId)],
    [
      "notifications",
      supabaseClient.from("notifications").delete().or(
        `from_user_id.eq.${userId},to_user_id.eq.${userId}`,
      ),
    ],
    ["ai_analyses", supabaseClient.from("ai_analyses").delete().eq("user_id", userId)],
    ["weather_logs", supabaseClient.from("weather_logs").delete().eq("user_id", userId)],
  ];

  for (const [label, promise] of steps) {
    const { error } = await promise;
    if (error) {
      return { error: `${label}の削除に失敗: ${error.message}` };
    }
  }

  const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    return { error: `ユーザーの削除に失敗: ${authDeleteError.message}` };
  }

  return { error: null };
}
