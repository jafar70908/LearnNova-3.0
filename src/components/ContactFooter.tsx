import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { HERO_HLS_VIDEO_URL, SOCIAL_LINKS } from '../data/portfolioData';
import { HlsVideoBackground } from './HlsVideoBackground';

interface ContactFooterProps {
  onOpenContact?: () => void;
}

const MARQUEE_TEXT = Array.from({ length: 10 }, () => 'BUILDING THE FUTURE • ').join('');

export function ContactFooter({ onOpenContact }: ContactFooterProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!trackRef.current) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.to(trackRef.current, {
        xPercent: -50,
        duration: 40,
        ease: 'none',
        repeat: -1,
      });
    }, trackRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer
      id="contact"
      className="relative bg-bg pt-16 md:pt-20 pb-8 md:pb-12 overflow-hidden"
    >
      <HlsVideoBackground
        src={HERO_HLS_VIDEO_URL}
        flipped
        overlayClassName="bg-black/60"
      />

      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-bg to-transparent pointer-events-none z-[1]"
      />

      {/* GSAP Marquee */}
      <div className="relative z-10 overflow-hidden border-y border-white/10 py-6 md:py-8 mb-14 md:mb-20">
        <div ref={trackRef} className="flex w-max whitespace-nowrap">
          <span className="text-3xl sm:text-5xl md:text-6xl font-display italic tracking-wide text-text-primary/85 pr-4">
            {MARQUEE_TEXT}
          </span>
          <span
            aria-hidden="true"
            className="text-3xl sm:text-5xl md:text-6xl font-display italic tracking-wide text-text-primary/85 pr-4"
          >
            {MARQUEE_TEXT}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 text-center mb-16 md:mb-24">
        <p className="text-xs text-muted uppercase tracking-[0.3em] mb-4">Get in touch</p>
        <h2
          className="text-3xl md:text-5xl font-normal tracking-tight text-text-primary mb-8 max-w-xl mx-auto"
          style={{ textWrap: 'balance' }}
        >
          Have an ambitious <span className="font-display italic">system</span> in mind?
        </h2>

        <div className="inline-flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:jafar.creative.in@gmail.com"
            className="relative group inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC]"
          >
            <span
              aria-hidden="true"
              className="absolute -inset-[2px] rounded-full accent-gradient animate-gradient-shift opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
            />
            <span className="relative z-10 px-7 py-3.5 rounded-full bg-surface border border-stroke group-hover:border-transparent text-sm md:text-base text-text-primary whitespace-nowrap transition-colors duration-300">
              jafar.creative.in@gmail.com
            </span>
          </a>

          {onOpenContact && (
            <button
              type="button"
              onClick={onOpenContact}
              className="px-6 py-3.5 rounded-full border border-white/15 bg-bg/60 hover:bg-surface text-sm text-text-primary whitespace-nowrap transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC]"
            >
              Send a message
            </button>
          )}
        </div>
      </div>

      {/* Footer Bar */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-muted">
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary transition-colors duration-200 whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="inline-flex items-center gap-2.5 text-text-primary/80 whitespace-nowrap">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Available for projects</span>
        </div>
      </div>
    </footer>
  );
}
