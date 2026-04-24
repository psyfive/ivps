import { PracticeProvider } from './context/PracticeContext';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';

export default function App() {
  return (
    <AuthProvider>
      <PracticeProvider>
        <AppShell />
      </PracticeProvider>
    </AuthProvider>
  );
}
