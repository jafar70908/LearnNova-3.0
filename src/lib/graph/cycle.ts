import type { Graph } from './types';

export type LinkValidationResult =
  | { ok: true }
  | { ok: false; code: 'SELF_LINK' | 'DUPLICATE' | 'CYCLE'; message: string; loop?: string[] };

/**
 * Adding edge (prereqId -> conceptId) creates a cycle iff prereqId is
 * reachable from conceptId by walking existing active dependents.
 * Returns the cycle node IDs [conceptId, ..., prereqId, conceptId], or null.
 */
export function findCycle(
  g: Graph,
  prereqId: string,
  conceptId: string
): string[] | null {
  if (prereqId === conceptId) {
    return [conceptId, conceptId];
  }

  const activeIds = new Set(
    g.concepts.filter((c) => c.status === 'active').map((c) => c.id)
  );
  if (!activeIds.has(prereqId) || !activeIds.has(conceptId)) {
    return null;
  }

  const dependents: Record<string, string[]> = {};
  for (const link of g.links) {
    if (!activeIds.has(link.prereqId) || !activeIds.has(link.conceptId)) continue;
    if (!dependents[link.prereqId]) dependents[link.prereqId] = [];
    dependents[link.prereqId].push(link.conceptId);
  }

  // Iterative DFS from conceptId along dependents, tracking parent pointers on visit
  const stack: { id: string; from: string | null }[] = [{ id: conceptId, from: null }];
  const visited = new Set<string>();
  const parent: Record<string, string | null> = {};

  while (stack.length > 0) {
    const { id: current, from } = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    parent[current] = from;

    if (current === prereqId) {
      const path: string[] = [];
      let cursor: string | null = prereqId;
      while (cursor !== null) {
        path.unshift(cursor);
        cursor = parent[cursor] ?? null;
      }
      return [...path, conceptId];
    }

    const nextNodes = dependents[current] ?? [];
    for (let i = nextNodes.length - 1; i >= 0; i--) {
      const dep = nextNodes[i];
      if (!visited.has(dep)) {
        stack.push({ id: dep, from: current });
      }
    }
  }

  return null;
}

export function explainCycle(g: Graph, loop: string[]): string {
  const titleMap: Record<string, string> = {};
  for (const c of g.concepts) {
    titleMap[c.id] = c.title;
  }

  if (loop.length === 2 && loop[0] === loop[1]) {
    const name = titleMap[loop[0]] ?? loop[0];
    return `'${name}' cannot be a prerequisite of itself (${name} -> ${name}).`;
  }

  const startTitle = titleMap[loop[0]] ?? loop[0];
  const endTitle = titleMap[loop[loop.length - 2]] ?? loop[loop.length - 2];
  const chain = loop.map((id) => titleMap[id] ?? id).join(' -> ');
  return `'${endTitle}' cannot be a prerequisite of '${startTitle}' because '${startTitle}' already leads to '${endTitle}': ${chain}`;
}

export function validateNewLink(
  g: Graph,
  prereqId: string,
  conceptId: string
): LinkValidationResult {
  if (prereqId === conceptId) {
    return {
      ok: false,
      code: 'SELF_LINK',
      message: explainCycle(g, [conceptId, conceptId]),
      loop: [conceptId, conceptId],
    };
  }

  const exists = g.links.some(
    (l) => l.prereqId === prereqId && l.conceptId === conceptId
  );
  if (exists) {
    return {
      ok: false,
      code: 'DUPLICATE',
      message: 'Already a prerequisite link between these two concepts.',
    };
  }

  const loop = findCycle(g, prereqId, conceptId);
  if (loop) {
    return {
      ok: false,
      code: 'CYCLE',
      message: explainCycle(g, loop),
      loop,
    };
  }

  return { ok: true };
}
