import { computeDagLayout } from '../lib/graph';

export type UserRole = 'instructor' | 'learner';

export interface UserProfile {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface CourseRecord {
  id: string;
  instructorId: string;
  title: string;
  description: string;
  passThreshold: number;
  quizMinutes: number;
  published: boolean;
  graphVersion: number;
  createdAt: string;
}

export interface ConceptRecord {
  id: string;
  courseId: string;
  title: string;
  description: string;
  status: 'active' | 'archived';
  orderIndex: number;
  posX: number;
  posY: number;
  passThreshold: number | null;
  parentConceptId: string | null;
}

export interface PrerequisiteRecord {
  id: string;
  courseId: string;
  prereqId: string;
  conceptId: string;
  createdAt: string;
  removedAt: string | null;
}

export interface LessonRecord {
  id: string;
  conceptId: string;
  title: string;
  kind: 'text' | 'video';
  body: string;
  videoUrl?: string;
  durationMin: number;
  orderIndex: number;
}

export interface QuizQuestionRecord {
  id: string;
  conceptId: string;
  prompt: string;
  options: string[];
  orderIndex: number;
}

export interface EnrollmentRecord {
  id: string;
  learnerId: string;
  courseId: string;
  targetConceptId: string | null;
  enrolledAt: string;
}

export interface LessonCompletionRecord {
  learnerId: string;
  lessonId: string;
  completedAt: string;
}

export interface QuizAttemptRecord {
  id: string;
  learnerId: string;
  conceptId: string;
  score: number;
  passed: boolean;
  thresholdUsed: number;
  answers: number[];
  graphVersion: number;
  createdAt: string;
}

export interface MasteryGrantRecord {
  id: string;
  learnerId: string;
  conceptId: string;
  sourceConceptId: string | null;
  reason: 'split' | 'manual';
  createdAt: string;
}

export type ChangeKind =
  | 'add_prereq'
  | 'remove_prereq'
  | 'split_concept'
  | 'archive_concept'
  | 'set_threshold'
  | 'create_concept'
  | 'move_lesson';

export interface CourseChangeRecord {
  id: string;
  courseId: string;
  version: number;
  kind: ChangeKind;
  summary: string;
  payload: Record<string, unknown>;
  actorId: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  courseId: string;
  changeId: string;
  title: string;
  body: string;
  diff: {
    newlyUnlocked: string[];
    newlyLocked: string[];
    newConcepts: string[];
    archivedConcepts: string[];
    pathBefore: string[];
    pathAfter: string[];
    minutesBefore: number;
    minutesAfter: number;
  };
  readAt: string | null;
  createdAt: string;
}

export interface PathForgeDatabase {
  users: UserProfile[];
  courses: CourseRecord[];
  concepts: ConceptRecord[];
  prerequisites: PrerequisiteRecord[];
  lessons: LessonRecord[];
  quizQuestions: QuizQuestionRecord[];
  /** Isolated answer key table: questionId -> correct option index (never sent to learner quiz UI) */
  quizAnswerKeys: Record<string, number>;
  enrollments: EnrollmentRecord[];
  lessonCompletions: LessonCompletionRecord[];
  quizAttempts: QuizAttemptRecord[];
  masteryGrants: MasteryGrantRecord[];
  courseChanges: CourseChangeRecord[];
  notifications: NotificationRecord[];
}

function makeFiveQuestionQuiz(
  conceptId: string,
  title: string,
  customQuestions?: { prompt: string; options: string[]; correctIndex: number }[]
): { questions: QuizQuestionRecord[]; keys: Record<string, number> } {
  const defaults = customQuestions ?? [
    {
      prompt: `What is the primary goal when applying ${title} in software engineering?`,
      options: [
        `Structure problem solving cleanly using ${title}`,
        'Eliminate all variable names from source code',
        'Disable compiler type checks globally',
        'Prevent functions from returning values',
      ],
      correctIndex: 0,
    },
    {
      prompt: `When studying ${title}, which habit prevents subtle runtime bugs?`,
      options: [
        'Ignoring boundary inputs and edge cases',
        `Tracing state transitions step by step for ${title}`,
        'Removing all comments and assertions',
        'Duplicating logic across unrelated files',
      ],
      correctIndex: 1,
    },
    {
      prompt: `Why do prerequisites come before ${title} in a concept graph?`,
      options: [
        'To force arbitrary waiting periods',
        'Because flat lists are impossible to render',
        `${title} builds directly on foundational mental models from earlier concepts`,
        'Only instructors are allowed to view earlier concepts',
      ],
      correctIndex: 2,
    },
    {
      prompt: `How should you verify mastery of ${title}?`,
      options: [
        'Skimming the title once without practice',
        'Deleting previous lessons',
        'Skipping directly to the final project',
        `Completing the lessons and proving understanding on the ${title} check`,
      ],
      correctIndex: 3,
    },
    {
      prompt: `Which statement best describes ${title} inside a modular program?`,
      options: [
        `It composes predictably with other concepts when preconditions are met`,
        'It only executes on Wednesdays',
        'It replaces hardware memory entirely',
        'It requires disabling loops and conditions',
      ],
      correctIndex: 0,
    },
  ];

  const questions: QuizQuestionRecord[] = [];
  const keys: Record<string, number> = {};

  defaults.forEach((q, idx) => {
    const qId = `${conceptId}-q${idx + 1}`;
    questions.push({
      id: qId,
      conceptId,
      prompt: q.prompt,
      options: q.options,
      orderIndex: idx + 1,
    });
    keys[qId] = q.correctIndex;
  });

  return { questions, keys };
}

export function createSeedDatabase(): PathForgeDatabase {
  const now = '2026-11-17T10:00:00.000Z';

  const users: UserProfile[] = [
    {
      id: 'user-instructor',
      email: 'instructor@demo.com',
      password: 'Demo@1234',
      fullName: 'Priya Sharma',
      role: 'instructor',
      createdAt: now,
    },
    {
      id: 'user-learner',
      email: 'learner@demo.com',
      password: 'Demo@1234',
      fullName: 'Arjun Patel',
      role: 'learner',
      createdAt: now,
    },
    {
      id: 'user-newbie',
      email: 'newbie@demo.com',
      password: 'Demo@1234',
      fullName: 'Sam Rivera',
      role: 'learner',
      createdAt: now,
    },
  ];

  const courses: CourseRecord[] = [
    {
      id: 'course-prog',
      instructorId: 'user-instructor',
      title: 'Programming Foundations',
      description:
        'A 14-concept prerequisite graph from first principles to Recursion and Divide & Conquer.',
      passThreshold: 70,
      quizMinutes: 5,
      published: true,
      graphVersion: 1,
      createdAt: now,
    },
    {
      id: 'course-web',
      instructorId: 'user-instructor',
      title: 'Web Basics',
      description:
        'Semantic HTML, CSS layout mechanics, the DOM tree, and event-driven browser interfaces.',
      passThreshold: 70,
      quizMinutes: 5,
      published: true,
      graphVersion: 1,
      createdAt: now,
    },
    {
      id: 'course-data',
      instructorId: 'user-instructor',
      title: 'Data Thinking',
      description:
        'Structured inquiry from distributions and sampling bias to hypothesis testing.',
      passThreshold: 70,
      quizMinutes: 5,
      published: true,
      graphVersion: 1,
      createdAt: now,
    },
  ];

  // 14 concepts for Programming Foundations matching Doc 01 Section 7
  const progConceptDefs: {
    id: string;
    title: string;
    description: string;
    lessons: { title: string; kind: 'text' | 'video'; min: number; body: string; videoUrl?: string }[];
    customQuiz?: { prompt: string; options: string[]; correctIndex: number }[];
  }[] = [
    {
      id: 'c1',
      title: 'Intro to Programming',
      description: 'How computers execute step-by-step instructions, algorithms, and syntax.',
      lessons: [
        {
          title: 'What Is an Algorithm?',
          kind: 'text',
          min: 7,
          body: 'An algorithm is a finite, unambiguous sequence of steps that transforms inputs into outputs. Before writing code, engineers break messy real-world tasks into deterministic instructions.',
        },
        {
          title: 'From Source Code to Execution',
          kind: 'video',
          min: 8,
          body: 'Walkthrough of how interpreters and compilers translate human-readable code into machine operations.',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
      ],
    },
    {
      id: 'c2',
      title: 'Variables',
      description: 'Named memory bindings, reassignment, and scope lifetimes.',
      lessons: [
        {
          title: 'Binding Names to Values',
          kind: 'text',
          min: 10,
          body: 'Variables give meaningful names to values in memory. Prefer immutable bindings (`const`) by default and reserve mutable bindings (`let`) for values that legitimately evolve.',
        },
        {
          title: 'Memory Model & Reassignment',
          kind: 'text',
          min: 10,
          body: 'Tracing how variable references point to values prevents aliasing surprises when passing data through larger programs.',
        },
      ],
    },
    {
      id: 'c3',
      title: 'Data Types and Operators',
      description: 'Primitives, booleans, arithmetic, and type coercion.',
      lessons: [
        {
          title: 'Numbers, Strings & Booleans',
          kind: 'text',
          min: 8,
          body: 'Types define both the set of valid values and the operations permitted on them.',
        },
        {
          title: 'Arithmetic & Comparison Operators',
          kind: 'text',
          min: 9,
          body: 'Use strict equality (`===`) and explicit conversions to avoid subtle coercion bugs.',
        },
        {
          title: 'Logical Truth Tables',
          kind: 'text',
          min: 8,
          body: 'Master AND, OR, NOT, and short-circuit evaluation for reliable branching expressions.',
        },
      ],
    },
    {
      id: 'c4',
      title: 'Input and Output',
      description: 'Reading structured input, formatting output, and validation boundaries.',
      lessons: [
        {
          title: 'Standard Streams & Parsing',
          kind: 'text',
          min: 7,
          body: 'Programs interact with users and systems through clean input parsing and structured output formatting.',
        },
        {
          title: 'Validating External Input',
          kind: 'text',
          min: 8,
          body: 'Never trust raw user strings—parse and validate boundaries before core computation runs.',
        },
      ],
    },
    {
      id: 'c5',
      title: 'Conditionals',
      description: 'Branching logic, guard clauses, and exhaustive decision trees.',
      lessons: [
        {
          title: 'If / Else Branching',
          kind: 'text',
          min: 8,
          body: 'Control flow diverges based on boolean predicates evaluated at runtime.',
        },
        {
          title: 'Guard Clauses & Early Returns',
          kind: 'text',
          min: 8,
          body: 'Flatten deeply nested conditionals by handling invalid or base states up front.',
        },
        {
          title: 'Pattern & Switch Dispatch',
          kind: 'text',
          min: 9,
          body: 'When selecting among discrete variants, structured switch statements keep intent clear.',
        },
      ],
    },
    {
      id: 'c6',
      title: 'Loops',
      description: 'Deterministic iteration, while-conditions, and loop invariants.',
      lessons: [
        {
          title: 'For Loops & Bounded Ranges',
          kind: 'text',
          min: 10,
          body: 'Use `for` loops when traversing known bounds or indexed sequences cleanly.',
        },
        {
          title: 'While Loops & Termination',
          kind: 'text',
          min: 10,
          body: 'Every `while` loop must make measurable progress toward a terminating condition to avoid infinite loops.',
        },
        {
          title: 'Loop Invariants & Nested Iteration',
          kind: 'video',
          min: 10,
          body: 'Visualizing how inner and outer loop counters evolve across 2D grids.',
          videoUrl: 'https://www.youtube.com/watch?v=loop-invariants-demo',
        },
      ],
      customQuiz: [
        {
          prompt: 'What guarantees that a while-loop eventually terminates?',
          options: [
            'The loop body advances state toward making the loop condition false',
            'Writing at least three nested loops inside it',
            'Declaring all variables outside the function',
            'Using floating-point counters exclusively',
          ],
          correctIndex: 0,
        },
        {
          prompt: 'Which loop construct is clearest when iterating a fixed index range 0..n-1?',
          options: ['A recursive goto', 'A bounded for-loop', 'An infinite while(true)', 'A switch statement'],
          correctIndex: 1,
        },
        {
          prompt: 'What does `break` do inside a loop?',
          options: [
            'Restarts the entire program',
            'Skips only the next line',
            'Exits the enclosing loop immediately',
            'Doubles the loop counter',
          ],
          correctIndex: 2,
        },
        {
          prompt: 'What is a loop invariant?',
          options: [
            'A syntax error in the loop header',
            'A variable that cannot be read inside the loop',
            'An external API call',
            'A condition that holds true before and after every iteration',
          ],
          correctIndex: 3,
        },
        {
          prompt: 'What happens if an outer loop runs N times and an inner loop runs M times?',
          options: [
            'The inner body executes N × M times',
            'The inner body executes N + M times',
            'The outer loop never finishes',
            'Only the inner loop runs',
          ],
          correctIndex: 0,
        },
      ],
    },
    {
      id: 'c7',
      title: 'Lists and Arrays',
      description: 'Contiguous sequences, indexing, slicing, and linear traversal.',
      lessons: [
        {
          title: 'Indexed Collections in Memory',
          kind: 'text',
          min: 10,
          body: 'Arrays provide O(1) indexed access by storing elements sequentially.',
        },
        {
          title: 'Map, Filter & Reduce Patterns',
          kind: 'text',
          min: 10,
          body: 'Expressive collection transforms eliminate off-by-one indexing mistakes.',
        },
        {
          title: 'Mutation vs Immutable Updates',
          kind: 'text',
          min: 10,
          body: 'Know when in-place mutation is warranted versus returning fresh arrays.',
        },
      ],
    },
    {
      id: 'c8',
      title: 'Strings',
      description: 'Character encodings, immutability, slicing, and text parsing.',
      lessons: [
        {
          title: 'Unicode & String Immutability',
          kind: 'text',
          min: 10,
          body: 'Understanding UTF-16/UTF-8 code points and why string operations produce new strings.',
        },
        {
          title: 'Tokenizing & Pattern Matching',
          kind: 'text',
          min: 10,
          body: 'Splitting, trimming, and normalizing text cleanly in real parsers.',
        },
      ],
    },
    {
      id: 'c9',
      title: 'Functions',
      description: 'Abstraction boundaries, parameters, return values, and pure composition.',
      lessons: [
        {
          title: 'Function Anatomy & Decomposition',
          kind: 'text',
          min: 10,
          body: 'Functions package cohesive behavior behind clear contracts so complex systems stay readable.',
        },
        {
          title: 'Parameters, Arguments & Return Values',
          kind: 'text',
          min: 12,
          body: 'Pass explicit inputs and return explicit results instead of relying on hidden global state.',
        },
        {
          title: 'Pure Functions & Testing',
          kind: 'text',
          min: 13,
          body: 'Deterministic functions with no side effects are effortless to reason about and unit test.',
        },
      ],
    },
    {
      id: 'c10',
      title: 'Scope and Call Stack',
      description: 'Lexical closures, stack frames, and execution lifetimes.',
      lessons: [
        {
          title: 'Lexical Scope & Closures',
          kind: 'text',
          min: 12,
          body: 'Inner scopes resolve bindings upward through enclosing lexical environments.',
        },
        {
          title: 'Call Stack Frames Visualized',
          kind: 'video',
          min: 13,
          body: 'Step-by-step animation of push/pop stack frames as functions invoke one another.',
          videoUrl: 'https://www.youtube.com/watch?v=call-stack-demo',
        },
      ],
    },
    {
      id: 'c11',
      title: 'Recursion',
      description: 'Self-referential decomposition, base cases, and structural induction.',
      lessons: [
        {
          title: 'Base Case & Recursive Step',
          kind: 'text',
          min: 12,
          body: 'Every valid recursive function defines a terminating base case and reduces each call strictly closer to it.',
        },
        {
          title: 'Tracing Recursive Trees',
          kind: 'text',
          min: 14,
          body: 'Follow how stack frames unwind from leaf calls back up to the root.',
        },
        {
          title: 'Memoization & Tail Thinking',
          kind: 'text',
          min: 14,
          body: 'Cache overlapping subproblems to transform exponential recursion into linear time.',
        },
      ],
    },
    {
      id: 'c12',
      title: 'Sorting Basics',
      description: 'Comparison invariants, insertion sort, selection sort, and stability.',
      lessons: [
        {
          title: 'Ordering Invariants',
          kind: 'text',
          min: 10,
          body: 'Compare quadratic elementary sorts and understand why stability matters for multi-key data.',
        },
        {
          title: 'Insertion & Selection Mechanics',
          kind: 'text',
          min: 12,
          body: 'Trace element swaps and sorted-prefix growth step by step.',
        },
        {
          title: 'Time & Space Tradeoffs',
          kind: 'text',
          min: 13,
          body: 'Benchmark best, average, and worst-case inputs across real array sizes.',
        },
      ],
    },
    {
      id: 'c13',
      title: 'Searching Algorithms',
      description: 'Linear scans vs binary search on monotonic domains.',
      lessons: [
        {
          title: 'Linear Scan vs Sorted Search',
          kind: 'text',
          min: 12,
          body: 'When data is unsorted, linear inspection is optimal; once ordered, we can halve the search space.',
        },
        {
          title: 'Binary Search Midpoint Precision',
          kind: 'text',
          min: 13,
          body: 'Master loop bounds (`lo <= hi`) to eliminate infinite binary search bugs forever.',
        },
      ],
    },
    {
      id: 'c14',
      title: 'Divide and Conquer',
      description: 'Merge sort, quicksort partitioning, and recurrence relations.',
      lessons: [
        {
          title: 'Split, Solve & Combine',
          kind: 'text',
          min: 12,
          body: 'Partitioning a problem into independent subproblems unlocks O(n log n) scalability.',
        },
        {
          title: 'Merge Sort & Quicksort',
          kind: 'text',
          min: 14,
          body: 'Compare guaranteed O(n log n) merging against in-place pivot partitioning.',
        },
        {
          title: 'Analyzing Recurrences',
          kind: 'text',
          min: 14,
          body: 'Count work per recursion tree level to reason confidently about asymptotic cost.',
        },
      ],
    },
  ];

  const progLinksRaw: [string, string][] = [
    ['c1', 'c2'],
    ['c2', 'c3'],
    ['c2', 'c4'],
    ['c3', 'c5'],
    ['c4', 'c5'],
    ['c5', 'c6'],
    ['c6', 'c7'],
    ['c6', 'c8'],
    ['c6', 'c9'],
    ['c9', 'c10'],
    ['c9', 'c11'],
    ['c10', 'c11'],
    ['c7', 'c12'],
    ['c9', 'c12'],
    ['c7', 'c13'],
    ['c9', 'c13'],
    ['c11', 'c14'],
    ['c13', 'c14'],
  ];

  // Course 2: Web Basics (5 concepts)
  const webConceptDefs = [
    { id: 'w1', title: 'HTML Document Tree', desc: 'Semantic tags, landmarks, and accessibility tree basics.', min: 15 },
    { id: 'w2', title: 'CSS Box Model', desc: 'Padding, borders, margins, and layout sizing.', min: 20 },
    { id: 'w3', title: 'Flexbox & Grid', desc: 'Responsive 1D and 2D spatial alignment.', min: 25 },
    { id: 'w4', title: 'DOM Manipulation', desc: 'Querying nodes and updating UI state safely.', min: 20 },
    { id: 'w5', title: 'Browser Events', desc: 'Bubbling, delegation, and keyboard accessibility.', min: 20 },
  ];
  const webLinksRaw: [string, string][] = [
    ['w1', 'w2'],
    ['w2', 'w3'],
    ['w1', 'w4'],
    ['w4', 'w5'],
  ];

  // Course 3: Data Thinking (4 concepts)
  const dataConceptDefs = [
    { id: 'd1', title: 'Asking Measurable Questions', desc: 'Framing crisp hypotheses and operational metrics.', min: 15 },
    { id: 'd2', title: 'Distributions & Variance', desc: 'Medians, percentiles, and long-tail behavior.', min: 20 },
    { id: 'd3', title: 'Sampling & Bias', desc: 'Selection bias, survivorship, and clean study design.', min: 20 },
    { id: 'd4', title: 'Hypothesis Testing', desc: 'Confidence intervals, effect size, and decision thresholds.', min: 25 },
  ];
  const dataLinksRaw: [string, string][] = [
    ['d1', 'd2'],
    ['d1', 'd3'],
    ['d2', 'd4'],
    ['d3', 'd4'],
  ];

  const concepts: ConceptRecord[] = [];
  const prerequisites: PrerequisiteRecord[] = [];
  const lessons: LessonRecord[] = [];
  const quizQuestions: QuizQuestionRecord[] = [];
  const quizAnswerKeys: Record<string, number> = {};

  // Build Programming Foundations concepts, lessons, quizzes
  progConceptDefs.forEach((def, idx) => {
    concepts.push({
      id: def.id,
      courseId: 'course-prog',
      title: def.title,
      description: def.description,
      status: 'active',
      orderIndex: idx + 1,
      posX: 0,
      posY: 0,
      passThreshold: null,
      parentConceptId: null,
    });

    def.lessons.forEach((l, lIdx) => {
      lessons.push({
        id: `${def.id}-l${lIdx + 1}`,
        conceptId: def.id,
        title: l.title,
        kind: l.kind,
        body: l.body,
        videoUrl: l.videoUrl,
        durationMin: l.min,
        orderIndex: lIdx + 1,
      });
    });

    const { questions, keys } = makeFiveQuestionQuiz(def.id, def.title, def.customQuiz);
    quizQuestions.push(...questions);
    Object.assign(quizAnswerKeys, keys);
  });

  progLinksRaw.forEach(([prereqId, conceptId], idx) => {
    prerequisites.push({
      id: `link-prog-${idx + 1}`,
      courseId: 'course-prog',
      prereqId,
      conceptId,
      createdAt: now,
      removedAt: null,
    });
  });

  // Web Basics
  webConceptDefs.forEach((def, idx) => {
    concepts.push({
      id: def.id,
      courseId: 'course-web',
      title: def.title,
      description: def.desc,
      status: 'active',
      orderIndex: idx + 1,
      posX: 0,
      posY: 0,
      passThreshold: null,
      parentConceptId: null,
    });
    lessons.push({
      id: `${def.id}-l1`,
      conceptId: def.id,
      title: `${def.title} Essentials`,
      kind: 'text',
      body: def.desc,
      durationMin: def.min,
      orderIndex: 1,
    });
    const { questions, keys } = makeFiveQuestionQuiz(def.id, def.title);
    quizQuestions.push(...questions);
    Object.assign(quizAnswerKeys, keys);
  });
  webLinksRaw.forEach(([prereqId, conceptId], idx) => {
    prerequisites.push({
      id: `link-web-${idx + 1}`,
      courseId: 'course-web',
      prereqId,
      conceptId,
      createdAt: now,
      removedAt: null,
    });
  });

  // Data Thinking
  dataConceptDefs.forEach((def, idx) => {
    concepts.push({
      id: def.id,
      courseId: 'course-data',
      title: def.title,
      description: def.desc,
      status: 'active',
      orderIndex: idx + 1,
      posX: 0,
      posY: 0,
      passThreshold: null,
      parentConceptId: null,
    });
    lessons.push({
      id: `${def.id}-l1`,
      conceptId: def.id,
      title: `${def.title} Studio`,
      kind: 'text',
      body: def.desc,
      durationMin: def.min,
      orderIndex: 1,
    });
    const { questions, keys } = makeFiveQuestionQuiz(def.id, def.title);
    quizQuestions.push(...questions);
    Object.assign(quizAnswerKeys, keys);
  });
  dataLinksRaw.forEach(([prereqId, conceptId], idx) => {
    prerequisites.push({
      id: `link-data-${idx + 1}`,
      courseId: 'course-data',
      prereqId,
      conceptId,
      createdAt: now,
      removedAt: null,
    });
  });

  // Compute clean initial DAG node coordinates per course
  for (const course of courses) {
    const courseConcepts = concepts.filter((c) => c.courseId === course.id);
    const courseLinks = prerequisites.filter((l) => l.courseId === course.id && !l.removedAt);
    const positions = computeDagLayout(courseConcepts, courseLinks);
    for (const c of courseConcepts) {
      const pos = positions[c.id];
      if (pos) {
        c.posX = pos.x;
        c.posY = pos.y;
      }
    }
  }

  // Demo learner (Arjun) enrolled in Programming Foundations, target = C11 Recursion, C1-C5 mastered
  const enrollments: EnrollmentRecord[] = [
    {
      id: 'enr-arjun-prog',
      learnerId: 'user-learner',
      courseId: 'course-prog',
      targetConceptId: 'c11',
      enrolledAt: now,
    },
    {
      id: 'enr-sam-prog',
      learnerId: 'user-newbie',
      courseId: 'course-prog',
      targetConceptId: 'c6',
      enrolledAt: now,
    },
  ];

  const masteredForArjun = [
    { conceptId: 'c1', score: 92 },
    { conceptId: 'c2', score: 85 },
    { conceptId: 'c3', score: 88 },
    { conceptId: 'c4', score: 80 },
    { conceptId: 'c5', score: 95 },
  ];

  const lessonCompletions: LessonCompletionRecord[] = [];
  const quizAttempts: QuizAttemptRecord[] = [];

  masteredForArjun.forEach((m, idx) => {
    const conceptLessons = lessons.filter((l) => l.conceptId === m.conceptId);
    conceptLessons.forEach((l) => {
      lessonCompletions.push({
        learnerId: 'user-learner',
        lessonId: l.id,
        completedAt: now,
      });
    });

    quizAttempts.push({
      id: `attempt-seed-${idx + 1}`,
      learnerId: 'user-learner',
      conceptId: m.conceptId,
      score: m.score,
      passed: true,
      thresholdUsed: 70,
      answers: [0, 1, 2, 3, 0],
      graphVersion: 1,
      createdAt: now,
    });
  });

  const courseChanges: CourseChangeRecord[] = [
    {
      id: 'change-seed-1',
      courseId: 'course-prog',
      version: 1,
      kind: 'create_concept',
      summary: 'Initial curriculum graph published with 14 concepts and 18 prerequisite links.',
      payload: { conceptsCount: 14, linksCount: 18 },
      actorId: 'user-instructor',
      createdAt: now,
    },
  ];

  return {
    users,
    courses,
    concepts,
    prerequisites,
    lessons,
    quizQuestions,
    quizAnswerKeys,
    enrollments,
    lessonCompletions,
    quizAttempts,
    masteryGrants: [],
    courseChanges,
    notifications: [],
  };
}
