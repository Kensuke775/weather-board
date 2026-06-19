# Weather Board

感情を「天気」で表現して、グループで共有するシェアハウス型アプリ。
天気みたいに気分は毎日変わる。
Weather Boardは気軽に、正直に共有できる。

## できること

- 自分の気分を天気で投稿して、グループメンバーと共有
- 投稿の天気に応じて付箋の色や背景が変わるビジュアル表現
- アクティビティフィードでメンバー全員の最新投稿をすぐ確認できる
- 投稿にコメントを残したり、「ちょっと話したい」通知を送れる
- 通知はアプリ内・プッシュ通知の両方で受け取れる
- 絵文字でアバターを作成してプロフィールをカスタマイズ
- ルームを作成・参加して、グループを分けて管理（上限なし）
- ルームメンバーの一覧確認・招待コードのコピー・ルームからの退出が可能
- 投稿にアクティビティタグを付けて記録
- 1週間分の投稿をもとに AI が分析・アドバイスを生成
- ヒストリーカレンダーで1ヶ月分の天気ログを振り返り

## スクリーンショット

| ホーム | アクティビティフィード | メンバー一覧 |
|---|---|---|
| ![ホーム](screenshots/home-screen.png) | ![アクティビティフィード](screenshots/home-activity-feed.png) | ![メンバー一覧](screenshots/home-members.png) |

| コメント | 投稿 | ヒストリーカレンダー |
|---|---|---|
| ![コメント](screenshots/comments.png) | ![投稿](screenshots/post.png) | ![ヒストリーカレンダー](screenshots/history-calendar.png) |

| ヒストリー詳細 | AI分析 | AI分析履歴 |
|---|---|---|
| ![ヒストリー詳細](screenshots/history-details.png) | ![AI分析](screenshots/analysis.png) | ![AI分析履歴](screenshots/analysis-history.png) |

| 通知 | ログイン | サインアップ |
|---|---|---|
| ![通知](screenshots/notifications.png) | ![ログイン](screenshots/login.png) | ![サインアップ](screenshots/sign-up.png) |

| 設定 |
|---|
| ![設定](screenshots/settings.png) |

## 技術スタック

- React Native
- Expo / Expo Router
- TypeScript
- Supabase（DB・認証・Realtime・Edge Functions）
- PostgreSQL
- Google OAuth（expo-auth-session）
- Anthropic Claude API
- Firebase Cloud Messaging（Android プッシュ通知）
- Expo Push Notifications（iOS プッシュ通知）
- NativeWind

## セットアップ

```bash
# パッケージのインストール
npm install

# 環境変数の設定
cp .env.example .env
# .env に Supabase の URL・APIキー・Anthropic APIキーを記入

# 起動
npx expo start
```

## 作者

GitHub: [Kensuke775](https://github.com/Kensuke775)
