import { useMutation, useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { ScrollView, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { apiRequest } from '@/services/api-client';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import type { Plan, PlanSnapshot } from '@/types/api';

type CheckoutProvider = 'payos' | 'momo';

export default function PlansRoute() {
  const brand = useBrandColors();
  const externalBilling = process.env.EXPO_PUBLIC_BILLING_MODE === 'external';
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => apiRequest<PlanSnapshot>('/api/plans') });
  const checkout = useMutation({
    mutationFn: ({ planId, provider }: { planId: Plan['id']; provider: CheckoutProvider }) => apiRequest<{ orderId: string; checkoutUrl: string }>('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, provider }),
    }),
    onSuccess: ({ checkoutUrl }) => void Linking.openURL(checkoutUrl),
  });

  if (plans.error) return <ScreenError message={plans.error instanceof Error ? plans.error.message : 'Không thể tải các gói.'} onRetry={() => void plans.refetch()}/>;
  if (plans.data === undefined) return <ScreenLoading label="Đang tải các gói…"/>;

  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md, backgroundColor: colors.background }}>
    <View style={{ gap: spacing.xs }}>
      <AppText variant="title">Chọn gói phù hợp</AppText>
      <AppText variant="subhead">{externalBilling ? 'Thanh toán qua VietQR hoặc MoMo. Gói được kích hoạt khi hệ thống nhận webhook thành công.' : 'Xem quyền lợi và gói hiện đang sử dụng trên tài khoản của bạn.'}</AppText>
    </View>
    {plans.data.plans.map((plan) => {
      const current = plans.data.current.planId === plan.id && !plans.data.current.unlimited;
      const busy = checkout.isPending && checkout.variables?.planId === plan.id;
      return <View key={plan.id} style={{ gap: spacing.md, padding: spacing.lg, borderWidth: plan.recommended ? 2 : 1, borderColor: plan.recommended ? colors.success : colors.separator, borderRadius: radius.xl, backgroundColor: plan.recommended ? brand.secondary : colors.surface }}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="caption" style={{ color: colors.success, fontWeight: '800' }}>{plan.recommended ? 'ĐỀ XUẤT' : current ? 'ĐANG SỬ DỤNG' : 'GÓI ĐĂNG KÝ'}</AppText>
          <AppText variant="title">{plan.name}</AppText>
          <AppText variant="subhead">{plan.description}</AppText>
          <AppText variant="headline">{plan.monthlyPriceVnd === 0 ? 'Miễn phí' : plan.monthlyPriceVnd.toLocaleString('vi-VN') + 'đ / tháng'}</AppText>
        </View>
        <View style={{ gap: spacing.xs }}>
          {plan.highlights.map((highlight) => <AppText key={highlight} variant="subhead">✓ {highlight}</AppText>)}
        </View>
        {externalBilling && plan.id !== 'free' && !current && <>
          <AppButton title="Thanh toán VietQR" loading={busy && checkout.variables?.provider === 'payos'} disabled={checkout.isPending} onPress={() => checkout.mutate({ planId: plan.id, provider: 'payos' })}/>
          <AppButton title="Thanh toán MoMo" variant="secondary" loading={busy && checkout.variables?.provider === 'momo'} disabled={checkout.isPending} onPress={() => checkout.mutate({ planId: plan.id, provider: 'momo' })}/>
        </>}
        {current && <View style={{ padding: spacing.sm, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.successBackground }}><AppText variant="subhead" style={{ color: colors.success, fontWeight: '700' }}>Gói hiện tại</AppText></View>}
      </View>;
    })}
    {checkout.error && <View accessibilityRole="alert" style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.destructiveBackground }}><AppText variant="subhead" style={{ color: colors.destructive }}>{checkout.error instanceof Error ? checkout.error.message : 'Không thể tạo giao dịch.'}</AppText></View>}
  </ScrollView>;
}
