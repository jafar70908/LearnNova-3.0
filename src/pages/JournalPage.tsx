import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JOURNAL_ENTRIES, type JournalEntry } from '../data/portfolioData';
import { filterJournalByTopic } from '../utils/portfolioHelpers';
import { ContactFooter } from '../components/ContactFooter';
import { ResilientImage } from '../components/ResilientImage';

interface JournalPageProps {
  onSelectEntry: (entry: JournalEntry) => void;
  onOpenContact: () => void;
}

const TOPICS = ['All', ...Array.from(new Set(JOURNAL_ENTRIES.map((e) => e.topic)))];

export function JournalPage({ onSelectEntry, onOpenContact }: JournalPageProps) {
  const [activeTopic, setActiveTopic] = useState('All');
  const navigate = useNavigate();
  const visibleEntries = filterJournalByTopic(JOURNAL_ENTRIES, activeTopic);

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="bg-bg text-text-primary min-h-screen pt-28 md:pt-36"
    >
      <div className="max-w-[1000px] mx-auto px-6 md:px-10 pb-16 md:pb-24">
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
            <p className="text-xs text-muted uppercase tracking-[0.3em] mb-3">Essays</p>
            <h1 className="text-4xl md:text-6xl font-normal tracking-tight text-text-primary">
              Journal <span className="font-display italic">archive</span>
            </h1>
          </div>

          <div
            role="tablist"
            aria-label="Filter journal essays by topic"
            className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-full bg-surface border border-stroke self-start md:self-auto"
          >
            {TOPICS.map((topic) => {
              const active = activeTopic === topic;
              return (
                <button
                  key={topic}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTopic(topic)}
                  className={`px-3.5 py-1.5 rounded-full text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-text-primary text-bg font-medium'
                      : 'text-muted hover:text-text-primary'
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {visibleEntries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelectEntry(entry)}
              className="group w-full flex items-center justify-between gap-4 sm:gap-6 p-4 rounded-[40px] sm:rounded-full bg-surface/30 hover:bg-surface border border-stroke transition-colors duration-300 text-left cursor-pointer"
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
                  <h2 className="text-base sm:text-xl font-normal text-text-primary truncate sm:whitespace-normal">
                    {entry.title}
                  </h2>
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
                className="w-10 h-10 rounded-full border border-stroke bg-bg/60 flex items-center justify-center text-muted group-hover:text-text-primary transition-colors shrink-0 mr-1 sm:mr-2"
              >
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </button>
          ))}
        </div>
      </div>

      <ContactFooter onOpenContact={onOpenContact} />
    </motion.main>
  );
}
