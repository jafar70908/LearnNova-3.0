import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LOADING_WORDS } from '../data/portfolioData';
import { computeLoaderProgress, cycleIndex, formatLoaderCount } from '../utils/portfolioHelpers';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [count, setCount] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const wordTimer = window.setInterval(() => {
      setWordIndex((prev) => cycleIndex(prev, LOADING_WORDS.length, 1));
    }, 900);

    return () => window.clearInterval(wordTimer);
  }, []);

  useEffect(() => {
    let rafId = 0;
    let completionTimeout = 0;
    const durationMs = 2700;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const nextCount = computeLoaderProgress(elapsed, durationMs);
      setCount(nextCount);

      if (nextCount < 100) {
        rafId = requestAnimationFrame(tick);
      } else {
        completionTimeout = window.setTimeout(() => {
          onComplete();
        }, 400);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      if (completionTimeout) {
        window.clearTimeout(completionTimeout);
      }
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[9999] bg-bg flex flex-col justify-between select-none"
      role="status"
      aria-label="Loading LearnNova"
    >
      <div className="flex justify-between items-start p-6 md:p-10">
        <motion.span
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-xs text-muted uppercase tracking-[0.3em]"
        >
          LearnNova
        </motion.span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.span
            key={LOADING_WORDS[wordIndex]}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-6xl lg:text-7xl font-display italic text-text-primary/80"
          >
            {LOADING_WORDS[wordIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex justify-end px-6 md:px-10">
          <span className="text-6xl md:text-8xl lg:text-9xl font-display text-text-primary tabular-nums leading-none">
            {formatLoaderCount(count)}
          </span>
        </div>

        <div className="w-full h-[3px] bg-stroke/50 overflow-hidden">
          <div
            className="h-full w-full accent-gradient origin-left transition-transform duration-75 ease-out"
            style={{
              transform: `scaleX(${count / 100})`,
              boxShadow: '0 0 8px rgba(137, 170, 204, 0.35)',
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
