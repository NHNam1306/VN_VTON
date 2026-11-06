import { Redirect } from 'expo-router';

import { useAuth } from '@/providers/auth-provider';

export default function IndexRoute() {
  const { session } = useAuth();
  return <Redirect href={session ? '/(tabs)/home' : '/auth'} />;
}
