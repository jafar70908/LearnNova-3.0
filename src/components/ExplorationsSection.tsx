import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import { EXPLORATIONS, type ExplorationItem } from '../data/portfolioData';
import { ResilientImage } from './ResilientImage';

gsap.registerPlugin(ScrollTrigger);

interface ExplorationsSectionProps {
  onSelectExploration: (item: ExplorationItem) => void;
}

export function ExplorationsSection({ onSelectExploration }: ExplorationsSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const leftColRef = useRef<HTMLDivElement | null>(null);
  const rightColRef = useRef<HTMLDivElement | null>(null);

  const leftItems = EXPLORATIONS.filter((item) => item.column === 'left');
  const rightItems = EXPLORATIONS.filter((item) => item.column === 'right');

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 768px)', () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: contentRef.current,
        pinSpacing: false,
      });

      if (leftColRef.current) {
        gsap.fromTo(
          leftColRef.current,
          { y: 80 },
          {
            y: -120,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.6,
            },
          }
        );
      }

      if (rightColRef.current) {
        gsap.fromTo(
          rightColRef.current,
          { y: 140 },
          {
            y: -180,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.8,
            },
          }
        );
      }
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      id="explorations"
      ref={sectionRef}
      className="relative min-h-screen md:min-h-[260vh] bg-bg overflow-x-clip"
    >
      {/* Layer 1: Pinned Center */}
      <div
        ref={contentRef}
        className="relative z-10 min-h-[70vh] md:h-screen flex flex-col items-center justify-center text-center px-6 pointer-events-none"
      >
        <div className="max-w-lg mx-auto bg-bg/70 backdrop-blur-sm rounded-3xl px-6 py-8">
          <p className="text-xs text-muted uppercase tracking-[0.3em] mb-4">Explorations</p>

          <h2 className="text-4xl md:text-6xl font-normal tracking-tight text-text-primary mb-4">
            Visual <span className="font-display italic">playground</span>
          </h2>

          <p className="text-sm md:text-base text-muted max-w-sm mx-auto mb-8 leading-relaxed">
            A living archive of tactile form studies, optical experiments, and kinetic sketches.
          </p>

          <a
            href="https://dribbble.com"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto relative group inline-flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC]"
          >
            <span
              aria-hidden="true"
              className="absolute -inset-[2px] rounded-full accent-gradient animate-gradient-shift opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
            />
            <span className="relative z-10 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-surface border border-stroke group-hover:border-transparent text-sm text-text-primary whitespace-nowrap transition-colors duration-300">
              <span>Follow on Dribbble</span>
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </span>
          </a>
        </div>
      </div>

      {/* Layer 2: Parallax Columns */}
      <div className="relative z-20 md:absolute md:inset-x-0 md:top-0 pointer-events-none flex justify-center">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 md:px-12 py-8 md:py-20 grid grid-cols-2 gap-4 sm:gap-12 md:gap-40">
          <div
            ref={leftColRef}
            className="flex flex-col items-start gap-8 sm:gap-20 md:gap-44 md:pt-[18vh]"
          >
            {leftItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectExploration(item)}
                aria-label={`Inspect ${item.title}`}
                style={{ transform: `rotate(${item.rotationDeg}deg)` }}
                className="pointer-events-auto group relative aspect-square w-full max-w-[320px] rounded-2xl overflow-hidden border border-stroke bg-surface shadow-2xl transition-all duration-500 hover:scale-105 hover:rotate-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC]"
              >
                <ResilientImage
                  src={item.image}
                  alt={item.title}
                  fallbackTitle={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 text-left"
                >
                  <p className="font-display italic text-base sm:text-lg text-text-primary leading-tight">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{item.medium}</p>
                </div>
              </button>
            ))}
          </div>

          <div
            ref={rightColRef}
            className="flex flex-col items-end gap-8 sm:gap-20 md:gap-44 pt-8 md:pt-[34vh]"
          >
            {rightItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectExploration(item)}
                aria-label={`Inspect ${item.title}`}
                style={{ transform: `rotate(${item.rotationDeg}deg)` }}
                className="pointer-events-auto group relative aspect-square w-full max-w-[320px] rounded-2xl overflow-hidden border border-stroke bg-surface shadow-2xl transition-all duration-500 hover:scale-105 hover:rotate-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC]"
              >
                <ResilientImage
                  src={item.image}
                  alt={item.title}
                  fallbackTitle={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 p-3 sm:p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 text-left"
                >
                  <p className="font-display italic text-base sm:text-lg text-text-primary leading-tight">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{item.medium}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
