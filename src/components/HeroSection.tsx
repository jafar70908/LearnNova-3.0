import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { HERO_HLS_VIDEO_URL } from '../data/portfolioData';
import { cycleIndex } from '../utils/portfolioHelpers';
import { HlsVideoBackground } from './HlsVideoBackground';

const HERO_CONCEPT_PHRASES = ['Concept Graph', 'Mastery Path', 'Live Curriculum'] as const;

interface HeroSectionProps {
  ready: boolean;
  onSeeWorks: () => void;
  onReachOut: () => void;
}

export function HeroSection({ ready, onSeeWorks, onReachOut }: HeroSectionProps) {
  const [roleIndex, setRoleIndex] = useState(0);
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRoleIndex((prev) => cycleIndex(prev, HERO_CONCEPT_PHRASES.length, 1));
    }, 2000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!ready || !heroRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.name-reveal',
        { opacity: 0.25, y: 18 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
      );

      gsap.fromTo(
        '.blur-in',
        { opacity: 0.25, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.03,
          ease: 'power3.out',
        }
      );
    }, heroRef);

    return () => ctx.revert();
  }, [ready]);

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-bg px-6 pt-24 pb-24"
    >
      <HlsVideoBackground src={HERO_HLS_VIDEO_URL} overlayClassName="bg-black/20" />

      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent pointer-events-none z-[1]"
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
        <p className="text-xs text-muted uppercase tracking-[0.3em] mb-8 blur-in">
          PREREQUISITE-AWARE LEARNING ENGINE
        </p>

        <h1
          className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-display italic leading-[0.92] tracking-tight text-text-primary mb-6 name-reveal"
          style={{ textWrap: 'balance' }}
        >
          Master What Comes First.
        </h1>

        <p className="text-base md:text-lg text-muted mb-2 blur-in">
          Where knowledge is a connected graph, not a flat list.
        </p>

        <p className="text-sm md:text-base text-muted mb-6 blur-in">
          Powered by{' '}
          <span
            key={roleIndex}
            className="font-display italic text-text-primary text-2xl md:text-3xl animate-role-fade-in inline-block mx-1"
          >
            {HERO_CONCEPT_PHRASES[roleIndex]}
          </span>
        </p>

        <p className="text-sm md:text-base text-muted max-w-xl mb-12 leading-relaxed blur-in">
          Move forward by proving mastery of foundational concepts, compute your shortest
          personalized route to any target skill, and adapt seamlessly to live curriculum updates
          without losing progress.
        </p>

        <div className="inline-flex flex-wrap items-center justify-center gap-4 blur-in">
          <button
            type="button"
            onClick={onSeeWorks}
            className="relative group inline-flex items-center justify-center rounded-full text-sm transition-transform duration-300 hover:scale-105 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC] whitespace-nowrap shrink-0"
          >
            <span
              aria-hidden="true"
              className="absolute -inset-[2px] rounded-full accent-gradient animate-gradient-shift opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
            />
            <span className="relative z-10 px-7 py-3.5 rounded-full bg-text-primary text-bg group-hover:bg-bg group-hover:text-text-primary transition-colors duration-300 font-medium">
              Launch Learner Path
            </span>
          </button>

          <button
            type="button"
            onClick={onReachOut}
            className="relative group inline-flex items-center justify-center rounded-full text-sm transition-transform duration-300 hover:scale-105 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC] whitespace-nowrap shrink-0"
          >
            <span
              aria-hidden="true"
              className="absolute -inset-[2px] rounded-full accent-gradient animate-gradient-shift opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
            />
            <span className="relative z-10 px-7 py-3.5 rounded-full border-2 border-stroke group-hover:border-transparent bg-bg text-text-primary transition-colors duration-300 font-medium">
              Open Graph Editor
            </span>
          </button>
        </div>
      </div>

      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 pointer-events-none">
        <span className="text-xs text-muted uppercase tracking-[0.2em]">SCROLL</span>
        <div className="w-px h-10 bg-stroke relative overflow-hidden">
          <div className="w-full h-1/2 accent-gradient animate-scroll-down" />
        </div>
      </div>
    </section>
  );
}
