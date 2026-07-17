import { Text, View } from 'react-native';

import { WeatherBoardColors } from '@/constants/theme';

const SECTIONS = [
  {
    title: '1. 禁止事項',
    body: '本アプリでは、以下に該当する投稿・コメント・行為を禁止します。違反が確認された場合、該当コンテンツの削除やアカウントの利用停止・削除を行うことがあります。\n・誹謗中傷、嫌がらせ、差別的な表現\n・暴力的、わいせつ、その他不適切な内容\n・他者になりすます行為、第三者の権利を侵害する行為\n・その他、法令や公序良俗に反する行為',
  },
  {
    title: '2. 通報・ブロック機能',
    body: '本アプリには、不適切な投稿・コメント・ユーザーを通報する機能、および迷惑なユーザーをブロックする機能があります。通報内容は運営者が確認し、必要に応じて対応します。',
  },
  {
    title: '3. アカウントの停止・削除',
    body: '本規約に違反したユーザーに対して、運営者は事前の通知なくコンテンツの削除、アカウントの利用停止または削除を行うことができます。',
  },
  {
    title: '4. 規約の変更',
    body: '本規約は必要に応じて変更することがあります。重要な変更がある場合は、アプリ内でお知らせします。',
  },
  {
    title: '5. お問い合わせ',
    body: '本規約に関するご質問は t.ypebob96@gmail.com までご連絡ください。',
  },
];

export function EulaContent() {
  return (
    <View>
      {/* イントロ */}
      <Text style={{ fontSize: 13, color: WeatherBoardColors.textPrimaryDark, lineHeight: 20, marginBottom: 20 }}>
        Weather Board（以下「本アプリ」）をご利用いただく前に、以下の内容をご確認のうえ同意してください。
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
