import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { AnalysisMarkdown } from '@/components/AnalysisMarkdown';
import IconHeader from '@/components/IconHeader';
import { CardStyle, WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { useTabBarSpace } from '@/hooks/useTabBarSpace';
import { supabase } from '@/lib/supabase';

export type AnalysisData = {
  type: 'weekly' | 'monthly';
  content: string;
  created_at: string;
  id: string;
};

function formatTime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor(((seconds % 86400) % 3600) / 60);
  const secs = Math.floor(((seconds % 86400) % 3600) % 60);
  return { days, hours, minutes, secs };
}

export default function Analysis() {
  const { user } = useUser();
  const userId = user?.id;
  // 一番下のコンテンツがタブバーに隠れないようにするための下余白。
  const tabBarHeight = useTabBarSpace(24);
  const [analysisContent, setAnalysisContent] = useState<AnalysisData | null>(null);
  const [canAnalyze, setCanAnalyze] = useState(false);
  const [histories, setHistories] = useState<AnalysisData[]>([]);
  const [isHistory, setIsHistory] = useState(false);
  const [leftTime, setLeftTime] = useState(0);
  const [selectedHistory, setSelectedHistory] = useState<AnalysisData | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { days, hours, minutes, secs } = formatTime(leftTime);

  const fetchExistingAnalysis = useCallback(async () => {
    const { data: analysedData, error: analysedError } = await supabase
      .from('ai_analyses')
      .select('id, type, content, created_at')
      .eq('user_id', userId)
      .eq('type', 'weekly')
      .order('created_at', { ascending: false })
      .limit(1);
    if (analysedError) {
      console.error('[analysis] fetchExistingAnalysis', analysedError.message);
      Alert.alert('過去の分析の取得に失敗しました。');
      return;
    }
    if (!analysedData || analysedData.length === 0) return setCanAnalyze(true);
    else {
      const { data: historyData, error: historyError } = await supabase
        .from('ai_analyses')
        .select('id, type, content, created_at')
        .eq('user_id', userId)
        .eq('type', 'weekly')
        .order('created_at', { ascending: false });
      if (historyError) {
        console.error('[analysis] fetchExistingAnalysis', historyError.message);
        Alert.alert('分析の取得に失敗しました。');
        return;
      }
      setHistories(historyData);
    }
    const diff = (new Date().getTime() - new Date(analysedData[0].created_at).getTime()) / 1000 / 60 / 60 / 24;
    const nextTime = Math.floor((7 - diff) * 24 * 60 * 60);
    if (diff >= 7) setCanAnalyze(true);
    else {
      setLeftTime(nextTime);
      setCanAnalyze(false);
    }
    setAnalysisContent(analysedData?.[0] ?? null);
  }, [userId]);

  const handleAnalysis = async () => {
    if (isAnalysing || !canAnalyze) return;
    setIsAnalysing(true);
    try {
      const { error } = await supabase.functions.invoke('analyze-weather');
      if (error) {
        Alert.alert('分析に失敗しました。しばらく時間をおいて再試行してください。');
        return;
      }
      await fetchExistingAnalysis();
    } finally {
      setIsAnalysing(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setLeftTime((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          setIsLoading(true);
          await fetchExistingAnalysis();
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }, [fetchExistingAnalysis]),
  );

  const renderContent = () => {
    if (isAnalysing)
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={WeatherBoardColors.textPrimaryDark} />
        </View>
      );
    if (isHistory)
      return (
        <View style={{ flex: 1 }}>
          {selectedHistory ? (
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Pressable onPress={() => setSelectedHistory(null)} style={{ paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: WeatherBoardColors.textPrimaryDark }}>
                  <Text style={{ color: WeatherBoardColors.textPrimaryDark, fontWeight: '700', fontSize: 14 }}>
                    戻る
                  </Text>
                </Pressable>
                <Text style={{ color: WeatherBoardColors.textMutedBlack, fontSize: 12 }}>
                  {new Date(selectedHistory.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <AnalysisMarkdown content={selectedHistory.content} />
            </View>
          ) : (
            <FlatList
              data={histories}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: WeatherBoardColors.divider, marginVertical: 4 }} />}
              contentContainerStyle={{ paddingVertical: 8 }}
              ListEmptyComponent={() => (
                <Text style={{ color: WeatherBoardColors.textMutedBlack, fontWeight: '700', textAlign: 'center', padding: 16 }}>
                  まだ分析履歴はありません。
                </Text>
              )}
              renderItem={({ item }) => {
                const title = item.content.split('\n')[0].replace(/^#\s*/, '');
                return (
                  <Pressable
                    onPress={() => setSelectedHistory(item)}
                    style={{ paddingVertical: 12, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: WeatherBoardColors.textPrimaryDark, fontWeight: '600', fontSize: 13, flex: 1 }}>{title}</Text>
                    <Text style={{ color: WeatherBoardColors.textMutedBlack, fontSize: 11 }}>
                      {new Date(item.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit' })}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      );
    if (analysisContent) return <AnalysisMarkdown content={analysisContent.content} />;
    return (
      <Text style={{ color: WeatherBoardColors.textMutedBlack, fontWeight: '700', textAlign: 'center', padding: 16 }}>
        まだ分析結果がありません。
      </Text>
    );
  };

  const renderButton = () => {
    if (isHistory) return null;
    if (isLoading) return <ActivityIndicator size="small" color={WeatherBoardColors.buttonBackground} />;
    if (canAnalyze)
      return (
        <Pressable
          onPress={handleAnalysis}
          style={{
            backgroundColor: WeatherBoardColors.buttonBackground,
            borderRadius: 16,
            paddingVertical: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
          <Ionicons name="trending-up-outline" size={20} color="white" />
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>今週を振り返る</Text>
        </Pressable>
      );
    return (
      <>
        <Pressable
          onPress={handleAnalysis}
          style={{
            backgroundColor: 'rgba(96, 165, 250, 0.45)',
            borderRadius: 16,
            paddingVertical: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
          <Ionicons name="trending-up-outline" size={20} color="white" />
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>分析済み — 来週また振り返ろう</Text>
        </Pressable>
        <Text style={{ color: WeatherBoardColors.textMutedBlack, fontSize: 12, textAlign: 'center', marginTop: 6 }}>
          {`あと ${days}日${hours}時間${minutes}分${secs}秒`}
        </Text>
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <IconHeader icon="sparkles-outline" title="Analysis" subtitle="AIが週の気分を振り返ります">
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 100, padding: 4, gap: 4 }}>
          <Pressable
            onPress={() => {
              setSelectedHistory(null);
              setIsHistory(false);
            }}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 100,
              backgroundColor: isHistory ? 'transparent' : WeatherBoardColors.buttonBackground,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 4,
            }}>
            <Ionicons name="trending-up-outline" size={14} color={isHistory ? WeatherBoardColors.textPrimaryDark : '#FFFFFF'} />
            <Text style={{ color: isHistory ? WeatherBoardColors.textPrimaryDark : '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Weekly</Text>
          </Pressable>
          <Pressable
            onPress={() => setIsHistory(true)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 100,
              backgroundColor: isHistory ? WeatherBoardColors.buttonBackground : 'transparent',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 4,
            }}>
            <Ionicons name="calendar-outline" size={14} color={isHistory ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark} />
            <Text style={{ color: isHistory ? '#FFFFFF' : WeatherBoardColors.textPrimaryDark, fontWeight: '700', fontSize: 13 }}>History</Text>
          </Pressable>
        </View>
      </IconHeader>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: tabBarHeight }}>
        {/* Content island — includes the button so it "sits inside" as one card */}
        <View style={{ ...CardStyle, flex: 1, borderRadius: 20, padding: 16, justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>{renderContent()}</View>
          {renderButton()}
        </View>
      </View>
    </View>
  );
}
