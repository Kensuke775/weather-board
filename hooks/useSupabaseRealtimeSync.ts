import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

type SupabaseRealtimeSyncType = {
    channelName: string;
    table: string;
    filter?: string;
    callback: () => Promise<void>;
}

export function useSupabaseRealtimeSync(params:SupabaseRealtimeSyncType) {
useEffect(() => {
    const {channelName, table, filter, callback, } = params;
    let channel: ReturnType<typeof supabase.channel>;
    const setUp = async () => {
      const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      await callback();
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, async () => {
          await callback();
        })
        .subscribe();
    };
    setUp();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // callbackは呼び出し元で毎回新しく作られる関数のため、依存配列にあえて含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [params.channelName, params.table, params.filter])
}