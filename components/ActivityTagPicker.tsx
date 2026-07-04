import { WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useMemo, useState } from 'react';
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
  if (userTagsError) {
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
  const selectedTagIds = useMemo(
    () => new Set(selectedTags.map((t) => t.id)),
    [selectedTags]
  );

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
      <View className="mb-4">
        <Text className="text-sm font-bold mb-4" style={{ color: WeatherBoardColors.textPrimary }}>
          今日のアクティビティ
        </Text>
        <View className="flex-wrap flex-row gap-3">
          {userCreatedTags.map((tag) => (
            <View key={tag.id} className="flex items-center gap-2 p-2 border overflow-hidden" style={{ borderRadius: 16, borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
              <Pressable
                onLongPress={() => {
                  Alert.alert('タグを削除しますか？', '', [{ text: 'キャンセル' }, { text: 'OK', onPress: () => handleDeleteTag(tag) }]);
                }}
                onPress={() => handleToggleTag(tag)}
                key={tag.id}
                style={selectedTagIds.has(tag.id) ? { opacity: 1 } : { opacity: 0.4 }}>
                <Text className="text-sm font-bold" style={{ color: 'black' }}>
                  #{tag.tag_name}
                </Text>
              </Pressable>
            </View>
          ))}

          <View className="flex items-center gap-2 p-2 border overflow-hidden" style={{ borderRadius: 16, borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'white' }}>
            <Pressable onPress={() => setIsInputVisible(!isInputVisible)}>
              <Text className="text-sm font-bold" style={{ color: 'black' }}>
                tags +
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {isInputVisible && (
        <View className="flex-row items-center rounded-xl overflow-hidden border" style={{ borderColor: WeatherBoardColors.glassBorder, marginTop: 12, marginBottom: 16 }}>
          <TextInput value={inputText} onChangeText={setInputText} placeholder="タグ名を入れて追加しよう" placeholderTextColor={WeatherBoardColors.placeholderDark} autoCapitalize="none" className="flex-1 px-1 h-14 bg-white text-sm" />
          <Pressable onPress={handleInsertTag} className="px-1 flex justify-center items-center h-14" style={{ backgroundColor: WeatherBoardColors.tertiaryBackground }}>
            <Text className="text-sm font-bold" style={{ color: WeatherBoardColors.textPrimary }}>
              追加する
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
