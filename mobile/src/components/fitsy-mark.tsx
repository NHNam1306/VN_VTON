import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { radius, shadows, useBrandColors } from '@/theme';

/** Chữ "Fitsy" kèm dấu lấp lánh, dùng cho header và màn đăng nhập. */
export function FitsyWordmark({ size = 30 }: { size?: number }) {
  const brand = useBrandColors();
  return <View accessibilityRole="header" accessibilityLabel="Fitsy" style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
    <AppText selectable={false} style={{ fontSize: size, lineHeight: size * 1.15, fontWeight: '800', letterSpacing: -0.6, color: brand.primary }}>Fitsy</AppText>
    <AppText selectable={false} style={{ fontSize: size * 0.5, lineHeight: size * 0.6, fontWeight: '800', color: brand.sparkle, marginLeft: 2 }}>✦</AppText>
  </View>;
}

/** Ô vuông logo (avatar mặc định, màn đăng nhập). */
export function FitsyMark({ size = 58 }: { size?: number }) {
  const brand = useBrandColors();
  return <View accessibilityRole="image" accessibilityLabel="Fitsy" style={{ width: size, height: size, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center', boxShadow: shadows.raised }}>
    <AppText selectable={false} style={{ fontSize: size * 0.48, fontWeight: '800', color: '#FFFFFF' }}>F</AppText>
    <AppText selectable={false} style={{ position: 'absolute', top: size * 0.14, right: size * 0.16, fontSize: size * 0.2, fontWeight: '800', color: brand.sparkle }}>✦</AppText>
  </View>;
}
