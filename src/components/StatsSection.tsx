import { motion } from 'framer-motion';
import { STATS } from '../data/portfolioData';

export function StatsSection() {
  return (
    <section aria-label="Career milestones" className="bg-bg py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 border-t border-b border-stroke py-12 md:py-16">
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: index * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              viewport={{ once: true, margin: '-60px' }}
              className="flex flex-col items-start md:items-center text-left md:text-center"
            >
              <span className="text-5xl md:text-7xl font-display italic text-text-primary tabular-nums leading-none mb-3">
                {stat.value}
              </span>
              <span className="text-xs text-muted uppercase tracking-[0.25em]">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
