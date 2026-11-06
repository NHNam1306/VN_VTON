import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, ScrollView, View } from 'react-native';
import { useState } from 'react';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { useAuth } from '@/providers/auth-provider';
import { ApiError, apiRequest, protectedImageSource } from '@/services/api-client';
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
  const upload = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Cần quyền truy cập thư viện ảnh để chọn ảnh toàn thân.');
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 0.9 });
      if (picked.canceled) return null;
      const asset = picked.assets[0];
      const form = new FormData();
      form.append('personImage', { uri: asset.uri, name: asset.fileName ?? 'person.jpg', type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
      return apiRequest<PersonImage>('/api/person-image', { method: 'POST', body: form });
    },
    onSuccess: (item) => {
      if (!item) return;
      queryClient.setQueryData(['person-image'], { item });
      void queryClient.invalidateQueries({ queryKey: ['try-on-results'] });
      setNotice('Ảnh toàn thân đã sẵn sàng.');
    },
  });
  const generate = useMutation({
    mutationFn: () => apiRequest<GenerationResponse>('/api/generations/angles/front', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ garmentIds: selected, privacyConfirmed: true, preservePose: true }),
    }),
    onSuccess: (item) => {
      queryClient.setQueryData<{ items: TryOnResult[] }>(['try-on-results'], (current) => ({ items: [item, ...(current?.items ?? []).filter((result) => result.angle !== item.angle)] }));
      setNotice('Đã tạo xong ảnh thử đồ.');
    },
  });

  const loading = person.data === undefined || garments.data === undefined || results.data === undefined || plans.data === undefined;
  const loadError = person.error ?? garments.error ?? results.error ?? plans.error;
  if (loading) return <ScreenLoading label="Đang chuẩn bị phòng thử…"/>;
  if (loadError) return <ScreenError message={loadError instanceof Error ? loadError.message : 'Không thể mở phòng thử.'} onRetry={() => { void person.refetch(); void garments.refetch(); void results.refetch(); void plans.refetch(); }}/>;

  const maxSelected = plans.data!.current.entitlements.selectedGarments;
  const latest = results.data!.items.find((item) => item.angle === 'front');
  const mutationError = upload.error ?? generate.error;
  const exhausted = mutationError instanceof ApiError && mutationError.status === 402;
  const toggle = (id: string) => {
    setNotice(null);
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < maxSelected ? [...current, id] : current);
  };

  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}>
    <View style={{ gap: spacing.sm }}><AppText variant="title">Ảnh của bạn</AppText><AppText variant="subhead">Chọn ảnh toàn thân, rõ người và đủ sáng.</AppText>
      {person.data!.item ? <Image source={protectedImageSource(person.data!.item.imageUrl, session?.access_token)} style={{ width: '100%', aspectRatio: 4 / 5, maxHeight: 520, borderRadius: radius.xl, backgroundColor: colors.groupedBackground }} contentFit="contain"/> : <View style={{ minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.separator, backgroundColor: colors.surface }}><AppText variant="headline">Chưa có ảnh toàn thân</AppText></View>}
      <AppButton title={person.data!.item ? 'Đổi ảnh' : 'Chọn ảnh toàn thân'} variant="secondary" loading={upload.isPending} onPress={() => upload.mutate()}/>
    </View>

    <View style={{ gap: spacing.sm }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}><AppText variant="headline">Chọn món đồ</AppText><AppText variant="caption">{selected.length}/{maxSelected}</AppText></View>
      {garments.data!.items.length === 0 ? <View style={{ paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm }}><AppText variant="headline">Tủ đồ đang trống</AppText><AppText variant="subhead">Hãy thêm đồ trên web trước khi tạo ảnh.</AppText></View> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>{garments.data!.items.map((item) => { const active = selected.includes(item.id); return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => toggle(item.id)} style={({ pressed }) => ({ width: 132, gap: spacing.xs, padding: spacing.xs, borderRadius: radius.lg, borderWidth: active ? 3 : 1, borderColor: active ? brand.primary : colors.separator, backgroundColor: active ? brand.secondary : colors.surface, opacity: pressed ? 0.72 : 1 })}><Image source={protectedImageSource(item.frontProcessedUrl, session?.access_token)} style={{ width: '100%', height: 150, borderRadius: radius.md, backgroundColor: colors.groupedBackground }} contentFit="contain"/><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><AppText variant="caption" numberOfLines={1} style={{ flex: 1, fontWeight: active ? '700' : '500' }}>{item.name}</AppText>{active && <AppText variant="headline" style={{ color: brand.primary }}>✓</AppText>}</View></Pressable>; })}</ScrollView>}
    </View>

    <View style={{ gap: spacing.sm }}><AppButton title="Tạo ảnh thử đồ" loading={generate.isPending} disabled={!person.data!.item || selected.length === 0} onPress={() => generate.mutate()}/><AppText variant="caption" style={{ textAlign: 'center' }}>Khi tạo ảnh, bạn xác nhận có quyền sử dụng ảnh đã tải lên.</AppText></View>
    {mutationError && <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface }}><AppText variant="headline" style={{ color: colors.destructive }}>{exhausted ? 'Bạn đã dùng hết lượt tạo ảnh.' : 'Chưa thể tạo ảnh'}</AppText><AppText variant="subhead">{exhausted ? 'Hãy đăng ký thêm để tiếp tục tạo ảnh.' : mutationError instanceof Error ? mutationError.message : 'Dịch vụ chưa được hỗ trợ, vui lòng thử ảnh khác.'}</AppText></View>}
    {notice && <AppText variant="subhead" style={{ textAlign: 'center', color: brand.primary }}>{notice}</AppText>}
    {latest && <View style={{ gap: spacing.sm }}><AppText variant="headline">Kết quả mới nhất</AppText><Image source={protectedImageSource(latest.imageUrl, session?.access_token)} style={{ width: '100%', aspectRatio: 4 / 5, maxHeight: 620, borderRadius: radius.xl, backgroundColor: colors.groupedBackground }} contentFit="contain" transition={250}/></View>}
  </ScrollView>;
}
