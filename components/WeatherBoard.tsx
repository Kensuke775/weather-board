import { WeatherBoardItem } from '@/lib/types';
import { View } from 'react-native';
import WeatherCard from './WeatherCard';

type WeatherBoardProps = {
  weatherLogs: WeatherBoardItem[];
};

export default function WeatherBoard({ weatherLogs }: WeatherBoardProps){
    return(
        <View className="flex flex-row flex-wrap">
            {weatherLogs.map((w) => (
                <WeatherCard key={w.id} nickname={w.profiles.nickname} avatar_emoji={w.profiles.avatar_emoji} weather={w.weather} note={w.note} logged_date={w.logged_date} weather_log_id={w.id} user_id={w.user_id}/>
            ))}
        </View>
    );
}
