import React from 'react';
import Markdown from 'react-native-marked';

import { WeatherBoardColors } from '@/constants/theme';

type AnalysisMarkdownProps = {
  content: string;
};

export function AnalysisMarkdown({ content }: AnalysisMarkdownProps) {
  return (
    <Markdown
      flatListProps={{
        style: { backgroundColor: 'transparent' },
        contentContainerStyle: { padding: 8, paddingBottom: 20 },
      }}
      theme={{
        colors: {
          code: 'transparent',
          link: WeatherBoardColors.buttonBackground,
          text: WeatherBoardColors.textPrimaryDark,
          border: 'rgba(0,0,0,0.12)',
        },
      }}
      styles={{
        h1: { fontSize: 14, fontWeight: 'bold', color: WeatherBoardColors.textPrimaryDark },
        h2: { fontSize: 14, fontWeight: 'bold', color: WeatherBoardColors.textPrimaryDark },
        h3: { fontSize: 13, fontWeight: 'bold', color: WeatherBoardColors.textPrimaryDark },
        text: { fontSize: 12, color: WeatherBoardColors.textPrimaryDark },
        paragraph: { marginBottom: 16 },
        li: { fontSize: 13, lineHeight: 20, color: WeatherBoardColors.textPrimaryDark },
        hr: { borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
      }}
      value={content}
    />
  );
}
