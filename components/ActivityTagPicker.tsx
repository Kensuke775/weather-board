import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

export type ActivityTagPickerProps = {
  setSelectedId: (tag: ActivityTag[]) => void;
  selectedId: ActivityTag[];
};

export type ActivityTag = {
  id: string;
  tag_name: string | null;
  user_id: string | null;
};

export default function ActivityTagPicker({ selectedId, setSelectedId }: ActivityTagPickerProps) {
  const [systemTags, setSystemTags] = useState<ActivityTag[]>([]);
  const [userCreatedTags, setUserCreatedTags] = useState<ActivityTag[]>([]);
  const [inputText, setInputText] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);

  const fetchSystemTags = async () => {
    const { data: systemTagsData, error: systemTagsError } = await supabase.from('activity_tags').select('id, tag_name, user_id');
    if (systemTagsError) return Alert.alert(systemTagsError.message);
    setSystemTags(systemTagsData);
  };

  const handleInsertTag = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Alert.alert('ユーザーが取得出来ませんでした。');
    if (inputText === '') return Alert.alert('入力欄が空です。');
    const { data: tagData, error: tagError } = await supabase.from('activity_tags').insert({ tag_name: inputText, user_id: user.id }).select('id, tag_name, user_id').single();
    if (tagError) return Alert.alert(tagError.message);
    setUserCreatedTags([...userCreatedTags, tagData]);
    setIsInputVisible(false);
    setInputText('');
  };

  const handleToggleTag = (tag: ActivityTag) => {
    const isIncludes = selectedId.some((item) => item.id === tag.id);
    if (isIncludes) {
      const filteredId = [...selectedId].filter((item) => item.id !== tag.id);
      setSelectedId(filteredId);
    } else setSelectedId([...selectedId, tag]);
  };

  useEffect(() => {
    fetchSystemTags();
  }, []);
  return (
    <>
      <View>
        <View>
          <View>
            <Text>システムのタグ</Text>
            {systemTags.map((tag) => (
              <Pressable key={tag.id} onPress={() => handleToggleTag(tag)} style={selectedId.some((item) => item.id === tag.id) ? { opacity: 1 } : { opacity: 0.4 }}>
                <Text>{tag.tag_name}</Text>
              </Pressable>
            ))}
          </View>

          <View>
            <Text>自分のタグ</Text>
            <View>
              {userCreatedTags.map((tag) => (
                <Pressable onPress={() => handleToggleTag(tag)} key={tag.id} style={selectedId.some((item) => item.id === tag.id) ? { opacity: 1 } : { opacity: 0.4 }}>
                  <Text>{tag.tag_name}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setIsInputVisible(true)}>
                <Text>tags + </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      {isInputVisible && (
        <View className="flex justify-end w-full h-[100px]">
          <TextInput value={inputText} onChangeText={setInputText} placeholder="新しいタグを作れます。" />
          <Pressable onPress={handleInsertTag}>
            <Text>追加する</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}
