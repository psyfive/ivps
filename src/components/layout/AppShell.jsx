// src/components/layout/AppShell.jsx
import { usePractice } from '../../context/PracticeContext';
import { LeftNav } from './LeftNav';
import { RightUtilPanel } from './RightUtilPanel';
import { DashboardView } from '../dashboard/DashboardView';
import { LibraryView } from '../library/LibraryView';
import { CockpitView } from '../cockpit/CockpitView';
import { SkillDetailModal } from '../library/SkillDetailModal';

export function AppShell() {
  const { screen, selectedSkill, skill } = usePractice();

  return (
    // v3과 동일한 3단 다크 레이아웃
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d1117] text-[#e8e2d6]">

      {/* ─ 좌측 네비게이션 사이드바 ─────────────────────────────── */}
      <LeftNav />

      {/* ─ 메인 콘텐츠 영역 ─────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {screen === 'dashboard' && <DashboardView />}
        {screen === 'library'   && <LibraryView />}
        {screen === 'cockpit'   && <CockpitView />}
      </main>

      {/* ─ 우측 유틸리티 패널 (Cockpit 화면에서만 표시) ─────────── */}
      {screen === 'cockpit' && <RightUtilPanel />}

      {/* ─ 스킬 상세 모달 (라이브러리에서 카드 클릭 시) ─────────── */}
      {selectedSkill && (
        <SkillDetailModal
          skill={selectedSkill}
          onClose={skill.closeSkillModal}
        />
      )}
    </div>
  );
}