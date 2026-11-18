import { motion } from 'framer-motion';
import { GitBranch, RefreshCw, Route } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePathForge } from '../../context/PathForgeContext';

const CAPABILITIES = [
  {
    number: '01',
    title: 'DAG Prerequisite Engine',
    description:
      'Cycle-free concept graphs that block circular dependencies and show exact missing prerequisites.',
    icon: GitBranch,
    path: '/instructor',
    cta: 'Open Graph Editor',
  },
  {
    number: '02',
    title: 'Shortest Path to Mastery',
    description:
      'Dynamic topological routing that skips mastered concepts and estimates total completion time.',
    icon: Route,
    path: '/learner',
    cta: 'Launch Learner Path',
  },
  {
    number: '03',
    title: 'Zero-Loss Live Restructuring',
    description:
      'Split concepts or rewire prerequisites mid-semester while preserving student mastery and notifying affected learners.',
    icon: RefreshCw,
    path: '/instructor',
    cta: 'Inspect Change Engine',
  },
] as const;

const STATS_ITEMS = [
  '14 Seeded CS Concepts',
  '80% Mastery Threshold',
  'Cycle-Safe DAG',
  'Live Path Recalculation',
] as const;

export function PathForgeCapabilitiesSection() {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = usePathForge();
  const loggedIn = isAuthenticated && currentUser !== null;

  return (
    <section
      id="capabilities"
      aria-label="Core platform capabilities"
      className="bg-bg py-20 md:py-28 border-t border-stroke"
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 space-y-14">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-xs text-[#89AACC] uppercase tracking-[0.28em] mb-3">
              Core Architecture
            </p>
            <h2
              className="text-4xl md:text-6xl font-display italic text-text-primary leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Built for prerequisite-aware mastery.
            </h2>
          </div>
          <p className="text-sm text-muted max-w-md leading-relaxed">
            Every concept unlock, shortest-route calculation, and mid-semester split runs on a
            deterministic directed acyclic graph.
          </p>
        </div>

        {/* 3 Dark-Themed Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CAPABILITIES.map((cap, index) => {
            const Icon = cap.icon;
            return (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.08,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                viewport={{ once: true, margin: '-60px' }}
                className="group relative rounded-3xl bg-surface border border-stroke hover:border-[#89AACC]/60 p-7 flex flex-col justify-between transition-colors duration-300"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <span className="text-xs font-mono text-muted tracking-widest">
                      {cap.number}
                    </span>
                    <span className="w-9 h-9 rounded-full bg-bg border border-stroke flex items-center justify-center text-[#89AACC] group-hover:border-[#89AACC]/60 transition-colors">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </div>

                  <h3 className="text-2xl font-display italic text-text-primary mb-3">
                    {cap.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">{cap.description}</p>
                </div>

                <div className="pt-6 mt-6 border-t border-stroke/80">
                  <button
                    type="button"
                    onClick={() => navigate(loggedIn ? cap.path : '/auth')}
                    className="text-xs text-[#89AACC] hover:text-text-primary transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>{cap.cta}</span>
                    <span aria-hidden="true">↗</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Live Stats Strip */}
        <div
          role="region"
          aria-label="Platform specifications"
          className="rounded-3xl bg-surface/60 border border-stroke px-6 py-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-text-primary/90 tracking-wide"
        >
          {STATS_ITEMS.map((item, idx) => (
            <div key={item} className="inline-flex items-center gap-4">
              <span className="font-medium">{item}</span>
              {idx < STATS_ITEMS.length - 1 && (
                <span aria-hidden="true" className="text-[#89AACC]">
                  •
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
