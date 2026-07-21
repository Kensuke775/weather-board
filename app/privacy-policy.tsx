import { ScrollView, View } from 'react-native';

import { PrivacyPolicyContent } from '@/components/PrivacyPolicyContent';
import { CardStyle, WeatherBoardColors } from '@/constants/theme';

export default function PrivacyPolicy() {
  return (
    <View style={{ flex: 1, backgroundColor: WeatherBoardColors.screenBackground }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <View style={{ ...CardStyle, borderRadius: 20, padding: 20 }}>
          <PrivacyPolicyContent />
        </View>
      </ScrollView>
    </View>
  );
}
