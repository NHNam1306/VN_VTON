import { View } from 'react-native';
import { Image } from 'expo-image';

import { radius, shadows } from '@/theme';

export function TryohMark({ size = 58 }: { size?: number }) {
  return <View accessibilityRole="image" accessibilityLabel="Tryoh" style={{ width: size, height: size, borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: '#17211D', alignItems: 'center', justifyContent: 'center', boxShadow: shadows.raised }}><Image source={require('../../assets/images/icon.png')} contentFit="cover" style={{ width: size, height: size }} /></View>;
}
