import { Color } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';

export const colors = {
  label: Platform.select({
    ios: Color.ios.label,
    android: Color.android.dynamic.onSurface,
    default: '#17211D',
  })!,
  secondaryLabel: Platform.select({
    ios: Color.ios.secondaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#66706A',
  })!,
  separator: Platform.select({
    ios: Color.ios.separator,
    android: Color.android.dynamic.outlineVariant,
    default: '#DDE3DE',
  })!,
  background: Platform.select({
    ios: Color.ios.systemBackground,
    android: Color.android.dynamic.surface,
    default: '#F7F5EF',
  })!,
  groupedBackground: Platform.select({
    ios: Color.ios.secondarySystemBackground,
    android: Color.android.dynamic.surfaceContainer,
    default: '#F1EFE8',
  })!,
  surface: Platform.select({
    ios: Color.ios.secondarySystemGroupedBackground,
    android: Color.android.dynamic.surfaceContainerLow,
    default: '#FFFFFF',
  })!,
  destructive: Platform.select({
    ios: Color.ios.systemRed,
    android: Color.android.dynamic.error,
    default: '#C93434',
  })!,
  onBrand: '#FFFFFF',
} as const;

const brand = {
  light: { primary: '#17211D', secondary: '#DCEAD8', accent: '#F6D25F' },
  dark: { primary: '#DCEAD8', secondary: '#29372F', accent: '#F6D25F' },
} as const;

export function useBrandColors() {
  const scheme = useColorScheme();
  return brand[scheme === 'dark' ? 'dark' : 'light'];
}
