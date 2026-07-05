import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

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

const PRIMARY_BROWN = '#624221';
const MUTED_BROWN = 'rgba(98,66,33,0.5)';
const ACCENT_BLUE = '#6B9BDE';

const fetchUserTags = async (userId: string, setter: (data: ActivityTag[]) => void) => {
  const { data: userTagsData, error: userTagsError } = await supabase
    .from('activity_tags')
    .select('id, tag_name, user_id')
    .eq('user_id', userId);
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
  const selectedTagIds = useMemo(() => new Set(selectedTags.map((t) => t.id)), [selectedTags]);

  const handleInsertTag = async () => {
    if (isAddingTag) return;
    setIsAddingTag(true);
    try {
      if (inputText === '') return Alert.alert('入力欄が空です。');
      const { data: userTagsData, error: userTagsError } = await supabase
        .from('activity_tags')
        .insert({ tag_name: inputText, user_id: userId })
        .select('id, tag_name, user_id')
        .single();
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
      setSelectedTags([...selectedTags].filter((item) => item.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleDeleteTag = async (tag: ActivityTag) => {
    const { error: userTagsError } = await supabase.from('activity_tags').delete().eq('id', tag.id);
    if (userTagsError) {
      console.error('[ActivityTagPicker] handleDeleteTag', userTagsError.message);
      Alert.alert('タグの削除に失敗しました。');
      return;
    }
    setUserCreatedTags(userCreatedTags.filter((t) => t.id !== tag.id));
    setSelectedTags(selectedTags.filter((item) => item.id !== tag.id));
  };

  useEffect(() => {
    if (!userId) return;
    fetchUserTags(userId, setUserCreatedTags);
  }, [userId]);

  return (
    <View>
      {/* Section header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <Text style={{ fontSize: 15 }}>🌿</Text>
        <Text style={{ color: PRIMARY_BROWN, fontWeight: '700', fontSize: 14 }}>今日のアクティビティ</Text>
      </View>

      {/* Tags */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
        {userCreatedTags.map((tag) => {
          const isSelected = selectedTagIds.has(tag.id);
          return (
            <Pressable
              key={tag.id}
              onLongPress={() => {
                Alert.alert('タグを削除しますか？', '', [
                  { text: 'キャンセル' },
                  { text: 'OK', onPress: () => handleDeleteTag(tag) },
                ]);
              }}
              onPress={() => handleToggleTag(tag)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.92)',
                borderRadius: 20,
                paddingVertical: 8,
                paddingHorizontal: 14,
                opacity: isSelected ? 1 : 0.5,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 1,
              }}>
              <Text style={{ color: PRIMARY_BROWN, fontSize: 13, fontWeight: '600' }}>#{tag.tag_name}</Text>
            </Pressable>
          );
        })}

        {/* tags + button */}
        <Pressable
          onPress={() => setIsInputVisible(!isInputVisible)}
          style={{
            backgroundColor: ACCENT_BLUE,
            borderRadius: 20,
            paddingVertical: 8,
            paddingHorizontal: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 1,
          }}>
          <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>tags +</Text>
        </Pressable>
      </View>

      {/* Tag input */}
      {isInputVisible && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 14,
            overflow: 'hidden',
            marginTop: 12,
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderWidth: 1,
            borderColor: 'rgba(98,66,33,0.15)',
          }}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="タグ名を入れて追加しよう"
            placeholderTextColor={MUTED_BROWN}
            autoCapitalize="none"
            style={{ flex: 1, paddingHorizontal: 14, height: 48, color: PRIMARY_BROWN, fontSize: 13 }}
          />
          <Pressable
            onPress={handleInsertTag}
            style={{ paddingHorizontal: 16, height: 48, justifyContent: 'center', backgroundColor: ACCENT_BLUE }}>
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>追加する</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
