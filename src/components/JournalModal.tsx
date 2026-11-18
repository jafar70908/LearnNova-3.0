import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { JournalEntry } from '../data/portfolioData';
import { ResilientImage } from './ResilientImage';

interface JournalModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
}

export function JournalModal({ entry, onClose }: JournalModalProps) {
  useEffect(() => {
    if (!entry) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [entry, onClose]);

  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={entry.title}
        >
          <motion.article
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-surface border border-stroke rounded-3xl overflow-hidden my-auto max-h-[88vh] flex flex-col"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close journal article"
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-bg/80 backdrop-blur-md border border-white/15 text-text-primary hover:border-[#89AACC] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>

            <div className="overflow-y-auto p-6 sm:p-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-stroke shrink-0">
                  <ResilientImage
                    src={entry.image}
                    alt={entry.title}
                    fallbackTitle={entry.topic}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted uppercase tracking-[0.2em]">
                  <span>{entry.topic}</span>
                  <span aria-hidden="true">·</span>
                  <span>{entry.readTime}</span>
                  <span aria-hidden="true">·</span>
                  <span>{entry.date}</span>
                </div>
              </div>

              <h3 className="text-2xl sm:text-4xl font-display italic text-text-primary leading-tight mb-4">
                {entry.title}
              </h3>

              <p className="text-base text-text-primary/90 leading-relaxed mb-6 pb-6 border-b border-stroke">
                {entry.excerpt}
              </p>

              <div className="space-y-5 text-sm sm:text-base text-muted leading-relaxed">
                {entry.paragraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
