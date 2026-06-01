import { WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

export type ActivityTagPickerProps = {
  setSelectedTags: (tag: ActivityTag[]) => void;
  selectedTags: ActivityTag[];
  isInputVisible: boolean;
  setIsInputVisible: (value: boolean) => void;
};

export type ActivityTag = {
  id: string;
  tag_name: string | null;
  user_id: string | null;
};

const fetchUserTags = async (userId: string, setter: (data: ActivityTag[]) => void) => {
  const { data: userTagsData, error: userTagsError } = await supabase.from('activity_tags').select('id, tag_name, user_id').eq('user_id', userId);
  if (userTagsError){
    console.error('[ActivityTagPicker] fetchUserTags', userTagsError.message);
    Alert.alert('タグの取得に失敗しました。');
    return;
  }
  setter(userTagsData);
};

export default function ActivityTagPicker({ selectedTags, setSelectedTags, isInputVisible, setIsInputVisible }: ActivityTagPickerProps) {
  const { user } = useUser();
  const [userCreatedTags, setUserCreatedTags] = useState<ActivityTag[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const userId = user?.id;

  const handleInsertTag = async () => {
    if (isAddingTag) return;
    setIsAddingTag(true);
    try {
      if (inputText === '') return Alert.alert('入力欄が空です。');
      const { data: userTagsData, error: userTagsError } = await supabase.from('activity_tags').insert({ tag_name: inputText, user_id: userId }).select('id, tag_name, user_id').single();
      if (userTagsError) {
        console.error('[ActivityTagPicker] handleInsertTag', userTagsError.message);
        Alert.alert('タグの追加に失敗しました。');
        return;
      }
      setUserCreatedTags([...userCreatedTags, userTagsData]);
      setIsInputVisible(false);
      setInputText('');
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleToggleTag = (tag: ActivityTag) => {
    const isSelected = selectedTags.some((item) => item.id === tag.id);
    if (isSelected) {
      const filteredId = [...selectedTags].filter((item) => item.id !== tag.id);
      setSelectedTags(filteredId);
    } else setSelectedTags([...selectedTags, tag]);
  };

  const handleDeleteTag = async (tag: ActivityTag) => {
    const { error: userTagsError } = await supabase.from('activity_tags').delete().eq('id', tag.id);
    if (userTagsError) {
      console.error('[ActivityTagPicker] handleDeleteTag', userTagsError.message);
      Alert.alert('タグの削除に失敗しました。');
      return;
    }
    const deleteUserTag = userCreatedTags.filter((userTag) => userTag.id !== tag.id);
    const deleteUserTagId = selectedTags.filter((item) => item.id !== tag.id);
    setUserCreatedTags(deleteUserTag);
    setSelectedTags(deleteUserTagId);
  };

  useEffect(() => {
    if (!userId) return;
    fetchUserTags(userId, setUserCreatedTags);
  }, [userId]);
  return (
    <View>
      <View className="mb-10">
        <Text className="text-ms font-bold mb-4" style={{ color: WeatherBoardColors.textPrimary }}>
          自分のタグ
        </Text>
        <View className="flex-wrap flex-row gap-3">
          {userCreatedTags.map((tag) => (
            <BlurView key={tag.id} intensity={40} tint="light" className="flex items-center gap-2 p-2 border overflow-hidden" style={{ borderRadius: 16, borderColor: WeatherBoardColors.glassBorder }}>
              <Pressable
                onLongPress={() => {
                  Alert.alert('タグを削除しますか？', '', [{ text: 'キャンセル' }, { text: 'OK', onPress: () => handleDeleteTag(tag) }]);
                }}
                onPress={() => handleToggleTag(tag)}
                key={tag.id}
                style={selectedTags.some((item) => item.id === tag.id) ? { opacity: 1 } : { opacity: 0.4 }}>
                <Text className="text-ms font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                  #{tag.tag_name}
                </Text>
              </Pressable>
            </BlurView>
          ))}

          <BlurView intensity={40} tint="light" className="flex items-center gap-2 p-2 border overflow-hidden" style={{ borderRadius: 16, borderColor: WeatherBoardColors.glassBorder }}>
            <Pressable onPress={() => setIsInputVisible(true)}>
              <Text className="text-ms font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
                tags +
              </Text>
            </Pressable>
          </BlurView>
        </View>
      </View>

      {isInputVisible && (
        <View className="flex-row items-center rounded-xl overflow-hidden border" style={{ borderColor: WeatherBoardColors.glassBorder }}>
          <TextInput value={inputText} onChangeText={setInputText} placeholder="名前を入力し、追加してください。" autoCapitalize="none" className="flex-1 py-4 px-2 h-12 bg-white" />
          <Pressable onPress={handleInsertTag} className="px-1 flex justify-center items-center h-12" style={{ backgroundColor: WeatherBoardColors.tertiaryBackground }}>
            <Text className="text-base font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
              追加する
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
