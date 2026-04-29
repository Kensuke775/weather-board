export type WeatherType = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'snowy' | 'foggy' | 'stormy';

export type Profile = {
  user_id: string;
  nickname: string;
  avatar_emoji: string | null;
  created_at: string;
  push_token: string | null;
};

export type Post = {
  id: string;
  user_id: string;
  weather: WeatherType;
  note: string | null;
  created_at: string;
};

export type Room = {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  created_by: string;
};

export type WeatherLogs = {
  id: string;
  user_id: string;
  weather: WeatherType;
  note: string | null;
  logged_date: string;
  updated_at: string;
};

export type WeatherLogHistory = {
  id: string;
  weather_log_id: string;
  weather: WeatherType;
  note: string | null;
  recorded_at: string;
};

export const WEATHER_CONFIG = {
  sunny: { label: '晴れ', emoji: '☀️', color: '#FCD34D' },
  partly_cloudy: { label: '晴れ時々曇り', emoji: '🌤️', color: '#93C5FD' },
  cloudy: { label: '曇り・どんより', emoji: '☁️', color: '#94A3B8' },
  rainy: { label: '雨', emoji: '☔️', color: '#60A5FA' },
  stormy: { label: '嵐', emoji: '⛈️', color: '#6366F1' },
  snowy: { label: '雪', emoji: '❄️', color: '#BAE6FD' },
  foggy: { label: '霧', emoji: '🌫️', color: '#D1D5DB' },
};

export type WeatherBoardItem = {
  profiles: NameAvatar;
  id: string;
  weather: WeatherType;
  note: string | null;
  logged_date: string;
  user_id: string;
};

export type CommentItem = {
  profiles: NameAvatar;
  id: string;
  weather_log_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type Notification = {
  id: string;
  to_user_id: string;
  type: 'talk' | 'comment';
  from_user_id: string;
  weather_log_id: string;
  is_read: boolean;
  created_at: string;
  profiles: NameAvatar | null;
};

export type NameAvatar = {
  nickname: string;
  avatar_emoji: string
}

export type Reaction = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  weather_log_id: string;
  created_at: string;
};


export type HistoryLog = {
  id: string;
  user_id: string;
  weather: WeatherType;
  logged_date: string;
  profiles: { avatar_emoji: string };
};
