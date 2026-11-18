import type { ExplorationItem, JournalEntry, ProjectItem } from '../data/portfolioData';

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatLoaderCount(count: number): string {
  const safe = Math.round(clampNumber(count, 0, 100));
  return String(safe).padStart(3, '0');
}

export function computeLoaderProgress(elapsedMs: number, durationMs = 2700): number {
  if (durationMs <= 0) return 100;
  const ratio = clampNumber(elapsedMs / durationMs, 0, 1);
  return Math.round(ratio * 100);
}

export function cycleIndex(current: number, length: number, step = 1): number {
  if (length <= 0) return 0;
  return (((current + step) % length) + length) % length;
}

export function filterProjectsByCategory(
  projects: ProjectItem[],
  category: string
): ProjectItem[] {
  if (!category || category === 'All') {
    return projects;
  }
  return projects.filter((project) => project.category === category);
}

export function filterJournalByTopic(
  entries: JournalEntry[],
  topic: string
): JournalEntry[] {
  if (!topic || topic === 'All') {
    return entries;
  }
  return entries.filter((entry) => entry.topic === topic);
}

export function getAdjacentExplorationIndex(
  items: ExplorationItem[],
  currentId: string,
  direction: 1 | -1
): number {
  if (items.length === 0) return -1;
  const idx = items.findIndex((item) => item.id === currentId);
  if (idx === -1) return 0;
  return cycleIndex(idx, items.length, direction);
}

export function shouldSkipLoader(search: string, prefersReducedMotion = false): boolean {
  if (prefersReducedMotion) return true;
  const params = new URLSearchParams(search);
  return params.get('autostart') === '1';
}

export function validateInquiryForm(input: {
  name: string;
  email: string;
  message: string;
}): { valid: boolean; errors: Partial<Record<'name' | 'email' | 'message', string>> } {
  const errors: Partial<Record<'name' | 'email' | 'message', string>> = {};
  if (!input.name.trim()) {
    errors.name = 'Please enter your name.';
  }
  const emailTrimmed = input.email.trim();
  if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (input.message.trim().length < 10) {
    errors.message = 'Please share a brief note (at least 10 characters).';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
