import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FEATURED_PROJECTS, type ProjectItem } from '../data/portfolioData';
import { filterProjectsByCategory } from '../utils/portfolioHelpers';
import { ContactFooter } from '../components/ContactFooter';
import { ResilientImage } from '../components/ResilientImage';

interface WorkPageProps {
  onSelectProject: (project: ProjectItem) => void;
  onOpenContact: () => void;
}

const CATEGORIES = ['All', ...Array.from(new Set(FEATURED_PROJECTS.map((p) => p.category)))];

export function WorkPage({ onSelectProject, onOpenContact }: WorkPageProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const navigate = useNavigate();
  const visibleProjects = filterProjectsByCategory(FEATURED_PROJECTS, activeCategory);

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="bg-bg text-text-primary min-h-screen pt-28 md:pt-36"
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 pb-16 md:pb-24">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs text-muted hover:text-text-primary uppercase tracking-[0.25em] mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to home</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-14">
          <div>
            <p className="text-xs text-muted uppercase tracking-[0.3em] mb-3">Archive</p>
            <h1 className="text-4xl md:text-6xl font-normal tracking-tight text-text-primary">
              Selected <span className="font-display italic">works</span>
            </h1>
          </div>

          <div
            role="tablist"
            aria-label="Filter projects by discipline"
            className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-full bg-surface border border-stroke self-start md:self-auto"
          >
            {CATEGORIES.map((category) => {
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3.5 py-1.5 rounded-full text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-text-primary text-bg font-medium'
                      : 'text-muted hover:text-text-primary'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => onSelectProject(project)}
              className="group bg-surface border border-stroke rounded-3xl overflow-hidden text-left hover:border-[#89AACC]/50 transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC]"
            >
              <div className="aspect-[16/10] w-full overflow-hidden relative bg-bg">
                <ResilientImage
                  src={project.image}
                  alt={project.title}
                  fallbackTitle={project.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
                    backgroundSize: '4px 4px',
                  }}
                />
              </div>

              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-muted mb-2">
                  <span>{project.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{project.client}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{project.year}</span>
                </div>

                <h2 className="text-2xl font-display italic text-text-primary mb-2">
                  {project.title}
                </h2>
                <p className="text-sm text-muted leading-relaxed">{project.summary}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <ContactFooter onOpenContact={onOpenContact} />
    </motion.main>
  );
}
