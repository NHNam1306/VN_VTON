import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/icon';
import { AppText } from '@/components/app-text';
import { FitsyWordmark } from '@/components/fitsy-mark';
import { useAuth } from '@/providers/auth-provider';
import { apiRequest, protectedImageSource } from '@/services/api-client';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import { TryOnScreen } from '@/screens/try-on';
import { WardrobeScreen } from '@/screens/wardrobe';
import type { SocialSnapshot } from '@/types/api';

type HomeSegment = 'try-on' | 'wardrobe' | 'shop';

const segments: { value: HomeSegment; label: string; icon: AppIconName }[] = [
  { value: 'try-on', label: 'Thử đồ AI', icon: 'hanger' },
  { value: 'wardrobe', label: 'Tủ đồ', icon: 'wardrobe' },
  { value: 'shop', label: 'Shop', icon: 'bag' },
];

export function HomeScreen() {
  const [segment, setSegment] = useState<HomeSegment>('try-on');
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <HomeHeader />
      <SegmentBar value={segment} onChange={setSegment} />
      <View collapsable={false} style={{ flex: 1 }}>
        {segment === 'try-on' && <TryOnScreen onOpenWardrobe={() => setSegment('wardrobe')} />}
        {segment === 'wardrobe' && <WardrobeScreen fixedMode="garments" />}
        {segment === 'shop' && <ShopComingSoon />}
      </View>
    </SafeAreaView>
  );
}

function HomeHeader() {
  const brand = useBrandColors();
  const router = useRouter();
  const { session } = useAuth();
  // Dùng chung cache với tab Cá nhân / Khám phá; lỗi ở đây không chặn trang chủ.
  const social = useQuery({ queryKey: ['social'], queryFn: () => apiRequest<SocialSnapshot>('/api/social') });
  const unread = social.data?.notifications.filter((item) => !item.read).length ?? 0;
  const avatar = social.data?.me.avatar;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md }}>
      <FitsyWordmark size={32} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
          hitSlop={8}
          onPress={() => router.navigate('/(tabs)/friends')}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <AppIcon name="bell" size={26} color={brand.primary} />
          {unread > 0 && <View style={{ position: 'absolute', top: 0, right: 1, width: 9, height: 9, borderRadius: 5, backgroundColor: brand.sparkle, borderWidth: 1.5, borderColor: colors.background }} />}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cá nhân"
          hitSlop={8}
          onPress={() => router.navigate('/(tabs)/profile')}
          style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: brand.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', opacity: pressed ? 0.6 : 1 })}>
          {avatar
            ? <Image source={protectedImageSource(avatar, session?.access_token)} style={{ width: 36, height: 36 }} contentFit="cover" />
            : <AppIcon name="person" size={28} color={brand.primary} />}
        </Pressable>
      </View>
    </View>
  );
}

function SegmentBar({ value, onChange }: { value: HomeSegment; onChange: (value: HomeSegment) => void }) {
  const brand = useBrandColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 4, gap: 4, borderRadius: radius.full, backgroundColor: colors.surface, boxShadow: '0 2px 10px rgba(20, 26, 60, 0.06)' }}>
        {segments.map((item) => {
          const active = item.value === value;
          const tint = active ? colors.onBrand : brand.primary;
          return <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              minHeight: 46,
              paddingHorizontal: spacing.md + 2,
              borderRadius: radius.full,
              backgroundColor: active ? brand.primary : 'transparent',
              opacity: pressed ? 0.75 : 1,
            })}>
            <AppIcon name={item.icon} size={20} color={tint} />
            <AppText selectable={false} variant="body" style={{ color: tint, fontWeight: active ? '700' : '600' }}>{item.label}</AppText>
          </Pressable>;
        })}
      </View>
    </ScrollView>
  );
}

function ShopComingSoon() {
  const brand = useBrandColors();
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.secondary }}>
        <AppIcon name="bag" size={34} color={brand.accent} />
      </View>
      <AppText variant="title" style={{ textAlign: 'center' }}>Shop sắp ra mắt</AppText>
      <AppText variant="subhead" style={{ textAlign: 'center', maxWidth: 320 }}>
        Fitsy sẽ gợi ý sản phẩm hợp gu bạn từ các KOL/KOC trên Shopee, TikTok Shop và shop ngoài sàn — thử ngay trên ảnh của bạn trước khi mua.
      </AppText>
    </ScrollView>
  );
}
