import { conceptStates } from './mastery';
import { computePath, formatDurationMinutes } from './path';
import type { ChangeDiff, Facts, Graph, Snapshot } from './types';

export function snapshot(
  g: Graph,
  f: Facts,
  targetId: string | null
): Snapshot {
  const computedStates = conceptStates(g, f);
  const states: Snapshot['states'] = {};
  const activeConceptIds: string[] = [];

  for (const c of g.concepts) {
    if (c.status === 'active') {
      activeConceptIds.push(c.id);
      states[c.id] = computedStates[c.id]?.status ?? 'locked';
    }
  }

  const pathRes = computePath(g, f, targetId);

  return {
    states,
    activeConceptIds,
    path: pathRes.steps.map((s) => s.id),
    minutes: pathRes.totalMinutes,
    targetId,
  };
}

export function diffSnapshots(before: Snapshot, after: Snapshot): ChangeDiff {
  const beforeActive = new Set(before.activeConceptIds);
  const afterActive = new Set(after.activeConceptIds);

  const newlyUnlocked: string[] = [];
  const newlyLocked: string[] = [];
  const newConcepts: string[] = [];
  const archivedConcepts: string[] = [];

  for (const id of after.activeConceptIds) {
    if (!beforeActive.has(id)) {
      newConcepts.push(id);
    } else if (before.states[id] === 'locked' && after.states[id] === 'unlocked') {
      newlyUnlocked.push(id);
    } else if (before.states[id] === 'unlocked' && after.states[id] === 'locked') {
      newlyLocked.push(id);
    }
  }

  for (const id of before.activeConceptIds) {
    if (!afterActive.has(id)) {
      archivedConcepts.push(id);
    }
  }

  const pathChanged =
    before.path.length !== after.path.length ||
    before.path.some((id, idx) => after.path[idx] !== id);

  const minutesChanged = before.minutes !== after.minutes;

  const isEmpty =
    newlyUnlocked.length === 0 &&
    newlyLocked.length === 0 &&
    newConcepts.length === 0 &&
    archivedConcepts.length === 0 &&
    !pathChanged &&
    !minutesChanged;

  return {
    newlyUnlocked,
    newlyLocked,
    newConcepts,
    archivedConcepts,
    pathBefore: before.path,
    pathAfter: after.path,
    minutesBefore: before.minutes,
    minutesAfter: after.minutes,
    isEmpty,
  };
}

export function describeDiff(
  diff: ChangeDiff,
  titles: Record<string, string>
): { title: string; body: string } {
  const nameOf = (id: string) => titles[id] ?? id;
  const parts: string[] = [];

  if (diff.newlyUnlocked.length > 0) {
    parts.push(`Unlocked: ${diff.newlyUnlocked.map(nameOf).join(', ')}`);
  }
  if (diff.newlyLocked.length > 0) {
    parts.push(`Locked: ${diff.newlyLocked.map(nameOf).join(', ')}`);
  }
  if (diff.newConcepts.length > 0) {
    parts.push(`New concepts: ${diff.newConcepts.map(nameOf).join(', ')}`);
  }

  const pathChanged =
    diff.pathBefore.length !== diff.pathAfter.length ||
    diff.pathBefore.some((id, idx) => diff.pathAfter[idx] !== id);

  if (pathChanged) {
    const beforeLabel =
      diff.pathBefore.length > 0 ? diff.pathBefore.map(nameOf).join(' → ') : 'Empty';
    const afterLabel =
      diff.pathAfter.length > 0 ? diff.pathAfter.map(nameOf).join(' → ') : 'Empty';
    parts.push(`Path updated (${beforeLabel} → ${afterLabel})`);
  }

  if (diff.minutesBefore !== diff.minutesAfter) {
    parts.push(
      `Estimate: ${formatDurationMinutes(diff.minutesBefore)} → ${formatDurationMinutes(
        diff.minutesAfter
      )}`
    );
  }

  const title =
    diff.newlyUnlocked.length > 0
      ? 'Course updated — new concepts unlocked'
      : diff.newlyLocked.length > 0
        ? 'Course updated — prerequisites added'
        : 'Curriculum updated';

  return {
    title,
    body: parts.length > 0 ? parts.join(' · ') : 'Your learning path was recalculated.',
  };
}
