import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ProjectItem } from '../data/portfolioData';
import { ResilientImage } from './ResilientImage';

interface ProjectModalProps {
  project: ProjectItem | null;
  onClose: () => void;
  onOpenContact: () => void;
}

export function ProjectModal({ project, onClose, onOpenContact }: ProjectModalProps) {
  useEffect(() => {
    if (!project) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [project, onClose]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${project.title} case study`}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl bg-surface border border-stroke rounded-3xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close case study"
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-bg/80 backdrop-blur-md border border-white/15 text-text-primary hover:border-[#89AACC] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>

            <div className="overflow-y-auto">
              <div className="aspect-[16/9] w-full bg-bg overflow-hidden relative">
                <ResilientImage
                  src={project.image}
                  alt={project.title}
                  fallbackTitle={project.title}
                  className="w-full h-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"
                />
              </div>

              <div className="p-6 sm:p-10">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted uppercase tracking-[0.2em] mb-3">
                  <span>{project.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{project.client}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{project.year}</span>
                </div>

                <h3 className="text-3xl sm:text-5xl font-display italic text-text-primary mb-4">
                  {project.title}
                </h3>

                <p className="text-sm sm:text-base text-muted leading-relaxed mb-8">
                  {project.summary}
                </p>

                <div className="grid grid-cols-3 gap-4 border-y border-stroke py-5 mb-8">
                  {project.metrics.map((metric) => (
                    <div key={metric.label}>
                      <div className="text-xl sm:text-2xl font-display italic text-text-primary tabular-nums">
                        {metric.value}
                      </div>
                      <div className="text-xs text-muted mt-1">{metric.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h4 className="text-xs text-muted uppercase tracking-[0.2em] mb-2">
                      Challenge
                    </h4>
                    <p className="text-sm text-text-primary/85 leading-relaxed">
                      {project.challenge}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted uppercase tracking-[0.2em] mb-2">
                      Approach
                    </h4>
                    <p className="text-sm text-text-primary/85 leading-relaxed">
                      {project.solution}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-stroke">
                  <div className="text-xs text-muted">
                    <span className="uppercase tracking-[0.2em] mr-2">Deliverables:</span>
                    <span className="text-text-primary/80">
                      {project.deliverables.join(' · ')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenContact();
                    }}
                    className="px-5 py-2.5 rounded-full bg-text-primary text-bg hover:opacity-90 text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-opacity"
                  >
                    Inquire about similar work
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
