import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { ScrollView, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { TryohMark } from '@/components/tryoh-mark';
import { useAuth } from '@/providers/auth-provider';
import { apiBaseUrl, apiRequest } from '@/services/api-client';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import type { PlanSnapshot } from '@/types/api';

export function ProfileScreen() {
  const auth = useAuth();
  const brand = useBrandColors();
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => apiRequest<PlanSnapshot>('/api/plans') });
  if (plans.data === undefined) return <ScreenLoading label="Đang tải hồ sơ…"/>;
  if (plans.error) return <ScreenError message={plans.error instanceof Error ? plans.error.message : 'Không thể tải hồ sơ.'} onRetry={() => void plans.refetch()}/>;
  const name = String(auth.user?.user_metadata.display_name ?? auth.user?.email?.split('@')[0] ?? 'Người dùng');
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }}>
    <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.surface }}><TryohMark/><AppText variant="title">{name}</AppText><AppText variant="subhead">{auth.user?.email}</AppText></View>
    <View style={{ gap: spacing.sm, padding: spacing.lg, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: brand.secondary }}><AppText variant="caption">GÓI HIỆN TẠI</AppText><AppText variant="title">{plans.data.current.planName}</AppText><AppText variant="subhead">Tủ đồ {plans.data.current.entitlements.wardrobeItems} món · {plans.data.current.entitlements.savedOutfits} outfit</AppText><AppButton title="Xem các gói đăng ký" variant="secondary" onPress={() => void Linking.openURL(`${apiBaseUrl}/goi-dang-ky`)}/></View>
    <View style={{ gap: spacing.sm }}><AppButton title="Đăng xuất" variant="destructive" onPress={() => void auth.signOut()}/></View>
  </ScrollView>;
}
