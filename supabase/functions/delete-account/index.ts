import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { deleteUserAccountData } from "../_shared/deleteUserAccountData.ts";

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

  const { error } = await deleteUserAccountData(supabaseClient, user.id);
  if (error) {
    return new Response(error, { status: 400 });
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { headers: { "Content-Type": "application/json" } },
  );
});
