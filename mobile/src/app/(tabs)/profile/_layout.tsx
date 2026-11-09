import { Stack } from 'expo-router/stack';

export default function ProfileLayout() {
  return <Stack screenOptions={{ headerLargeTitleEnabled: true, headerShadowVisible: false }}><Stack.Screen name="index" options={{ title: 'Cá nhân' }}/></Stack>;
}
