import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedDatabase } from '../../data/seedPathForge';
import { computePath, conceptStates } from '../graph';
import {
  applyAddPrerequisite,
  applyEnroll,
  applySetTarget,
  applySplitConcept,
  applySubmitQuiz,
  applyToggleLesson,
  applyUnenroll,
  buildCourseGraph,
  buildLearnerFacts,
  createEmptyFacts,
  previewImpactDryRun,
} from './pathforgeStore';

test('TC-07: failing then passing Loops quiz unlocks Lists, Strings, and Functions immediately', () => {
  const db0 = createSeedDatabase();

  // Fail quiz (0/5 = 0%)
  const failRes = applySubmitQuiz(db0, 'user-learner', 'c6', [1, 0, 0, 0, 1]);
  assert.equal(failRes.ok, true);
  if (!failRes.ok) return;
  assert.equal(failRes.data.passed, false);

  // Still locked
  const states1 = conceptStates(
    buildCourseGraph(failRes.db, 'course-prog'),
    buildLearnerFacts(failRes.db, 'user-learner')
  );
  assert.equal(states1['c9'].status, 'locked');

  // Pass quiz (5/5 = 100%) with custom answers [0, 1, 2, 3, 0]
  const passRes = applySubmitQuiz(failRes.db, 'user-learner', 'c6', [0, 1, 2, 3, 0]);
  assert.equal(passRes.ok, true);
  if (!passRes.ok) return;
  assert.equal(passRes.data.passed, true);
  assert.equal(passRes.data.score, 100);
  // Immutable history preserved (both attempts recorded)
  assert.equal(
    passRes.db.quizAttempts.filter(
      (a) => a.learnerId === 'user-learner' && a.conceptId === 'c6'
    ).length,
    2
  );

  const states2 = conceptStates(
    buildCourseGraph(passRes.db, 'course-prog'),
    buildLearnerFacts(passRes.db, 'user-learner')
  );
  assert.equal(states2['c6'].status, 'mastered');
  assert.equal(states2['c7'].status, 'unlocked');
  assert.equal(states2['c8'].status, 'unlocked');
  assert.equal(states2['c9'].status, 'unlocked');
});

test('TC-10 & TC-15: adding C7 -> C11 recomputes path to 185 min, sends notification, rejects stale version', () => {
  const db = createSeedDatabase();

  const preview = previewImpactDryRun(
    db,
    applyAddPrerequisite(db, 'user-instructor', 'course-prog', 'c7', 'c11', 1),
    'course-prog'
  );
  assert.ok(preview);
  assert.ok(preview.affectedLearners >= 1);

  const addRes = applyAddPrerequisite(db, 'user-instructor', 'course-prog', 'c7', 'c11', 1);
  assert.equal(addRes.ok, true);
  if (!addRes.ok) return;
  assert.equal(addRes.data.version, 2);

  // Stale version check (TC-15)
  const staleRes = applyAddPrerequisite(
    addRes.db,
    'user-instructor',
    'course-prog',
    'c8',
    'c11',
    1
  );
  assert.equal(staleRes.ok, false);
  if (!staleRes.ok) assert.equal(staleRes.code, 'STALE_VERSION');

  // Arjun's new path includes c7 and totalMinutes = 185
  const arjunPath = computePath(
    buildCourseGraph(addRes.db, 'course-prog'),
    buildLearnerFacts(addRes.db, 'user-learner'),
    'c11'
  );
  assert.deepEqual(
    arjunPath.steps.map((s) => s.id),
    ['c6', 'c7', 'c9', 'c10', 'c11']
  );
  assert.equal(arjunPath.totalMinutes, 185);

  const arjunNotifs = addRes.db.notifications.filter((n) => n.userId === 'user-learner');
  assert.equal(arjunNotifs.length, 1);
  assert.equal(arjunNotifs[0].diff.minutesBefore, 150);
  assert.equal(arjunNotifs[0].diff.minutesAfter, 185);
});

test('TC-11 & TC-12: splitting Functions preserves mastery grants, lesson completions, and attempt counts', () => {
  let db = createSeedDatabase();

  // Pass C6 and C9 for Arjun, and complete one lesson of C9
  const p6 = applySubmitQuiz(db, 'user-learner', 'c6', [0, 1, 2, 3, 0]);
  assert.equal(p6.ok, true);
  if (!p6.ok) return;
  db = p6.db;

  const p9 = applySubmitQuiz(db, 'user-learner', 'c9', [0, 1, 2, 3, 0]);
  assert.equal(p9.ok, true);
  if (!p9.ok) return;
  db = p9.db;

  const tLesson = applyToggleLesson(db, 'user-learner', 'c9-l1');
  assert.equal(tLesson.ok, true);
  db = tLesson.db;

  const attemptsBefore = db.quizAttempts.length;
  const completionsBefore = db.lessonCompletions.length;

  // Split C9 Functions into Function Basics (c9-l1) and Parameters and Return Values (c9-l2, c9-l3)
  const splitRes = applySplitConcept(db, 'user-instructor', 'course-prog', 'c9', [
    {
      title: 'Function Basics',
      lessonIds: ['c9-l1'],
      isEntry: true,
      isExit: false,
    },
    {
      title: 'Parameters and Return Values',
      lessonIds: ['c9-l2', 'c9-l3'],
      isEntry: false,
      isExit: true,
    },
  ]);

  assert.equal(splitRes.ok, true);
  if (!splitRes.ok) return;

  const [child1Id, child2Id] = splitRes.data.childIds;

  // Integrity check: attempt and completion counts never decrease
  assert.equal(splitRes.db.quizAttempts.length, attemptsBefore);
  assert.equal(splitRes.db.lessonCompletions.length, completionsBefore);

  // Arjun gets mastery grants for both children and C10 remains unlocked
  const arjunStates = conceptStates(
    buildCourseGraph(splitRes.db, 'course-prog'),
    buildLearnerFacts(splitRes.db, 'user-learner')
  );
  assert.equal(arjunStates[child1Id].status, 'mastered');
  assert.equal(arjunStates[child2Id].status, 'mastered');
  assert.equal(arjunStates['c10'].status, 'unlocked');

  // Sam (newbie, has not started Functions) sees both children in path to C11
  const samPath = computePath(
    buildCourseGraph(splitRes.db, 'course-prog'),
    buildLearnerFacts(splitRes.db, 'user-newbie'),
    'c11'
  );
  const pathIds = samPath.steps.map((s) => s.id);
  assert.ok(pathIds.includes(child1Id));
  assert.ok(pathIds.includes(child2Id));
  assert.ok(pathIds.indexOf(child1Id) < pathIds.indexOf(child2Id));
});

test('Auth guards: empty facts yield zero mastered concepts and null learnerId rejects mutations', () => {
  const db = createSeedDatabase();
  const empty = createEmptyFacts();
  const nullFacts = buildLearnerFacts(db, null);

  assert.equal(empty.completedLessons.size, 0);
  assert.equal(nullFacts.everPassed.size, 0);

  const states = conceptStates(buildCourseGraph(db, 'course-prog'), nullFacts);
  const masteredCount = Object.values(states).filter((s) => s.status === 'mastered').length;
  assert.equal(masteredCount, 0);

  const toggleRes = applyToggleLesson(db, null, 'c1-l1');
  assert.equal(toggleRes.ok, false);
  if (!toggleRes.ok) assert.equal(toggleRes.code, 'FORBIDDEN');

  const quizRes = applySubmitQuiz(db, '', 'c1', [0, 1, 2]);
  assert.equal(quizRes.ok, false);
  if (!quizRes.ok) assert.equal(quizRes.code, 'FORBIDDEN');

  const enrollRes = applyEnroll(db, null, 'course-prog');
  assert.equal(enrollRes.ok, false);
  if (!enrollRes.ok) assert.equal(enrollRes.code, 'FORBIDDEN');

  const unenrollRes = applyUnenroll(db, null, 'course-prog');
  assert.equal(unenrollRes.ok, false);

  const targetRes = applySetTarget(db, null, 'course-prog', 'c11');
  assert.equal(targetRes.ok, false);
});

test('Quiz submission returns maximum marks, obtained marks, percentage, and per-question right/wrong review', () => {
  const db = createSeedDatabase();
  // In Loops (c6), seeded answer key is [0, 1, 2, 3, 0]
  // Answer Q1, Q2, Q5 right and Q3, Q4 wrong => 3/5 = 60%
  const res = applySubmitQuiz(db, 'user-learner', 'c6', [0, 1, 0, 0, 0]);
  assert.equal(res.ok, true);
  if (!res.ok) return;

  assert.equal(res.data.maxMarks, 5);
  assert.equal(res.data.obtainedMarks, 3);
  assert.equal(res.data.correct, 3);
  assert.equal(res.data.wrongCount, 2);
  assert.equal(res.data.percentage, 60);
  assert.equal(res.data.passed, false);
  assert.equal(res.data.questionResults.length, 5);

  assert.equal(res.data.questionResults[0].isCorrect, true);
  assert.equal(res.data.questionResults[0].selectedIndex, 0);
  assert.equal(res.data.questionResults[0].correctIndex, 0);
  assert.equal(res.data.questionResults[0].marksObtained, 1);

  assert.equal(res.data.questionResults[2].isCorrect, false);
  assert.equal(res.data.questionResults[2].selectedIndex, 0);
  assert.equal(res.data.questionResults[2].correctIndex, 2);
  assert.equal(res.data.questionResults[2].marksObtained, 0);
});
