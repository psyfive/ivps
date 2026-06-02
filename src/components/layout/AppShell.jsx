import { useState, useEffect } from 'react';
import { usePractice } from '../../context/PracticeContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { LeftNav } from './LeftNav';
import { LeftNavDrawer } from './LeftNavDrawer';
import { RightUtilPanel } from './RightUtilPanel';
import { RightUtilDrawer } from './RightUtilDrawer';
import { MobileTopBar } from './MobileTopBar';
import { DashboardView } from '../dashboard/DashboardView';
import { LibraryView } from '../library/LibraryView';
import { CockpitView } from '../cockpit/CockpitView';
import { PracticeGuide } from '../guide/PracticeGuide';
import { SkillDetailModal } from '../library/SkillDetailModal';

export function AppShell() {
  const { screen, selectedSkill, skill, practiceFullscreen, phase } = usePractice();
  const { isTabletOnly } = useBreakpoint();
  const isLastAfter = phase === 'last-after';
  const [navOpen, setNavOpen] = useState(false);
  const [utilOpen, setUtilOpen] = useState(false);

  // 화면 전환 시 드로어 자동 닫기
  useEffect(() => {
    setNavOpen(false);
    setUtilOpen(false);
  }, [screen]);

  const showNav = !practiceFullscreen && !isLastAfter;
  const showUtil = screen === 'cockpit' && !practiceFullscreen && !isLastAfter;

  const mainContent = (
    <>
      {screen === 'dashboard' && <DashboardView />}
      {screen === 'library' && <LibraryView />}
      {screen === 'cockpit' && <CockpitView />}
      {screen === 'guide' && <PracticeGuide />}
    </>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden ivps-bg text-ivps-text">

      {isTabletOnly ? (
        /* ── 태블릿 portrait (768–1023px): 드로어 레이아웃 ── */
        <>
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {showNav && (
              <MobileTopBar
                onNavOpen={() => setNavOpen(true)}
                onUtilOpen={() => setUtilOpen(true)}
              />
            )}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
              {mainContent}
            </main>
          </div>

          {showNav && (
            <LeftNavDrawer open={navOpen} onClose={() => setNavOpen(false)} />
          )}

          {/* RightUtilDrawer는 항상 마운트 (오디오 컨텍스트 유지) — showUtil 조건으로 DOM 포함 여부 결정 */}
          {showUtil && (
            <RightUtilDrawer open={utilOpen} onClose={() => setUtilOpen(false)} />
          )}
        </>
      ) : (
        /* ── 데스크탑 / tabletLg (1024px+): 인라인 사이드바 레이아웃 ── */
        <>
          {showNav && <LeftNav />}

          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            {mainContent}
          </main>

          {showUtil && <RightUtilPanel />}
        </>
      )}

      {/* 스킬 상세 모달 */}
      {selectedSkill && screen !== 'library' && (
        <SkillDetailModal
          skill={selectedSkill}
          onClose={skill.closeSkillModal}
        />
      )}
    </div>
  );
}
