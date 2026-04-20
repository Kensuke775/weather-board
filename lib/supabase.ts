// データベース — ユーザー情報・天気投稿の保存（PostgreSQL）
// 認証 — ログイン・サインアップ
// リアルタイム — 他のユーザーの投稿をリアルタイムで反映

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
//SupabaseのSDKは内部でURL処理を使っているため、React Native環境でも動くように「ブラウザのURL機能を模倣するコード」を読み込んでいます。
import 'react-native-url-polyfill/auto'

// SpaBaseに接続するためのURL、どのプロジェクトか。
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;

//アクセスキー認証用
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// スパベースクライアントを制作してエクスポートし、他のファイルから使えるようにする。
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, //ログイン状態をスマホに保存。
    autoRefreshToken: true, //トークンを自動更新します。
    persistSession: true, //アプリを完全に閉じて再起動しても「前回のログイン状態」を復元できます。
    detectSessionInUrl: false, //React NativeではURLからセッションを検出する機能が不要なので、それをオフにする設定です。
  },
});
