import { PracticeProvider } from './context/PracticeContext';
import { AppShell } from './components/layout/AppShell';
import { ThemeToggle } from './components/layout/ThemeToggle'; // 1. 버튼 부품을 가져옵니다.

export default function App() {
  return (
    <PracticeProvider>
      <AppShell />
      {/* 2. 화면 어디서든 보일 수 있게 여기에 버튼을 놓습니다. 
          이 버튼은 '고정 위치(fixed)'라 코드 순서가 아래여도 화면 좌측 하단에 잘 뜰 거예요. */}
      <ThemeToggle /> 
    </PracticeProvider>
  );
}