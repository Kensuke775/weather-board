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
  sunny: { label: 'Feeling Amazing', emoji: '☀️', color: 'rgba(251, 146, 60, 0.3)', darkColor: 'rgba(188, 110, 45, 0.95)', cardColor: '#F5C896' },
  partly_cloudy: { label: 'Pretty Good', emoji: '🌤️', color: 'rgba(252, 211, 77, 0.3)', darkColor: 'rgba(189, 158, 58, 0.95)', cardColor: '#F5DEB8' },
  cloudy: { label: 'Feeling Blah', emoji: '☁️', color: 'rgba(148, 163, 184, 0.3)', darkColor: 'rgba(111, 122, 138, 0.95)', cardColor: '#EDE0CC' },
  rainy: { label: 'A Little Down', emoji: '☔️', color: 'rgba(96, 165, 250, 0.3)', darkColor: 'rgba(72, 124, 188, 0.95)', cardColor: '#B8D4F0' },
  stormy: { label: 'Rough Day', emoji: '⛈️', color: 'rgba(99, 102, 241, 0.3)', darkColor: 'rgba(74, 77, 181, 0.95)', cardColor: '#C8B8E0' },
  snowy: { label: 'Feeling Sick', emoji: '❄️', color: 'rgba(186, 230, 253, 0.3)', darkColor: 'rgba(140, 173, 190, 0.85)', cardColor: '#C8E0F0' },
  foggy: { label: 'Foggy & Sleepy', emoji: '🌫️', color: 'rgba(209, 213, 219, 0.3)', darkColor: 'rgba(157, 160, 164, 0.85)', cardColor: '#DCDCD0' },
};

export type WeatherBoardItem = {
  profiles: NameAvatar;
  id: string;
  weather: WeatherType;
  note: string | null;
  user_id: string;
  updated_at: string;
  tags: { id: string; name: string; }[]
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
  type: 'talk' | 'comment' | 'reaction' | 'room_join';
  from_user_id: string;
  weather_log_id: string | null;
  is_read: boolean;
  created_at: string;
  profiles: NameAvatar | null;
  weather: WeatherType | null;
  note: string | null;
  tags: { id: string; name: string }[];
};

export type NameAvatar = {
  nickname: string;
  avatar_emoji: string
}

export type RoomMember = {
  user_id: string
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


export type CommentsStatus =
  Record<string, {commenters: {user_id: string; emoji: string }[]; count: number}>

  export type RoomItem = {
    rooms: { id: string; name: string; invite_code?: string; icon_emoji?: string; created_by?: string };
  };

export type RoomMessageItem = {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles: NameAvatar;
};

export type ConversationItem = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  last_message_at: string;
  user_a: NameAvatar;
  user_b: NameAvatar;
};

export type DirectMessageItem = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type ActivityFeedItem = {
  id: string;
  from_user_id:string;
  to_user_id: string;
  created_at: string;
  from: { avatar_emoji: string; nickname: string } | null;
  to: { avatar_emoji: string; nickname: string } | null;
}

export type CommentSectionProps = {
  weather_log_id: string;
  to_user_id: string;
  readOnly?: boolean;
  cardColor?: string;
};

export const REACTION_TYPES = [
  { type: 'like', emoji: '👍' },
  { type: 'heart', emoji: '❤️' },
  { type: 'cheer', emoji: '📢' },
] as const;

export type ReactionType = (typeof REACTION_TYPES)[number]['type'];