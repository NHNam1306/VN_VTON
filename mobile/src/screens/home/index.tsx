import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PreviewableImage } from '@/components/previewable-image';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { useAuth } from '@/providers/auth-provider';
import { apiRequest } from '@/services/api-client';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import type { Garment, PlanSnapshot, SavedOutfit } from '@/types/api';

export function HomeScreen() {
  const brand = useBrandColors();
  const { user } = useAuth();
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => apiRequest<PlanSnapshot>('/api/plans') });
  const garments = useQuery({ queryKey: ['garments'], queryFn: () => apiRequest<{ items: Garment[] }>('/api/garments') });
  const outfits = useQuery({ queryKey: ['saved-outfits'], queryFn: () => apiRequest<{ items: SavedOutfit[] }>('/api/generations/outfits') });
  const loading = plans.data === undefined || garments.data === undefined || outfits.data === undefined;
  const error = plans.error ?? garments.error ?? outfits.error;
  const retry = () => { void plans.refetch(); void garments.refetch(); void outfits.refetch(); };

  if (loading) return <ScreenLoading label="Đang mở tủ đồ…"/>;
  if (error && (!plans.data || !garments.data || !outfits.data)) return <ScreenError message={error instanceof Error ? error.message : 'Không thể tải dữ liệu.'} onRetry={retry}/>;

  const current = plans.data!.current;
  const items = garments.data!.items.slice(0, 6);
  const name = String(user?.user_metadata.display_name ?? user?.email?.split('@')[0] ?? 'bạn');

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}>
      <View style={{ gap: spacing.sm, padding: spacing.lg, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: brand.primary }}>
        <AppText variant="caption" style={{ color: colors.onBrand, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.4 }}>Xin chào, {name}</AppText>
        <AppText variant="title" style={{ color: colors.onBrand }}>Hôm nay bạn muốn thử phong cách nào?</AppText>
        <Link href="/(tabs)/try-on" asChild><Pressable style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radius.full, backgroundColor: brand.accent, opacity: pressed ? 0.75 : 1 })}><AppText variant="headline" style={{ color: '#17211D' }}>Mở phòng thử</AppText></Pressable></Link>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="headline">Không gian của bạn</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Metric label="Gói hiện tại" value={current.planName}/>
          <Metric label="Tủ đồ" value={garments.data!.items.length + '/' + (current.unlimited ? '∞' : current.entitlements.wardrobeItems)}/>
          <Metric label="Outfit" value={outfits.data!.items.length + '/' + (current.unlimited ? '∞' : current.entitlements.savedOutfits)}/>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><AppText variant="headline">Mới trong tủ</AppText><Link href="/(tabs)/wardrobe" asChild><Pressable><AppText variant="subhead" style={{ color: brand.primary, fontWeight: '700' }}>Xem tất cả</AppText></Pressable></Link></View>
        {items.length === 0
          ? <View style={{ paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm }}><AppText variant="headline">Tủ đồ đang trống</AppText><AppText variant="subhead" style={{ textAlign: 'center' }}>Mở tab Tủ đồ để thêm món đầu tiên từ thư viện ảnh.</AppText></View>
          : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>{items.map((item) => <View key={item.id} style={{ width: 132, gap: spacing.sm }}><PreviewableImage uri={item.frontProcessedUrl} title={item.name} style={{ width: 132, height: 164, borderRadius: radius.lg, backgroundColor: colors.groupedBackground }} contentFit="cover"/><AppText variant="caption" numberOfLines={1}>{item.name}</AppText></View>)}</ScrollView>}
      </View>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={{ flex: 1, gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.surface }}><AppText variant="caption">{label}</AppText><AppText variant="headline" style={{ fontVariant: ['tabular-nums'] }}>{value}</AppText></View>;
}
