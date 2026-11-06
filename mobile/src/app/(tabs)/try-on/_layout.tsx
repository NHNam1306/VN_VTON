import { Stack } from 'expo-router/stack';

export default function TryOnLayout() {
  return <Stack screenOptions={{ headerLargeTitleEnabled: true, headerShadowVisible: false }}><Stack.Screen name="index" options={{ title: 'Phòng thử' }}/></Stack>;
}
