import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, type PropsWithChildren, use, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { authConfigurationError, supabase } from '@/services/supabase';

type AuthContextValue = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  configurationError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<'signed-in' | 'confirmation-required'>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(Boolean(authConfigurationError));
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (authConfigurationError) {
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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
      const code = parsed.queryParams?.code;
      if (typeof code === 'string') await supabase.auth.exchangeCodeForSession(code);
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
    configurationError: authConfigurationError,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw new Error(error.message === 'Email not confirmed' ? 'Email chưa được xác minh.' : 'Email hoặc mật khẩu không đúng.');
    },
    signUp: async (name, email, password) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { display_name: name.trim() }, emailRedirectTo: 'tryoh://auth-callback' },
      });
      if (error) throw new Error(error.message);
      return data.session ? 'signed-in' : 'confirmation-required';
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [ready, session]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth phải được dùng bên trong AuthProvider.');
  return context;
}
