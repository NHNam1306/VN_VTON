import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { FlatList, RefreshControl, View, useWindowDimensions } from 'react-native';

import { AppText } from '@/components/app-text';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { useAuth } from '@/providers/auth-provider';
import { apiRequest, protectedImageSource } from '@/services/api-client';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import type { Garment } from '@/types/api';

const categoryNames: Record<Garment['category'], string> = {
  tops: 'Áo', outerwear: 'Áo khoác', bottoms: 'Quần / váy', shoes: 'Giày', accessories: 'Phụ kiện',
};

export function WardrobeScreen() {
  const brand = useBrandColors();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 3 : 2;
  const query = useQuery({ queryKey: ['garments'], queryFn: () => apiRequest<{ items: Garment[] }>('/api/garments') });

  if (query.data === undefined) return <ScreenLoading label="Đang mở tủ đồ…"/>;
  if (query.error) return <ScreenError message={query.error instanceof Error ? query.error.message : 'Không thể tải tủ đồ.'} onRetry={() => void query.refetch()}/>;

  return (
    <FlatList
      key={columns}
      data={query.data.items}
      numColumns={columns}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md, flexGrow: 1 }}
      columnWrapperStyle={{ gap: spacing.md }}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={brand.primary as string}/>} 
      ListEmptyComponent={<View style={{ flex: 1, minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl }}><AppText variant="headline">Tủ đồ đang trống</AppText><AppText variant="subhead" style={{ textAlign: 'center' }}>Hãy thêm món đồ trên web. Món đồ sẽ tự xuất hiện ở đây.</AppText></View>}
      renderItem={({ item }) => (
        <View style={{ flex: 1, gap: spacing.sm, padding: spacing.sm, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.surface }}>
          <Image source={protectedImageSource(item.frontProcessedUrl || item.frontOriginalUrl, session?.access_token)} style={{ width: '100%', aspectRatio: 0.82, borderRadius: radius.lg, backgroundColor: colors.groupedBackground }} contentFit="contain" transition={150}/>
          <View style={{ gap: 2, paddingHorizontal: spacing.xs, paddingBottom: spacing.xs }}><AppText variant="headline" numberOfLines={1}>{item.name}</AppText><AppText variant="caption" style={{ color: brand.primary }}>{categoryNames[item.category]}</AppText></View>
        </View>
      )}
    />
  );
}
