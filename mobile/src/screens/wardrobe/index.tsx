import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { useMemo, useState } from 'react';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { PreviewableImage } from '@/components/previewable-image';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { apiRequest } from '@/services/api-client';
import { imageUploadFile } from '@/services/image-upload';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import type { Garment, GarmentCategory, PageResponse, PlanSnapshot, SavedOutfit } from '@/types/api';

type AiExtractedGarment = {
  id: string;
  category: GarmentCategory;
  name: string;
  studioImageUrl: string;
};

type CatalogMode = 'garments' | 'outfits';
type CategoryFilter = 'all' | GarmentCategory;
type OutfitFilter = 'all' | 'complete' | 'front-only';
type CatalogEntry =
  | { key: string; type: 'garment'; item: Garment }
  | { key: string; type: 'outfit'; item: SavedOutfit };

const categoryNames: Record<GarmentCategory, string> = {
  tops: 'Áo',
  outerwear: 'Áo khoác',
  bottoms: 'Quần / váy',
  shoes: 'Giày',
  accessories: 'Phụ kiện',
};

const categories: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'tops', label: 'Áo' },
  { value: 'outerwear', label: 'Áo khoác' },
  { value: 'bottoms', label: 'Quần / váy' },
  { value: 'shoes', label: 'Giày' },
  { value: 'accessories', label: 'Phụ kiện' },
];

const outfitFilters: { value: OutfitFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'complete', label: 'Đủ hai góc' },
  { value: 'front-only', label: 'Chỉ góc trước' },
];

const PAGE_SIZE = 40;

export function WardrobeScreen() {
  const brand = useBrandColors();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<CatalogMode>('garments');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [outfitFilter, setOutfitFilter] = useState<OutfitFilter>('all');
  const [message, setMessage] = useState<string | null>(null);
  const columns = width >= 700 ? 3 : 2;

  const garments = useInfiniteQuery({
    queryKey: ['garments', 'catalog'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => apiRequest<PageResponse<Garment>>(`/api/garments?limit=${PAGE_SIZE}&offset=${pageParam}`),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  });
  const outfits = useInfiniteQuery({
    queryKey: ['saved-outfits', 'catalog'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => apiRequest<PageResponse<SavedOutfit>>(`/api/generations/outfits?limit=${PAGE_SIZE}&offset=${pageParam}`),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  });
  const plans = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiRequest<PlanSnapshot>('/api/plans'),
  });

  const maxItems = plans.data?.current.entitlements.wardrobeItems ?? 0;
  const unlimited = plans.data?.current.unlimited ?? false;
  const garmentItems = useMemo(() => garments.data?.pages.flatMap((page) => page.items) ?? [], [garments.data?.pages]);
  const outfitItems = useMemo(() => outfits.data?.pages.flatMap((page) => page.items) ?? [], [outfits.data?.pages]);
  const garmentTotal = garments.data?.pages[0]?.total ?? 0;
  const outfitTotal = outfits.data?.pages[0]?.total ?? 0;
  const remainingSlots = unlimited
    ? Number.MAX_SAFE_INTEGER
    : Math.max(0, maxItems - garmentTotal);

  const addGarment = useMutation({
    mutationFn: async () => {
      if (remainingSlots === 0) throw new Error('Tủ đồ đã đạt giới hạn của gói hiện tại.');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Cần quyền truy cập thư viện ảnh để thêm món đồ.');
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (picked.canceled) return null;

      const asset = picked.assets[0];
      const extractForm = new FormData();
      extractForm.append('file', imageUploadFile(asset, 'garment.jpg'));
      extractForm.append('category', 'tops');
      extractForm.append('persist', 'true');
      const extracted = await apiRequest<{ items: AiExtractedGarment[]; garments: Garment[] }>('/api/garments/ai-extract', {
        method: 'POST',
        body: extractForm,
      });
      if (extracted.garments.length === 0) {
        throw new Error('Không nhận diện được món đồ trong ảnh. Hãy thử ảnh rõ hơn.');
      }
      return extracted.garments;
    },
    onSuccess: (items) => {
      if (!items) return;
      setMessage(items.length === 1 ? 'Đã thêm món đồ vào tủ.' : 'Đã thêm ' + items.length + ' món đồ vào tủ.');
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['garments'] }),
  });

  const deleteGarment = useMutation({
    mutationFn: (id: string) => apiRequest<void>('/api/garments/' + encodeURIComponent(id), { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['garments'] });
      setMessage('Đã xoá món đồ.');
    },
  });

  const deleteOutfit = useMutation({
    mutationFn: (id: string) => apiRequest<{ deleted: boolean }>('/api/generations/outfits/' + encodeURIComponent(id), { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-outfits'] });
      setMessage('Đã xoá outfit.');
    },
  });

  const entries = useMemo<CatalogEntry[]>(() => {
    if (mode === 'garments') {
      return garmentItems
        .filter((item) => category === 'all' || item.category === category)
        .map((item) => ({ key: 'garment-' + item.id, type: 'garment' as const, item }));
    }
    return outfitItems
      .filter((item) => (
        outfitFilter === 'all'
        || (outfitFilter === 'complete' && Boolean(item.backImageUrl))
        || (outfitFilter === 'front-only' && !item.backImageUrl)
      ))
      .map((item) => ({ key: 'outfit-' + item.id, type: 'outfit' as const, item }));
  }, [category, garmentItems, mode, outfitFilter, outfitItems]);

  const loadError = garments.error ?? outfits.error ?? plans.error;
  if (loadError) {
    return <ScreenError
      message={loadError instanceof Error ? loadError.message : 'Không thể tải kho đồ.'}
      onRetry={() => {
        void garments.refetch();
        void outfits.refetch();
        void plans.refetch();
      }}
    />;
  }
  if (garments.data === undefined || outfits.data === undefined || plans.data === undefined) {
    return <ScreenLoading label="Đang mở kho đồ…"/>;
  }

  const currentCount = mode === 'garments' ? garmentTotal : outfitTotal;
  const currentLimit = mode === 'garments'
    ? plans.data.current.entitlements.wardrobeItems
    : plans.data.current.entitlements.savedOutfits;
  const actionError = addGarment.error ?? deleteGarment.error ?? deleteOutfit.error;

  return (
    <FlatList
      key={mode + '-' + columns}
      data={entries}
      numColumns={columns}
      keyExtractor={(entry) => entry.key}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md, flexGrow: 1 }}
      columnWrapperStyle={{ gap: spacing.md }}
      onEndReachedThreshold={0.45}
      onEndReached={() => {
        if (mode === 'garments' && garments.hasNextPage && !garments.isFetchingNextPage) void garments.fetchNextPage();
        if (mode === 'outfits' && outfits.hasNextPage && !outfits.isFetchingNextPage) void outfits.fetchNextPage();
      }}
      refreshControl={<RefreshControl
        refreshing={mode === 'garments' ? garments.isRefetching : outfits.isRefetching}
        onRefresh={() => void (mode === 'garments' ? garments.refetch() : outfits.refetch())}
        tintColor={brand.primary as string}
      />}
      ListHeaderComponent={<View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: 'row',
            minHeight: 44,
            padding: 2,
            borderWidth: 1,
            borderColor: colors.separator,
            borderRadius: radius.full,
            backgroundColor: colors.surface,
          }}>
          {([
            { value: 'garments' as const, label: 'Món đồ' },
            { value: 'outfits' as const, label: 'Outfit' },
          ]).map((option) => {
            const selected = mode === option.value;
            return <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                setMode(option.value);
                setMessage(null);
              }}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.full,
                backgroundColor: selected ? brand.primary : 'transparent',
                opacity: pressed ? 0.78 : 1,
              })}>
              <AppText
                variant="body"
                style={{
                  color: selected ? colors.onBrand : colors.label,
                  fontWeight: selected ? '700' : '500',
                }}>
                {selected ? '✓  ' : ''}{option.label}
              </AppText>
            </Pressable>;
          })}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <AppText variant="headline">{mode === 'garments' ? 'Món đồ đã thêm' : 'Outfit đã lưu'}</AppText>
          <AppText variant="caption" style={{ fontVariant: ['tabular-nums'] }}>{currentCount}/{unlimited ? '∞' : currentLimit}</AppText>
        </View>

        {mode === 'garments' && <AppButton
          title="Thêm món đồ từ ảnh"
          loading={addGarment.isPending}
          disabled={remainingSlots === 0}
          onPress={() => {
            setMessage(null);
            addGarment.mutate();
          }}
        />}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {(mode === 'garments' ? categories : outfitFilters).map((filter) => {
            const active = mode === 'garments' ? category === filter.value : outfitFilter === filter.value;
            return <Pressable
              key={filter.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (mode === 'garments') setCategory(filter.value as CategoryFilter);
                else setOutfitFilter(filter.value as OutfitFilter);
              }}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: active ? brand.primary : colors.separator,
                backgroundColor: active ? brand.secondary : colors.surface,
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <AppText variant="caption" style={{ color: active ? brand.primary : colors.label, fontWeight: active ? '700' : '500' }}>{filter.label}</AppText>
            </Pressable>;
          })}
        </ScrollView>

        {actionError && <View accessibilityRole="alert" style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.destructiveBackground }}>
          <AppText variant="subhead" style={{ color: colors.destructive }}>{actionError instanceof Error ? actionError.message : 'Không thể cập nhật kho đồ.'}</AppText>
        </View>}
        {message && <View style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.successBackground }}>
          <AppText variant="subhead" style={{ color: colors.success }}>{message}</AppText>
        </View>}
      </View>}
      ListEmptyComponent={<View style={{ flex: 1, minHeight: 340, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl }}>
        <AppText variant="headline">{mode === 'garments' ? 'Không có món đồ phù hợp' : 'Không có outfit phù hợp'}</AppText>
        <AppText variant="subhead" style={{ textAlign: 'center' }}>
          {mode === 'garments'
            ? garmentTotal === 0 ? 'Thêm ảnh sản phẩm hoặc ảnh phối đồ để bắt đầu.' : 'Hãy chọn bộ lọc khác.'
            : outfitTotal === 0 ? 'Outfit tạo thành công trong Phòng thử sẽ xuất hiện tại đây.' : 'Hãy chọn bộ lọc khác.'}
        </AppText>
      </View>}
      renderItem={({ item: entry }) => entry.type === 'garment'
        ? <View style={{ flex: 1, gap: spacing.sm, padding: spacing.sm, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.surface }}>
            <PreviewableImage
              uri={entry.item.frontProcessedUrl || entry.item.frontOriginalUrl}
              title={entry.item.name}
              style={{ width: '100%', aspectRatio: 0.82, borderRadius: radius.lg, backgroundColor: colors.groupedBackground }}
              contentFit="contain"
              transition={150}
            />
            <View style={{ gap: 2, paddingHorizontal: spacing.xs, paddingBottom: spacing.xs }}>
              <AppText variant="headline" numberOfLines={1}>{entry.item.name}</AppText>
              <AppText variant="caption" style={{ color: brand.primary }}>{categoryNames[entry.item.category]}</AppText>
            </View>
            <AppButton
              title="Xoá"
              variant="destructive"
              loading={deleteGarment.isPending && deleteGarment.variables === entry.item.id}
              onPress={() => Alert.alert(
                'Xoá món đồ?',
                'Món đồ này sẽ bị xoá khỏi tủ. Các outfit đã tạo trước đó vẫn được giữ.',
                [
                  { text: 'Huỷ', style: 'cancel' },
                  { text: 'Xoá', style: 'destructive', onPress: () => deleteGarment.mutate(entry.item.id) },
                ],
              )}
            />
          </View>
        : <View style={{ flex: 1, gap: spacing.sm, padding: spacing.sm, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.surface }}>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <PreviewableImage
                uri={entry.item.frontImageUrl}
                title="Góc trước"
                style={{ flex: 1, height: 190, borderRadius: radius.lg, backgroundColor: colors.groupedBackground }}
                contentFit="contain"
                transition={150}
              />
              {entry.item.backImageUrl && <PreviewableImage
                uri={entry.item.backImageUrl}
                title="Góc sau"
                style={{ flex: 1, height: 190, borderRadius: radius.lg, backgroundColor: colors.groupedBackground }}
                contentFit="contain"
                transition={150}
              />}
            </View>
            <View style={{ gap: 2, paddingHorizontal: spacing.xs, paddingBottom: spacing.xs }}>
              <AppText variant="headline">{entry.item.backImageUrl ? 'Outfit hai góc' : 'Outfit góc trước'}</AppText>
              <AppText variant="caption">{entry.item.garmentIds.length} món · {new Date(entry.item.createdAt).toLocaleDateString('vi-VN')}</AppText>
            </View>
            <AppButton
              title="Xoá"
              variant="destructive"
              loading={deleteOutfit.isPending && deleteOutfit.variables === entry.item.id}
              onPress={() => Alert.alert(
                'Xoá outfit?',
                'Outfit này sẽ bị xoá khỏi kho. Ảnh toàn thân đã tải lên không bị ảnh hưởng.',
                [
                  { text: 'Huỷ', style: 'cancel' },
                  { text: 'Xoá', style: 'destructive', onPress: () => deleteOutfit.mutate(entry.item.id) },
                ],
              )}
            />
          </View>}
    />
  );
}
