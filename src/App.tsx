import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  EXPLORATIONS,
  type ExplorationItem,
  type JournalEntry,
  type ProjectItem,
} from './data/portfolioData';
import { PathForgeProvider } from './context/PathForgeContext';
import { getAdjacentExplorationIndex, shouldSkipLoader } from './utils/portfolioHelpers';
import { ContactModal } from './components/ContactModal';
import { JournalModal } from './components/JournalModal';
import { LightboxModal } from './components/LightboxModal';
import { LoadingScreen } from './components/LoadingScreen';
import { Navbar } from './components/Navbar';
import { ToastBanner } from './components/pathforge/NotificationCenter';
import { ProjectModal } from './components/ProjectModal';
import { AuthPage } from './pages/AuthPage';
import { CoursesCataloguePage } from './pages/CoursesCataloguePage';
import { IndexPage } from './pages/Index';
import { InstructorDashboardPage } from './pages/InstructorDashboardPage';
import { JournalPage } from './pages/JournalPage';
import { LearnerDashboardPage } from './pages/LearnerDashboardPage';
import { ResumePage } from './pages/ResumePage';
import { WorkPage } from './pages/WorkPage';

function AppShell() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return !shouldSkipLoader(window.location.search, reduced);
  });

  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [selectedExploration, setSelectedExploration] = useState<ExplorationItem | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  const handleStepExploration = (direction: 1 | -1) => {
    if (!selectedExploration) return;
    const nextIdx = getAdjacentExplorationIndex(
      EXPLORATIONS,
      selectedExploration.id,
      direction
    );
    if (nextIdx >= 0) {
      setSelectedExploration(EXPLORATIONS[nextIdx]);
    }
  };

  return (
    <div className="bg-bg text-text-primary min-h-screen">
      <AnimatePresence>
        {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      </AnimatePresence>

      <Navbar onOpenContact={() => setContactOpen(true)} />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <IndexPage
                ready={!isLoading}
                onSelectProject={setSelectedProject}
                onSelectJournal={setSelectedJournal}
                onSelectExploration={setSelectedExploration}
                onOpenContact={() => setContactOpen(true)}
              />
            }
          />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/courses" element={<CoursesCataloguePage />} />
          <Route path="/learner" element={<LearnerDashboardPage />} />
          <Route path="/learner/courses/:courseId" element={<LearnerDashboardPage />} />
          <Route path="/instructor" element={<InstructorDashboardPage />} />
          <Route path="/instructor/courses/:courseId" element={<InstructorDashboardPage />} />
          <Route
            path="/instructor/courses/:courseId/history"
            element={<InstructorDashboardPage defaultTab="history" />}
          />
          <Route
            path="/work"
            element={
              <WorkPage
                onSelectProject={setSelectedProject}
                onOpenContact={() => setContactOpen(true)}
              />
            }
          />
          <Route
            path="/resume"
            element={<ResumePage onOpenContact={() => setContactOpen(true)} />}
          />
          <Route
            path="/journal"
            element={
              <JournalPage
                onSelectEntry={setSelectedJournal}
                onOpenContact={() => setContactOpen(true)}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>

      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onOpenContact={() => setContactOpen(true)}
      />

      <JournalModal
        entry={selectedJournal}
        onClose={() => setSelectedJournal(null)}
      />

      <LightboxModal
        item={selectedExploration}
        onClose={() => setSelectedExploration(null)}
        onPrev={() => handleStepExploration(-1)}
        onNext={() => handleStepExploration(1)}
      />

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />

      <ToastBanner />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PathForgeProvider>
        <AppShell />
      </PathForgeProvider>
    </BrowserRouter>
  );
}
