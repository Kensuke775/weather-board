export type WeatherType = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'snowy' | 'foggy' | 'stormy';

export type Profile = {
  user_id: string;
  nickname: string;
  avatar_emoji: string | null;
  created_at: string;
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
