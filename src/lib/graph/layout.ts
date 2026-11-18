import type { Concept, Link } from './types';

export interface NodePosition {
  x: number;
  y: number;
}

/**
 * Pure topological layered DAG layout (no external dagre dependency needed).
 * Assigns each active concept a level = 1 + max(level of active prerequisites),
 * then spaces siblings horizontally within each row.
 */
export function computeDagLayout(
  concepts: Concept[],
  links: Link[],
  options?: { xGap?: number; yGap?: number; paddingX?: number; paddingY?: number }
): Record<string, NodePosition> {
  const xGap = options?.xGap ?? 250;
  const yGap = options?.yGap ?? 140;
  const paddingX = options?.paddingX ?? 80;
  const paddingY = options?.paddingY ?? 60;

  const active = concepts
    .filter((c) => c.status === 'active')
    .sort((a, b) => a.orderIndex - b.orderIndex || a.title.localeCompare(b.title));

  const activeSet = new Set(active.map((c) => c.id));
  const prereqs: Record<string, string[]> = {};
  for (const l of links) {
    if (!activeSet.has(l.prereqId) || !activeSet.has(l.conceptId)) continue;
    if (!prereqs[l.conceptId]) prereqs[l.conceptId] = [];
    prereqs[l.conceptId].push(l.prereqId);
  }

  const memo: Record<string, number> = {};
  const visiting = new Set<string>();

  const getLayer = (id: string): number => {
    if (id in memo) return memo[id];
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const parents = prereqs[id] ?? [];
    let layer = 0;
    for (const p of parents) {
      layer = Math.max(layer, getLayer(p) + 1);
    }
    visiting.delete(id);
    memo[id] = layer;
    return layer;
  };

  const layers: Record<number, Concept[]> = {};
  let maxLayerSize = 1;

  for (const c of active) {
    const l = getLayer(c.id);
    if (!layers[l]) layers[l] = [];
    layers[l].push(c);
    maxLayerSize = Math.max(maxLayerSize, layers[l].length);
  }

  const totalWidth = (maxLayerSize - 1) * xGap;
  const positions: Record<string, NodePosition> = {};

  for (const [layerKey, nodes] of Object.entries(layers)) {
    const layerIdx = Number(layerKey);
    const rowWidth = (nodes.length - 1) * xGap;
    const startX = paddingX + (totalWidth - rowWidth) / 2;

    nodes.forEach((node, idx) => {
      positions[node.id] = {
        x: Math.round(startX + idx * xGap),
        y: Math.round(paddingY + layerIdx * yGap),
      };
    });
  }

  return positions;
}
