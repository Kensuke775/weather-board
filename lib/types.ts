export type WeatherType = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'snowy' | 'foggy' | 'stormy';

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
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
