import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, ImageBackground, Platform, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalysisMarkdown } from '@/components/AnalysisMarkdown';
import { Fonts, WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

export type AnalysisData = {
  type: 'weekly' | 'monthly';
  content: string;
  created_at: string;
  id: string;
};

const backgroundImage = require('@/assets/images/weather/analysis.png');
const MARKDOWN_MAX_HEIGHT = Dimensions.get('window').height * 0.7;

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
  const { bottom } = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];
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
    const { data: analysedData, error: analysedError } = await supabase.from('ai_analyses').select('id, type, content, created_at').eq('user_id', userId).eq('type', 'weekly').order('created_at', { ascending: false }).limit(1);
    if (analysedError) {
      console.error('[analysis] fetchExistingAnalysis', analysedError.message);
      Alert.alert('過去の分析の取得に失敗しました。');
      return;
    }
    if (!analysedData || analysedData.length === 0) return setCanAnalyze(true);
    else {
      const { data: historyData, error: historyError } = await supabase.from('ai_analyses').select('id, type, content, created_at').eq('user_id', userId).eq('type', 'weekly').order('created_at', { ascending: false });
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

  if (!fontsLoaded) return null;

  const renderContent = () => {
    if (isAnalysing)
      return (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="white" />
        </View>
      );
    if (isHistory)
      return (
        <View className="flex-1 pb-12">
          {selectedHistory ? (
            <View className="flex-1 gap-2">
              <View className="flex-row justify-between items-center mb-6">
                <Pressable onPress={() => setSelectedHistory(null)} className="py-2 pl-2">
                  <Text className="text-center text-base font-bold border-b" style={{ color: WeatherBoardColors.textPrimary, borderBottomColor: WeatherBoardColors.textPrimary }}>
                    戻る
                  </Text>
                </Pressable>
                <Text className="text-sm font-semibold" style={{ color: WeatherBoardColors.textPrimary }}>
                  {new Date(selectedHistory.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={{ maxHeight: MARKDOWN_MAX_HEIGHT }}>
                <AnalysisMarkdown content={selectedHistory.content} />
              </View>
            </View>
          ) : (
            <FlatList
              data={histories}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View className="h-4" />}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
              ListEmptyComponent={() => (
                <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textMuted }}>
                  まだ分析履歴はありません。
                </Text>
              )}
              renderItem={({ item }) => {
                const title = item.content.split('\n')[0].replace(/^#\s*/, '');
                return (
                  <Pressable onPress={() => setSelectedHistory(item)} className="p-4 border flex-row items-center justify-between" style={{ borderColor: WeatherBoardColors.glassBorder }}>
                    <Text className="text-sm font-semibold flex-1" style={{ color: WeatherBoardColors.textPrimary }}>
                      {title}
                    </Text>
                    <Text className="text-xs" style={{ color: WeatherBoardColors.textMuted }}>
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
      <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary, padding: 8 }}>
        まだ分析結果がありません。
      </Text>
    );
  };

  const renderButton = () => {
    if (isHistory) return null;
    if (isLoading) return <ActivityIndicator size="small" color="white" />;
    if (canAnalyze)
      return (
        <>
          <Ionicons name="analytics-outline" size={20} color="white" />
          <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
            今週を振り返る
          </Text>
        </>
      );
    return (
      <>
        <Ionicons name="analytics-outline" size={20} color="white" />
        <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
          分析済み — 来週また振り返ろう
        </Text>
      </>
    );
  };

  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center px-5">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }} />
      <View style={{ flex: 1, paddingBottom: 100, paddingTop: 80 }}>
        <Text className="text-4xl text-center pb-8" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
          Analisis
        </Text>
        <View className="flex-row items-center gap-2 mb-2">
          <BlurView intensity={50} tint={'dark'} className="py-2 px-4 border rounded" style={{ borderColor: WeatherBoardColors.glassBorder, backgroundColor: Platform.OS === 'ios' ? undefined : 'rgba(0, 0, 0, 0.8)' }}>
            <Pressable
              onPress={() => {
                setSelectedHistory(null);
                setIsHistory(false);
              }}>
              <Text className="text-sm font-bold" style={{ color: WeatherBoardColors.textPrimary, opacity: isHistory ? 0.5 : 1 }}>
                Weekly
              </Text>
            </Pressable>
          </BlurView>

          <BlurView intensity={50} tint={'dark'} className="py-2 px-4 border rounded" style={{ borderColor: WeatherBoardColors.glassBorder, backgroundColor: Platform.OS === 'ios' ? undefined : 'rgba(0, 0, 0, 0.8)' }}>
            <Pressable onPress={() => setIsHistory(true)}>
              <Text className="text-sm font-bold" style={{ color: WeatherBoardColors.textPrimary, opacity: isHistory ? 1 : 0.5 }}>
                History
              </Text>
            </Pressable>
          </BlurView>
        </View>

        <BlurView
          intensity={50}
          tint={'dark'}
          className="overflow-hidden p-3 flex-1 mb-4 border"
          style={{ borderTopRightRadius: 4, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, borderColor: WeatherBoardColors.glassBorder, backgroundColor: Platform.OS === 'ios' ? undefined : 'rgba(0, 0, 0, 0.8)' }}>
          {renderContent()}
        </BlurView>

        {!isHistory && (
          <View>
            <View
              className="overflow-hidden rounded-xl border"
              style={{
                borderColor: WeatherBoardColors.glassBorder,
                backgroundColor: canAnalyze ? WeatherBoardColors.accentBackground : WeatherBoardColors.glassBackgroundButton,
              }}>
              <Pressable onPress={handleAnalysis} className="py-6 flex-row justify-center items-center gap-3">
                {renderButton()}
              </Pressable>
            </View>
            {!isLoading && !canAnalyze && (
              <Text className="text-sm text-center " style={{ color: WeatherBoardColors.textPrimary }}>
                {`あと ${days}日${hours}時間${minutes}分${secs}秒`}
              </Text>
            )}
          </View>
        )}
      </View>
    </ImageBackground>
  );
}
