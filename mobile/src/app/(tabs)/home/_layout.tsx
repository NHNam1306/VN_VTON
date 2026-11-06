import { Stack } from 'expo-router/stack';

export default function HomeLayout() {
  return <Stack screenOptions={{ headerLargeTitleEnabled: true, headerShadowVisible: false }}><Stack.Screen name="index" options={{ title: 'Tryoh' }}/></Stack>;
}
