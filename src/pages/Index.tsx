import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePathForge } from '../context/PathForgeContext';
import type { ExplorationItem, JournalEntry, ProjectItem } from '../data/portfolioData';
import { ContactFooter } from '../components/ContactFooter';
import { HeroSection } from '../components/HeroSection';
import { PathForgeCapabilitiesSection } from '../components/pathforge/PathForgeCapabilitiesSection';
import { PathForgeLandingSection } from '../components/pathforge/PathForgeLandingSection';

interface IndexPageProps {
  ready: boolean;
  onSelectProject?: (project: ProjectItem) => void;
  onSelectJournal?: (entry: JournalEntry) => void;
  onSelectExploration?: (item: ExplorationItem) => void;
  onOpenContact: () => void;
}

export function IndexPage({ ready, onOpenContact }: IndexPageProps) {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = usePathForge();

  const loggedIn = isAuthenticated && currentUser !== null;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="bg-bg text-text-primary min-h-screen"
    >
      <HeroSection
        ready={ready}
        onSeeWorks={() => navigate(loggedIn ? '/learner' : '/auth')}
        onReachOut={() => navigate(loggedIn ? '/instructor' : '/auth')}
      />

      <PathForgeCapabilitiesSection />

      <PathForgeLandingSection />

      <ContactFooter onOpenContact={onOpenContact} />
    </motion.main>
  );
}
