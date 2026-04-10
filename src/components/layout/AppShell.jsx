import { usePractice } from '../../context/PracticeContext';
import { LeftNav } from './LeftNav'; // 같은 폴더(layout)에 있음
import { RightUtilPanel } from './RightUtilPanel'; // 같은 폴더(layout)에 있음
import { DashboardView } from '../dashboard/DashboardView'; // dashboard 폴더 안에 있음
import { LibraryView } from '../library/LibraryView'; // library 폴더 안에 있음
import { CockpitView } from '../cockpit/CockpitView'; // cockpit 폴더 안에 있음
import { SkillDetailModal } from '../library/SkillDetailModal'; // library 폴더 안에 있음

export function AppShell() {
  const { screen, selectedSkill, skill } = usePractice();

  return (
    // bg-[var(--ivps-bg)] 대신 ivps-bg를 사용하여 테마에 따라 배경색이 변하게 합니다.
    <div className="flex h-screen w-screen overflow-hidden ivps-bg text-ivps-text">
      {/* 좌측 네비게이션 사이드바 */}
      <LeftNav />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {screen === 'dashboard' && <DashboardView />}
        {screen === 'library' && <LibraryView />}
        {screen === 'cockpit' && <CockpitView />}
      </main>

      {/* 우측 유틸리티 패널 (Cockpit 화면에서만 표시) */}
      {screen === 'cockpit' && <RightUtilPanel />}

      {/* 스킬 상세 모달 (라이브러리에서 카드 클릭 시) */}
      {selectedSkill && (
        <SkillDetailModal 
          skill={selectedSkill}
          onClose={skill.closeSkillModal}
        />
      )}
      
      {/* 참고: ThemeToggle은 이미 App.jsx에 넣었으므로 여기에 중복으로 넣지 않아도 됩니다. */}
    </div>
  );
}