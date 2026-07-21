import { Platform } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

// app/(tabs)/_layout.tsx の浮いたタブバーは position: 'absolute' の
// ピル型で、useBottomTabBarHeight() だと正確な位置が取れないため、
// タブバーの marginBottom/height と同じ計算式をここに集約している。
// extra はタブバーの上端からさらに確保したい余白（px）。
export function useTabBarSpace(extra: number = 0): number {
  const { bottom } = useSafeAreaInsets();
  const tabBarMarginBottom = Platform.OS === 'android' ? 4 : Math.max(bottom - 4, 0);
  return tabBarMarginBottom + 60 + extra;
}
