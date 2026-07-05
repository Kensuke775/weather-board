import React from 'react';
import Markdown from 'react-native-marked';

type AnalysisMarkdownProps = {
  content: string;
};

const PRIMARY_BROWN = '#624221';

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
          link: '#6B9BDE',
          text: PRIMARY_BROWN,
          border: 'rgba(98,66,33,0.15)',
        },
      }}
      styles={{
        h1: { fontSize: 14, fontWeight: 'bold', color: PRIMARY_BROWN },
        h2: { fontSize: 14, fontWeight: 'bold', color: PRIMARY_BROWN },
        h3: { fontSize: 13, fontWeight: 'bold', color: PRIMARY_BROWN },
        text: { fontSize: 12, color: PRIMARY_BROWN },
        paragraph: { marginBottom: 16 },
        li: { fontSize: 13, lineHeight: 20, color: PRIMARY_BROWN },
        hr: { borderBottomWidth: 1, borderColor: 'rgba(98,66,33,0.12)' },
      }}
      value={content}
    />
  );
}
