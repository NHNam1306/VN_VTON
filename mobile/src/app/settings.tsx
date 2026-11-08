import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ScreenError, ScreenLoading } from '@/components/screen-state';
import { useAuth } from '@/providers/auth-provider';
import { apiRequest } from '@/services/api-client';
import { supabase } from '@/services/supabase';
import { colors, radius, spacing, useBrandColors } from '@/theme';
import type { SocialSnapshot } from '@/types/api';

type Feedback = { tone: 'error' | 'success'; text: string } | null;
type InvitePolicy = SocialSnapshot['me']['invitePolicy'];
type Visibility = SocialSnapshot['me']['defaultVisibility'];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SettingsRoute() {
  const social = useQuery({
    queryKey: ['social'],
    queryFn: () => apiRequest<SocialSnapshot>('/api/social'),
  });
  if (social.error) return <ScreenError message={errorMessage(social.error, 'Không thể tải cài đặt.')} onRetry={() => void social.refetch()}/>;
  if (social.data === undefined) return <ScreenLoading label="Đang tải cài đặt…"/>;
  return <SettingsContent snapshot={social.data}/>;
}

function SettingsContent({ snapshot }: { snapshot: SocialSnapshot }) {
  const auth = useAuth();
  const brand = useBrandColors();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(String(auth.user?.user_metadata.display_name ?? ''));
  const [username, setUsername] = useState(snapshot.me.username);
  const [birthDate, setBirthDate] = useState(snapshot.me.birthDate ?? '');
  const [invitePolicy, setInvitePolicy] = useState<InvitePolicy>(snapshot.me.invitePolicy);
  const [defaultVisibility, setDefaultVisibility] = useState<Visibility>(snapshot.me.defaultVisibility);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountFeedback, setAccountFeedback] = useState<Feedback>(null);
  const [emailFeedback, setEmailFeedback] = useState<Feedback>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);
  const [privacyFeedback, setPrivacyFeedback] = useState<Feedback>(null);
  const syncSocialFields = (next: SocialSnapshot) => {
    setUsername(next.me.username);
    setBirthDate(next.me.birthDate ?? '');
    setInvitePolicy(next.me.invitePolicy);
    setDefaultVisibility(next.me.defaultVisibility);
  };

  const updateName = useMutation({
    mutationFn: () => apiRequest('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: displayName.trim() }),
    }),
    onSuccess: async () => {
      await supabase.auth.refreshSession();
      setAccountFeedback({ tone: 'success', text: 'Đã cập nhật tên hiển thị.' });
      void queryClient.invalidateQueries({ queryKey: ['social'] });
    },
    onError: (error) => setAccountFeedback({ tone: 'error', text: errorMessage(error, 'Không thể cập nhật tên.') }),
  });

  const saveSocialProfile = useMutation({
    mutationFn: () => apiRequest<SocialSnapshot>('/api/social/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim().toLowerCase(),
        birthDate: snapshot.me.birthDate ?? (birthDate || null),
        invitePolicy,
        defaultVisibility,
      }),
    }),
    onSuccess: (next) => {
      queryClient.setQueryData(['social'], next);
      syncSocialFields(next);
      setAccountFeedback({ tone: 'success', text: 'Đã lưu thông tin cá nhân.' });
    },
    onError: (error) => setAccountFeedback({ tone: 'error', text: errorMessage(error, 'Không thể lưu thông tin.') }),
  });

  const changeEmail = useMutation({
    mutationFn: () => apiRequest('/api/auth/change-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail: newEmail.trim(), password: emailPassword }),
    }),
    onSuccess: async () => {
      await supabase.auth.refreshSession();
      setNewEmail('');
      setEmailPassword('');
      setEmailFeedback({ tone: 'success', text: 'Yêu cầu đổi email đã được ghi nhận. Hãy xác minh email mới nếu được yêu cầu.' });
    },
    onError: (error) => setEmailFeedback({ tone: 'error', text: errorMessage(error, 'Không thể đổi email.') }),
  });

  const changePassword = useMutation({
    mutationFn: () => apiRequest('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({ tone: 'success', text: 'Đổi mật khẩu thành công.' });
    },
    onError: (error) => setPasswordFeedback({ tone: 'error', text: errorMessage(error, 'Không thể đổi mật khẩu.') }),
  });

  const savePrivacy = useMutation({
    mutationFn: () => apiRequest<SocialSnapshot>('/api/social/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: snapshot.me.username,
        birthDate: snapshot.me.birthDate,
        invitePolicy,
        defaultVisibility,
      }),
    }),
    onSuccess: (next) => {
      queryClient.setQueryData(['social'], next);
      syncSocialFields(next);
      setPrivacyFeedback({ tone: 'success', text: 'Đã lưu quyền riêng tư.' });
    },
    onError: (error) => setPrivacyFeedback({ tone: 'error', text: errorMessage(error, 'Không thể lưu quyền riêng tư.') }),
  });

  const unblock = useMutation({
    mutationFn: (targetId: string) => apiRequest<SocialSnapshot>('/api/social/unblock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId }),
    }),
    onSuccess: (snapshot) => queryClient.setQueryData(['social'], snapshot),
  });

  const nameValid = displayName.trim().length >= 2 && displayName.trim().length <= 50;
  const socialValid = /^[a-z0-9_]{3,40}$/.test(username.trim().toLowerCase());
  const emailValid = emailPattern.test(newEmail.trim()) && newEmail.trim().length <= 254 && emailPassword.length > 0;
  const passwordValid = currentPassword.length > 0 && newPassword.length >= 8 && newPassword.length <= 128 && newPassword === confirmPassword;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md, backgroundColor: colors.background }}>
      <SettingsCard title="Hồ sơ">
        <Field label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} maxLength={50} autoCapitalize="words"/>
        <AppButton title="Lưu tên" loading={updateName.isPending} disabled={!nameValid} onPress={() => {
          setAccountFeedback(null);
          updateName.mutate();
        }}/>
        <View style={{ height: 1, backgroundColor: colors.separator }}/>
        <Field label="Username" value={username} onChangeText={setUsername} maxLength={40} autoCapitalize="none" autoCorrect={false}/>
        <Field
          label="Ngày sinh (YYYY-MM-DD)"
          value={birthDate}
          onChangeText={setBirthDate}
          maxLength={10}
          editable={!snapshot.me.birthDate}
          placeholder="2000-01-31"
        />
        <AppButton title="Lưu thông tin" variant="secondary" loading={saveSocialProfile.isPending} disabled={!socialValid} onPress={() => {
          setAccountFeedback(null);
          saveSocialProfile.mutate();
        }}/>
        <Message feedback={accountFeedback}/>
      </SettingsCard>

      <SettingsCard title="Địa chỉ email">
        <AppText variant="subhead">{auth.user?.email}</AppText>
        <Field label="Email mới" value={newEmail} onChangeText={setNewEmail} maxLength={254} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}/>
        <Field label="Mật khẩu hiện tại" value={emailPassword} onChangeText={setEmailPassword} maxLength={128} secureTextEntry autoCapitalize="none"/>
        <AppButton title="Đổi email" loading={changeEmail.isPending} disabled={!emailValid} onPress={() => {
          setEmailFeedback(null);
          changeEmail.mutate();
        }}/>
        <Message feedback={emailFeedback}/>
      </SettingsCard>

      <SettingsCard title="Mật khẩu">
        <Field label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} maxLength={128} secureTextEntry autoCapitalize="none"/>
        <Field label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} maxLength={128} secureTextEntry autoCapitalize="none"/>
        <Field label="Nhập lại mật khẩu" value={confirmPassword} onChangeText={setConfirmPassword} maxLength={128} secureTextEntry autoCapitalize="none"/>
        <AppButton title="Lưu mật khẩu" loading={changePassword.isPending} disabled={!passwordValid} onPress={() => {
          setPasswordFeedback(null);
          changePassword.mutate();
        }}/>
        <Message feedback={passwordFeedback}/>
      </SettingsCard>

      <SettingsCard title="Quyền riêng tư">
        <AppText variant="caption" style={{ color: colors.label, fontWeight: '700' }}>Ai được gửi lời mời?</AppText>
        <ChoiceRow
          value={invitePolicy}
          onChange={setInvitePolicy}
          choices={[
            ['known', 'Bạn chung / mã mời'],
            ['code', 'Chỉ mã mời'],
            ['everyone', 'Mọi người'],
          ]}
        />
        <AppText variant="caption" style={{ color: colors.label, fontWeight: '700' }}>Quyền xem outfit mặc định</AppText>
        <ChoiceRow
          value={defaultVisibility}
          onChange={setDefaultVisibility}
          choices={[
            ['private', 'Chỉ mình tôi'],
            ['friends', 'Bạn bè'],
          ]}
        />
        <AppButton title="Lưu quyền riêng tư" loading={savePrivacy.isPending} onPress={() => {
          setPrivacyFeedback(null);
          savePrivacy.mutate();
        }}/>
        <Message feedback={privacyFeedback}/>
      </SettingsCard>

      <SettingsCard title="Danh sách đã chặn">
        {snapshot.blocked.length === 0
          ? <AppText variant="subhead">Chưa chặn ai.</AppText>
          : snapshot.blocked.map((person) => (
            <View key={person.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <AppText variant="headline">{person.name}</AppText>
                <AppText variant="caption">@{person.username}</AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={unblock.isPending}
                onPress={() => unblock.mutate(person.id)}
                style={({ pressed }) => ({
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.separator,
                  borderRadius: radius.full,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.65 : 1,
                })}>
                <AppText variant="caption" style={{ color: brand.primary, fontWeight: '800' }}>Bỏ chặn</AppText>
              </Pressable>
            </View>
          ))}
      </SettingsCard>
    </ScrollView>
  );
}

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.separator, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.surface }}>
      <AppText variant="headline">{title}</AppText>
      {children}
    </View>
  );
}

function Field({ label, ...props }: ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="caption" style={{ color: colors.label, fontWeight: '700' }}>{label}</AppText>
      <TextInput
        {...props}
        placeholderTextColor={colors.secondaryLabel}
        style={{
          minHeight: 50,
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: colors.separator,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          color: colors.label,
          backgroundColor: props.editable === false ? colors.groupedBackground : colors.surface,
          fontSize: 16,
        }}
      />
    </View>
  );
}

function ChoiceRow<T extends string>({
  value,
  choices,
  onChange,
}: {
  value: T;
  choices: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {choices.map(([choice, label]) => {
        const selected = value === choice;
        return (
          <Pressable
            key={choice}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(choice)}
            style={({ pressed }) => ({
              paddingHorizontal: spacing.md,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: selected ? colors.label : colors.separator,
              borderRadius: radius.full,
              backgroundColor: selected ? colors.label : colors.surface,
              opacity: pressed ? 0.7 : 1,
            })}>
            <AppText variant="caption" style={{ color: selected ? colors.onBrand : colors.label, fontWeight: '700' }}>{label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function Message({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  const error = feedback.tone === 'error';
  return (
    <View accessibilityRole="alert" style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: error ? colors.destructiveBackground : colors.successBackground }}>
      <AppText variant="subhead" style={{ color: error ? colors.destructive : colors.success, fontWeight: '600' }}>{feedback.text}</AppText>
    </View>
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
