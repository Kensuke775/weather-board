import { Text, View } from 'react-native';

import { WeatherBoardColors } from '@/constants/theme';

const SECTIONS = [
  {
    title: '1. 収集する情報',
    body: '本アプリでは、アカウント作成・機能提供のために以下の情報を取得します。\n・メールアドレス（アカウント認証のため）\n・プロフィール情報（ニックネーム、アバター、都道府県）\n・投稿内容（天気の記録、メモ、タグ）\n・コメント、DM、グループチャットのメッセージ\n・プッシュ通知の送信に必要な端末トークン',
  },
  {
    title: '2. 利用目的',
    body: '取得した情報は、アカウントの管理、投稿・コメント・チャット機能の提供、プッシュ通知の送信、不正利用やトラブルへの対応のために利用します。第三者への販売や、本アプリの機能提供と関係のない目的での利用は行いません。',
  },
  {
    title: '3. 第三者サービスの利用',
    body: '本アプリはデータの保存・認証にSupabase、プッシュ通知の配信にExpo（EAS）の各サービスを利用しています。これらのサービスにはデータ保存・通信のために必要な範囲で情報が渡りますが、本アプリの機能提供以外の目的での利用はありません。',
  },
  {
    title: '4. データの保持・削除',
    body: '設定画面から「アカウントを削除」を行うと、投稿・コメント・チャット・フォロー・リアクションなどアカウントに紐づく情報は削除されます。削除後の復元はできません。',
  },
  {
    title: '5. お問い合わせ',
    body: 'プライバシーに関するご質問・削除依頼などは t.ypebob96@gmail.com までご連絡ください。',
  },
];

export function PrivacyPolicyContent() {
  return (
    <View>
      {/* イントロ */}
      <Text style={{ fontSize: 13, color: WeatherBoardColors.textPrimaryDark, lineHeight: 20, marginBottom: 20 }}>
        Weather Board（以下「本アプリ」）における個人情報の取り扱いについて、以下のとおり定めます。
      </Text>

      {/* セクション */}
      {SECTIONS.map((section) => (
        <View key={section.title} style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark, marginBottom: 8 }}>
            {section.title}
          </Text>
          <Text style={{ fontSize: 13, color: WeatherBoardColors.textPrimaryDark, lineHeight: 20, opacity: 0.85 }}>
            {section.body}
          </Text>
        </View>
      ))}
    </View>
  );
}
