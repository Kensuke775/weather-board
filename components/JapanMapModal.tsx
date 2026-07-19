import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { WeatherBoardColors } from '@/constants/theme';
import { JAPAN_PREFECTURES, JAPAN_VIEWBOX } from '@/constants/japanPrefectures';
import { supabase } from '@/lib/supabase';
import { WEATHER_CONFIG, WeatherType } from '@/lib/types';

type PrefectureWeather = Record<string, WeatherType>;

const fetchPrefectureWeather = async (): Promise<PrefectureWeather> => {
  const today = new Date().toLocaleDateString('en-CA');
  const { data, error } = await supabase
    .from('weather_logs')
    .select('weather, profiles!inner(prefecture)')
    .eq('logged_date', today)
    .not('profiles.prefecture', 'is', null);

  if (error) {
    console.error('[JapanMapModal] fetchPrefectureWeather', error.message);
    return {};
  }

  // 都道府県ごとに天気の出現数を集計し最頻値を返す
  const tally: Record<string, Record<string, number>> = {};
  for (const row of data ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const pref = profile?.prefecture as string | null;
    if (!pref) continue;
    const weather = row.weather as WeatherType;
    tally[pref] ??= {};
    tally[pref][weather] = (tally[pref][weather] ?? 0) + 1;
  }

  const result: PrefectureWeather = {};
  for (const [pref, counts] of Object.entries(tally)) {
    result[pref] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as WeatherType;
  }
  return result;
};

const WEATHER_MAP_COLOR: Record<WeatherType, string> = {
  sunny: '#F5A623',
  partly_cloudy: '#F5C842',
  cloudy: '#A0B0C0',
  rainy: '#60A5FA',
  stormy: '#8B7BE0',
  snowy: '#93C5FD',
  foggy: '#C4C8CC',
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function JapanMapModal({ visible, onClose }: Props) {
  const router = useRouter();
  const [prefWeather, setPrefWeather] = useState<PrefectureWeather>({});
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchPrefectureWeather();
    setPrefWeather(result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const handlePrefPress = (prefName: string) => {
    onClose();
    router.push(`/prefecture-users?name=${encodeURIComponent(prefName)}`);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
        {/* ヘッダー */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: WeatherBoardColors.divider,
        }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>
              今日の天気マップ
            </Text>
            <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack, marginTop: 2 }}>
              都道府県をタップするとユーザー一覧を表示
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={18} color={WeatherBoardColors.textPrimaryDark} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={WeatherBoardColors.buttonBackground} />
          </View>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 16 }}>
            {/* 日本地図 SVG */}
            <Svg
              width="100%"
              height={undefined}
              viewBox={JAPAN_VIEWBOX}
              style={{ aspectRatio: 20 / 17 }}>
              {JAPAN_PREFECTURES.map((pref) => {
                const weather = prefWeather[pref.name];
                const fill = weather ? WEATHER_MAP_COLOR[weather] : 'rgba(0,0,0,0.08)';
                const stroke = '#FFFFFF';
                const isOkinawa = pref.code === 47;
                return (
                  <Path
                    key={pref.code}
                    d={pref.path}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isOkinawa ? 0.05 : 0.05}
                    onPress={() => handlePrefPress(pref.name)}
                  />
                );
              })}
              {/* 沖縄ラベル */}
              <SvgText
                x={128}
                y={17.1}
                fontSize={0.4}
                fill={WeatherBoardColors.textMutedBlack}
                textAnchor="middle">
                沖縄
              </SvgText>
              {/* 沖縄の枠線（インセット区切り） */}
              <Rect
                x={126.8}
                y={16.3}
                width={2.4}
                height={1.4}
                fill="none"
                stroke="rgba(0,0,0,0.15)"
                strokeWidth={0.04}
                strokeDasharray="0.15 0.1"
              />
            </Svg>

            {/* 凡例 */}
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 16,
              paddingHorizontal: 4,
            }}>
              {(Object.keys(WEATHER_CONFIG) as WeatherType[]).map((weather) => (
                <View key={weather} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: WEATHER_MAP_COLOR[weather] }} />
                  <Text style={{ fontSize: 10, color: WeatherBoardColors.textMutedBlack }}>
                    {WEATHER_CONFIG[weather].emoji}
                  </Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.08)' }} />
                <Text style={{ fontSize: 10, color: WeatherBoardColors.textMutedBlack }}>投稿なし</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
