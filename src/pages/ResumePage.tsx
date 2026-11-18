import { motion } from 'framer-motion';
import { ArrowLeft, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RESUME_EXPERIENCE, STATS } from '../data/portfolioData';
import { ContactFooter } from '../components/ContactFooter';

interface ResumePageProps {
  onOpenContact: () => void;
}

const CAPABILITIES = [
  {
    group: 'Design & Direction',
    items: ['Creative Direction', 'Design Systems', 'Editorial Typography', 'Motion Choreography'],
  },
  {
    group: 'Engineering',
    items: ['TypeScript & React', 'GSAP & ScrollTrigger', 'WebGL / Shaders', 'HLS Streaming Media'],
  },
];

export function ResumePage({ onOpenContact }: ResumePageProps) {
  const navigate = useNavigate();

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="bg-bg text-text-primary min-h-screen pt-28 md:pt-36"
    >
      <div className="max-w-[960px] mx-auto px-6 md:px-10 pb-16 md:pb-24">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs text-muted hover:text-text-primary uppercase tracking-[0.25em] mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to home</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-10 border-b border-stroke mb-12">
          <div>
            <p className="text-xs text-muted uppercase tracking-[0.3em] mb-3">Curriculum Vitae</p>
            <h1 className="text-4xl md:text-6xl font-display italic text-text-primary mb-2">
              Michael Smith
            </h1>
            <p className="text-sm sm:text-base text-muted">
              Creative Technologist · Fullstack Engineer · Chicago, IL
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-stroke hover:border-[#89AACC] text-sm text-text-primary whitespace-nowrap self-start sm:self-auto transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>Print CV</span>
          </button>
        </div>

        {/* Experience */}
        <section aria-label="Experience" className="mb-14">
          <h2 className="text-xs text-muted uppercase tracking-[0.3em] mb-8">Experience</h2>
          <div className="space-y-10">
            {RESUME_EXPERIENCE.map((item) => (
              <div
                key={item.period}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 pb-8 border-b border-stroke/70 last:border-b-0"
              >
                <div className="md:col-span-4">
                  <p className="text-sm text-text-primary tabular-nums">{item.period}</p>
                  <p className="text-xs text-muted mt-1">{item.location}</p>
                </div>
                <div className="md:col-span-8">
                  <h3 className="text-xl font-display italic text-text-primary">
                    {item.role}
                  </h3>
                  <p className="text-sm text-muted mb-3">{item.organization}</p>
                  <ul className="space-y-2 text-sm text-text-primary/80 leading-relaxed">
                    {item.highlights.map((highlight, idx) => (
                      <li key={idx}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Capabilities */}
        <section aria-label="Core capabilities" className="mb-14">
          <h2 className="text-xs text-muted uppercase tracking-[0.3em] mb-8">Capabilities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-6 sm:p-8 rounded-3xl bg-surface border border-stroke">
            {CAPABILITIES.map((cap) => (
              <div key={cap.group}>
                <h3 className="font-display italic text-2xl text-text-primary mb-3">
                  {cap.group}
                </h3>
                <ul className="space-y-2 text-sm text-muted">
                  {cap.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Metrics */}
        <section aria-label="Track record" className="grid grid-cols-3 gap-4 border-t border-stroke pt-10">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl sm:text-5xl font-display italic text-text-primary tabular-nums">
                {stat.value}
              </div>
              <div className="text-xs text-muted uppercase tracking-[0.2em] mt-2">
                {stat.label}
              </div>
            </div>
          ))}
        </section>
      </div>

      <ContactFooter onOpenContact={onOpenContact} />
    </motion.main>
  );
}
