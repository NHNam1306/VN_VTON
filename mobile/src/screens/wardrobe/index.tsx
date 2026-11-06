import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetch } from 'expo/fetch';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, FlatList, RefreshControl, View, useWindowDimensions } from 'react-native';
import { useState } from 'react';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { useAuth } from '@/providers/auth-provider';
import { apiBaseUrl, apiRequest, protectedImageSource } from '@/services/api-client';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import type { Garment } from '@/types/api';

type AiExtractedGarment = {
  id: string;
  category: Garment['category'];
  name: string;
  studioImageUrl: string;
};

const categoryNames: Record<Garment['category'], string> = {
  tops: 'Áo', outerwear: 'Áo khoác', bottoms: 'Quần / váy', shoes: 'Giày', accessories: 'Phụ kiện',
};

export function WardrobeScreen() {
  const brand = useBrandColors();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [message, setMessage] = useState<string | null>(null);
  const columns = width >= 700 ? 3 : 2;
  const query = useQuery({ queryKey: ['garments'], queryFn: () => apiRequest<{ items: Garment[] }>('/api/garments') });
  const addGarment = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Cần quyền truy cập thư viện ảnh để thêm món đồ.');
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (picked.canceled) return null;

      const asset = picked.assets[0];
      const originalFile = {
        uri: asset.uri,
        name: asset.fileName ?? 'garment.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob;
      const extractForm = new FormData();
      extractForm.append('file', originalFile);
      extractForm.append('category', 'tops');
      const extracted = await apiRequest<{ items: AiExtractedGarment[] }>('/api/garments/ai-extract', {
        method: 'POST',
        body: extractForm,
      });
      const item = extracted.items[0];
      if (!item) throw new Error('Không nhận diện được món đồ trong ảnh. Hãy thử ảnh rõ hơn.');

      const studioUrl = item.studioImageUrl.startsWith('http') ? item.studioImageUrl : apiBaseUrl + item.studioImageUrl;
      const processedResponse = await fetch(studioUrl, {
        headers: session?.access_token ? { Authorization: 'Bearer ' + session.access_token } : undefined,
      });
      if (!processedResponse.ok) throw new Error('Không thể tải ảnh món đồ đã xử lý.');
      const processedBlob = await processedResponse.blob();

      const createForm = new FormData();
      createForm.append('name', item.name || 'Món đồ mới');
      createForm.append('category', item.category);
      createForm.append('frontOriginal', originalFile);
      createForm.append('frontProcessed', processedBlob, 'front-processed.webp');
      return apiRequest<Garment>('/api/garments', { method: 'POST', body: createForm });
    },
    onSuccess: (item) => {
      if (!item) return;
      queryClient.setQueryData<{ items: Garment[] }>(['garments'], (current) => ({
        items: [item, ...(current?.items ?? [])],
      }));
      setMessage('Đã thêm món đồ vào tủ.');
    },
  });
  const deleteGarment = useMutation({
    mutationFn: (id: string) => apiRequest<void>('/api/garments/' + encodeURIComponent(id), { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<{ items: Garment[] }>(['garments'], (current) => ({
        items: (current?.items ?? []).filter((item) => item.id !== id),
      }));
      setMessage('Đã xoá món đồ.');
    },
  });

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
      ListHeaderComponent={<View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <AppText variant="title">Tủ đồ</AppText>
          <AppText variant="caption">{query.data.items.length} món</AppText>
        </View>
        <AppButton title="Thêm món đồ từ ảnh" loading={addGarment.isPending} onPress={() => { setMessage(null); addGarment.mutate(); }}/>
        {addGarment.error && <View accessibilityRole="alert" style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.destructiveBackground }}><AppText variant="subhead" style={{ color: colors.destructive }}>{addGarment.error instanceof Error ? addGarment.error.message : 'Không thể thêm món đồ.'}</AppText></View>}
        {deleteGarment.error && <View accessibilityRole="alert" style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.destructiveBackground }}><AppText variant="subhead" style={{ color: colors.destructive }}>{deleteGarment.error instanceof Error ? deleteGarment.error.message : 'Không thể xoá món đồ.'}</AppText></View>}
        {message && <View style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.successBackground }}><AppText variant="subhead" style={{ color: colors.success }}>{message}</AppText></View>}
      </View>}
      ListEmptyComponent={<View style={{ flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl }}><AppText variant="headline">Tủ đồ đang trống</AppText><AppText variant="subhead" style={{ textAlign: 'center' }}>Thêm ảnh sản phẩm hoặc ảnh phối đồ để bắt đầu.</AppText></View>}
      renderItem={({ item }) => (
        <View style={{ flex: 1, gap: spacing.sm, padding: spacing.sm, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.surface }}>
          <Image source={protectedImageSource(item.frontProcessedUrl || item.frontOriginalUrl, session?.access_token)} style={{ width: '100%', aspectRatio: 0.82, borderRadius: radius.lg, backgroundColor: colors.groupedBackground }} contentFit="contain" transition={150}/>
          <View style={{ gap: 2, paddingHorizontal: spacing.xs, paddingBottom: spacing.xs }}><AppText variant="headline" numberOfLines={1}>{item.name}</AppText><AppText variant="caption" style={{ color: brand.primary }}>{categoryNames[item.category]}</AppText></View>
          <AppButton title="Xoá" variant="destructive" loading={deleteGarment.isPending && deleteGarment.variables === item.id} onPress={() => Alert.alert(
            'Xoá món đồ?',
            'Món đồ này sẽ bị xoá khỏi tủ. Các outfit đã tạo trước đó vẫn được giữ.',
            [
              { text: 'Huỷ', style: 'cancel' },
              { text: 'Xoá', style: 'destructive', onPress: () => deleteGarment.mutate(item.id) },
            ],
          )}/>
        </View>
      )}
    />
  );
}
