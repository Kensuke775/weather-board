import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { user_id, type } = await req.json();

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  let analysedData : unknown;

  if(type === 'weekly'){
    const { data: weeklyData, error:weeklyError } =
    await supabaseClient.from('weather_log_history').select('weather, note, recorded_at, weather_logs(user_id), weather_log_history_activities(tag_name)')
    .gte('recorded_at', sevenDaysAgo.toISOString()).lte('recorded_at',now.toISOString()).eq('weather_logs.user_id', user_id);

    if(weeklyError) return new Response('履歴の読み取りに失敗しました。', { status: 400 });
    analysedData = weeklyData;
  }else{
    const { data: monthlyData, error: monthlyError } = await supabaseClient.from('ai_analyses').select('user_id, content').order('created_at', { ascending: false }).limit(4).eq('user_id', user_id).eq('type', 'weekly');
    if(monthlyError) return new Response('履歴の読み取りに失敗しました。', { status: 400 });
    analysedData = monthlyData;
  }

  const weeklyPrompt = "以下は過去7日間の天気ログです（天気・メモ・アクティビティタグを含みます）。以下の構成で分析してください。\n1. 今週の傾向（天気の流れを振り返る）\n2. パターンの気づき（タグと天気の相関から見えること）\n3. 具体的なアドバイス（来週試してみると良いこと）\n4. 一言メッセージ（温かみのある締めくくり）";
  const monthlyPrompt = "以下は直近4週間分のWeekly分析結果です。これらをもとに、1ヶ月の総合的な傾向と振り返りをまとめてください。";
  const systemPrompt =
  `あなたはWeather Boardというアプリの分析AIです。
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

  【出力テンプレート】
  # （タイトル）

  ## 今週の流れ
  （天気の変化を2〜3文で振り返る）

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
  （温かみのある締めくくりを1〜2文で）
  `


  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `${type === 'weekly' ? weeklyPrompt : monthlyPrompt}\n${JSON.stringify(analysedData)}`,
          }
        ]
      })
    })

  if(!claudeResponse.ok) return new Response('Claude APIの呼び出しに失敗しました。', { status: 500 });
  const claudeData = await claudeResponse.json();
  const { error: analysedError } = await supabaseClient.from('ai_analyses').insert({ 'user_id': user_id, 'type': type, 'content': claudeData.content[0].text });
  if(analysedError) return new Response(analysedError.message, { status: 404 });

  return new Response(
    JSON.stringify(claudeData),
    { headers: { "Content-Type": "application/json" } },
  )
})

