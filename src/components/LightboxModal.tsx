import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ExplorationItem } from '../data/portfolioData';
import { ResilientImage } from './ResilientImage';

interface LightboxModalProps {
  item: ExplorationItem | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function LightboxModal({ item, onClose, onPrev, onNext }: LightboxModalProps) {
  useEffect(() => {
    if (!item) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [item, onClose, onPrev, onNext]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 sm:p-8"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Lightbox: ${item.title}`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lightbox"
            className="absolute top-5 right-5 z-20 w-11 h-11 rounded-full bg-surface border border-white/15 text-text-primary hover:border-[#89AACC] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label="Previous exploration"
            className="hidden sm:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-surface border border-white/15 text-text-primary hover:border-[#89AACC] items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="Next exploration"
            className="hidden sm:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-surface border border-white/15 text-text-primary hover:border-[#89AACC] items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>

          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl flex flex-col items-center text-center"
          >
            <div className="w-full aspect-square max-h-[68vh] rounded-3xl overflow-hidden border border-stroke bg-surface shadow-2xl mb-6">
              <ResilientImage
                src={item.image}
                alt={item.title}
                fallbackTitle={item.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted uppercase tracking-[0.2em] mb-2">
              <span>{item.medium}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{item.year}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-display italic text-text-primary mb-2">
              {item.title}
            </h3>

            <p className="text-sm text-muted max-w-md mb-4">{item.notes}</p>

            <div className="flex sm:hidden items-center gap-3 mt-2">
              <button
                type="button"
                onClick={onPrev}
                aria-label="Previous exploration"
                className="px-4 py-2 rounded-full bg-surface border border-stroke text-xs text-text-primary"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={onNext}
                aria-label="Next exploration"
                className="px-4 py-2 rounded-full bg-surface border border-stroke text-xs text-text-primary"
              >
                Next
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
