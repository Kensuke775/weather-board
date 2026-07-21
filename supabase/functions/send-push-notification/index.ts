import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const NotificationPayloadSchema = z.object({
  to_user_id: z.string().uuid(),
  from_user_id: z.string().uuid(),
  type: z.enum(['comment', 'talk', 'room_message', 'direct_message', 'reaction'])
})

// notificationsのINSERTをトリガーにDBから呼ばれるEdge Function
Deno.serve(async (req) => {
  const body = await req.json();
  const parsed = NotificationPayloadSchema.safeParse(body);
  if(!parsed.success){
    console.error("[send-push-notification] invalid request body", parsed.error.message);
    return new Response("リクエストの形式が正しくありません。", { status: 400 });
  }
  const { to_user_id, from_user_id, type } = parsed.data;

  if (to_user_id === from_user_id) {
    return new Response(JSON.stringify({ ok: true, skipped: 'self' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // サービスロールキーで初期化（RLS無視）
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  // 通知先のpush_tokenを取得
  const { data: profileData, error: profileError } = await supabaseClient.from(
    "profiles",
  ).select("push_token").eq("user_id", to_user_id).single();
  if (profileError || !profileData) {
    console.error("[send-push-notification]", profileError.message);
    return new Response("送信先プロフィールの取得に失敗", { status: 400 });
  }
  if (profileData.push_token === null) {
    return new Response("ok", { status: 200 });
  }

  // 通知元の名前取得
  const { data: profileFromData, error: profileFromError } =
    await supabaseClient.from("profiles").select("nickname").eq(
      "user_id",
      from_user_id,
    ).single();
  if (profileFromError || !profileFromData) {
    console.error("[send-push-notification]", profileFromError.message);
    return new Response("送信元プロフィールの取得に失敗", { status: 400 });
  }

  // Expo Push APIで通知を送信
  const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: profileData.push_token,
      title: "Weather Board",
      body: type === "talk"
        ? `${profileFromData.nickname}から少し話したい`
        : type === "comment"
        ? `${profileFromData.nickname}からコメントが届きました`
        : type === "room_message"
        ? `${profileFromData.nickname}からグループチャットにメッセージが届きました`
        : type === "direct_message"
        ? `${profileFromData.nickname}からDMが届きました`
        : `${profileFromData.nickname}があなたの投稿にリアクションしました`,
    }),
  });

  if (!pushResponse.ok) {
    console.error(
      "[send-push-notification] pushResponse error",
      pushResponse.status,
    );
    return new Response("pushResponse APIの呼び出しに失敗しました。", {
      status: 500,
    });
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { headers: { "Content-Type": "application/json" } },
  );
});
