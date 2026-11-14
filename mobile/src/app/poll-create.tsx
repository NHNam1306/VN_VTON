import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { Notice } from '@/components/notice';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { useAuth } from '@/providers/auth-provider';
import { apiRequest, protectedImageSource } from '@/services/api-client';
import { haptic } from '@/services/haptics';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import type { PageResponse, SavedOutfit, SocialSnapshot } from '@/types/api';

const DURATIONS = [{ hours: 1, label: '1 giờ' }, { hours: 24, label: '1 ngày' }, { hours: 72, label: '3 ngày' }] as const;
const MAX_OPTIONS = 3;

/** Tạo bình chọn từ 2–3 outfit đã lưu, gửi cho bạn bè quẹt chọn giúp. */
export default function PollCreateRoute() {
  const brand = useBrandColors();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const outfits = useQuery({ queryKey: ['saved-outfits', 'poll'], queryFn: () => apiRequest<PageResponse<SavedOutfit>>('/api/generations/outfits?limit=100&offset=0') });
  const social = useQuery({ queryKey: ['social'], queryFn: () => apiRequest<SocialSnapshot>('/api/social') });
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState<number>(24);
  const [excluded, setExcluded] = useState<string[]>([]);

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest<SocialSnapshot>('/api/social/poll-create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }),
    onSuccess: (snapshot) => {
      haptic.success();
      queryClient.setQueryData(['social'], snapshot);
      router.replace('/polls');
    },
  });

  const error = outfits.error ?? social.error;
  if (error) return <ScreenError message={error instanceof Error ? error.message : 'Không thể tải dữ liệu.'} onRetry={() => { void outfits.refetch(); void social.refetch(); }}/>;
  if (!outfits.data || !social.data) return <ScreenLoading variant="grid" label="Đang tải outfit…"/>;

  const friends = social.data.friends;
  const recipients = friends.filter((friend) => !excluded.includes(friend.id));
  const toggle = (id: string) => {
    haptic.select();
    setPicked((list) => list.includes(id) ? list.filter((item) => item !== id) : list.length >= MAX_OPTIONS ? list : [...list, id]);
  };
  const canSubmit = picked.length >= 2 && recipients.length > 0 && !create.isPending;

  return <>
    <Stack.Screen options={{ title: 'Nhờ bạn bè chọn' }}/>
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl }}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="headline">1. Chọn 2–3 outfit ({picked.length}/{MAX_OPTIONS})</AppText>
        {outfits.data.items.length < 2
          ? <AppText variant="subhead">Cần ít nhất 2 outfit đã lưu. Tạo thêm ở Phòng thử nhé.</AppText>
          : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {outfits.data.items.map((outfit) => {
                const order = picked.indexOf(outfit.id);
                return <Pressable key={outfit.id} accessibilityRole="checkbox" accessibilityState={{ checked: order >= 0 }} onPress={() => toggle(outfit.id)}
                  style={{ width: '31%', aspectRatio: 4 / 5, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 3, borderColor: order >= 0 ? brand.accent : 'transparent', backgroundColor: colors.groupedBackground }}>
                  <Image source={protectedImageSource(outfit.frontImageUrl, session?.access_token)} style={{ flex: 1 }} contentFit="cover"/>
                  {order >= 0 && <Animated.View entering={ZoomIn.duration(160)} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.accent }}>
                    <AppText style={{ color: colors.onBrand, fontWeight: '800' }}>{order + 1}</AppText>
                  </Animated.View>}
                </Pressable>;
              })}
            </View>}
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="headline">2. Hỏi gì?</AppText>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          placeholder="Mình nên chọn bộ nào?"
          placeholderTextColor={colors.secondaryLabel}
          style={{ minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.separator, backgroundColor: colors.surface, color: colors.label, fontSize: 16 }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {['Đi tiệc tối nay mặc gì?', 'Đi làm thứ Hai', 'Hẹn hò cuối tuần', 'Đi Đà Lạt'].map((idea) => <Pressable key={idea} onPress={() => setTitle(idea)}
            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: brand.secondary }}>
            <AppText variant="caption" style={{ color: brand.primary }}>{idea}</AppText>
          </Pressable>)}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="headline">3. Trong bao lâu?</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {DURATIONS.map((item) => <Pressable key={item.hours} accessibilityRole="radio" accessibilityState={{ selected: hours === item.hours }} onPress={() => { haptic.select(); setHours(item.hours); }}
            style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: hours === item.hours ? brand.primary : colors.surface }}>
            <AppText variant="caption" style={{ fontWeight: '800', color: hours === item.hours ? colors.onBrand : colors.label }}>{item.label}</AppText>
          </Pressable>)}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="headline">4. Gửi cho ai? ({recipients.length}/{friends.length})</AppText>
        {friends.length === 0
          ? <View style={{ gap: spacing.sm }}>
              <AppText variant="subhead">Bạn chưa có bạn bè trên Fitsy.</AppText>
              <AppButton title="Tìm bạn bè" variant="secondary" onPress={() => router.navigate('/(tabs)/friends')}/>
            </View>
          : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {friends.map((friend) => {
                const on = !excluded.includes(friend.id);
                return <Pressable key={friend.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                  onPress={() => setExcluded((list) => on ? [...list, friend.id] : list.filter((id) => id !== friend.id))}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: on ? brand.accent : colors.surface }}>
                  <AppText variant="caption" style={{ fontWeight: '700', color: on ? colors.onBrand : colors.secondaryLabel }}>{friend.name}</AppText>
                </Pressable>;
              })}
            </View>}
      </View>

      {create.error && <Notice tone="error" text={create.error instanceof Error ? create.error.message : 'Chưa tạo được bình chọn.'} onDismiss={() => create.reset()}/>}
      <AppButton title="Gửi bình chọn" icon="people" loading={create.isPending} disabled={!canSubmit}
        onPress={() => create.mutate({ outfitIds: picked, recipientIds: recipients.map((friend) => friend.id), hours, title: title.trim() })}/>
    </ScrollView>
  </>;
}
