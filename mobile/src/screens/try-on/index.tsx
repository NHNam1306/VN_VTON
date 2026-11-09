import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useMemo, useState } from 'react';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/icon';
import { AppText } from '@/components/app-text';
import { PreviewableImage } from '@/components/previewable-image';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { useAuth } from '@/providers/auth-provider';
import { ApiError, apiRequest, protectedImageSource } from '@/services/api-client';
import { imageUploadFile } from '@/services/image-upload';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import type { CreditStatus, Garment, PageResponse, PersonImage, PlanSnapshot, TryOnResult } from '@/types/api';

type GenerationResponse = TryOnResult & { credits: CreditStatus };
const GARMENT_PAGE_SIZE = 40;

export function TryOnScreen({ onOpenWardrobe }: { onOpenWardrobe?: () => void } = {}) {
  const brand = useBrandColors();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const person = useQuery({ queryKey: ['person-image'], queryFn: () => apiRequest<{ item: PersonImage | null }>('/api/person-image') });
  const garments = useInfiniteQuery({
    queryKey: ['garments', 'catalog'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => apiRequest<PageResponse<Garment>>(`/api/garments?limit=${GARMENT_PAGE_SIZE}&offset=${pageParam}`),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  });
  const results = useQuery({ queryKey: ['try-on-results'], queryFn: () => apiRequest<{ items: TryOnResult[] }>('/api/generations/results') });
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => apiRequest<PlanSnapshot>('/api/plans') });
  const garmentItems = useMemo(() => garments.data?.pages.flatMap((page) => page.items) ?? [], [garments.data?.pages]);
  const selectedGarmentIds = selected.filter((id) => garmentItems.some((item) => item.id === id));
  const upload = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Cần quyền truy cập thư viện ảnh để chọn ảnh toàn thân.');
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.9 });
      if (picked.canceled) return null;
      const asset = picked.assets[0];
      const form = new FormData();
      form.append('personImage', imageUploadFile(asset, 'person.jpg'));
      return apiRequest<PersonImage>('/api/person-image', { method: 'POST', body: form });
    },
    onSuccess: (item) => {
      if (!item) return;
      queryClient.setQueryData(['person-image'], { item });
      queryClient.setQueryData(['try-on-results'], { items: [] });
      void queryClient.invalidateQueries({ queryKey: ['try-on-results'] });
      setNotice('Ảnh toàn thân đã sẵn sàng.');
    },
  });
  const deletePerson = useMutation({
    mutationFn: () => apiRequest<{ deleted: boolean }>('/api/person-image', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.setQueryData(['person-image'], { item: null });
      setNotice('Đã gỡ ảnh tải lên. Các outfit đã tạo vẫn được giữ nguyên.');
    },
  });
  const generate = useMutation({
    mutationFn: (angle: 'front' | 'back') => apiRequest<GenerationResponse>('/api/generations/angles/' + angle, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ garmentIds: selectedGarmentIds, privacyConfirmed: true, preservePose: true }),
    }),
    onSuccess: (item) => {
      queryClient.setQueryData<{ items: TryOnResult[] }>(['try-on-results'], (current) => ({
        items: item.angle === 'front'
          ? [item]
          : [item, ...(current?.items ?? []).filter((result) => result.angle === 'front')],
      }));
      void queryClient.invalidateQueries({ queryKey: ['saved-outfits'] });
      setNotice(item.angle === 'front' ? 'Đã tạo góc trước và lưu thành outfit.' : 'Đã bổ sung góc sau cho outfit.');
    },
  });
  const loading = person.data === undefined || garments.data === undefined || results.data === undefined || plans.data === undefined;
  const loadError = person.error ?? garments.error ?? results.error ?? plans.error;
  if (loadError) return <ScreenError message={loadError instanceof Error ? loadError.message : 'Không thể mở phòng thử.'} onRetry={() => { void person.refetch(); void garments.refetch(); void results.refetch(); void plans.refetch(); }}/>;
  if (loading) return <ScreenLoading label="Đang chuẩn bị phòng thử…"/>;

  const maxSelected = plans.data!.current.entitlements.selectedGarments;
  const latestFront = results.data!.items.find((item) => item.angle === 'front');
  const latestBack = results.data!.items.find((item) => item.angle === 'back');
  const mutationError = upload.error ?? deletePerson.error ?? generate.error;
  const exhausted = mutationError instanceof ApiError && mutationError.status === 402;
  const mutationTitle = exhausted
    ? 'Bạn đã dùng hết lượt tạo ảnh.'
    : upload.error
      ? 'Chưa thể tải ảnh'
      : deletePerson.error
        ? 'Chưa thể gỡ ảnh'
        : 'Chưa thể tạo ảnh';
  const toggle = (id: string) => {
    setNotice(null);
    setSelected((current) => {
      const available = current.filter((itemId) => garmentItems.some((item) => item.id === itemId));
      return available.includes(id)
        ? available.filter((item) => item !== id)
        : available.length < maxSelected ? [...available, id] : available;
    });
  };

  const personItem = person.data!.item;
  const selectedItems = selectedGarmentIds
    .map((id) => garmentItems.find((item) => item.id === id))
    .filter((item): item is Garment => Boolean(item));
  const visibleSelected = selectedItems.slice(0, 3);
  const hiddenCount = selectedItems.length - visibleSelected.length;
  const preview = latestFront?.imageUrl ?? personItem?.imageUrl ?? null;
  const canGenerate = !generate.isPending && Boolean(personItem) && selectedGarmentIds.length > 0;
  const generateHint = !personItem
    ? 'Thêm ảnh toàn thân để bắt đầu.'
    : selectedGarmentIds.length === 0
      ? 'Chọn món đồ bên dưới để phối.'
      : null;

  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.lg }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View style={{ width: '36%', gap: spacing.sm }}>
        {visibleSelected.length === 0
          ? <Pressable accessibilityRole="button" accessibilityLabel="Chọn món đồ" onPress={onOpenWardrobe} style={({ pressed }) => ({ aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.separator, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 })}>
              <AppIcon name="plus" size={22} color={brand.accent}/>
              <AppText variant="caption" style={{ textAlign: 'center' }}>Chọn đồ bên dưới</AppText>
            </Pressable>
          : visibleSelected.map((item, index) => <View key={item.id} style={{ aspectRatio: 1, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.surface, boxShadow: '0 2px 10px rgba(20, 26, 60, 0.06)' }}>
              <Image source={protectedImageSource(item.frontProcessedUrl, session?.access_token)} style={{ flex: 1, margin: spacing.sm }} contentFit="contain"/>
              <CheckBadge/>
              {index === visibleSelected.length - 1 && hiddenCount > 0 && <View style={{ position: 'absolute', bottom: 6, right: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, backgroundColor: brand.primary }}><AppText variant="caption" style={{ color: colors.onBrand, fontWeight: '700' }}>+{hiddenCount}</AppText></View>}
            </View>)}
      </View>
      <AppIcon name="arrow" size={26} color={brand.primary}/>
      <View style={{ flex: 1 }}>
        {preview
          ? <PreviewableImage uri={preview} title={latestFront ? 'Outfit mới nhất' : 'Ảnh toàn thân'} style={{ width: '100%', aspectRatio: 3 / 5, borderRadius: radius.xl, backgroundColor: colors.groupedBackground }} contentFit="cover" transition={250}/>
          : <Pressable accessibilityRole="button" accessibilityLabel="Thêm ảnh toàn thân" onPress={() => upload.mutate()} disabled={upload.isPending} style={({ pressed }) => ({ width: '100%', aspectRatio: 3 / 5, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.separator, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 })}>
              <AppIcon name="photo" size={32} color={brand.accent}/>
              <AppText variant="headline" style={{ textAlign: 'center' }}>{upload.isPending ? 'Đang tải ảnh…' : 'Thêm ảnh toàn thân'}</AppText>
              <AppText variant="caption" style={{ textAlign: 'center' }}>Ảnh rõ người, đủ sáng</AppText>
            </Pressable>}
      </View>
    </View>

    <View style={{ gap: spacing.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tạo outfit ngay"
        accessibilityState={{ disabled: !canGenerate, busy: generate.isPending && generate.variables === 'front' }}
        disabled={!canGenerate}
        onPress={() => generate.mutate('front')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 58, borderRadius: radius.full, backgroundColor: brand.primary, opacity: !canGenerate ? 0.45 : pressed ? 0.8 : 1 })}>
        {generate.isPending && generate.variables === 'front'
          ? <AppText variant="headline" style={{ color: colors.onBrand }}>Đang tạo outfit…</AppText>
          : <><AppIcon name="sparkles" size={22} color={colors.onBrand}/><AppText variant="headline" style={{ color: colors.onBrand, fontSize: 19 }}>Tạo outfit ngay</AppText></>}
      </Pressable>
      {generateHint && <AppText variant="caption" style={{ textAlign: 'center' }}>{generateHint}</AppText>}
      {latestFront && <AppButton title="Thêm góc sau" variant="secondary" loading={generate.isPending && generate.variables === 'back'} disabled={generate.isPending || selectedGarmentIds.length === 0} onPress={() => generate.mutate('back')}/>}
    </View>

    {mutationError && <View accessibilityRole="alert" style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.destructiveBackground }}><AppText variant="headline" style={{ color: colors.destructive }}>{mutationTitle}</AppText><AppText variant="subhead">{exhausted ? 'Hãy đăng ký thêm để tiếp tục tạo ảnh.' : mutationError instanceof Error ? mutationError.message : 'Dịch vụ chưa được hỗ trợ, vui lòng thử ảnh khác.'}</AppText></View>}
    {notice && <AppText variant="subhead" style={{ textAlign: 'center', color: brand.accent, fontWeight: '600' }}>{notice}</AppText>}

    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <AppText variant="headline">Chọn món đồ</AppText>
        <AppText variant="caption" style={{ fontVariant: ['tabular-nums'] }}>{selectedGarmentIds.length}/{maxSelected}</AppText>
      </View>
      {garmentItems.length === 0
        ? <View style={{ paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm, borderRadius: radius.xl, backgroundColor: colors.surface }}>
            <AppText variant="headline">Tủ đồ đang trống</AppText>
            <AppText variant="subhead" style={{ textAlign: 'center' }}>Thêm món đầu tiên trong mục Tủ đồ.</AppText>
            {onOpenWardrobe && <AppButton title="Mở Tủ đồ" variant="secondary" onPress={onOpenWardrobe}/>}
          </View>
        : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}>
            {garmentItems.map((item) => {
              const active = selected.includes(item.id);
              return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityState={{ checked: active }} onPress={() => toggle(item.id)} style={({ pressed }) => ({ width: 112, gap: spacing.xs, padding: spacing.xs, borderRadius: radius.lg, borderCurve: 'continuous', borderWidth: 2, borderColor: active ? brand.accent : 'transparent', backgroundColor: colors.surface, opacity: pressed ? 0.72 : 1 })}>
                <Image source={protectedImageSource(item.frontProcessedUrl, session?.access_token)} style={{ width: '100%', height: 112, borderRadius: radius.md }} contentFit="contain"/>
                <AppText variant="caption" numberOfLines={1} style={{ paddingHorizontal: 2, color: active ? brand.primary : colors.secondaryLabel, fontWeight: active ? '700' : '500' }}>{item.name}</AppText>
                {active && <CheckBadge/>}
              </Pressable>;
            })}
            {garments.hasNextPage && <Pressable onPress={() => void garments.fetchNextPage()} disabled={garments.isFetchingNextPage} style={{ width: 112, alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface }}><AppText variant="headline" style={{ textAlign: 'center', color: brand.accent }}>{garments.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'}</AppText></Pressable>}
          </ScrollView>}
    </View>

    <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {personItem
          ? <PreviewableImage uri={personItem.imageUrl} title="Ảnh toàn thân" style={{ width: 56, height: 72, borderRadius: radius.md, backgroundColor: colors.groupedBackground }} contentFit="cover"/>
          : <View style={{ width: 56, height: 72, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.secondary }}><AppIcon name="photo" size={24} color={brand.accent}/></View>}
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="headline">Ảnh của bạn</AppText>
          <AppText variant="caption">{personItem ? 'Dùng cho mọi lần thử đồ.' : 'Chọn ảnh toàn thân, rõ người và đủ sáng.'}</AppText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AppButton title={personItem ? 'Đổi ảnh' : 'Chọn ảnh toàn thân'} variant="secondary" loading={upload.isPending} onPress={() => upload.mutate()} style={{ flex: 1 }}/>
        {personItem && <AppButton title="Gỡ ảnh" variant="destructive" loading={deletePerson.isPending} onPress={() => Alert.alert(
          'Gỡ ảnh đã tải lên?',
          'Chỉ ảnh toàn thân hiện tại bị gỡ. Các outfit đã tạo vẫn được giữ nguyên.',
          [
            { text: 'Huỷ', style: 'cancel' },
            { text: 'Gỡ ảnh', style: 'destructive', onPress: () => deletePerson.mutate() },
          ],
        )} style={{ flex: 1 }}/>}
      </View>
    </View>

    {latestBack && latestFront && <View style={{ gap: spacing.sm }}>
      <AppText variant="headline">Kết quả mới nhất</AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <ResultImage label="Góc trước" result={latestFront}/>
        <ResultImage label="Góc sau" result={latestBack}/>
      </View>
    </View>}
  </ScrollView>;
}

function CheckBadge() {
  const brand = useBrandColors();
  return <View style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.accent, borderWidth: 2, borderColor: colors.surface }}>
    <AppIcon name="check" size={13} color={colors.onBrand}/>
  </View>;
}

function ResultImage({ label, result }: { label: string; result: TryOnResult }) {
  return <View style={{ flex: 1, gap: spacing.xs }}>
    <PreviewableImage uri={result.imageUrl} title={label} style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: radius.xl, backgroundColor: colors.groupedBackground }} contentFit="contain" transition={250}/>
    <AppText variant="caption" style={{ textAlign: 'center' }}>{label}</AppText>
  </View>;
}
