import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JOURNAL_ENTRIES, type JournalEntry } from '../data/portfolioData';
import { ResilientImage } from './ResilientImage';

interface JournalSectionProps {
  onSelectEntry: (entry: JournalEntry) => void;
}

export function JournalSection({ onSelectEntry }: JournalSectionProps) {
  const navigate = useNavigate();

  return (
    <section id="journal" className="bg-bg py-16 md:py-24">
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
              <span className="text-xs text-muted uppercase tracking-[0.3em]">Journal</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-normal tracking-tight text-text-primary mb-3">
              Recent <span className="font-display italic">thoughts</span>
            </h2>

            <p className="text-sm md:text-base text-muted max-w-md">
              Notes on interactive architecture, typography, and motion craft.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              navigate('/journal');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hidden md:inline-flex relative group items-center rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC] shrink-0"
          >
            <span
              aria-hidden="true"
              className="absolute -inset-[2px] rounded-full accent-gradient animate-gradient-shift opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
            />
            <span className="relative z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-stroke group-hover:border-transparent text-sm text-text-primary whitespace-nowrap shrink-0 transition-colors duration-300">
              <span>View all</span>
              <ArrowRight
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </button>
        </motion.div>

        <div className="flex flex-col gap-4">
          {JOURNAL_ENTRIES.map((entry, index) => (
            <motion.button
              key={entry.id}
              type="button"
              onClick={() => onSelectEntry(entry)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: index * 0.06,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              viewport={{ once: true, margin: '-60px' }}
              className="group w-full flex items-center justify-between gap-4 sm:gap-6 p-4 rounded-[40px] sm:rounded-full bg-surface/30 hover:bg-surface border border-stroke transition-colors duration-300 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC]"
            >
              <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-full overflow-hidden border border-stroke shrink-0 bg-bg">
                  <ResilientImage
                    src={entry.image}
                    alt={entry.title}
                    fallbackTitle={entry.topic}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>

                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-normal text-text-primary group-hover:text-white transition-colors truncate sm:whitespace-normal">
                    {entry.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted mt-1">
                    <span>{entry.topic}</span>
                    <span aria-hidden="true">·</span>
                    <span>{entry.readTime}</span>
                    <span aria-hidden="true">·</span>
                    <span>{entry.date}</span>
                  </div>
                </div>
              </div>

              <span
                aria-hidden="true"
                className="w-10 h-10 rounded-full border border-stroke bg-bg/60 flex items-center justify-center text-muted group-hover:text-text-primary group-hover:border-[#89AACC]/60 transition-colors shrink-0 mr-1 sm:mr-2"
              >
                <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </motion.button>
          ))}
        </div>

        <div className="mt-8 flex justify-center md:hidden">
          <button
            type="button"
            onClick={() => {
              navigate('/journal');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-stroke text-sm text-text-primary whitespace-nowrap"
          >
            <span>View all</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
