import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// notificationsのINSERTをトリガーにDBから呼ばれるEdge Function
Deno.serve(async (req) => {
  const { to_user_id, from_user_id, type } = await req.json();
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
        : `${profileFromData.nickname}からコメントが届きました`,
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
