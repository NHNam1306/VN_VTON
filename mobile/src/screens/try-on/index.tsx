import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useState } from 'react';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { PreviewableImage } from '@/components/previewable-image';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { useAuth } from '@/providers/auth-provider';
import { ApiError, apiRequest, protectedImageSource } from '@/services/api-client';
import { imageUploadFile } from '@/services/image-upload';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import type { CreditStatus, Garment, PersonImage, PlanSnapshot, TryOnResult } from '@/types/api';

type GenerationResponse = TryOnResult & { credits: CreditStatus };

export function TryOnScreen() {
  const brand = useBrandColors();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const person = useQuery({ queryKey: ['person-image'], queryFn: () => apiRequest<{ item: PersonImage | null }>('/api/person-image') });
  const garments = useQuery({ queryKey: ['garments'], queryFn: () => apiRequest<{ items: Garment[] }>('/api/garments') });
  const results = useQuery({ queryKey: ['try-on-results'], queryFn: () => apiRequest<{ items: TryOnResult[] }>('/api/generations/results') });
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => apiRequest<PlanSnapshot>('/api/plans') });
  const selectedGarmentIds = selected.filter((id) => garments.data?.items.some((item) => item.id === id));
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
      const available = current.filter((itemId) => garments.data!.items.some((item) => item.id === itemId));
      return available.includes(id)
        ? available.filter((item) => item !== id)
        : available.length < maxSelected ? [...available, id] : available;
    });
  };

  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}>
    <View style={{ gap: spacing.sm }}><AppText variant="title">Ảnh của bạn</AppText><AppText variant="subhead">Chọn ảnh toàn thân, rõ người và đủ sáng.</AppText>
      {person.data!.item ? <PreviewableImage uri={person.data!.item.imageUrl} title="Ảnh toàn thân" style={{ width: '100%', aspectRatio: 4 / 5, maxHeight: 520, borderRadius: radius.xl, backgroundColor: colors.groupedBackground }} contentFit="contain"/> : <View style={{ minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.separator, backgroundColor: colors.surface }}><AppText variant="headline">Chưa có ảnh toàn thân</AppText></View>}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AppButton title={person.data!.item ? 'Đổi ảnh' : 'Chọn ảnh toàn thân'} variant="secondary" loading={upload.isPending} onPress={() => upload.mutate()} style={{ flex: 1 }}/>
        {person.data!.item && <AppButton title="Gỡ ảnh" variant="destructive" loading={deletePerson.isPending} onPress={() => Alert.alert(
          'Gỡ ảnh đã tải lên?',
          'Chỉ ảnh toàn thân hiện tại bị gỡ. Các outfit đã tạo vẫn được giữ nguyên.',
          [
            { text: 'Huỷ', style: 'cancel' },
            { text: 'Gỡ ảnh', style: 'destructive', onPress: () => deletePerson.mutate() },
          ],
        )} style={{ flex: 1 }}/>}
      </View>
    </View>

    <View style={{ gap: spacing.sm }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}><AppText variant="headline">Chọn món đồ</AppText><AppText variant="caption">{selectedGarmentIds.length}/{maxSelected}</AppText></View>
      {garments.data!.items.length === 0 ? <View style={{ paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm }}><AppText variant="headline">Tủ đồ đang trống</AppText><AppText variant="subhead">Mở tab Tủ đồ để thêm món trước khi tạo ảnh.</AppText></View> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>{garments.data!.items.map((item) => { const active = selected.includes(item.id); return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => toggle(item.id)} style={({ pressed }) => ({ width: 132, gap: spacing.xs, padding: spacing.xs, borderRadius: radius.lg, borderWidth: active ? 3 : 1, borderColor: active ? brand.primary : colors.separator, backgroundColor: active ? brand.secondary : colors.surface, opacity: pressed ? 0.72 : 1 })}><Image source={protectedImageSource(item.frontProcessedUrl, session?.access_token)} style={{ width: '100%', height: 150, borderRadius: radius.md, backgroundColor: colors.groupedBackground }} contentFit="contain"/><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><AppText variant="caption" numberOfLines={1} style={{ flex: 1, fontWeight: active ? '700' : '500' }}>{item.name}</AppText>{active && <AppText variant="headline" style={{ color: brand.primary }}>✓</AppText>}</View></Pressable>; })}</ScrollView>}
    </View>

    <View style={{ gap: spacing.sm }}>
      <AppButton title="Tạo góc trước" loading={generate.isPending && generate.variables === 'front'} disabled={generate.isPending || !person.data!.item || selectedGarmentIds.length === 0} onPress={() => generate.mutate('front')}/>
      <AppButton title="Tạo góc sau" variant="secondary" loading={generate.isPending && generate.variables === 'back'} disabled={generate.isPending || !latestFront || selectedGarmentIds.length === 0} onPress={() => generate.mutate('back')}/>
      <AppText variant="caption" style={{ textAlign: 'center' }}>Góc sau dùng kết quả góc trước làm tham chiếu để giữ trang phục nhất quán.</AppText>
    </View>
    {mutationError && <View accessibilityRole="alert" style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.destructiveBackground }}><AppText variant="headline" style={{ color: colors.destructive }}>{mutationTitle}</AppText><AppText variant="subhead">{exhausted ? 'Hãy đăng ký thêm để tiếp tục tạo ảnh.' : mutationError instanceof Error ? mutationError.message : 'Dịch vụ chưa được hỗ trợ, vui lòng thử ảnh khác.'}</AppText></View>}
    {notice && <AppText variant="subhead" style={{ textAlign: 'center', color: brand.primary }}>{notice}</AppText>}
    {latestFront && <View style={{ gap: spacing.sm }}>
      <AppText variant="headline">Kết quả mới nhất</AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <ResultImage label="Góc trước" result={latestFront}/>
        {latestBack && <ResultImage label="Góc sau" result={latestBack}/>}
      </View>
    </View>}
  </ScrollView>;
}

function ResultImage({ label, result }: { label: string; result: TryOnResult }) {
  return <View style={{ flex: 1, gap: spacing.xs }}>
    <PreviewableImage uri={result.imageUrl} title={label} style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: radius.xl, backgroundColor: colors.groupedBackground }} contentFit="contain" transition={250}/>
    <AppText variant="caption" style={{ textAlign: 'center' }}>{label}</AppText>
  </View>;
}
