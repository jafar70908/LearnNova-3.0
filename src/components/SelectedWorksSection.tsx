import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FEATURED_PROJECTS, type ProjectItem } from '../data/portfolioData';
import { ResilientImage } from './ResilientImage';

interface SelectedWorksSectionProps {
  onSelectProject: (project: ProjectItem) => void;
}

export function SelectedWorksSection({ onSelectProject }: SelectedWorksSectionProps) {
  const navigate = useNavigate();

  return (
    <section id="selected-works" className="bg-bg py-12 md:py-16">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '-100px' }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-14"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span aria-hidden="true" className="w-8 h-px bg-stroke" />
              <span className="text-xs text-muted uppercase tracking-[0.3em]">Selected Work</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-normal tracking-tight text-text-primary mb-3">
              Featured <span className="font-display italic">projects</span>
            </h2>

            <p className="text-sm md:text-base text-muted max-w-md">
              A selection of projects I&apos;ve worked on, from concept to launch.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              navigate('/work');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hidden md:inline-flex relative group items-center rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC] shrink-0"
          >
            <span
              aria-hidden="true"
              className="absolute -inset-[2px] rounded-full accent-gradient animate-gradient-shift opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
            />
            <span className="relative z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-stroke group-hover:border-transparent text-sm text-text-primary whitespace-nowrap shrink-0 transition-colors duration-300">
              <span>View all work</span>
              <ArrowRight
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
          {FEATURED_PROJECTS.map((project, index) => {
            const colSpan = project.span === 'wide' ? 'md:col-span-7' : 'md:col-span-5';
            const aspectClass = 'aspect-[4/3] md:aspect-auto md:h-[380px] lg:h-[420px]';

            return (
              <motion.button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project)}
                aria-label={`View ${project.title} case study`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.08,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                viewport={{ once: true, margin: '-80px' }}
                className={`${colSpan} ${aspectClass} relative group bg-surface border border-stroke rounded-3xl overflow-hidden text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC]`}
              >
                <ResilientImage
                  src={project.image}
                  alt={`${project.title} — ${project.client}`}
                  fallbackTitle={project.title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Halftone overlay */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
                    backgroundSize: '4px 4px',
                  }}
                />

                {/* Subtle bottom legibility scrim on mobile / default state */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none md:opacity-0 md:group-hover:opacity-0 transition-opacity duration-300"
                />
                <div className="absolute bottom-4 left-5 right-5 flex items-baseline justify-between gap-3 md:hidden pointer-events-none">
                  <span className="font-display italic text-xl text-text-primary">
                    {project.title}
                  </span>
                  <span className="text-xs text-muted tabular-nums">{project.year}</span>
                </div>

                {/* Hover overlay */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-bg/70 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-6"
                >
                  <div className="relative rounded-full p-[2px] accent-gradient animate-gradient-shift shadow-lg">
                    <div className="px-6 py-2.5 rounded-full bg-white text-[#0A0A0A] text-sm font-medium whitespace-nowrap">
                      View — <span className="font-display italic text-base">{project.title}</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center md:hidden">
          <button
            type="button"
            onClick={() => {
              navigate('/work');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-stroke text-sm text-text-primary whitespace-nowrap"
          >
            <span>View all work</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
