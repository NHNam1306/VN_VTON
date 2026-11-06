import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { FlatList, RefreshControl, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { useAuth } from '@/providers/auth-provider';
import { apiRequest, protectedImageSource } from '@/services/api-client';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import type { SocialPerson, SocialSnapshot } from '@/types/api';

export function FriendsScreen() {
  const brand = useBrandColors();
  const { session } = useAuth();
  const query = useQuery({ queryKey: ['social'], queryFn: () => apiRequest<SocialSnapshot>('/api/social') });
  if (query.data === undefined) return <ScreenLoading label="Đang tải bạn bè…"/>;
  if (query.error) return <ScreenError message={query.error instanceof Error ? query.error.message : 'Không thể tải bạn bè.'} onRetry={() => void query.refetch()}/>;
  const unread = query.data.notifications.filter((item) => !item.read).length;
  return <FlatList data={query.data.friends} keyExtractor={(item) => item.id} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm, flexGrow: 1 }} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={brand.primary as string}/>} ListHeaderComponent={<View style={{ gap: spacing.sm, padding: spacing.lg, marginBottom: spacing.md, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: brand.secondary }}><AppText variant="title">Kết nối cùng gu</AppText><AppText variant="subhead">{query.data.incoming.length ? `${query.data.incoming.length} lời mời đang chờ` : unread ? `${unread} thông báo mới` : `${query.data.friends.length} bạn bè`}</AppText></View>} ListEmptyComponent={<View style={{ flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}><AppText variant="headline">Chưa có bạn bè</AppText><AppText variant="subhead" style={{ textAlign: 'center' }}>Tìm và kết bạn trên web; danh sách sẽ đồng bộ vào app.</AppText></View>} renderItem={({ item }) => <FriendRow person={item} accessToken={session?.access_token}/>}/>;
}

function FriendRow({ person, accessToken }: { person: SocialPerson; accessToken?: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.surface }}><Image source={person.avatar ? protectedImageSource(person.avatar, accessToken) : undefined} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.groupedBackground }} contentFit="cover"/><View style={{ flex: 1 }}><AppText variant="headline" numberOfLines={1}>{person.name}</AppText><AppText variant="caption">@{person.username}</AppText></View></View>;
}
