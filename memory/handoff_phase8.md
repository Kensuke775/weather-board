---
name: Phase 8 引き継ぎ
description: アクティビティタグ完成・AI分析途中・analysis.tsxの残タスク
type: project
---

## Phase 8 進捗

### 完成したもの
- `activity_tags` テーブル・RLS・システム定義タグ初期データ
- `weather_log_activities` テーブル・RLS
- `ActivityTagPicker.tsx` — システムタグ・ユーザー定義タグの選択UI
- `post.tsx` — タグ保存処理（`weather_log_activities` へのINSERT）
- `ai_analyses` テーブル・RLS（INSERT・SELECT）
- `supabase/functions/analyze-weather/index.ts` — Edge Function実装・デプロイ済み
- Anthropic APIキー → `supabase secrets set ANTHROPIC_API_KEY=...` で登録済み

### 現在の状態
`app/(tabs)/analysis.tsx` を実装中。以下は完成している：
- `fetchExistingAnalysis` 関数（`useEffect` の外に定義・`activeTab` 変更時に実行）
- `handleAnalysis` 関数（`invoke` でEdge Functionを呼び出し）
- タブ切り替えUI（weekly/monthly）
- 分析結果の表示エリア

### 残タスク

#### analysis.tsx
1. `handleAnalysis` の後半SELECTを `fetchExistingAnalysis()` 呼び出しに置き換える
2. `analysisContent` が null のときだけ「分析する」ボタンを表示する条件分岐を追加
3. `invoke` のエラーハンドリングを追加

#### Edge Function（analyze-weather/index.ts）
1. `type === 'monthly'` のとき30日分を取得する処理を追加（現在は常に7日分）
2. プロンプトを `type` によって切り替える

### 注意点
- `analysis.tsx` のタブに `icon-symbol.tsx` に `'wand.and.stars': 'insights'` を追加済み
- `(tabs)/_layout.tsx` に `analysis` タブを登録済み
- Edge Functionは SERVICE_ROLE_KEY でSupabaseにアクセスしている（RLS無視）

**Why:** AI分析はPhase 8のメインコンテンツ。ポートフォリオとして「Claude APIを使った機能」を見せるために重要。

**How to apply:** 次セッションは `analysis.tsx` の残タスク→動作確認→月次対応の順で進める。
