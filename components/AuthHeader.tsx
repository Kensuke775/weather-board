import { Text, View } from 'react-native';

type Props = {
  title: string;
  subtitle?: string;
};

export function AuthHeader({ title, subtitle }: Props) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 80, paddingBottom: 28, paddingHorizontal: 24 }}>
      <Text style={{ fontFamily: 'DancingScript_400Regular', fontSize: 44, color: 'white', lineHeight: 52 }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: 14, color: 'white', marginTop: 8, opacity: 0.9 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
