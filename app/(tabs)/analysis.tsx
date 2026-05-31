import { AnalysisMarkdown } from '@/components/AnalysisMarkdown';
import { Fonts, WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, ImageBackground, Pressable, Text, View } from 'react-native';

export type AnalysisData = {
  type: 'weekly' | 'monthly';
  content: string;
  created_at: string;
  id: string;
};

const backgroundImage = require('@/assets/images/weather/analysis.png');
const MARKDOWN_MAX_HEIGHT = Dimensions.get('window').height * 0.75;

function formatTime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor(((seconds % 86400) % 3600) / 60);
  const secs = Math.floor(((seconds % 86400) % 3600) % 60);
  return { days, hours, minutes, secs };
}

export default function Analysis() {
  const [analysisContent, setAnalysisContent] = useState<AnalysisData | null>(null);
  const [canAnalyze, setCanAnalyze] = useState(false);
  const [histories, setHistories] = useState<AnalysisData[]>([]);
  const [isHistory, setIsHistory] = useState(false);
  const [leftTime, setLeftTime] = useState(0);
  const [selectedHistory, setSelectedHistory] = useState<AnalysisData | null>(null);
  const { days, hours, minutes, secs } = formatTime(leftTime);

  const fetchExistingAnalysis = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: analysedData } = await supabase.from('ai_analyses').select('id, type, content, created_at').eq('user_id', user.id).eq('type', 'weekly').order('created_at', { ascending: false }).limit(1);
    if (!analysedData || analysedData.length === 0) return setCanAnalyze(true);
    else {
      const { data: historyData, error: historyError } = await supabase.from('ai_analyses').select('id, type, content, created_at').eq('user_id', user.id).eq('type', 'weekly').order('created_at', { ascending: false });
      if (historyError) return Alert.alert(historyError.message);
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
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setLeftTime((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAnalysis = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
    await supabase.functions.invoke('analyze-weather', {
      body: { user_id: user.id, type: 'weekly' },
    });
    await fetchExistingAnalysis();
  };

  useFocusEffect(
    useCallback(() => {
      fetchExistingAnalysis();
    }, []),
  );

  const [fontsLoaded] = useFonts({
    DancingScript_400Regular: Fonts.titleFont,
  }) as [boolean, Error | null];

  if (!fontsLoaded) return null;
  return (
    <ImageBackground source={backgroundImage} className="flex-1 justify-center px-5">
      <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}></View>
      <View style={{ flex: 1, maxHeight: MARKDOWN_MAX_HEIGHT }}>
        <Text className="text-4xl text-center pb-8" style={{ color: WeatherBoardColors.textPrimary, fontFamily: 'DancingScript_400Regular' }}>
          Analisis
        </Text>
        <View className="flex-row items-center gap-2 mb-2">
          <BlurView intensity={50} tint={'dark'} className="py-2 px-4 border rounded" style={{ borderColor: WeatherBoardColors.glassBorder }}>
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

          <BlurView intensity={50} tint={'dark'} className="py-2 px-4 border rounded" style={{ borderColor: WeatherBoardColors.glassBorder }}>
            <Pressable onPress={() => setIsHistory(true)}>
              <Text className="text-sm font-bold" style={{ color: WeatherBoardColors.textPrimary, opacity: isHistory ? 1 : 0.5 }}>
                History
              </Text>
            </Pressable>
          </BlurView>
        </View>

        <BlurView intensity={50} tint={'dark'} className="overflow-hidden p-3 flex-1 mb-8 border" style={{ borderTopRightRadius: 4, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, borderColor: WeatherBoardColors.glassBorder }}>
          {isHistory ? (
            <View className="flex-1">
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
                  renderItem={({ item }) => (
                    <Pressable onPress={() => setSelectedHistory(item)} className="p-4 border flex-row items-center" style={{ borderColor: WeatherBoardColors.glassBorder }}>
                      <Text className="text-sm font-semibold" style={{ color: WeatherBoardColors.textPrimary }}>
                        {new Date(item.created_at).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </Pressable>
                  )}
                />
              )}
            </View>
          ) : analysisContent ? (
            <AnalysisMarkdown content={analysisContent.content} />
          ) : (
            <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary, padding: 8 }}>
              まだ分析結果がありません。
            </Text>
          )}
        </BlurView>
        {isHistory ? null : canAnalyze ? (
          <Pressable onPress={handleAnalysis} className="border py-6 rounded-xl" style={{ backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
            <Text className="text-center text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
              1週間分の分析する
            </Text>
          </Pressable>
        ) : (
          <View>
            <Text className="text-center text-base font-bold py-6 rounded-xl mb-2 border" style={{ color: WeatherBoardColors.textPrimary, backgroundColor: WeatherBoardColors.accentBackground, borderColor: WeatherBoardColors.glassBorder }}>
              1週間分の分析は終わってます。
            </Text>
            <Text className="text-sm text-center " style={{ color: WeatherBoardColors.textPrimary }}>
              {`あと ${days}日${hours}時間${minutes}分${secs}秒`}
            </Text>
          </View>
        )}
      </View>
    </ImageBackground>
  );
}
