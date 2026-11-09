import { Redirect } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FitsyMark, FitsyWordmark } from '@/components/fitsy-mark';
import { useAuth } from '@/providers/auth-provider';
import { colors, radius, shadows, spacing } from '@/theme';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contentByMode: Record<AuthMode, { eyebrow: string; title: string; description: string }> = {
  login: {
    eyebrow: 'Chào mừng trở lại',
    title: 'Tiếp tục vào phòng thử',
    description: 'Đăng nhập để xem lại ảnh và tủ đồ đã lưu.',
  },
  register: {
    eyebrow: 'Tạo tài khoản mới',
    title: 'Bắt đầu tủ đồ của riêng bạn',
    description: 'Dùng email và mật khẩu tối thiểu 8 ký tự.',
  },
  forgot: {
    eyebrow: 'Khôi phục tài khoản',
    title: 'Quên mật khẩu?',
    description: 'Nhập email đăng ký, chúng tôi sẽ gửi cho bạn liên kết đặt lại mật khẩu.',
  },
  reset: {
    eyebrow: 'Bảo mật tài khoản',
    title: 'Đặt mật khẩu mới',
    description: 'Chọn mật khẩu mới có ít nhất 8 ký tự.',
  },
};

export function AuthScreen({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const auth = useAuth();
  const [selectedMode, setSelectedMode] = useState<AuthMode>(
    initialMode === 'reset' || auth.recoveryMode ? 'reset' : initialMode,
  );
  const mode = auth.recoveryMode ? 'reset' : selectedMode;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(auth.configurationError);
  const [notice, setNotice] = useState<string | null>(null);
  const visibleError = error ?? auth.linkError;

  if (auth.session && mode !== 'reset' && !auth.recoveryMode) {
    return <Redirect href="/(tabs)/home" />;
  }

  const changeMode = (nextMode: AuthMode) => {
    setSelectedMode(nextMode);
    setError(null);
    setNotice(null);
    setAwaitingConfirmation(false);
    setPassword('');
    setConfirmPassword('');
  };

  const leaveRecovery = async (nextMode: 'login' | 'forgot') => {
    if (mode === 'reset' && auth.session) {
      try {
        await auth.signOut();
      } catch {
        // The recovery screen still needs to close even if remote sign-out is unavailable.
      }
    }
    auth.finishRecovery();
    changeMode(nextMode);
  };

  const validate = () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail && mode !== 'reset') return 'Vui lòng nhập email.';
    if (mode !== 'reset' && (!emailPattern.test(normalizedEmail) || normalizedEmail.length > 254)) {
      return 'Email không hợp lệ.';
    }
    if (mode === 'forgot') return null;
    if (!password) return 'Vui lòng nhập mật khẩu.';
    if ((mode === 'register' || mode === 'reset') && (password.length < 8 || password.length > 128)) {
      return 'Mật khẩu phải từ 8 đến 128 ký tự.';
    }
    if ((mode === 'register' || mode === 'reset') && password !== confirmPassword) {
      return 'Mật khẩu nhập lại chưa khớp.';
    }
    if (mode === 'register' && (name.trim().length < 2 || name.trim().length > 50)) {
      return 'Tên hiển thị phải từ 2 đến 50 ký tự.';
    }
    if (mode === 'reset' && (!auth.session || auth.linkError)) {
      return 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.';
    }
    return null;
  };

  const submit = async () => {
    if (busy || auth.configurationError) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'login') {
        await auth.signIn(email, password);
      } else if (mode === 'register') {
        const result = await auth.signUp(name, email, password);
        if (result === 'confirmation-required') {
          setAwaitingConfirmation(true);
          setNotice('Tài khoản đã được tạo. Hãy kiểm tra email để xác minh trước khi đăng nhập.');
        }
      } else if (mode === 'forgot') {
        await auth.requestPasswordReset(email);
        setNotice('Nếu email tồn tại, bạn sẽ nhận được liên kết đặt lại mật khẩu trong ít phút.');
      } else {
        await auth.resetPassword(password);
        auth.finishRecovery();
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể xác thực tài khoản.';
      if (/xác minh email|email chưa được xác minh/i.test(message)) {
        setAwaitingConfirmation(true);
        setNotice(message);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmation = async () => {
    if (!email.trim() || resending) return;
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      await auth.resendConfirmation(email);
      setNotice('Đã gửi lại email xác minh. Hãy kiểm tra hộp thư và thư rác.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa thể gửi lại email xác minh.');
    } finally {
      setResending(false);
    }
  };

  const content = contentByMode[mode];
  const submitLabel = mode === 'login'
    ? 'Đăng nhập'
    : mode === 'register'
      ? 'Tạo tài khoản'
      : mode === 'forgot'
        ? 'Gửi liên kết đặt lại'
        : 'Lưu mật khẩu mới';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xl,
          backgroundColor: colors.background,
        }}>
        <View style={{ width: '100%', maxWidth: 520, gap: spacing.lg }}>
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <FitsyMark size={64} />
            <View style={{ alignItems: 'center', gap: spacing.xs }}>
              <FitsyWordmark size={32} />
              <AppText variant="subhead" style={{ textAlign: 'center' }}>
                Phòng thử đồ AI trong túi của bạn
              </AppText>
            </View>
          </View>

          <View style={{
            gap: spacing.md,
            padding: spacing.lg,
            borderWidth: 1,
            borderColor: colors.separator,
            borderRadius: radius.xl,
            borderCurve: 'continuous',
            backgroundColor: colors.surface,
            boxShadow: shadows.raised,
          }}>
            {(mode === 'login' || mode === 'register') && (
              <View style={{
                flexDirection: 'row',
                padding: spacing.xs,
                borderRadius: radius.full,
                backgroundColor: colors.groupedBackground,
              }}>
                {(['login', 'register'] as const).map((item) => {
                  const selected = mode === item;
                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => changeMode(item)}
                      style={({ pressed }) => ({
                        flex: 1,
                        alignItems: 'center',
                        paddingVertical: 11,
                        borderRadius: radius.full,
                        backgroundColor: selected ? colors.surface : 'transparent',
                        opacity: pressed ? 0.72 : 1,
                      })}>
                      <AppText
                        variant="subhead"
                        style={{ fontWeight: selected ? '700' : '500', color: colors.label }}>
                        {item === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {(mode === 'forgot' || mode === 'reset') && (
              <Pressable
                accessibilityRole="button"
                onPress={() => void leaveRecovery('login')}
                style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}>
                <AppText variant="subhead" style={{ color: colors.label, fontWeight: '700' }}>
                  ← Quay lại đăng nhập
                </AppText>
              </Pressable>
            )}

            <View style={{ gap: spacing.xs }}>
              <AppText variant="caption" style={{ color: colors.success, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 }}>
                {content.eyebrow}
              </AppText>
              <AppText variant="title">{content.title}</AppText>
              <AppText variant="subhead">{content.description}</AppText>
            </View>

            {mode === 'register' && (
              <Field
                label="Tên hiển thị"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                placeholder="Tên của bạn"
                maxLength={50}
              />
            )}

            {mode !== 'reset' && (
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                placeholder="email@example.com"
                maxLength={254}
              />
            )}

            {mode !== 'forgot' && (
              <PasswordField
                label={mode === 'reset' ? 'Mật khẩu mới' : 'Mật khẩu'}
                value={password}
                onChangeText={setPassword}
                visible={showPassword}
                onToggleVisible={() => setShowPassword((current) => !current)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            )}

            {mode === 'login' && (
              <Pressable
                accessibilityRole="button"
                onPress={() => void leaveRecovery('forgot')}
                style={({ pressed }) => ({ alignSelf: 'flex-end', opacity: pressed ? 0.6 : 1 })}>
                <AppText variant="subhead" style={{ color: colors.success, fontWeight: '700' }}>
                  Quên mật khẩu?
                </AppText>
              </Pressable>
            )}

            {(mode === 'register' || mode === 'reset') && (
              <PasswordField
                label="Nhập lại mật khẩu"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                visible={showPassword}
                onToggleVisible={() => setShowPassword((current) => !current)}
                autoComplete="new-password"
              />
            )}

            {visibleError && <MessageBox tone="error" message={visibleError} />}
            {notice && <MessageBox tone="success" message={notice} />}

            <AppButton
              title={submitLabel}
              loading={busy}
              disabled={Boolean(auth.configurationError)}
              onPress={() => void submit()}
            />

            {awaitingConfirmation && (
              <AppButton
                title="Gửi lại email xác minh"
                loading={resending}
                variant="secondary"
                onPress={() => void resendConfirmation()}
              />
            )}

            {mode === 'reset' && (!auth.session || auth.linkError) && (
              <Pressable
                accessibilityRole="button"
                onPress={() => changeMode('forgot')}
                style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.6 : 1 })}>
                <AppText variant="subhead" style={{ color: colors.success, fontWeight: '700' }}>
                  Yêu cầu liên kết mới
                </AppText>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
          minHeight: 52,
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: colors.separator,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          color: colors.label,
          backgroundColor: colors.surface,
          fontSize: 16,
        }}
      />
    </View>
  );
}

function PasswordField({
  label,
  visible,
  onToggleVisible,
  ...props
}: ComponentProps<typeof TextInput> & {
  label: string;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="caption" style={{ color: colors.label, fontWeight: '700' }}>{label}</AppText>
      <View style={{
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.separator,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.surface,
      }}>
        <TextInput
          {...props}
          maxLength={128}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Tối thiểu 8 ký tự"
          placeholderTextColor={colors.secondaryLabel}
          style={{ flex: 1, minHeight: 50, paddingHorizontal: spacing.md, color: colors.label, fontSize: 16 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          onPress={onToggleVisible}
          hitSlop={8}
          style={({ pressed }) => ({ paddingHorizontal: spacing.md, opacity: pressed ? 0.55 : 1 })}>
          <AppText variant="caption" style={{ color: colors.success, fontWeight: '800' }}>
            {visible ? 'Ẩn' : 'Hiện'}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function MessageBox({ tone, message }: { tone: 'error' | 'success'; message: string }) {
  const isError = tone === 'error';
  return (
    <View
      accessibilityRole="alert"
      style={{
        padding: spacing.md,
        borderWidth: 1,
        borderColor: isError ? '#F2CACA' : '#C8E6D3',
        borderRadius: radius.md,
        backgroundColor: isError ? colors.destructiveBackground : colors.successBackground,
      }}>
      <AppText
        variant="subhead"
        style={{ color: isError ? colors.destructive : colors.success, fontWeight: '600' }}>
        {message}
      </AppText>
    </View>
  );
}
