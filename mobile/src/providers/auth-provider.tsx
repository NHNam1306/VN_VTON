import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, type PropsWithChildren, use, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { authConfigurationError, getSessionWithTimeout, supabase } from '@/services/supabase';

type AuthContextValue = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  recoveryMode: boolean;
  linkError: string | null;
  configurationError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<'signed-in' | 'confirmation-required'>;
  resendConfirmation: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  finishRecovery: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(Boolean(authConfigurationError));
  const [session, setSession] = useState<Session | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (authConfigurationError) {
      return;
    }
    let active = true;
    void getSessionWithTimeout()
      .then(({ data, error }) => {
        if (!active || error) return;
        setSession(data.session);
      })
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Unable to restore auth session:', error);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      if (event === 'SIGNED_OUT') setRecoveryMode(false);
      setSession(nextSession);
      setReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authConfigurationError) return;
    const consume = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const path = (parsed.path ?? '').replace(/^\/+/, '');
      const type = parsed.queryParams?.type;
      const isRecovery = path === 'reset-password' || type === 'recovery';
      if (isRecovery) setRecoveryMode(true);
      setLinkError(null);

      const code = parsed.queryParams?.code;
      if (typeof code === 'string') {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) setLinkError('Liên kết xác thực không hợp lệ hoặc đã hết hạn.');
        return;
      }

      const hash = url.includes('#') ? new URLSearchParams(url.split('#')[1]) : null;
      const accessToken = hash?.get('access_token');
      const refreshToken = hash?.get('refresh_token');
      if (hash?.get('type') === 'recovery') setRecoveryMode(true);
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) setLinkError('Liên kết xác thực không hợp lệ hoặc đã hết hạn.');
      } else if (isRecovery) {
        setLinkError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      }
    };
    void Linking.getInitialURL().then(consume);
    const linkSubscription = Linking.addEventListener('url', ({ url }) => { void consume(url); });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      linkSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    session,
    user: session?.user ?? null,
    recoveryMode,
    linkError,
    configurationError: authConfigurationError,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) {
        const unconfirmed = error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message);
        if (unconfirmed) {
          throw new Error('Email chưa được xác minh. Hãy kiểm tra hộp thư hoặc gửi lại email xác minh.');
        }
        const invalidCredentials =
          error.code === 'invalid_credentials'
          || /invalid login credentials|invalid credentials/i.test(error.message);
        if (invalidCredentials) {
          throw new Error('Email hoặc mật khẩu không đúng.');
        }
        const connectionError =
          error.status === 0
          || /fetch|network|timeout|connection/i.test(error.message);
        throw new Error(connectionError
          ? 'Không thể kết nối máy chủ. Hãy kiểm tra mạng hoặc cập nhật ứng dụng rồi thử lại.'
          : 'Chưa thể đăng nhập. Vui lòng thử lại sau.');
      }
    },
    signUp: async (name, email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { display_name: name.trim() },
          emailRedirectTo: Linking.createURL('auth-callback'),
        },
      });
      if (error) {
        throw new Error('Chưa thể tạo tài khoản. Hãy kiểm tra thông tin hoặc đăng nhập nếu bạn đã có tài khoản.');
      }
      return data.session ? 'signed-in' : 'confirmation-required';
    },
    resendConfirmation: async (email) => {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: Linking.createURL('auth-callback') },
      });
      if (error) {
        const rateLimited = error.status === 429 || /rate limit|too many/i.test(error.message);
        throw new Error(rateLimited
          ? 'Bạn vừa yêu cầu gửi email. Vui lòng đợi khoảng một phút rồi thử lại.'
          : 'Chưa thể gửi lại email xác minh. Vui lòng thử lại sau.');
      }
    },
    requestPasswordReset: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: Linking.createURL('reset-password'),
      });
      if (error) throw new Error('Chưa thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.');
    },
    resetPassword: async (password) => {
      if (!session) throw new Error('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error('Chưa thể cập nhật mật khẩu. Vui lòng yêu cầu liên kết mới.');
      setRecoveryMode(false);
      setLinkError(null);
    },
    finishRecovery: () => {
      setRecoveryMode(false);
      setLinkError(null);
    },
    signOut: async () => {
      // Thu hồi phiên trên máy chủ; mất mạng thì vẫn xoá phiên trên máy để người dùng luôn đăng xuất được.
      const { error } = await supabase.auth.signOut();
      if (error) await supabase.auth.signOut({ scope: 'local' });
    },
  }), [linkError, ready, recoveryMode, session]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth phải được dùng bên trong AuthProvider.');
  return context;
}
