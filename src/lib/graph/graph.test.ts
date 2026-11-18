import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedDatabase } from '../../data/seedPathForge';
import {
  buildCourseGraph,
  buildLearnerFacts,
} from '../store/pathforgeStore';
import {
  computePath,
  conceptStates,
  explainCycle,
  findCycle,
  formatDurationMinutes,
  validateNewLink,
} from './index';

test('TC-04: rejects Recursion -> Loops with full human-readable loop chain', () => {
  const db = createSeedDatabase();
  const graph = buildCourseGraph(db, 'course-prog');
  const loop = findCycle(graph, 'c11', 'c6');
  assert.ok(loop, 'Expected cycle loop to be detected');
  const msg = explainCycle(graph, loop);
  assert.ok(msg.includes('Loops'));
  assert.ok(msg.includes('Functions'));
  assert.ok(msg.includes('Scope and Call Stack'));
  assert.ok(msg.includes('Recursion'));
  assert.equal(
    msg,
    `'Recursion' cannot be a prerequisite of 'Loops' because 'Loops' already leads to 'Recursion': Loops -> Functions -> Scope and Call Stack -> Recursion -> Loops`
  );
});

test('TC-05 & Edge cases: rejects self-link, duplicate, 2-cycle; allows diamond A->C', () => {
  const g = {
    concepts: [
      { id: 'a', title: 'A', orderIndex: 1, status: 'active' as const, passThreshold: null },
      { id: 'b', title: 'B', orderIndex: 2, status: 'active' as const, passThreshold: null },
      { id: 'c', title: 'C', orderIndex: 3, status: 'active' as const, passThreshold: null },
    ],
    links: [
      { prereqId: 'a', conceptId: 'b' },
      { prereqId: 'b', conceptId: 'c' },
    ],
    lessons: [],
    courseThreshold: 70,
    quizMinutes: 5,
  };

  const selfRes = validateNewLink(g, 'a', 'a');
  assert.equal(selfRes.ok, false);
  if (!selfRes.ok) assert.equal(selfRes.code, 'SELF_LINK');

  const dupRes = validateNewLink(g, 'a', 'b');
  assert.equal(dupRes.ok, false);
  if (!dupRes.ok) assert.equal(dupRes.code, 'DUPLICATE');

  const twoCycle = validateNewLink(g, 'b', 'a');
  assert.equal(twoCycle.ok, false);
  if (!twoCycle.ok) assert.equal(twoCycle.code, 'CYCLE');

  const cycleRes = validateNewLink(g, 'c', 'a');
  assert.equal(cycleRes.ok, false);
  if (!cycleRes.ok) assert.equal(cycleRes.code, 'CYCLE');

  const diamondRes = validateNewLink(g, 'a', 'c');
  assert.equal(diamondRes.ok, true);
});

test('TC-06: seeded learner (C1-C5 mastered) sees C6 unlocked and C7 locked missing [C6]', () => {
  const db = createSeedDatabase();
  const graph = buildCourseGraph(db, 'course-prog');
  const facts = buildLearnerFacts(db, 'user-learner');
  const states = conceptStates(graph, facts);

  assert.equal(states['c1'].status, 'mastered');
  assert.equal(states['c5'].status, 'mastered');
  assert.equal(states['c6'].status, 'unlocked');
  assert.equal(states['c7'].status, 'locked');
  assert.deepEqual(
    states['c7'].missing.map((m) => m.id),
    ['c6']
  );
  assert.deepEqual(
    states['c11'].missing.map((m) => m.id),
    ['c9', 'c10']
  );
});

test('TC-08 & TC-09: target Recursion path is C6,C9,C10,C11 = 150 min (2 h 30 min), drops to 115 min after C6 passed', () => {
  const db = createSeedDatabase();
  const graph = buildCourseGraph(db, 'course-prog');
  const facts = buildLearnerFacts(db, 'user-learner');

  const res = computePath(graph, facts, 'c11');
  assert.deepEqual(
    res.steps.map((s) => s.id),
    ['c6', 'c9', 'c10', 'c11']
  );
  assert.equal(res.totalMinutes, 150);
  assert.equal(formatDurationMinutes(res.totalMinutes), '2 h 30 min');

  // Simulate passing C6 and completing C6 lessons
  const updatedFacts = {
    ...facts,
    everPassed: new Set([...facts.everPassed, 'c6']),
    bestScore: { ...facts.bestScore, c6: 85 },
  };
  const nextRes = computePath(graph, updatedFacts, 'c11');
  assert.deepEqual(
    nextRes.steps.map((s) => s.id),
    ['c9', 'c10', 'c11']
  );
  assert.equal(nextRes.totalMinutes, 115);
  assert.equal(formatDurationMinutes(nextRes.totalMinutes), '1 h 55 min');
});

test('Edge case 4 & 13: mastered target returns empty path; sticky mastery survives raised threshold', () => {
  const db = createSeedDatabase();
  const graph = buildCourseGraph(db, 'course-prog');
  const facts = buildLearnerFacts(db, 'user-learner');

  const masteredTarget = computePath(graph, facts, 'c3');
  assert.equal(masteredTarget.alreadyMastered, true);
  assert.equal(masteredTarget.steps.length, 0);

  // Raise course threshold to 95: C2 (score 85, everPassed = true) MUST stay mastered (BR-06)
  const raisedGraph = { ...graph, courseThreshold: 95 };
  const states = conceptStates(raisedGraph, facts);
  assert.equal(states['c2'].status, 'mastered');
});
