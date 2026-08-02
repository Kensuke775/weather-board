import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { JAPAN_PREFECTURES, JAPAN_VIEWBOX } from '@/constants/japanPrefectures';
import { WeatherBoardColors } from '@/constants/theme';
import useUserProfileNavigation from '@/hooks/useUserProfileNavigation';
import { toDateString } from '@/lib/date';
import { clampVb, pinchDist, Vb } from '@/lib/mapGeometry';
import { supabase } from '@/lib/supabase';
import { WEATHER_CONFIG, WeatherType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type PrefectureData = { weather: WeatherType; count: number };
type PrefUser = { user_id: string; nickname: string; avatar_emoji: string; weather: WeatherType };

const WEATHER_MAP_COLOR: Record<WeatherType, string> = {
  sunny: '#F5A623',
  partly_cloudy: '#F5C842',
  cloudy: '#A0B0C0',
  rainy: '#60A5FA',
  stormy: '#8B7BE0',
  snowy: '#93C5FD',
  foggy: '#C4C8CC',
};

const [INIT_X, INIT_Y, INIT_W, INIT_H] = JAPAN_VIEWBOX.split(' ').map(Number);
const ASPECT = INIT_W / INIT_H;
const MAP_BOUNDS: Vb = { x: INIT_X, y: INIT_Y, w: INIT_W, h: INIT_H };

function vbToStr({ x, y, w, h }: Vb): string {
  return `${x.toFixed(3)} ${y.toFixed(3)} ${w.toFixed(3)} ${h.toFixed(3)}`;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

const fetchPrefectureData = async (): Promise<Record<string, PrefectureData>> => {
  const today = toDateString();
  const { data, error } = await supabase
    .from('weather_logs')
    .select('weather, profiles!inner(prefecture)')
    .eq('logged_date', today)
    .not('profiles.prefecture', 'is', null);

  if (error) {
    console.error('[JapanMap] fetchPrefectureData', error.message);
    return {};
  }

  const tally: Record<string, Record<string, number>> = {};
  for (const row of data ?? []) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const pref = profile?.prefecture as string | null;
    if (!pref) continue;
    const weather = row.weather as WeatherType;
    tally[pref] ??= {};
    tally[pref][weather] = (tally[pref][weather] ?? 0) + 1;
  }

  const result: Record<string, PrefectureData> = {};
  for (const [pref, counts] of Object.entries(tally)) {
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as WeatherType;
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    result[pref] = { weather: dominant, count: total };
  }
  return result;
};

const fetchPrefectureUsers = async (prefName: string): Promise<PrefUser[]> => {
  const today = toDateString();
  const { data, error } = await supabase
    .from('weather_logs')
    .select('user_id, weather, profiles!inner(nickname, avatar_emoji, prefecture)')
    .eq('logged_date', today)
    .eq('profiles.prefecture', prefName);

  if (error) {
    console.error('[JapanMap] fetchPrefectureUsers', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      user_id: row.user_id,
      nickname: profile?.nickname ?? '名無し',
      avatar_emoji: profile?.avatar_emoji ?? '🙂',
      weather: row.weather as WeatherType,
    };
  });
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const CARD_STYLE = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  marginHorizontal: 16,
  shadowColor: '#000',
  shadowOpacity: 0.07,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};

export default function JapanMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigateToProfile = useUserProfileNavigation();
  const [prefData, setPrefData] = useState<Record<string, PrefectureData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPref, setSelectedPref] = useState<string | null>(null);
  const [prefUsers, setPrefUsers] = useState<PrefUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const vbRef = useRef<Vb>({ x: INIT_X, y: INIT_Y, w: INIT_W, h: INIT_H });
  const savedVb = useRef<Vb>({ x: INIT_X, y: INIT_Y, w: INIT_W, h: INIT_H });
  const [viewBoxStr, setViewBoxStr] = useState(JAPAN_VIEWBOX);
  const svgPxWidth = useRef(300);

  const applyVb = (vb: Vb) => {
    const c = clampVb(vb, MAP_BOUNDS);
    vbRef.current = c;
    setViewBoxStr(vbToStr(c));
  };

  const zoomTo = (factor: number) => {
    const { x, w } = vbRef.current;
    const newW = w / factor;
    const cx = x + w / 2;
    const cy = vbRef.current.y + vbRef.current.h / 2;
    applyVb({ x: cx - newW / 2, y: cy - newW / ASPECT / 2, w: newW, h: newW / ASPECT });
  };

  const resetVb = () => applyVb({ x: INIT_X, y: INIT_Y, w: INIT_W, h: INIT_H });

  const isPinching = useRef(false);
  const pinchStartDist = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, gs) =>
        e.nativeEvent.touches.length > 1 || Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4,
      onPanResponderGrant: (e) => {
        savedVb.current = { ...vbRef.current };
        const touches = e.nativeEvent.touches;
        if (touches.length >= 2) {
          isPinching.current = true;
          pinchStartDist.current = pinchDist(touches[0], touches[1]);
        } else {
          isPinching.current = false;
        }
      },
      onPanResponderMove: (e, gs) => {
        const sv = savedVb.current;
        const touches = e.nativeEvent.touches;
        if (isPinching.current && touches.length >= 2 && pinchStartDist.current > 0) {
          const dist = pinchDist(touches[0], touches[1]);
          const newW = sv.w * (pinchStartDist.current / dist);
          const cx = sv.x + sv.w / 2;
          const cy = sv.y + sv.h / 2;
          applyVb({ x: cx - newW / 2, y: cy - newW / ASPECT / 2, w: newW, h: newW / ASPECT });
        } else if (!isPinching.current && svgPxWidth.current > 0) {
          const unitsPerPx = sv.w / svgPxWidth.current;
          applyVb({ x: sv.x - gs.dx * unitsPerPx, y: sv.y - gs.dy * unitsPerPx, w: sv.w, h: sv.h });
        }
      },
      onPanResponderRelease: () => { isPinching.current = false; },
      onPanResponderTerminate: () => { isPinching.current = false; },
    }),
  ).current;

  const load = useCallback(async () => {
    setIsLoading(true);
    setPrefData(await fetchPrefectureData());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrefPress = async (prefName: string) => {
    setSelectedPref(prefName);
    setIsLoadingUsers(true);
    setPrefUsers(await fetchPrefectureUsers(prefName));
    setIsLoadingUsers(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      {/* ヘッダー */}
      <View style={{
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: insets.top + 12,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: WeatherBoardColors.divider,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={20} color={WeatherBoardColors.textPrimaryDark} />
          </Pressable>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>
              今日の天気マップ
            </Text>
            <Text style={{ fontSize: 13, color: WeatherBoardColors.textMutedBlack, marginTop: 2 }}>
              都道府県をタップしてユーザーを確認
            </Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={WeatherBoardColors.buttonBackground} />
        </View>
      ) : (
        <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 16 }}>
          {/* 地図カード */}
          <View style={{ ...CARD_STYLE, overflow: 'hidden' }}>
            {/* 地図（ズームボタン重ねる） */}
            <View style={{ position: 'relative' }}>
              <View
                {...panResponder.panHandlers}
                onLayout={(e) => { svgPxWidth.current = e.nativeEvent.layout.width; }}
                onTouchStart={() => setScrollEnabled(false)}
                onTouchEnd={() => setScrollEnabled(true)}
                onTouchCancel={() => setScrollEnabled(true)}
                style={{ width: '100%', aspectRatio: ASPECT, backgroundColor: '#EAF4FB' }}>
                <Svg width="100%" height="100%" viewBox={viewBoxStr}>
                  {JAPAN_PREFECTURES.map((pref) => {
                    const data = prefData[pref.name];
                    const isSelected = selectedPref === pref.name;
                    const fill = data ? WEATHER_MAP_COLOR[data.weather] : 'rgba(180,195,210,0.5)';
                    return (
                      <Path
                        key={pref.code}
                        d={pref.path}
                        fill={fill}
                        stroke={isSelected ? '#3B82F6' : '#FFFFFF'}
                        strokeWidth={isSelected ? 0.065 : 0.05}
                        onPress={() => handlePrefPress(pref.name)}
                      />
                    );
                  })}
                  {(() => {
                    const currentW = parseFloat(viewBoxStr.split(' ')[2]);
                    return JAPAN_PREFECTURES.map((pref) => {
                      const data = prefData[pref.name];
                      return (
                        <React.Fragment key={`lbl-${pref.code}`}>
                          {data && (
                            <SvgText
                              x={pref.centroid.x}
                              y={pref.centroid.y + currentW * 0.016}
                              fontSize={currentW * 0.024}
                              fill="rgba(20,20,20,0.75)"
                              textAnchor="middle">
                              {data.count}人
                            </SvgText>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </Svg>
              </View>

              {/* フローティングズームボタン */}
              <View style={{
                position: 'absolute',
                top: 10,
                right: 10,
                gap: 6,
              }}>
                {([
                  { icon: 'add' as const, action: () => zoomTo(1.6) },
                  { icon: 'remove' as const, action: () => zoomTo(1 / 1.6) },
                  { icon: 'expand-outline' as const, action: resetVb },
                ]).map(({ icon, action }) => (
                  <Pressable
                    key={icon}
                    onPress={action}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      backgroundColor: 'rgba(255,255,255,0.85)',
                      alignItems: 'center', justifyContent: 'center',
                      shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4,
                      shadowOffset: { width: 0, height: 1 }, elevation: 2,
                    }}>
                    <Ionicons name={icon} size={16} color={WeatherBoardColors.textPrimaryDark} />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 凡例 */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: WeatherBoardColors.divider }}>
              {(Object.keys(WEATHER_CONFIG) as WeatherType[]).map((weather) => (
                <View key={weather} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: WEATHER_MAP_COLOR[weather] }} />
                  <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack }}>
                    {WEATHER_CONFIG[weather].emoji}
                  </Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: 'rgba(180,195,210,0.5)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }} />
                <Text style={{ fontSize: 11, color: WeatherBoardColors.textMutedBlack }}>投稿なし</Text>
              </View>
            </View>
          </View>

          {/* ユーザーリストカード */}
          <View style={{ ...CARD_STYLE, marginTop: 12, marginBottom: 16, overflow: 'hidden' }}>
            {/* カードヘッダー */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: WeatherBoardColors.divider }}>
              {selectedPref ? (
                <Text style={{ fontSize: 14, fontWeight: '700', color: WeatherBoardColors.textPrimaryDark }}>
                  {selectedPref}
                  <Text style={{ fontWeight: '400', fontSize: 13, color: WeatherBoardColors.textMutedBlack }}>
                    {' '}の今日の投稿
                  </Text>
                </Text>
              ) : (
                <Text style={{ fontSize: 13, color: WeatherBoardColors.textMutedBlack }}>
                  都道府県をタップするとユーザーが表示されます
                </Text>
              )}
            </View>

            {isLoadingUsers ? (
              <ActivityIndicator size="small" color={WeatherBoardColors.buttonBackground} style={{ marginTop: 20 }} />
            ) : selectedPref && prefUsers.length === 0 ? (
              <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: WeatherBoardColors.textMutedBlack }}>
                今日の投稿はありません
              </Text>
            ) : (
              <View>
                {prefUsers.map((item, index) => (
                  <View key={item.user_id}>
                    {index > 0 && <View style={{ height: 1, backgroundColor: WeatherBoardColors.divider, marginLeft: 56 }} />}
                    <Pressable
                      onPress={() => navigateToProfile(item.user_id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 11,
                        paddingHorizontal: 16,
                        gap: 12,
                      }}>
                      <Text style={{ fontSize: 28 }}>{item.avatar_emoji}</Text>
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: WeatherBoardColors.textPrimaryDark }}>
                        {item.nickname}
                      </Text>
                      <Text style={{ fontSize: 20 }}>{WEATHER_CONFIG[item.weather].emoji}</Text>
                      <Ionicons name="chevron-forward" size={14} color={WeatherBoardColors.textMutedBlack} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
