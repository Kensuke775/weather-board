import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, PanResponder, Pressable, Text, View } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { JAPAN_PREFECTURES, JAPAN_VIEWBOX } from '@/constants/japanPrefectures';
import { WeatherBoardColors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { WEATHER_CONFIG, WeatherType } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type PrefectureWeather = Record<string, WeatherType>;

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
const ASPECT = INIT_W / INIT_H; // ~1.04

type Vb = { x: number; y: number; w: number; h: number };

// ---------------------------------------------------------------------------
// Pure helpers (no closures over component state — safe in PanResponder refs)
// ---------------------------------------------------------------------------

function clampVb(vb: Vb): Vb {
  const w = Math.max(2, Math.min(INIT_W, vb.w));
  const h = w / ASPECT;
  const x = Math.max(INIT_X, Math.min(INIT_X + INIT_W - w, vb.x));
  const y = Math.max(INIT_Y, Math.min(INIT_Y + INIT_H - h, vb.y));
  return { x, y, w, h };
}

function vbToStr({ x, y, w, h }: Vb): string {
  return `${x.toFixed(3)} ${y.toFixed(3)} ${w.toFixed(3)} ${h.toFixed(3)}`;
}

function pinchDist(
  t0: { pageX: number; pageY: number },
  t1: { pageX: number; pageY: number },
): number {
  return Math.hypot(t1.pageX - t0.pageX, t1.pageY - t0.pageY);
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = { visible: boolean; onClose: () => void };

export default function JapanMapModal({ visible, onClose }: Props) {
  const router = useRouter();
  const [prefWeather, setPrefWeather] = useState<PrefectureWeather>({});
  const [isLoading, setIsLoading] = useState(false);

  // ViewBox state — managed via ref for PanResponder access + state for re-render
  const vbRef = useRef<Vb>({ x: INIT_X, y: INIT_Y, w: INIT_W, h: INIT_H });
  const savedVb = useRef<Vb>({ x: INIT_X, y: INIT_Y, w: INIT_W, h: INIT_H });
  const [viewBoxStr, setViewBoxStr] = useState(JAPAN_VIEWBOX);
  const svgPxWidth = useRef(300); // updated via onLayout

  // applyVb: writes to ref + triggers re-render. Safe in PanResponder because
  // vbRef and setViewBoxStr are both stable across renders.
  const applyVb = (vb: Vb) => {
    const c = clampVb(vb);
    vbRef.current = c;
    setViewBoxStr(vbToStr(c));
  };

  const zoomTo = (factor: number) => {
    const { x, y, w, h } = vbRef.current;
    const newW = w / factor;
    const cx = x + w / 2;
    const cy = y + h / 2;
    applyVb({ x: cx - newW / 2, y: cy - newW / ASPECT / 2, w: newW, h: newW / ASPECT });
  };

  const resetVb = () => applyVb({ x: INIT_X, y: INIT_Y, w: INIT_W, h: INIT_H });

  // Pinch state refs — accessed by PanResponder (no closure issues; only refs used)
  const isPinching = useRef(false);
  const pinchStartDist = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // let taps through to SVG paths
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
    setPrefWeather(await fetchPrefectureWeather());
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
          <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 12 }}>
            {/* ズームコントロール */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
              <Text style={{ flex: 1, fontSize: 10, color: WeatherBoardColors.textMutedBlack }}>
                ピンチ / ドラッグ操作可能
              </Text>
              {([
                { icon: 'add-outline', action: () => zoomTo(1.6) },
                { icon: 'remove-outline', action: () => zoomTo(1 / 1.6) },
                { icon: 'expand-outline', action: resetVb },
              ] as const).map(({ icon, action }) => (
                <Pressable
                  key={icon}
                  onPress={action}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    backgroundColor: 'rgba(0,0,0,0.07)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Ionicons name={icon} size={15} color={WeatherBoardColors.textPrimaryDark} />
                </Pressable>
              ))}
            </View>

            {/* 地図 */}
            <View
              {...panResponder.panHandlers}
              onLayout={(e) => { svgPxWidth.current = e.nativeEvent.layout.width; }}
              style={{ width: '100%', aspectRatio: ASPECT, borderRadius: 10, overflow: 'hidden', backgroundColor: '#EAF4FB' }}>
              <Svg width="100%" height="100%" viewBox={viewBoxStr}>
                {/* 都道府県 */}
                {JAPAN_PREFECTURES.map((pref) => {
                  const weather = prefWeather[pref.name];
                  const fill = weather ? WEATHER_MAP_COLOR[weather] : 'rgba(180,195,210,0.5)';
                  return (
                    <Path
                      key={pref.code}
                      d={pref.path}
                      fill={fill}
                      stroke="#FFFFFF"
                      strokeWidth={0.05}
                      onPress={() => handlePrefPress(pref.name)}
                    />
                  );
                })}
                {/* 都道府県ラベル（ズームで読みやすくなる） */}
                {JAPAN_PREFECTURES.map((pref) => (
                  <SvgText
                    key={`lbl-${pref.code}`}
                    x={pref.centroid.x}
                    y={pref.centroid.y + 0.18}
                    fontSize={0.5}
                    fill="rgba(30,30,30,0.8)"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth={0.1}
                    textAnchor="middle"
                    fontWeight="bold">
                    {pref.label.substring(0, 2)}
                  </SvgText>
                ))}
              </Svg>
            </View>

            {/* 凡例 */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingHorizontal: 4 }}>
              {(Object.keys(WEATHER_CONFIG) as WeatherType[]).map((weather) => (
                <View key={weather} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: WEATHER_MAP_COLOR[weather] }} />
                  <Text style={{ fontSize: 10, color: WeatherBoardColors.textMutedBlack }}>
                    {WEATHER_CONFIG[weather].emoji}
                  </Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: 'rgba(180,195,210,0.5)' }} />
                <Text style={{ fontSize: 10, color: WeatherBoardColors.textMutedBlack }}>投稿なし</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
