import { WeatherBoardColors } from '@/constants/theme';
import React from 'react';
import Markdown from 'react-native-marked';

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
          link: WeatherBoardColors.accentBackground,
          text: WeatherBoardColors.textPrimary,
          border: WeatherBoardColors.glassBorder,
        },
      }}
      styles={{
        h1: { fontSize: 14, fontWeight: 'bold' },
        h2: { fontSize: 14, fontWeight: 'bold' },
        h3: { fontSize: 13, fontWeight: 'bold' },
        text: { fontSize: 12 },
        paragraph: { marginBottom: 16 },
        li: { fontSize: 14, lineHeight: 20 },
        hr: { borderBottomWidth: 0 },
      }}
      value={content}
    />
  );
}
