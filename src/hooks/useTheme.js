// src/hooks/useTheme.js
// ─────────────────────────────────────────────────────────────────────────────
// 라이트 / 소프트-다크 모드 전환 훅.
//
// 동작:
//   1. localStorage('ivps-theme') 에서 초기값 복원
//   2. 없으면 OS 시스템 설정(prefers-color-scheme) 따라감
//   3. <html> 태그에 'dark' class 토글 → themes.css 변수 자동 교체
//   4. 변경 시 localStorage 에 저장
//
// 사용:
//   const { theme, toggleTheme, isDark } = useTheme();
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ivps-theme';
const DARK_CLASS  = 'dark';

function getInitialTheme() {
  // SSR 가드
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;

  // 시스템 설정 따라감
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add(DARK_CLASS);
  } else {
    html.classList.remove(DARK_CLASS);
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const initial = getInitialTheme();
    // 초기 렌더 전에 즉시 적용 (FOUC 방지)
    applyTheme(initial);
    return initial;
  });

  const isDark = theme === 'dark';

  // theme 상태가 바뀔 때마다 DOM + localStorage 동기화
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setLight = useCallback(() => setTheme('light'), []);
  const setDark  = useCallback(() => setTheme('dark'),  []);

  return { theme, isDark, toggleTheme, setLight, setDark };
}
