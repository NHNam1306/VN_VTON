import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { TryohMark } from '@/components/tryoh-mark';
import { useAuth } from '@/providers/auth-provider';
import { apiRequest, protectedImageSource } from '@/services/api-client';
import { imageUploadFile } from '@/services/image-upload';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import type { PlanSnapshot, SocialSnapshot } from '@/types/api';

export function ProfileScreen() {
  const auth = useAuth();
  const brand = useBrandColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => apiRequest<PlanSnapshot>('/api/plans') });
  const social = useQuery({ queryKey: ['social'], queryFn: () => apiRequest<SocialSnapshot>('/api/social') });
  const uploadAvatar = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Cần quyền truy cập thư viện ảnh để đổi ảnh đại diện.');
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (picked.canceled) return null;
      const asset = picked.assets[0];
      const form = new FormData();
      form.append('avatar', imageUploadFile(asset, 'avatar.jpg'));
      return apiRequest<SocialSnapshot>('/api/social/avatar', { method: 'POST', body: form });
    },
    onSuccess: (snapshot) => {
      if (snapshot) queryClient.setQueryData(['social'], snapshot);
    },
  });

  if (plans.data === undefined || social.data === undefined) return <ScreenLoading label="Đang tải hồ sơ…"/>;
  const loadError = plans.error ?? social.error;
  if (loadError) return <ScreenError message={loadError instanceof Error ? loadError.message : 'Không thể tải hồ sơ.'} onRetry={() => { void plans.refetch(); void social.refetch(); }}/>;

  const name = social.data.me.name || String(auth.user?.user_metadata.display_name ?? auth.user?.email?.split('@')[0] ?? 'Người dùng');
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }}>
    <View style={{ alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.surface }}>
      {social.data.me.avatar
        ? <Image source={protectedImageSource(social.data.me.avatar, auth.session?.access_token)} style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.groupedBackground }} contentFit="cover"/>
        : <TryohMark size={88}/>}
      <AppText variant="title">{name}</AppText>
      <AppText variant="subhead">@{social.data.me.username}</AppText>
      <AppText variant="caption">{auth.user?.email}</AppText>
      <AppButton title="Đổi ảnh đại diện" variant="secondary" loading={uploadAvatar.isPending} onPress={() => uploadAvatar.mutate()} style={{ alignSelf: 'stretch' }}/>
      <AppButton title="Cài đặt tài khoản" variant="secondary" onPress={() => router.push('/settings')} style={{ alignSelf: 'stretch' }}/>
      {uploadAvatar.error && <AppText variant="subhead" style={{ color: colors.destructive }}>{uploadAvatar.error instanceof Error ? uploadAvatar.error.message : 'Không thể đổi ảnh đại diện.'}</AppText>}
    </View>
    <View style={{ gap: spacing.sm, padding: spacing.lg, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: brand.secondary }}>
      <AppText variant="caption">GÓI HIỆN TẠI</AppText>
      <AppText variant="title">{plans.data.current.planName}</AppText>
      <AppText variant="subhead">{plans.data.current.unlimited
        ? 'Tủ đồ và outfit không giới hạn'
        : 'Tủ đồ ' + plans.data.current.entitlements.wardrobeItems + ' món · ' + plans.data.current.entitlements.savedOutfits + ' outfit'}</AppText>
      <AppButton title="Xem các gói đăng ký" variant="secondary" onPress={() => router.push('/plans')}/>
    </View>
    <AppButton title="Đăng xuất" variant="destructive" onPress={() => void auth.signOut()}/>
  </ScrollView>;
}
