import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const user_id = user.id;
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const { data: userLogs, error: userLogsError } = await supabaseClient
    .from("weather_logs")
    .select("id")
    .eq("user_id", user_id);

  if (userLogsError) {
    return new Response("ユーザー取得に失敗しました", { status: 401 });
  }
  const logIds = userLogs?.map((l: { id: string }) => l.id) ?? [];

  const { data: weeklyData, error: weeklyError } = await supabaseClient
    .from("weather_log_history")
    .select(
      "weather, note, recorded_at, weather_log_history_activities(tag_name)",
    )
    .in("weather_log_id", logIds)
    .gte("recorded_at", sevenDaysAgo.toISOString())
    .lte("recorded_at", now.toISOString());

  if (weeklyError) {
    console.error("[analyze-weather] weeklyError", weeklyError.message);
    return new Response("履歴の読み取りに失敗しました。", { status: 400 });
  }

  const weeklyPrompt =
    "以下は過去7日間の天気ログです（天気・メモ・アクティビティタグを含みます）。以下の構成で分析してください。\n1. 今週の傾向（天気の流れを振り返る）\n2. パターンの気づき（タグと天気の相関から見えること）\n3. 具体的なアドバイス（来週試してみると良いこと）\n4. 一言メッセージ（温かみのある締めくくり）";
  const systemPrompt = `あなたはWeather Boardというアプリの分析AIです。
  Weather Boardは、同じルームのメンバーが今日の気分を天気で表現して共有するアプリです。
  天気は実際の天気ではなく、その人の感情状態を表します。

  天気の定義：
  - sunny（☀️）：気分最高・とても元気
  - partly_cloudy（⛅）：まあまあ・普通
  - cloudy（☁️）：どんより・気分が重い
  - rainy（🌧️）：悲しい・落ち込んでいる
  - stormy（⛈️）：怒り・ストレスが高い
  - snowy（🤧）：体調不良
  - foggy（🌫️）：ぼんやり・モヤモヤしている

  分析結果は、メンバーがより良い毎日を送るためのヒントとなるよう、温かみのある言葉でまとめてください。

  【厳守事項】
  以下のテンプレートのフォーマットのみを使用してください。このテンプレート以外の構造（表・コードブロック・番号付きリスト・インデント付きリスト等）は使わないこと。
  ---（水平線）は ## 今週の流れ・## 気づいたパターン・## 来週のヒント の直後にのみ使うこと。タイトルやそれ以外の場所には使わないこと。

  【出力テンプレート】
  # ☀️（タイトル）☀️
  （☀️はその週で最も多かった天気の絵文字に置き換える）
  ## 今週の流れ
  （天気の変化を2〜3文で振り返る。文中に絵文字を1個自然に含める）

  ## 気づいたパターン

  ### （パターンの小見出し）

  - （気づき1）
  - （気づき2）
  - （気づき3）

  ## 来週のヒント

  ### （アドバイスの小見出し）

  - （アドバイス1）
  - （アドバイス2）

  ## ひとこと
  （温かみのある締めくくりを1〜2文で。文中に絵文字を1個自然に含める）
  `;

  const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `${weeklyPrompt}\n${JSON.stringify(weeklyData)}`,
        },
      ],
    }),
  });

  if (!claudeResponse.ok) {
    console.error(
      "[analyze-weather] claudeResponse error",
      claudeResponse.status,
    );
    return new Response("Claude APIの呼び出しに失敗しました。", {
      status: 500,
    });
  }
  const claudeData = await claudeResponse.json();
  const { error: analysedError } = await supabaseClient.from("ai_analyses")
    .insert({
      "user_id": user_id,
      "content": claudeData.content[0].text,
      "type": "weekly",
    });
  if (analysedError) {
    console.error("[analyze-weather] analysedError", analysedError.message);
    return new Response("分析の書き込みに失敗しました。", { status: 500 });
  }

  return new Response(
    JSON.stringify(claudeData),
    { headers: { "Content-Type": "application/json" } },
  );
});
