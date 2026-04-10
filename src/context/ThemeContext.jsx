// src/context/ThemeContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// useTheme 훅을 전역 Context로 제공.
// App.jsx 최상단에서 <ThemeProvider>로 감싸면
// 하위 어디서든 useThemeContext()로 테마 상태 접근 가능.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext } from 'react';
import { useTheme } from '../hooks/useTheme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const themeValue = useTheme();
  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within <ThemeProvider>');
  return ctx;
}
