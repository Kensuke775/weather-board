import { useRouter } from 'expo-router';

export default function useUserProfileNavigation() {
  const router = useRouter();
  return (userId: string) => router.push(`/user-profile?userId=${userId}`);
}
