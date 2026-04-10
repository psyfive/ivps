// src/App.jsx
import { PracticeProvider } from './context/PracticeContext';
import { AppShell } from './components/layout/AppShell';

export default function App() {
  return (
    <PracticeProvider>
      <AppShell />
    </PracticeProvider>
  );
}