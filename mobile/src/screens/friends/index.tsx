import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useState } from 'react';

import { AppText } from '@/components/app-text';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { useAuth } from '@/providers/auth-provider';
import { apiRequest, protectedImageSource } from '@/services/api-client';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import type { SocialPerson, SocialSnapshot } from '@/types/api';

type SocialAction = {
  action: 'request' | 'request-response';
  body: Record<string, unknown>;
};

export function FriendsScreen() {
  const brand = useBrandColors();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const normalizedSearch = search.replace(/^@/, '').trim();

  const query = useQuery({
    queryKey: ['social'],
    queryFn: () => apiRequest<SocialSnapshot>('/api/social'),
  });
  const searchQuery = useQuery({
    queryKey: ['social-search', normalizedSearch],
    queryFn: () => apiRequest<SocialPerson[]>('/api/social/search?q=' + encodeURIComponent(normalizedSearch)),
    enabled: normalizedSearch.length >= 2,
  });
  const action = useMutation({
    mutationFn: ({ action: actionName, body }: SocialAction) => apiRequest<SocialSnapshot>('/api/social/' + actionName, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    onSuccess: (snapshot) => {
      queryClient.setQueryData(['social'], snapshot);
      void queryClient.invalidateQueries({ queryKey: ['social-search'] });
    },
  });

  if (query.data === undefined) return <ScreenLoading label="Đang tải bạn bè…"/>;
  if (query.error) return <ScreenError message={query.error instanceof Error ? query.error.message : 'Không thể tải bạn bè.'} onRetry={() => void query.refetch()}/>;

  const data = query.data;
  const unread = data.notifications.filter((item) => !item.read).length;
  const act = (actionName: SocialAction['action'], body: Record<string, unknown>) => {
    action.mutate({ action: actionName, body });
  };

  const searchAction = (person: SocialPerson) => {
    if (data.friends.some((item) => item.id === person.id)) {
      return <StatusPill label="Đã là bạn bè" />;
    }
    const incoming = data.incoming.find((item) => item.from.id === person.id);
    if (incoming) {
      return <SmallAction label="Chấp nhận" busy={action.isPending} onPress={() => act('request-response', { id: incoming.id, decision: 'accept' })}/>;
    }
    const outgoing = data.outgoing.find((item) => item.to.id === person.id);
    if (outgoing) {
      return <SmallAction label="Huỷ lời mời" secondary busy={action.isPending} onPress={() => act('request-response', { id: outgoing.id, decision: 'cancel' })}/>;
    }
    return <SmallAction label="Kết bạn" busy={action.isPending} onPress={() => act('request', { targetId: person.id })}/>;
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={brand.primary}/>}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }}>
      <View style={{ gap: spacing.sm, padding: spacing.lg, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: brand.secondary }}>
        <AppText variant="title">Kết nối cùng gu</AppText>
        <AppText variant="subhead">
          {data.incoming.length
            ? data.incoming.length + ' lời mời đang chờ'
            : unread
              ? unread + ' thông báo mới'
              : data.friends.length + ' bạn bè'}
        </AppText>
      </View>

      <Section title="Tìm bạn bè">
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TextInput
            accessibilityLabel="Tìm bạn theo tên hoặc username"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={50}
            placeholder="Tên hoặc @username"
            placeholderTextColor={colors.secondaryLabel}
            style={{
              flex: 1,
              minHeight: 48,
              paddingHorizontal: spacing.md,
              borderWidth: 1,
              borderColor: colors.separator,
              borderRadius: radius.lg,
              color: colors.label,
              backgroundColor: colors.surface,
              fontSize: 16,
            }}
          />
          {search.length > 0 && <SmallAction label="Xoá" secondary onPress={() => setSearch('')}/>}
        </View>
        {normalizedSearch.length === 1 && <AppText variant="caption">Nhập ít nhất 2 ký tự để tìm.</AppText>}
        {searchQuery.isFetching && <View style={{ padding: spacing.md, alignItems: 'center' }}><ActivityIndicator color={colors.label}/></View>}
        {searchQuery.error && <Message text={searchQuery.error instanceof Error ? searchQuery.error.message : 'Không thể tìm bạn lúc này.'} />}
        {normalizedSearch.length >= 2 && !searchQuery.isFetching && searchQuery.data?.length === 0 && (
          <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}><AppText variant="subhead">Không tìm thấy tài khoản phù hợp.</AppText></View>
        )}
        {searchQuery.data?.map((person) => (
          <PersonRow key={person.id} person={person} accessToken={session?.access_token} action={searchAction(person)}/>
        ))}
      </Section>

      {data.incoming.length > 0 && (
        <Section title={'Lời mời đã nhận · ' + data.incoming.length}>
          {data.incoming.map((request) => (
            <PersonRow
              key={request.id}
              person={request.from}
              accessToken={session?.access_token}
              action={<View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <SmallAction label="Nhận" busy={action.isPending} onPress={() => act('request-response', { id: request.id, decision: 'accept' })}/>
                <SmallAction label="Từ chối" secondary busy={action.isPending} onPress={() => act('request-response', { id: request.id, decision: 'decline' })}/>
              </View>}
            />
          ))}
        </Section>
      )}

      {data.outgoing.length > 0 && (
        <Section title={'Lời mời đã gửi · ' + data.outgoing.length}>
          {data.outgoing.map((request) => (
            <PersonRow
              key={request.id}
              person={request.to}
              accessToken={session?.access_token}
              action={<SmallAction label="Huỷ" secondary busy={action.isPending} onPress={() => act('request-response', { id: request.id, decision: 'cancel' })}/>}
            />
          ))}
        </Section>
      )}

      <Section title={'Bạn bè · ' + data.friends.length}>
        {data.friends.length === 0
          ? <View style={{ minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
            <AppText variant="headline">Chưa có bạn bè</AppText>
            <AppText variant="subhead" style={{ textAlign: 'center' }}>Tìm người dùng phía trên để gửi lời mời kết bạn.</AppText>
          </View>
          : data.friends.map((person) => <PersonRow key={person.id} person={person} accessToken={session?.access_token}/>)}
      </Section>

      {action.error && <Message text={action.error instanceof Error ? action.error.message : 'Không thể thực hiện thao tác.'} />}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.surface }}>
    <AppText variant="headline">{title}</AppText>
    {children}
  </View>;
}

function PersonRow({ person, accessToken, action }: { person: SocialPerson; accessToken?: string; action?: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm }}>
    <Image source={person.avatar ? protectedImageSource(person.avatar, accessToken) : undefined} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.groupedBackground }} contentFit="cover"/>
    <View style={{ flex: 1, minWidth: 0 }}>
      <AppText variant="headline" numberOfLines={1}>{person.name}</AppText>
      <AppText variant="caption" numberOfLines={1}>@{person.username}</AppText>
    </View>
    {action}
  </View>;
}

function SmallAction({ label, onPress, secondary = false, busy = false }: { label: string; onPress: () => void; secondary?: boolean; busy?: boolean }) {
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    disabled={busy}
    onPress={onPress}
    style={({ pressed }) => ({
      minHeight: 38,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderWidth: secondary ? 1 : 0,
      borderColor: colors.separator,
      borderRadius: radius.full,
      backgroundColor: secondary ? colors.surface : colors.label,
      opacity: busy ? 0.5 : pressed ? 0.72 : 1,
    })}>
    <AppText variant="caption" style={{ color: secondary ? colors.label : colors.onBrand, fontWeight: '800' }}>{label}</AppText>
  </Pressable>;
}

function StatusPill({ label }: { label: string }) {
  return <View style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.successBackground }}>
    <AppText variant="caption" style={{ color: colors.success, fontWeight: '700' }}>{label}</AppText>
  </View>;
}

function Message({ text }: { text: string }) {
  return <View accessibilityRole="alert" style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.destructiveBackground }}>
    <AppText variant="subhead" style={{ color: colors.destructive }}>{text}</AppText>
  </View>;
}
