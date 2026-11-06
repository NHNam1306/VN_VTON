import { View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { radius, shadows } from '@/theme';

export function TryohMark({ size = 58 }: { size?: number }) {
  return <View accessibilityRole="image" accessibilityLabel="Tryoh" style={{ width: size, height: size, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: '#17211D', alignItems: 'center', justifyContent: 'center', boxShadow: shadows.raised }}><SymbolView name="hanger" tintColor="#F6D25F" size={size * 0.52}/></View>;
}
