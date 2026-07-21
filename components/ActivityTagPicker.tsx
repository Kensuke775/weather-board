import { Ionicons } from '@expo/vector-icons';
import { BrownTheme, WeatherBoardColors } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

export type ActivityTagPickerProps = {
  setSelectedTags: (tag: ActivityTag[]) => void;
  selectedTags: ActivityTag[];
  maxSelected?: number;
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
  setter(Array.from(new Map(userTagsData.map((tag) => [tag.id, tag])).values()));
};

export default function ActivityTagPicker({ selectedTags, setSelectedTags, maxSelected }: ActivityTagPickerProps) {
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
      setUserCreatedTags((prev) => (prev.some((tag) => tag.id === userTagsData.id) ? prev : [...prev, userTagsData]));
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
      return;
    }
    if (maxSelected !== undefined && selectedTags.length >= maxSelected) {
      Alert.alert(`タグは${maxSelected}個まで選択できます。`);
      return;
    }
    setSelectedTags([...selectedTags, tag]);
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
        <View className="flex-row items-center gap-1.5 mb-1">
          <Ionicons name="pricetag-outline" size={16} color="rgba(0,0,0,0.85)" />
          <Text className="text-sm font-bold" style={{ color: 'rgba(0,0,0,0.85)' }}>
            今日のアクティビティ
          </Text>
        </View>
        <Text className="text-[10px] mb-3" style={{ color: 'rgba(0,0,0,0.4)' }}>
          長押しでタグを削除できます
        </Text>
        <View className="flex-wrap flex-row gap-3">
          {userCreatedTags.map((tag) => {
            const isSelected = selectedTagIds.has(tag.id);
            const isLimitReached = maxSelected !== undefined && selectedTags.length >= maxSelected;
            const isDisabled = !isSelected && isLimitReached;
            return (
              <View
                key={tag.id}
                className="overflow-hidden"
                style={{
                  borderRadius: 100,
                  backgroundColor: isSelected ? WeatherBoardColors.buttonBackground : 'white',
                  borderWidth: isSelected ? 0 : 1,
                  borderColor: 'rgba(0,0,0,0.15)',
                  opacity: isDisabled ? 0.3 : 1,
                }}>
                <Pressable
                  onLongPress={() => {
                    Alert.alert('タグを削除しますか？', '', [{ text: 'キャンセル' }, { text: 'OK', onPress: () => handleDeleteTag(tag) }]);
                  }}
                  onPress={() => handleToggleTag(tag)}
                  disabled={isDisabled}
                  className="px-4 py-2.5">
                  <Text className="text-sm font-bold" style={{ color: isSelected ? 'white' : 'black' }}>
                    {tag.tag_name}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: BrownTheme.contentBorder, marginBottom: 16 }} />

      <View className="flex-row items-center gap-2">
        <View className="flex-1 overflow-hidden" style={{ borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.04)' }}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="タグ名を入れて追加しよう"
            placeholderTextColor={WeatherBoardColors.placeholderDark}
            autoCapitalize="none"
            className="px-4 h-12 text-sm"
            style={{ color: 'rgba(0,0,0,0.85)' }}
          />
        </View>
        <Pressable onPress={handleInsertTag} className="items-center justify-center" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: WeatherBoardColors.buttonBackground }}>
          <Ionicons name="add" size={22} color="white" />
        </Pressable>
      </View>
    </View>
  );
}
