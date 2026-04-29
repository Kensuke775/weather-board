
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// notificationsのINSERTをトリガーにDBから呼ばれるEdge Function
Deno.serve(async (req) => {
  const { to_user_id, type } = await req.json();
  // サービスロールキーで初期化（RLS無視）
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )
  // 通知先のpush_tokenを取得
  const {data: profileData, error } = await supabaseClient.from('profiles').select('push_token').eq('user_id', to_user_id).single();
  if(error || !profileData) return new Response('プロフィールの取得に失敗', { status: 400 });
  if(profileData.push_token === null) return new Response('プッシュトークンの取得に失敗しました。', { status: 404 });

  // Expo Push APIで通知を送信
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: profileData.push_token,
      title: 'Weather Board',
      body: type === 'talk' ? 'ちょっと話してみたいです' : 'コメントが届きました',
    })
  })


  return new Response(
    JSON.stringify({ok: true}),
    { headers: {"Content-Type": "application/json"}}
  )
})

