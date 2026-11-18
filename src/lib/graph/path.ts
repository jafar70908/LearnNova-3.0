import { conceptStates, isMastered } from './mastery';
import type { Concept, Facts, Graph, PathResult, PathStep } from './types';

export function remainingConceptLessonMinutes(
  g: Graph,
  f: Facts,
  conceptId: string
): number {
  let sum = 0;
  for (const lesson of g.lessons) {
    if (lesson.conceptId === conceptId && !f.completedLessons.has(lesson.id)) {
      sum += lesson.durationMin;
    }
  }
  return sum;
}

export function computePath(
  g: Graph,
  f: Facts,
  targetId: string | null
): PathResult {
  if (!targetId) {
    return { steps: [], totalMinutes: 0, alreadyMastered: false };
  }

  const activeConcepts = new Map<string, Concept>();
  for (const c of g.concepts) {
    if (c.status === 'active') activeConcepts.set(c.id, c);
  }

  if (!activeConcepts.has(targetId)) {
    return { steps: [], totalMinutes: 0, alreadyMastered: false };
  }

  if (isMastered(g, f, targetId)) {
    return { steps: [], totalMinutes: 0, alreadyMastered: true };
  }

  const prereqsOf: Record<string, string[]> = {};
  const dependentsOf: Record<string, string[]> = {};

  for (const link of g.links) {
    if (!activeConcepts.has(link.prereqId) || !activeConcepts.has(link.conceptId)) {
      continue;
    }
    if (!prereqsOf[link.conceptId]) prereqsOf[link.conceptId] = [];
    prereqsOf[link.conceptId].push(link.prereqId);

    if (!dependentsOf[link.prereqId]) dependentsOf[link.prereqId] = [];
    dependentsOf[link.prereqId].push(link.conceptId);
  }

  // Backward walk from targetId, stopping at mastered concepts (BR-08)
  const needed = new Set<string>();
  const stack: string[] = [targetId];

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (needed.has(id) || isMastered(g, f, id)) continue;
    needed.add(id);
    for (const p of prereqsOf[id] ?? []) {
      stack.push(p);
    }
  }

  // Kahn topological sort restricted to `needed`; tie-break by orderIndex then title
  const indeg: Record<string, number> = {};
  for (const id of needed) {
    const reqs = (prereqsOf[id] ?? []).filter((p) => needed.has(p));
    indeg[id] = reqs.length;
  }

  const sortIds = (ids: string[]) =>
    ids.sort((a, b) => {
      const ca = activeConcepts.get(a)!;
      const cb = activeConcepts.get(b)!;
      return ca.orderIndex - cb.orderIndex || ca.title.localeCompare(cb.title);
    });

  const ready = sortIds([...needed].filter((id) => indeg[id] === 0));
  const orderedIds: string[] = [];

  while (ready.length > 0) {
    const current = ready.shift()!;
    orderedIds.push(current);

    for (const dep of dependentsOf[current] ?? []) {
      if (!needed.has(dep)) continue;
      indeg[dep] -= 1;
      if (indeg[dep] === 0) {
        ready.push(dep);
        sortIds(ready);
      }
    }
  }

  const states = conceptStates(g, f);
  let totalMinutes = 0;

  const steps: PathStep[] = orderedIds.map((id) => {
    const concept = activeConcepts.get(id)!;
    const lessonMinutes = remainingConceptLessonMinutes(g, f, id);
    const quizMinutes = g.quizMinutes;
    totalMinutes += lessonMinutes + quizMinutes;
    return {
      id,
      title: concept.title,
      lessonMinutes,
      quizMinutes,
      unlocked: states[id]?.status === 'unlocked',
    };
  });

  return { steps, totalMinutes, alreadyMastered: false };
}

export function formatDurationMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours === 0) return `${mins} min`;
  return `${hours} h ${mins} min`;
}
