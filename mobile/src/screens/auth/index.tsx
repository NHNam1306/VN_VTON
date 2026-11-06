import { Redirect } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { TryohMark } from '@/components/tryoh-mark';
import { useAuth } from '@/providers/auth-provider';
import { colors, radius, spacing, useBrandColors } from '@/theme';

export function AuthScreen() {
  const auth = useAuth();
  const brand = useBrandColors();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(auth.configurationError);
  const [notice, setNotice] = useState<string | null>(null);

  if (auth.session) return <Redirect href="/(tabs)/home"/>;

  const submit = async () => {
    if (busy || auth.configurationError) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'login') {
        await auth.signIn(email, password);
      } else {
        if (name.trim().length < 2) throw new Error('Tên hiển thị cần ít nhất 2 ký tự.');
        if (password.length < 8) throw new Error('Mật khẩu cần ít nhất 8 ký tự.');
        const result = await auth.signUp(name, email, password);
        if (result === 'confirmation-required') setNotice('Tài khoản đã được tạo. Hãy kiểm tra email để xác minh.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xác thực tài khoản.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.background }}>
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <TryohMark/>
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <AppText variant="title">Tryoh</AppText>
            <AppText variant="subhead" style={{ textAlign: 'center' }}>Phòng thử đồ AI trong túi của bạn</AppText>
          </View>
        </View>

        <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, borderCurve: 'continuous', backgroundColor: colors.surface }}>
          <View style={{ flexDirection: 'row', padding: spacing.xs, borderRadius: radius.full, backgroundColor: colors.groupedBackground }}>
            {(['login', 'register'] as const).map((item) => {
              const selected = mode === item;
              return <Pressable key={item} onPress={() => { setMode(item); setError(null); setNotice(null); }} style={({ pressed }) => ({ flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: selected ? colors.surface : 'transparent', opacity: pressed ? 0.7 : 1 })}><AppText variant="subhead" style={{ fontWeight: selected ? '700' : '500', color: selected ? colors.label : colors.secondaryLabel }}>{item === 'login' ? 'Đăng nhập' : 'Đăng ký'}</AppText></Pressable>;
            })}
          </View>

          {mode === 'register' && <Field label="Tên hiển thị" value={name} onChangeText={setName} autoCapitalize="words"/>}
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email"/>
          <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>
          {error && <AppText variant="subhead" accessibilityRole="alert" style={{ color: colors.destructive }}>{error}</AppText>}
          {notice && <AppText variant="subhead" style={{ color: brand.primary }}>{notice}</AppText>}
          <AppButton title={mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} loading={busy} disabled={!email.trim() || !password || Boolean(auth.configurationError)} onPress={() => void submit()}/>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }: ComponentProps<typeof TextInput> & { label: string }) {
  return <View style={{ gap: spacing.sm }}><AppText variant="caption" style={{ fontWeight: '700' }}>{label}</AppText><TextInput {...props} placeholderTextColor={colors.secondaryLabel} style={{ minHeight: 52, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.separator, borderRadius: radius.lg, borderCurve: 'continuous', color: colors.label, backgroundColor: colors.background, fontSize: 16 }}/></View>;
}
