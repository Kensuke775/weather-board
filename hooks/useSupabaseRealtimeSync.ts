import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

type SupabaseRealtimeSyncType = {
    channelName: string;
    table: string;
    filter?: string;
    skipInitialFetch?: boolean;
    callback: () => Promise<void>;
}

export function useSupabaseRealtimeSync(params:SupabaseRealtimeSyncType) {
useEffect(() => {
    const {channelName, table, filter, skipInitialFetch, callback, } = params;
    let channel: ReturnType<typeof supabase.channel>;
    // 依存配列(channelName等)が変わって古いeffectの後片付けが走った後も、
    // 非同期処理(removeChannel/callback)の続きが古いチャンネルを作ってしまわないようにするガード。
    let isCancelled = false;
    const setUp = async () => {
      const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);
      if (existing) await supabase.removeChannel(existing);
      if (isCancelled) return;
      if (!skipInitialFetch) {
        await callback();
        if (isCancelled) return;
      }
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, async () => {
          await callback();
        })
        .subscribe();
    };
    setUp();
    return () => {
      isCancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // callbackは呼び出し元で毎回新しく作られる関数のため、依存配列にあえて含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [params.channelName, params.table, params.filter, params.skipInitialFetch])
}