import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ImageBackground, Platform, Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalysisMarkdown } from '@/components/AnalysisMarkdown';
import { Fonts } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

export type AnalysisData = {
  type: 'weekly' | 'monthly';
  content: string;
  created_at: string;
  id: string;
};

const backgroundImage = require('@/assets/images/weather/new-index-bg.png');
const PRIMARY_BROWN = '#624221';
const MUTED_BROWN = 'rgba(98,66,33,0.5)';
const ACCENT_BLUE = '#6B9BDE';

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
  const { bottom, top } = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'android' ? 72 : 60 + bottom + 4;
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

  if (!fontsLoaded) return null;

  const renderContent = () => {
    if (isAnalysing)
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY_BROWN} />
        </View>
      );
    if (isHistory)
      return (
        <View style={{ flex: 1 }}>
          {selectedHistory ? (
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Pressable onPress={() => setSelectedHistory(null)} style={{ paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: PRIMARY_BROWN }}>
                  <Text style={{ color: PRIMARY_BROWN, fontWeight: '700', fontSize: 14 }}>
                    戻る
                  </Text>
                </Pressable>
                <Text style={{ color: MUTED_BROWN, fontSize: 12 }}>
                  {new Date(selectedHistory.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <AnalysisMarkdown content={selectedHistory.content} />
            </View>
          ) : (
            <FlatList
              data={histories}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: 'rgba(98,66,33,0.1)', marginVertical: 4 }} />}
              contentContainerStyle={{ paddingVertical: 8 }}
              ListEmptyComponent={() => (
                <Text style={{ color: MUTED_BROWN, fontWeight: '700', textAlign: 'center', padding: 16 }}>
                  まだ分析履歴はありません。
                </Text>
              )}
              renderItem={({ item }) => {
                const title = item.content.split('\n')[0].replace(/^#\s*/, '');
                return (
                  <Pressable
                    onPress={() => setSelectedHistory(item)}
                    style={{ paddingVertical: 12, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: PRIMARY_BROWN, fontWeight: '600', fontSize: 13, flex: 1 }}>{title}</Text>
                    <Text style={{ color: MUTED_BROWN, fontSize: 11 }}>
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
      <Text style={{ color: MUTED_BROWN, fontWeight: '700', textAlign: 'center', padding: 16 }}>
        まだ分析結果がありません。
      </Text>
    );
  };

  const renderButton = () => {
    if (isHistory) return null;
    if (isLoading) return <ActivityIndicator size="small" color="white" />;
    if (canAnalyze)
      return (
        <Pressable
          onPress={handleAnalysis}
          style={{
            backgroundColor: ACCENT_BLUE,
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
            backgroundColor: 'rgba(107,155,222,0.45)',
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
        <Text style={{ color: MUTED_BROWN, fontSize: 12, textAlign: 'center', marginTop: 6 }}>
          {`あと ${days}日${hours}時間${minutes}分${secs}秒`}
        </Text>
      </>
    );
  };

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: top + 20, paddingHorizontal: 20, paddingBottom: tabBarHeight + 12 }}>
        {/* Title */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 20, marginBottom: 4 }}>🌿</Text>
          <Text style={{ fontFamily: 'DancingScript_400Regular', fontSize: 40, color: PRIMARY_BROWN }}>Analysis</Text>
        </View>

        {/* Segmented control */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#F5EEE4',
            borderRadius: 20,
            padding: 4,
            marginBottom: 14,
          }}>
          <Pressable
            onPress={() => {
              setSelectedHistory(null);
              setIsHistory(false);
            }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 16,
              backgroundColor: isHistory ? 'transparent' : 'white',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
              shadowColor: isHistory ? 'transparent' : '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isHistory ? 0 : 0.08,
              shadowRadius: 4,
              elevation: isHistory ? 0 : 2,
            }}>
            <Text style={{ fontSize: 13 }}>🌿</Text>
            <Text style={{ color: isHistory ? MUTED_BROWN : PRIMARY_BROWN, fontWeight: isHistory ? '400' : '700', fontSize: 14 }}>
              Weekly
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setIsHistory(true)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 16,
              backgroundColor: isHistory ? 'white' : 'transparent',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
              shadowColor: isHistory ? '#000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isHistory ? 0.08 : 0,
              shadowRadius: 4,
              elevation: isHistory ? 2 : 0,
            }}>
            <Ionicons name="calendar-outline" size={14} color={isHistory ? PRIMARY_BROWN : MUTED_BROWN} />
            <Text style={{ color: isHistory ? PRIMARY_BROWN : MUTED_BROWN, fontWeight: isHistory ? '700' : '400', fontSize: 14 }}>
              History
            </Text>
          </Pressable>
        </View>

        {/* Content card */}
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: 20,
            padding: 16,
            marginBottom: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
          }}>
          {renderContent()}
        </View>

        {/* Button */}
        {renderButton()}
      </View>
    </ImageBackground>
  );
}
