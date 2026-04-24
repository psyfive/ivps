import { useAuth } from '../../context/AuthContext';

const PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'kakao', label: 'Kakao' },
  { id: 'naver', label: 'Naver' },
];

function getUserLabel(user) {
  if (!user) return '';
  const metadata = user.user_metadata ?? {};
  return metadata.full_name ?? metadata.name ?? metadata.nickname ?? user.email ?? '로그인 사용자';
}

export function AuthPanel() {
  const {
    configured,
    user,
    loading,
    profileStatus,
    error,
    signInWithProvider,
    signOut,
  } = useAuth();

  if (loading) {
    return (
      <div className="mx-3 mb-3 rounded-xl border border-[var(--ivps-border)] bg-[var(--ivps-surface2)] px-3 py-2 text-[11px] text-[var(--ivps-text4)]">
        로그인 상태 확인 중…
      </div>
    );
  }

  if (user) {
    return (
      <div className="mx-3 mb-3 rounded-xl border border-[var(--ivps-border)] bg-[var(--ivps-surface2)] px-3 py-2">
        <div className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--ivps-text4)]">
          Cloud Sync
        </div>
        <div className="mt-1 truncate text-[12px] font-semibold text-[var(--ivps-text1)]">
          {getUserLabel(user)}
        </div>
        <div className="mt-1 text-[10px] text-[var(--ivps-text4)]">
          {profileStatus === 'ready' ? '프로필 연결 완료' : '프로필 동기화 준비 중'}
        </div>
        <button
          type="button"
          onClick={signOut}
          className="mt-2 w-full rounded-lg border border-[var(--ivps-border2)] px-2 py-1.5 text-[11px] font-semibold text-[var(--ivps-text3)] transition-colors hover:bg-[var(--ivps-surface)] hover:text-[var(--ivps-text1)]"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-3 rounded-xl border border-[var(--ivps-border)] bg-[var(--ivps-surface2)] px-3 py-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--ivps-text4)]">
        Account
      </div>
      <div className="mt-1 text-[12px] font-semibold text-[var(--ivps-text1)]">
        연습 기록 저장
      </div>
      <p className="mt-1 text-[10.5px] leading-4 text-[var(--ivps-text4)]">
        소셜 로그인으로 XP, 악보 기록, 히트맵을 계정에 연결합니다.
      </p>

      <div className="mt-2 grid grid-cols-1 gap-1.5">
        {PROVIDERS.map(provider => (
          <button
            key={provider.id}
            type="button"
            disabled={!configured}
            onClick={() => signInWithProvider(provider.id)}
            className="rounded-lg border border-[var(--ivps-border2)] px-2 py-1.5 text-[11px] font-semibold text-[var(--ivps-text2)] transition-colors hover:border-[var(--ivps-gold-border)] hover:bg-[var(--ivps-surface)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {provider.label}로 계속하기
          </button>
        ))}
      </div>

      {!configured && (
        <div className="mt-2 text-[10px] leading-4 text-[var(--ivps-text4)]">
          `.env.local`에 Supabase URL과 anon key를 설정하면 활성화됩니다.
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[10px] leading-4 text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
