import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

const PROVIDER_IDS = {
  google: 'google',
  kakao: 'kakao',
  naver: 'custom:naver',
};

function getProfileFromUser(user) {
  const metadata = user?.user_metadata ?? {};
  return {
    id: user.id,
    display_name:
      metadata.full_name ??
      metadata.name ??
      metadata.nickname ??
      metadata.preferred_username ??
      null,
    avatar_url: metadata.avatar_url ?? metadata.picture ?? null,
    provider: user.app_metadata?.provider ?? user.identities?.[0]?.provider ?? null,
    updated_at: new Date().toISOString(),
  };
}

async function upsertProfile(user) {
  if (!supabase || !user) return { error: null };

  return supabase
    .from('profiles')
    .upsert(getProfileFromUser(user), { onConflict: 'id' });
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [profileStatus, setProfileStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setError(null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfileStatus('idle');
      return;
    }

    let cancelled = false;
    setProfileStatus('syncing');

    upsertProfile(session.user).then(({ error: profileError }) => {
      if (cancelled) return;
      if (profileError) {
        setProfileStatus('error');
        setError(profileError.message);
        return;
      }
      setProfileStatus('ready');
    });

    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const signInWithProvider = useCallback(async (provider) => {
    setError(null);

    if (!supabase) {
      setError('Supabase 환경변수가 설정되지 않았습니다.');
      return;
    }

    const providerId = PROVIDER_IDS[provider] ?? provider;
    const options = {
      redirectTo: window.location.origin,
    };

    if (provider === 'google') {
      options.scopes = 'openid email profile';
    }

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: providerId,
      options,
    });

    if (signInError) setError(signInError.message);
  }, []);

  const signOut = useCallback(async () => {
    setError(null);

    if (!supabase) return;

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
  }, []);

  const value = useMemo(() => ({
    configured: isSupabaseConfigured,
    session,
    user: session?.user ?? null,
    loading,
    profileStatus,
    error,
    signInWithProvider,
    signOut,
  }), [session, loading, profileStatus, error, signInWithProvider, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
