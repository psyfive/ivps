// src/context/PracticeContext.jsx
import { createContext, useContext } from 'react';
import { usePracticeSession } from '../hooks/usePracticeSession';

const PracticeContext = createContext(null);

export function PracticeProvider({ children }) {
  const session = usePracticeSession();
  return (
    <PracticeContext.Provider value={session}>
      {children}
    </PracticeContext.Provider>
  );
}

export function usePractice() {
  const ctx = useContext(PracticeContext);
  if (!ctx) throw new Error('usePractice must be used within PracticeProvider');
  return ctx;
}