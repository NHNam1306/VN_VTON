import { ActivityIndicator, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { spacing, useBrandColors } from '@/theme';

export function ScreenLoading({ label = 'Đang tải…' }: { label?: string }) {
  const brand = useBrandColors();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}><ActivityIndicator color={brand.primary as string}/><AppText variant="subhead">{label}</AppText></View>;
}

export function ScreenError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md }}><AppText variant="headline" style={{ textAlign: 'center' }}>Chưa thể tải dữ liệu</AppText><AppText variant="subhead" style={{ textAlign: 'center' }}>{message}</AppText><AppButton title="Thử lại" onPress={onRetry}/></View>;
}
