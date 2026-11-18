import type { Concept, ConceptState, Facts, Graph, MissingPrerequisite } from './types';

export function effectiveThreshold(concept: Concept, courseThreshold: number): number {
  return concept.passThreshold ?? courseThreshold;
}

export function isMastered(g: Graph, f: Facts, conceptId: string): boolean {
  if (f.grants.has(conceptId)) return true;
  if (f.everPassed.has(conceptId)) return true;

  const concept = g.concepts.find((c) => c.id === conceptId);
  if (!concept) return false;

  const best = f.bestScore[conceptId];
  if (typeof best === 'number') {
    return best >= effectiveThreshold(concept, g.courseThreshold);
  }
  return false;
}

export function getActivePrerequisites(g: Graph, conceptId: string): Concept[] {
  const activeById = new Map<string, Concept>();
  for (const c of g.concepts) {
    if (c.status === 'active') activeById.set(c.id, c);
  }

  const prereqs: Concept[] = [];
  for (const link of g.links) {
    if (link.conceptId === conceptId) {
      const p = activeById.get(link.prereqId);
      if (p) prereqs.push(p);
    }
  }
  return prereqs.sort((a, b) => a.orderIndex - b.orderIndex || a.title.localeCompare(b.title));
}

export function conceptStates(g: Graph, f: Facts): Record<string, ConceptState> {
  const result: Record<string, ConceptState> = {};

  for (const concept of g.concepts) {
    if (concept.status !== 'active') continue;

    const directPrereqs = getActivePrerequisites(g, concept.id);
    const missing: MissingPrerequisite[] = [];

    for (const prereq of directPrereqs) {
      if (!isMastered(g, f, prereq.id)) {
        const best = f.bestScore[prereq.id];
        missing.push({
          id: prereq.id,
          title: prereq.title,
          best: typeof best === 'number' ? best : null,
          required: effectiveThreshold(prereq, g.courseThreshold),
        });
      }
    }

    if (isMastered(g, f, concept.id)) {
      result[concept.id] = {
        status: 'mastered',
        missing,
        note:
          missing.length > 0
            ? 'Mastered (prerequisite added later)'
            : undefined,
      };
    } else if (missing.length === 0) {
      result[concept.id] = {
        status: 'unlocked',
        missing: [],
      };
    } else {
      result[concept.id] = {
        status: 'locked',
        missing,
      };
    }
  }

  return result;
}
