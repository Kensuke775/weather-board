import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type UserProviderType = {
  user: User | null;
};

const fetchUserData = async (setter: (data: User | null) => void) => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (error.message === 'Network request failed') {
      Alert.alert('通信エラーが発生しました。ネットワークを確認してください。');
    } else {
      console.error('[UserContext] fetchUserData', error.message);
      Alert.alert('ユーザーの取得に失敗しました。');
    }
    return;
  }
  setter(user);
};

const UserContext = createContext<UserProviderType>(null!);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    fetchUserData(setUser);
  }, []);

  return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
