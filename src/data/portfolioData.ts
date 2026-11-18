export interface ProjectItem {
  id: string;
  title: string;
  category: string;
  year: string;
  client: string;
  span: 'wide' | 'narrow';
  image: string;
  summary: string;
  challenge: string;
  solution: string;
  deliverables: string[];
  metrics: { label: string; value: string }[];
}

export interface JournalEntry {
  id: string;
  title: string;
  topic: string;
  readTime: string;
  date: string;
  image: string;
  excerpt: string;
  paragraphs: string[];
}

export interface ExplorationItem {
  id: string;
  title: string;
  medium: string;
  year: string;
  column: 'left' | 'right';
  rotationDeg: number;
  image: string;
  notes: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface ExperienceItem {
  period: string;
  role: string;
  organization: string;
  location: string;
  highlights: string[];
}

export const HERO_HLS_VIDEO_URL =
  'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';

export const LOADING_WORDS = ['Design', 'Create', 'Inspire'] as const;

export const HERO_ROLES = ['Creative', 'Fullstack', 'Founder', 'Scholar'] as const;

export const FEATURED_PROJECTS: ProjectItem[] = [
  {
    id: 'automotive-motion',
    title: 'Automotive Motion',
    category: 'Motion & 3D',
    year: '2026',
    client: 'Veloce Atelier',
    span: 'wide',
    image: '/src/assets/images/work_automotive_motion_1794951499590.jpg',
    summary:
      'Real-time aerodynamic lighting study and interactive launch experience for a bespoke electric grand tourer.',
    challenge:
      'Convey sculptural wind-tunnel velocity and carbon-weave precision in browser hardware without sacrificing sub-second initial interaction.',
    solution:
      'Engineered an HLS-backed studio stream layered with scroll-coupled GSAP camera rails and tactile parameter controls.',
    deliverables: ['Art Direction', 'WebGL Shaders', 'Interactive Configurator', 'Sound Design'],
    metrics: [
      { label: 'Frame Budget', value: '60 fps' },
      { label: 'Avg. Session', value: '4m 18s' },
      { label: 'Launch Reservations', value: '+142%' },
    ],
  },
  {
    id: 'urban-architecture',
    title: 'Urban Architecture',
    category: 'Architecture & Web',
    year: '2025',
    client: 'Chicago Civic Archive',
    span: 'narrow',
    image: '/src/assets/images/work_urban_architecture_1794951499748.jpg',
    summary:
      'Digital monograph and spatial wayfinding index cataloging mid-century brutalist towers along the Chicago River.',
    challenge:
      'Preserve high-resolution archival plates alongside floorplan blueprints in a quiet, distraction-free reading surface.',
    solution:
      'Crafted an asymmetric typographic grid pairing Instrument Serif captions with instant spatial cross-referencing.',
    deliverables: ['Editorial System', 'Archive Search', 'Spatial Mapping', 'Print Companion'],
    metrics: [
      { label: 'Indexed Plates', value: '1,240' },
      { label: 'Search Latency', value: '18 ms' },
      { label: 'Curator Rating', value: '99.4%' },
    ],
  },
  {
    id: 'human-perspective',
    title: 'Human Perspective',
    category: 'Editorial & Film',
    year: '2025',
    client: 'Aperture Monograph',
    span: 'narrow',
    image: '/src/assets/images/work_human_perspective_1794951500676.jpg',
    summary:
      'Long-form documentary portrait series exploring analog craftspeople and studio rituals across the Midwest.',
    challenge:
      'Translate the intimacy of silver-gelatin darkroom prints into an interactive web narrative without visual noise.',
    solution:
      'Designed an unhurried vertical cadence with ambient window-light transitions and synchronized field-audio vignettes.',
    deliverables: ['Cinematography', 'Editorial Pacing', 'Custom Lightbox', 'Field Audio'],
    metrics: [
      { label: 'Completion Rate', value: '84%' },
      { label: 'Featured Studios', value: '18' },
      { label: 'Print Run Sold', value: '3,500' },
    ],
  },
  {
    id: 'brand-identity',
    title: 'Brand Identity',
    category: 'Identity & System',
    year: '2026',
    client: 'Avoir Object House',
    span: 'wide',
    image: '/src/assets/images/work_brand_identity_1794951501182.jpg',
    summary:
      'Tactile packaging architecture, custom monogram system, and flagship e-commerce identity for an olfactory design studio.',
    challenge:
      'Unify physical debossed paper goods, machined aluminum vessels, and digital storytelling under a singular restrained voice.',
    solution:
      'Built a cohesive visual grammar anchored in obsidian basalt surfaces, crisp serif proportions, and measured motion.',
    deliverables: ['Visual Identity', 'Packaging Spec', 'Design Tokens', 'Flagship Commerce'],
    metrics: [
      { label: 'Conversion Lift', value: '+68%' },
      { label: 'Retail Partners', value: '24' },
      { label: 'System Tokens', value: '140' },
    ],
  },
];

export const JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'restraint-in-high-velocity-systems',
    title: 'Designing With Restraint in High-Velocity Systems',
    topic: 'Systems',
    readTime: '6 min read',
    date: 'Nov 2026',
    image: '/src/assets/images/exp_prism_refraction_1794951502608.jpg',
    excerpt:
      'Why subtracting decorative affordances produces faster cognitive flow and more enduring software craft.',
    paragraphs: [
      'Every additional border, badge, or animated status indicator demands a silent tax on attention. When interfaces feel effortless, it is rarely because they hold fewer capabilities—it is because every remaining element earns its coordinate.',
      'Across twenty years of building interactive products in Chicago, I have found that optical calm comes from ruthless hierarchy: one focal subject per viewport, generous negative space, and motion that behaves like physical mass rather than theatrics.',
      'Restraint is not minimalism for its own sake. It is structural clarity that lets complex engineering disappear behind human intuition.',
    ],
  },
  {
    id: 'physics-of-optical-timing',
    title: 'The Physics of Digital Craft and Optical Timing',
    topic: 'Motion',
    readTime: '5 min read',
    date: 'Oct 2026',
    image: '/src/assets/images/exp_kinetic_chrome_1794951501772.jpg',
    excerpt:
      'Calibrating GSAP scroll curves and micro-interaction easing so digital surfaces feel machined rather than weightless.',
    paragraphs: [
      'Screen motion fails when every transition shares the same generic cubic-bezier curve. A heavy architectural plate should settle differently from a crisp typographic hover state.',
      'By pairing hardware-composited transforms with deliberate deceleration curves, interfaces inherit tactile credibility. Users may never consciously notice a 180-millisecond settle, yet they immediately feel the difference.',
      'Good choreography guides the eye from intent to outcome without ever asking to be admired.',
    ],
  },
  {
    id: 'editorial-rhythm-over-density',
    title: 'Why Editorial Rhythm Beats Component Density',
    topic: 'Typography',
    readTime: '4 min read',
    date: 'Sep 2026',
    image: '/src/assets/images/exp_brutalist_atrium_1794951502880.jpg',
    excerpt:
      'Borrowing pacing, contrast, and typographic scale from architectural monographs for modern web storytelling.',
    paragraphs: [
      'Print designers learned centuries ago that contrast in scale creates narrative momentum. Pair an expressive italic serif headline with disciplined sans-serif metadata, and the reader immediately grasps both voice and structure.',
      'On the web, density often masquerades as utility. Giving a reader room to breathe between dense technical specs and full-bleed photography transforms passive scrolling into focused exploration.',
    ],
  },
  {
    id: 'generative-shaders-quiet-interfaces',
    title: 'Analog Optics Inside Modern Digital Workflows',
    topic: 'Craft',
    readTime: '7 min read',
    date: 'Aug 2026',
    image: '/src/assets/images/exp_analog_optics_1794951502684.jpg',
    excerpt:
      'What medium-format lenses, halftone grain, and natural chiaroscuro still teach us about lighting dark interfaces.',
    paragraphs: [
      'Dark mode is often misunderstood as pure black with glowing neon edges. In physical photography, darkness has texture—subtle specular rims, slate midtones, and measured falloff.',
      'Studying optical glass and analog film grain teaches restraint with luminance. When highlights are rare and deliberate, every steel-blue gradient and crisp white headline carries quiet authority.',
    ],
  },
];

export const EXPLORATIONS: ExplorationItem[] = [
  {
    id: 'kinetic-chrome',
    title: 'Kinetic Chrome Study',
    medium: 'Procedural Sculpture',
    year: '2026',
    column: 'left',
    rotationDeg: -3,
    image: '/src/assets/images/exp_kinetic_chrome_1794951501772.jpg',
    notes: 'Anisotropic brushed titanium ribbon study exploring tangential rim reflections.',
  },
  {
    id: 'brutalist-atrium',
    title: 'Brutalist Atrium Light',
    medium: 'Architectural Photography',
    year: '2026',
    column: 'right',
    rotationDeg: 2.5,
    image: '/src/assets/images/exp_brutalist_atrium_1794951502880.jpg',
    notes: 'Upward spatial study of cast concrete geometry and diffused noon skylight.',
  },
  {
    id: 'analog-optics',
    title: 'Analog Optics 80mm',
    medium: 'Still Life Study',
    year: '2025',
    column: 'left',
    rotationDeg: 2,
    image: '/src/assets/images/exp_analog_optics_1794951502684.jpg',
    notes: 'Low-key studio study of anodized aluminum barrel tolerances and optical coatings.',
  },
  {
    id: 'prism-refraction',
    title: 'Prism Refraction IV',
    medium: 'Optical Experiment',
    year: '2026',
    column: 'right',
    rotationDeg: -2.5,
    image: '/src/assets/images/exp_prism_refraction_1794951502608.jpg',
    notes: 'Collimated white light split along brushed steel into narrow steel-blue spectrum.',
  },
  {
    id: 'modular-synth',
    title: 'Tactile Hardware Dial',
    medium: 'Industrial Design',
    year: '2025',
    column: 'left',
    rotationDeg: -2,
    image: '/src/assets/images/exp_modular_synth_1794951502830.jpg',
    notes: 'Knurled rotary detent ergonomics and low-glare panel silkscreen typography.',
  },
  {
    id: 'obsidian-monolith',
    title: 'Obsidian Monolith',
    medium: 'Environmental Form',
    year: '2026',
    column: 'right',
    rotationDeg: 3,
    image: '/src/assets/images/exp_obsidian_monolith_1794951503547.jpg',
    notes: 'Faceted matte stone mass resting in still water under atmospheric coastal mist.',
  },
];

export const STATS: StatItem[] = [
  { value: '20+', label: 'Years Experience' },
  { value: '95+', label: 'Projects Done' },
  { value: '200%', label: 'Satisfied Clients' },
];

export const RESUME_EXPERIENCE: ExperienceItem[] = [
  {
    period: '2021 — Present',
    role: 'Principal Creative Technologist & Founder',
    organization: 'Northline Studio',
    location: 'Chicago, IL',
    highlights: [
      'Lead multidisciplinary product design, WebGL/GSAP engineering, and brand systems for automotive, architecture, and cultural partners.',
      'Architected design-to-production component platforms serving millions of monthly interactive sessions.',
    ],
  },
  {
    period: '2016 — 2021',
    role: 'Staff Design Engineer',
    organization: 'Kinetix Interactive',
    location: 'Chicago, IL',
    highlights: [
      'Directed front-end architecture and motion language across flagship web applications and real-time media streaming tools.',
      'Mentored 14 engineers and designers on accessibility, typography systems, and 60fps browser performance.',
    ],
  },
  {
    period: '2011 — 2016',
    role: 'Senior Interactive Designer',
    organization: 'Atelier Mono',
    location: 'New York & Chicago',
    highlights: [
      'Crafted editorial monographs, museum digital exhibits, and bespoke identity systems recognized internationally.',
    ],
  },
];

export const SOCIAL_LINKS = [
  { label: 'Twitter', href: 'https://twitter.com' },
  { label: 'LinkedIn', href: 'https://linkedin.com' },
  { label: 'Dribbble', href: 'https://dribbble.com' },
  { label: 'GitHub', href: 'https://github.com/jafar70908' },
] as const;
