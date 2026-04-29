import TalkButton from '@/components/TalkButton';
import { WEATHER_CONFIG, WeatherType } from '@/lib/types';
import { JSX, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import CommentSection from './CommentSection';

type WeatherCardProps = {
  nickname: string;
  avatar_emoji: string;
  weather: WeatherType;
  note: string | null;
  logged_date: string;
  weather_log_id: string;
  user_id: string;
};

export default function WeatherCard({ nickname, avatar_emoji, weather, note, logged_date, weather_log_id, user_id }: WeatherCardProps): JSX.Element {
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <>
      <Pressable onPress={() => setIsModalVisible(true)}>
        <View className="w-1/2">
          <View className="mb-12 flex flex-row">
            <Text>{avatar_emoji}</Text>
            <Text>{nickname}</Text>
          </View>
          <View className="mb-12 flex flex-row">
            <Text>{WEATHER_CONFIG[weather].emoji}</Text>
            <Text>{note}</Text>
          </View>
          <View className="mb-12 flex flex-row">
            <Text>{logged_date}</Text>
          </View>
        </View>
      </Pressable>
      <Modal visible={isModalVisible} animationType="slide">
        <View className="flex-1 justify-end">
          <View className="bg-white rounded-t-2xl p-20 h-1/2">
            <View>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <Text>戻る</Text>
              </Pressable>
            </View>
            <CommentSection to_user_id={user_id} weather_log_id={weather_log_id} />
            <TalkButton to_user_id={user_id} weather_log_id={weather_log_id} />
          </View>
        </View>
      </Modal>
    </>
  );
}
