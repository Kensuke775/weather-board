import React, { createContext, useContext, useEffect, useState } from 'react';

import { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type UserProviderType = {
  user: User | null;
  isLoading: boolean;
};

const UserContext = createContext<UserProviderType>(null!);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setisLoading] = useState(true);
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setisLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return <UserContext.Provider value={{ user, isLoading }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
