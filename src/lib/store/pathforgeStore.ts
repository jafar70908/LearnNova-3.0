import type {
  CourseChangeRecord,
  LessonRecord,
  NotificationRecord,
  PathForgeDatabase,
  QuizQuestionRecord,
} from '../../data/seedPathForge';
import {
  computeDagLayout,
  conceptStates,
  describeDiff,
  diffSnapshots,
  effectiveThreshold,
  snapshot,
  validateNewLink,
  type Facts,
  type Graph,
} from '../graph';

export type StoreErrorCode =
  | 'CYCLE'
  | 'DUPLICATE'
  | 'SELF_LINK'
  | 'STALE_VERSION'
  | 'FORBIDDEN'
  | 'LOCKED'
  | 'NOT_ENROLLED'
  | 'NOT_FOUND'
  | 'VALIDATION';

export type StoreResult<T = unknown> =
  | { ok: true; data: T; db: PathForgeDatabase }
  | { ok: false; code: StoreErrorCode; message: string; loop?: string[] };

export interface ImpactPreview {
  affectedLearners: number;
  newlyUnlockedCount: number;
  newlyLockedCount: number;
  pathShifts: {
    learnerName: string;
    minutesBefore: number;
    minutesAfter: number;
    newlyUnlockedTitles: string[];
    newlyLockedTitles: string[];
  }[];
}

export interface SplitChildInput {
  title: string;
  description?: string;
  lessonIds: string[];
  isEntry: boolean;
  isExit: boolean;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function buildCourseGraph(db: PathForgeDatabase, courseId: string): Graph {
  const course = db.courses.find((c) => c.id === courseId);
  const concepts = db.concepts
    .filter((c) => c.courseId === courseId)
    .map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      orderIndex: c.orderIndex,
      status: c.status,
      passThreshold: c.passThreshold,
      posX: c.posX,
      posY: c.posY,
      parentConceptId: c.parentConceptId,
    }));

  const links = db.prerequisites
    .filter((l) => l.courseId === courseId && l.removedAt === null)
    .map((l) => ({ prereqId: l.prereqId, conceptId: l.conceptId }));

  const conceptIdSet = new Set(concepts.map((c) => c.id));
  const lessons = db.lessons
    .filter((l) => conceptIdSet.has(l.conceptId))
    .map((l) => ({
      id: l.id,
      conceptId: l.conceptId,
      title: l.title,
      kind: l.kind,
      body: l.body,
      videoUrl: l.videoUrl,
      durationMin: l.durationMin,
      orderIndex: l.orderIndex,
    }));

  return {
    concepts,
    links,
    lessons,
    courseThreshold: course?.passThreshold ?? 70,
    quizMinutes: course?.quizMinutes ?? 5,
  };
}

export function createEmptyFacts(): Facts {
  return {
    bestScore: {},
    everPassed: new Set<string>(),
    grants: new Set<string>(),
    completedLessons: new Set<string>(),
  };
}

export function buildLearnerFacts(db: PathForgeDatabase, learnerId: string | null | undefined): Facts {
  if (!learnerId) {
    return createEmptyFacts();
  }

  const bestScore: Record<string, number> = {};
  const everPassed = new Set<string>();

  for (const attempt of db.quizAttempts) {
    if (attempt.learnerId !== learnerId) continue;
    const prev = bestScore[attempt.conceptId];
    if (typeof prev !== 'number' || attempt.score > prev) {
      bestScore[attempt.conceptId] = attempt.score;
    }
    if (attempt.passed) {
      everPassed.add(attempt.conceptId);
    }
  }

  const grants = new Set<string>();
  for (const grant of db.masteryGrants) {
    if (grant.learnerId === learnerId) {
      grants.add(grant.conceptId);
    }
  }

  const completedLessons = new Set<string>();
  for (const comp of db.lessonCompletions) {
    if (comp.learnerId === learnerId) {
      completedLessons.add(comp.lessonId);
    }
  }

  return { bestScore, everPassed, grants, completedLessons };
}

function getTitleMap(db: PathForgeDatabase, courseId: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of db.concepts) {
    if (c.courseId === courseId) map[c.id] = c.title;
  }
  return map;
}

function notifyEnrolledLearners(
  beforeDb: PathForgeDatabase,
  afterDb: PathForgeDatabase,
  courseId: string,
  changeRecord: CourseChangeRecord
): NotificationRecord[] {
  const beforeGraph = buildCourseGraph(beforeDb, courseId);
  const afterGraph = buildCourseGraph(afterDb, courseId);
  const titles = { ...getTitleMap(beforeDb, courseId), ...getTitleMap(afterDb, courseId) };
  const enrollments = afterDb.enrollments.filter((e) => e.courseId === courseId);
  const createdAt = new Date().toISOString();
  const notifications: NotificationRecord[] = [];

  for (const enr of enrollments) {
    const beforeFacts = buildLearnerFacts(beforeDb, enr.learnerId);
    const afterFacts = buildLearnerFacts(afterDb, enr.learnerId);

    const snapBefore = snapshot(beforeGraph, beforeFacts, enr.targetConceptId);
    const snapAfter = snapshot(afterGraph, afterFacts, enr.targetConceptId);
    const diff = diffSnapshots(snapBefore, snapAfter);

    if (!diff.isEmpty) {
      const { title, body } = describeDiff(diff, titles);
      notifications.push({
        id: makeId('notif'),
        userId: enr.learnerId,
        courseId,
        changeId: changeRecord.id,
        title,
        body,
        diff: {
          newlyUnlocked: diff.newlyUnlocked,
          newlyLocked: diff.newlyLocked,
          newConcepts: diff.newConcepts,
          archivedConcepts: diff.archivedConcepts,
          pathBefore: diff.pathBefore,
          pathAfter: diff.pathAfter,
          minutesBefore: diff.minutesBefore,
          minutesAfter: diff.minutesAfter,
        },
        readAt: null,
        createdAt,
      });
    }
  }

  return notifications;
}

export function applyToggleLesson(
  db: PathForgeDatabase,
  learnerId: string | null | undefined,
  lessonId: string
): StoreResult<{ completed: boolean }> {
  if (!learnerId || !db.users.some((u) => u.id === learnerId)) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: 'Please sign in as a Learner to enroll, access lessons, and track mastery.',
    };
  }

  const exists = db.lessonCompletions.some(
    (lc) => lc.learnerId === learnerId && lc.lessonId === lessonId
  );

  const nextCompletions = exists
    ? db.lessonCompletions.filter(
        (lc) => !(lc.learnerId === learnerId && lc.lessonId === lessonId)
      )
    : [
        ...db.lessonCompletions,
        { learnerId, lessonId, completedAt: new Date().toISOString() },
      ];

  return {
    ok: true,
    data: { completed: !exists },
    db: { ...db, lessonCompletions: nextCompletions },
  };
}

export function applyEnroll(
  db: PathForgeDatabase,
  learnerId: string | null | undefined,
  courseId: string
): StoreResult<{ enrolled: boolean }> {
  if (!learnerId || !db.users.some((u) => u.id === learnerId)) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: 'Please sign in as a Learner to enroll, access lessons, and track mastery.',
    };
  }

  const existing = db.enrollments.find(
    (e) => e.learnerId === learnerId && e.courseId === courseId
  );
  if (existing) {
    return { ok: true, data: { enrolled: true }, db };
  }

  const firstActive = db.concepts
    .filter((c) => c.courseId === courseId && c.status === 'active')
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const defaultTarget =
    firstActive.length > 0 ? firstActive[firstActive.length - 1].id : null;

  const nextEnrollment = {
    id: makeId('enr'),
    learnerId,
    courseId,
    targetConceptId: defaultTarget,
    enrolledAt: new Date().toISOString(),
  };

  return {
    ok: true,
    data: { enrolled: true },
    db: { ...db, enrollments: [...db.enrollments, nextEnrollment] },
  };
}

export function applyUnenroll(
  db: PathForgeDatabase,
  learnerId: string | null | undefined,
  courseId: string
): StoreResult<{ enrolled: boolean }> {
  if (!learnerId || !db.users.some((u) => u.id === learnerId)) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: 'Please sign in first.',
    };
  }

  // Retain quizAttempts and lessonCompletions (ENR-06)
  return {
    ok: true,
    data: { enrolled: false },
    db: {
      ...db,
      enrollments: db.enrollments.filter(
        (e) => !(e.learnerId === learnerId && e.courseId === courseId)
      ),
    },
  };
}

export function applySetTarget(
  db: PathForgeDatabase,
  learnerId: string | null | undefined,
  courseId: string,
  targetConceptId: string | null
): StoreResult<{ targetConceptId: string | null }> {
  if (!learnerId || !db.users.some((u) => u.id === learnerId)) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: 'Please sign in as a Learner to set a target concept.',
    };
  }

  const exists = db.enrollments.some(
    (e) => e.learnerId === learnerId && e.courseId === courseId
  );
  if (!exists) {
    return {
      ok: false,
      code: 'NOT_ENROLLED',
      message: 'Enroll in the course before choosing a target concept.',
    };
  }

  return {
    ok: true,
    data: { targetConceptId },
    db: {
      ...db,
      enrollments: db.enrollments.map((e) =>
        e.learnerId === learnerId && e.courseId === courseId
          ? { ...e, targetConceptId }
          : e
      ),
    },
  };
}

export interface QuizQuestionResult {
  questionId: string;
  orderIndex: number;
  prompt: string;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  marksObtained: number;
  maxMarks: number;
}

export interface QuizSubmissionResult {
  score: number;
  percentage: number;
  passed: boolean;
  thresholdUsed: number;
  correct: number;
  wrongCount: number;
  obtainedMarks: number;
  maxMarks: number;
  total: number;
  questionResults: QuizQuestionResult[];
}

export function gradeQuizAttempt(
  db: PathForgeDatabase,
  conceptId: string,
  answers: number[]
): Omit<QuizSubmissionResult, 'passed' | 'thresholdUsed'> {
  const questions = db.quizQuestions
    .filter((q) => q.conceptId === conceptId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  let correct = 0;
  const questionResults: QuizQuestionResult[] = questions.map((q, idx) => {
    const expected = db.quizAnswerKeys[q.id];
    const correctIndex = typeof expected === 'number' ? expected : -1;
    const selectedIndex = typeof answers[idx] === 'number' ? answers[idx] : -1;
    const isCorrect = correctIndex >= 0 && selectedIndex === correctIndex;
    if (isCorrect) {
      correct += 1;
    }
    return {
      questionId: q.id,
      orderIndex: q.orderIndex,
      prompt: q.prompt,
      options: q.options,
      selectedIndex,
      correctIndex,
      isCorrect,
      marksObtained: isCorrect ? 1 : 0,
      maxMarks: 1,
    };
  });

  const maxMarks = questions.length;
  const obtainedMarks = correct;
  const wrongCount = Math.max(0, maxMarks - obtainedMarks);
  const percentage = maxMarks > 0 ? Math.round((100 * obtainedMarks) / maxMarks) : 0;

  return {
    score: percentage,
    percentage,
    correct,
    wrongCount,
    obtainedMarks,
    maxMarks,
    total: maxMarks,
    questionResults,
  };
}

export function applySubmitQuiz(
  db: PathForgeDatabase,
  learnerId: string | null | undefined,
  conceptId: string,
  answers: number[]
): StoreResult<QuizSubmissionResult> {
  if (!learnerId || !db.users.some((u) => u.id === learnerId)) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: 'Please sign in as a Learner to enroll, access lessons, and track mastery.',
    };
  }

  const concept = db.concepts.find((c) => c.id === conceptId && c.status === 'active');
  if (!concept) {
    return { ok: false, code: 'NOT_FOUND', message: 'Concept is unavailable or archived.' };
  }

  const enrolled = db.enrollments.some(
    (e) => e.learnerId === learnerId && e.courseId === concept.courseId
  );
  if (!enrolled) {
    return { ok: false, code: 'NOT_ENROLLED', message: 'You must enroll in this course first.' };
  }

  const graph = buildCourseGraph(db, concept.courseId);
  const facts = buildLearnerFacts(db, learnerId);
  const states = conceptStates(graph, facts);

  if (states[conceptId]?.status === 'locked') {
    return {
      ok: false,
      code: 'LOCKED',
      message: 'Concept is locked - prerequisites changed.',
    };
  }

  const graded = gradeQuizAttempt(db, conceptId, answers);
  if (graded.maxMarks === 0) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'No quiz questions are available for this concept yet.',
    };
  }

  const course = db.courses.find((c) => c.id === concept.courseId);
  const thresholdUsed = effectiveThreshold(
    {
      id: concept.id,
      title: concept.title,
      orderIndex: concept.orderIndex,
      status: concept.status,
      passThreshold: concept.passThreshold,
    },
    course?.passThreshold ?? 70
  );
  const passed = graded.score >= thresholdUsed;

  const attempt = {
    id: makeId('attempt'),
    learnerId,
    conceptId,
    score: graded.score,
    passed,
    thresholdUsed,
    answers: [...answers],
    graphVersion: course?.graphVersion ?? 1,
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true,
    data: {
      ...graded,
      passed,
      thresholdUsed,
    },
    db: {
      ...db,
      quizAttempts: [...db.quizAttempts, attempt],
    },
  };
}

export function applyAddPrerequisite(
  db: PathForgeDatabase,
  actorId: string,
  courseId: string,
  prereqId: string,
  conceptId: string,
  expectedVersion?: number
): StoreResult<{ version: number }> {
  const course = db.courses.find((c) => c.id === courseId);
  if (!course) return { ok: false, code: 'NOT_FOUND', message: 'Course not found.' };
  if (course.instructorId !== actorId) {
    return { ok: false, code: 'FORBIDDEN', message: 'Only the course instructor can edit links.' };
  }
  if (typeof expectedVersion === 'number' && course.graphVersion !== expectedVersion) {
    return {
      ok: false,
      code: 'STALE_VERSION',
      message: 'Course changed in another session — reload to continue.',
    };
  }

  const graph = buildCourseGraph(db, courseId);
  const validation = validateNewLink(graph, prereqId, conceptId);
  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      message: validation.message,
      loop: validation.loop,
    };
  }

  const now = new Date().toISOString();
  const nextVersion = course.graphVersion + 1;
  const prereqTitle = db.concepts.find((c) => c.id === prereqId)?.title ?? prereqId;
  const conceptTitle = db.concepts.find((c) => c.id === conceptId)?.title ?? conceptId;

  const changeRecord: CourseChangeRecord = {
    id: makeId('chg'),
    courseId,
    version: nextVersion,
    kind: 'add_prereq',
    summary: `Added prerequisite: ${prereqTitle} → ${conceptTitle}`,
    payload: { prereqId, conceptId, prereqTitle, conceptTitle },
    actorId,
    createdAt: now,
  };

  const nextDb: PathForgeDatabase = {
    ...db,
    courses: db.courses.map((c) =>
      c.id === courseId ? { ...c, graphVersion: nextVersion } : c
    ),
    prerequisites: [
      ...db.prerequisites,
      {
        id: makeId('link'),
        courseId,
        prereqId,
        conceptId,
        createdAt: now,
        removedAt: null,
      },
    ],
    courseChanges: [changeRecord, ...db.courseChanges],
  };

  const notifs = notifyEnrolledLearners(db, nextDb, courseId, changeRecord);
  return {
    ok: true,
    data: { version: nextVersion },
    db: { ...nextDb, notifications: [...notifs, ...nextDb.notifications] },
  };
}

export function applyRemovePrerequisite(
  db: PathForgeDatabase,
  actorId: string,
  courseId: string,
  prereqId: string,
  conceptId: string,
  expectedVersion?: number
): StoreResult<{ version: number }> {
  const course = db.courses.find((c) => c.id === courseId);
  if (!course) return { ok: false, code: 'NOT_FOUND', message: 'Course not found.' };
  if (course.instructorId !== actorId) {
    return { ok: false, code: 'FORBIDDEN', message: 'Only the course instructor can edit links.' };
  }
  if (typeof expectedVersion === 'number' && course.graphVersion !== expectedVersion) {
    return {
      ok: false,
      code: 'STALE_VERSION',
      message: 'Course changed in another session — reload to continue.',
    };
  }

  const now = new Date().toISOString();
  const nextVersion = course.graphVersion + 1;
  const prereqTitle = db.concepts.find((c) => c.id === prereqId)?.title ?? prereqId;
  const conceptTitle = db.concepts.find((c) => c.id === conceptId)?.title ?? conceptId;

  const changeRecord: CourseChangeRecord = {
    id: makeId('chg'),
    courseId,
    version: nextVersion,
    kind: 'remove_prereq',
    summary: `Removed prerequisite: ${prereqTitle} → ${conceptTitle}`,
    payload: { prereqId, conceptId, prereqTitle, conceptTitle },
    actorId,
    createdAt: now,
  };

  const nextDb: PathForgeDatabase = {
    ...db,
    courses: db.courses.map((c) =>
      c.id === courseId ? { ...c, graphVersion: nextVersion } : c
    ),
    prerequisites: db.prerequisites.map((l) =>
      l.courseId === courseId &&
      l.prereqId === prereqId &&
      l.conceptId === conceptId &&
      l.removedAt === null
        ? { ...l, removedAt: now }
        : l
    ),
    courseChanges: [changeRecord, ...db.courseChanges],
  };

  const notifs = notifyEnrolledLearners(db, nextDb, courseId, changeRecord);
  return {
    ok: true,
    data: { version: nextVersion },
    db: { ...nextDb, notifications: [...notifs, ...nextDb.notifications] },
  };
}

export function applySplitConcept(
  db: PathForgeDatabase,
  actorId: string,
  courseId: string,
  parentConceptId: string,
  children: SplitChildInput[],
  expectedVersion?: number
): StoreResult<{ version: number; childIds: string[] }> {
  const course = db.courses.find((c) => c.id === courseId);
  if (!course) return { ok: false, code: 'NOT_FOUND', message: 'Course not found.' };
  if (course.instructorId !== actorId) {
    return { ok: false, code: 'FORBIDDEN', message: 'Only the course instructor can split concepts.' };
  }
  if (typeof expectedVersion === 'number' && course.graphVersion !== expectedVersion) {
    return {
      ok: false,
      code: 'STALE_VERSION',
      message: 'Course changed in another session — reload to continue.',
    };
  }

  const parent = db.concepts.find(
    (c) => c.id === parentConceptId && c.courseId === courseId && c.status === 'active'
  );
  if (!parent) {
    return { ok: false, code: 'NOT_FOUND', message: 'Concept to split not found or already archived.' };
  }
  if (children.length < 2 || children.length > 5) {
    return {
      ok: false,
      code: 'VALIDATION',
      message: 'A concept split must produce between 2 and 5 child concepts.',
    };
  }

  const now = new Date().toISOString();
  const nextVersion = course.graphVersion + 1;
  const createdChildren = children.map((child, idx) => ({
    id: makeId('concept'),
    courseId,
    title: child.title.trim(),
    description: child.description?.trim() || `Split segment ${idx + 1} of ${parent.title}.`,
    status: 'active' as const,
    orderIndex: parent.orderIndex + idx * 0.1,
    posX: parent.posX + (idx - (children.length - 1) / 2) * 140,
    posY: parent.posY + idx * 70,
    passThreshold: parent.passThreshold,
    parentConceptId: parent.id,
  }));

  const entryIds = createdChildren
    .filter((_, idx) => children[idx].isEntry)
    .map((c) => c.id);
  const resolvedEntryIds = entryIds.length > 0 ? entryIds : [createdChildren[0].id];

  const exitIdx = children.findIndex((c) => c.isExit);
  const exitId =
    exitIdx >= 0
      ? createdChildren[exitIdx].id
      : createdChildren[createdChildren.length - 1].id;

  // Move lessons by preserving original lesson IDs so completions never get lost!
  const lessonToChild = new Map<string, string>();
  children.forEach((child, idx) => {
    const childId = createdChildren[idx].id;
    child.lessonIds.forEach((lid) => lessonToChild.set(lid, childId));
  });

  const nextLessons = db.lessons.map((l) => {
    const newOwner = lessonToChild.get(l.id);
    if (newOwner) return { ...l, conceptId: newOwner };
    // Any unassigned lesson of parent moves to first child
    if (l.conceptId === parent.id) return { ...l, conceptId: createdChildren[0].id };
    return l;
  });

  // Clone parent's quiz questions onto each child if needed so every child has a working quiz
  const parentQuestions = db.quizQuestions.filter((q) => q.conceptId === parent.id);
  const newQuestions: QuizQuestionRecord[] = [];
  const newKeys: Record<string, number> = {};

  createdChildren.forEach((child) => {
    parentQuestions.forEach((pq, idx) => {
      const qId = makeId('q');
      newQuestions.push({
        id: qId,
        conceptId: child.id,
        prompt: `[${child.title}] ${pq.prompt}`,
        options: [...pq.options],
        orderIndex: idx + 1,
      });
      newKeys[qId] = db.quizAnswerKeys[pq.id] ?? 0;
    });
  });

  // Re-point incoming (p -> parent) and outgoing (parent -> d) links
  const activeLinks = db.prerequisites.filter(
    (l) => l.courseId === courseId && l.removedAt === null
  );
  const incoming = activeLinks.filter((l) => l.conceptId === parent.id);
  const outgoing = activeLinks.filter((l) => l.prereqId === parent.id);

  const nextPrereqs = db.prerequisites.map((l) =>
    l.courseId === courseId &&
    l.removedAt === null &&
    (l.conceptId === parent.id || l.prereqId === parent.id)
      ? { ...l, removedAt: now }
      : l
  );

  // Incoming -> entry child(ren)
  incoming.forEach((l) => {
    resolvedEntryIds.forEach((entryId) => {
      nextPrereqs.push({
        id: makeId('link'),
        courseId,
        prereqId: l.prereqId,
        conceptId: entryId,
        createdAt: now,
        removedAt: null,
      });
    });
  });

  // Chain children in order c1 -> c2 -> ... -> ck
  for (let i = 0; i < createdChildren.length - 1; i++) {
    nextPrereqs.push({
      id: makeId('link'),
      courseId,
      prereqId: createdChildren[i].id,
      conceptId: createdChildren[i + 1].id,
      createdAt: now,
      removedAt: null,
    });
  }

  // Exit child -> outgoing dependents
  outgoing.forEach((l) => {
    nextPrereqs.push({
      id: makeId('link'),
      courseId,
      prereqId: exitId,
      conceptId: l.conceptId,
      createdAt: now,
      removedAt: null,
    });
  });

  // Archive parent concept
  const nextConcepts = [
    ...db.concepts.map((c) =>
      c.id === parent.id ? { ...c, status: 'archived' as const } : c
    ),
    ...createdChildren,
  ];

  // Auto-layout clean positions for newly added children while keeping intact overall structure
  const courseConceptsAfter = nextConcepts.filter((c) => c.courseId === courseId);
  const courseLinksAfter = nextPrereqs.filter(
    (l) => l.courseId === courseId && l.removedAt === null
  );
  const layoutPositions = computeDagLayout(courseConceptsAfter, courseLinksAfter);
  const positionedConcepts = nextConcepts.map((c) => {
    if (c.courseId === courseId && c.status === 'active' && layoutPositions[c.id]) {
      return { ...c, posX: layoutPositions[c.id].x, posY: layoutPositions[c.id].y };
    }
    return c;
  });

  // Grant mastery of every child to every learner who mastered parent (BR-11, RST-03)
  const beforeGraph = buildCourseGraph(db, courseId);
  const enrolledLearnerIds = Array.from(
    new Set(
      db.enrollments
        .filter((e) => e.courseId === courseId)
        .map((e) => e.learnerId)
    )
  );

  const newGrants = [...db.masteryGrants];
  for (const lid of enrolledLearnerIds) {
    const facts = buildLearnerFacts(db, lid);
    const states = conceptStates(beforeGraph, facts);
    if (states[parent.id]?.status === 'mastered') {
      createdChildren.forEach((child) => {
        newGrants.push({
          id: makeId('grant'),
          learnerId: lid,
          conceptId: child.id,
          sourceConceptId: parent.id,
          reason: 'split',
          createdAt: now,
        });
      });
    }
  }

  // Re-point any learner targeting the archived parent to exitId so their path stays meaningful
  const nextEnrollments = db.enrollments.map((e) =>
    e.courseId === courseId && e.targetConceptId === parent.id
      ? { ...e, targetConceptId: exitId }
      : e
  );

  const changeRecord: CourseChangeRecord = {
    id: makeId('chg'),
    courseId,
    version: nextVersion,
    kind: 'split_concept',
    summary: `Split '${parent.title}' into ${createdChildren.map((c) => c.title).join(' → ')}`,
    payload: {
      parentId: parent.id,
      parentTitle: parent.title,
      childIds: createdChildren.map((c) => c.id),
      childTitles: createdChildren.map((c) => c.title),
    },
    actorId,
    createdAt: now,
  };

  const nextDb: PathForgeDatabase = {
    ...db,
    courses: db.courses.map((c) =>
      c.id === courseId ? { ...c, graphVersion: nextVersion } : c
    ),
    concepts: positionedConcepts,
    prerequisites: nextPrereqs,
    lessons: nextLessons,
    quizQuestions: [...db.quizQuestions, ...newQuestions],
    quizAnswerKeys: { ...db.quizAnswerKeys, ...newKeys },
    enrollments: nextEnrollments,
    masteryGrants: newGrants,
    courseChanges: [changeRecord, ...db.courseChanges],
  };

  const notifs = notifyEnrolledLearners(db, nextDb, courseId, changeRecord);
  return {
    ok: true,
    data: { version: nextVersion, childIds: createdChildren.map((c) => c.id) },
    db: { ...nextDb, notifications: [...notifs, ...nextDb.notifications] },
  };
}

export function applySetThreshold(
  db: PathForgeDatabase,
  actorId: string,
  courseId: string,
  newThreshold: number,
  conceptId?: string
): StoreResult<{ version: number }> {
  const course = db.courses.find((c) => c.id === courseId);
  if (!course) return { ok: false, code: 'NOT_FOUND', message: 'Course not found.' };
  if (course.instructorId !== actorId) {
    return { ok: false, code: 'FORBIDDEN', message: 'Only the course instructor can update thresholds.' };
  }

  const clamped = Math.max(0, Math.min(100, Math.round(newThreshold)));
  const now = new Date().toISOString();
  const nextVersion = course.graphVersion + 1;

  const targetTitle = conceptId
    ? db.concepts.find((c) => c.id === conceptId)?.title ?? conceptId
    : course.title;

  const changeRecord: CourseChangeRecord = {
    id: makeId('chg'),
    courseId,
    version: nextVersion,
    kind: 'set_threshold',
    summary: `Updated pass threshold for ${targetTitle} to ${clamped}%`,
    payload: { threshold: clamped, conceptId: conceptId ?? null },
    actorId,
    createdAt: now,
  };

  const nextDb: PathForgeDatabase = {
    ...db,
    courses: db.courses.map((c) =>
      c.id === courseId
        ? {
            ...c,
            passThreshold: conceptId ? c.passThreshold : clamped,
            graphVersion: nextVersion,
          }
        : c
    ),
    concepts: db.concepts.map((c) =>
      conceptId && c.id === conceptId ? { ...c, passThreshold: clamped } : c
    ),
    courseChanges: [changeRecord, ...db.courseChanges],
  };

  const notifs = notifyEnrolledLearners(db, nextDb, courseId, changeRecord);
  return {
    ok: true,
    data: { version: nextVersion },
    db: { ...nextDb, notifications: [...notifs, ...nextDb.notifications] },
  };
}

export function applyArchiveConcept(
  db: PathForgeDatabase,
  actorId: string,
  courseId: string,
  conceptId: string
): StoreResult<{ version: number }> {
  const course = db.courses.find((c) => c.id === courseId);
  if (!course) return { ok: false, code: 'NOT_FOUND', message: 'Course not found.' };
  if (course.instructorId !== actorId) {
    return { ok: false, code: 'FORBIDDEN', message: 'Forbidden.' };
  }

  const target = db.concepts.find((c) => c.id === conceptId && c.courseId === courseId);
  if (!target) return { ok: false, code: 'NOT_FOUND', message: 'Concept not found.' };

  const now = new Date().toISOString();
  const nextVersion = course.graphVersion + 1;

  const changeRecord: CourseChangeRecord = {
    id: makeId('chg'),
    courseId,
    version: nextVersion,
    kind: 'archive_concept',
    summary: `Archived concept '${target.title}' (history retained)`,
    payload: { conceptId, title: target.title },
    actorId,
    createdAt: now,
  };

  const nextDb: PathForgeDatabase = {
    ...db,
    courses: db.courses.map((c) =>
      c.id === courseId ? { ...c, graphVersion: nextVersion } : c
    ),
    concepts: db.concepts.map((c) =>
      c.id === conceptId ? { ...c, status: 'archived' as const } : c
    ),
    prerequisites: db.prerequisites.map((l) =>
      l.courseId === courseId &&
      l.removedAt === null &&
      (l.prereqId === conceptId || l.conceptId === conceptId)
        ? { ...l, removedAt: now }
        : l
    ),
    courseChanges: [changeRecord, ...db.courseChanges],
  };

  const notifs = notifyEnrolledLearners(db, nextDb, courseId, changeRecord);
  return {
    ok: true,
    data: { version: nextVersion },
    db: { ...nextDb, notifications: [...notifs, ...nextDb.notifications] },
  };
}

export function previewImpactDryRun(
  beforeDb: PathForgeDatabase,
  simulatedResult: StoreResult<unknown>,
  courseId: string
): ImpactPreview | null {
  if (!simulatedResult.ok) return null;
  const afterDb = simulatedResult.db;
  const beforeGraph = buildCourseGraph(beforeDb, courseId);
  const afterGraph = buildCourseGraph(afterDb, courseId);
  const titles = { ...getTitleMap(beforeDb, courseId), ...getTitleMap(afterDb, courseId) };
  const enrollments = afterDb.enrollments.filter((e) => e.courseId === courseId);

  let affectedLearners = 0;
  let newlyUnlockedCount = 0;
  let newlyLockedCount = 0;
  const pathShifts: ImpactPreview['pathShifts'] = [];

  for (const enr of enrollments) {
    const beforeFacts = buildLearnerFacts(beforeDb, enr.learnerId);
    const afterFacts = buildLearnerFacts(afterDb, enr.learnerId);
    const snapBefore = snapshot(beforeGraph, beforeFacts, enr.targetConceptId);
    const snapAfter = snapshot(afterGraph, afterFacts, enr.targetConceptId);
    const diff = diffSnapshots(snapBefore, snapAfter);

    if (!diff.isEmpty) {
      affectedLearners += 1;
      newlyUnlockedCount += diff.newlyUnlocked.length;
      newlyLockedCount += diff.newlyLocked.length;

      const user = afterDb.users.find((u) => u.id === enr.learnerId);
      pathShifts.push({
        learnerName: user?.fullName ?? 'Learner',
        minutesBefore: diff.minutesBefore,
        minutesAfter: diff.minutesAfter,
        newlyUnlockedTitles: diff.newlyUnlocked.map((id) => titles[id] ?? id),
        newlyLockedTitles: diff.newlyLocked.map((id) => titles[id] ?? id),
      });
    }
  }

  return {
    affectedLearners,
    newlyUnlockedCount,
    newlyLockedCount,
    pathShifts,
  };
}

export function applyCreateLesson(
  db: PathForgeDatabase,
  conceptId: string,
  lesson: Omit<LessonRecord, 'id' | 'conceptId' | 'orderIndex'>
): PathForgeDatabase {
  const count = db.lessons.filter((l) => l.conceptId === conceptId).length;
  const created: LessonRecord = {
    id: makeId('lesson'),
    conceptId,
    title: lesson.title,
    kind: lesson.kind,
    body: lesson.body,
    videoUrl: lesson.videoUrl,
    durationMin: Math.max(1, Math.min(240, Math.round(lesson.durationMin))),
    orderIndex: count + 1,
  };
  return { ...db, lessons: [...db.lessons, created] };
}
