import { Stack } from 'expo-router/stack';

export default function WardrobeLayout() {
  return <Stack screenOptions={{ headerLargeTitleEnabled: true, headerShadowVisible: false }}><Stack.Screen name="index" options={{ title: 'Kho đồ' }}/></Stack>;
}
