import { ScrollView, View } from 'react-native';

import { EulaContent } from '@/components/EulaContent';
import { CardStyle, WeatherBoardColors } from '@/constants/theme';

export default function Terms() {
  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <View style={{ ...CardStyle, borderRadius: 20, padding: 20 }}>
          <EulaContent />
        </View>
      </ScrollView>
    </View>
  );
}
