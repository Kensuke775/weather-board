import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { deleteUserAccountData } from "../_shared/deleteUserAccountData.ts";

const EXPIRY_DAYS = 7;
const PAGE_SIZE = 200;

// ゲスト（匿名）アカウントは作成後 EXPIRY_DAYS 日を過ぎたら自動削除する。
// Supabaseダッシュボードの Cron Trigger から定期実行される想定。
// サービスロールキーでの呼び出しのみ許可し、外部から不正に叩けないようにする。
Deno.serve(async (req) => {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response("認証に失敗しました。", { status: 401 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey,
  );

  const cutoff = new Date(Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  let deletedCount = 0;
  const failedUserIds: string[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabaseClient.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) {
      console.error("[cleanup-expired-guests] listUsers", error.message);
      return new Response("ユーザー一覧の取得に失敗しました。", {
        status: 500,
      });
    }
    if (data.users.length === 0) break;

    for (const guestUser of data.users) {
      if (!guestUser.is_anonymous) continue;
      if (new Date(guestUser.created_at) >= cutoff) continue;

      const { error: deleteError } = await deleteUserAccountData(
        supabaseClient,
        guestUser.id,
      );
      if (deleteError) {
        console.error(
          "[cleanup-expired-guests] deleteUserAccountData",
          guestUser.id,
          deleteError,
        );
        failedUserIds.push(guestUser.id);
        continue;
      }
      deletedCount++;
    }

    if (data.users.length < PAGE_SIZE) break;
    page++;
  }

  return new Response(
    JSON.stringify({ ok: true, deletedCount, failedUserIds }),
    { headers: { "Content-Type": "application/json" } },
  );
});
