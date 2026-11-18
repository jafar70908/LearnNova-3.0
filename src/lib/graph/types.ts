export type ConceptStatus = 'active' | 'archived';

export interface Concept {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  status: ConceptStatus;
  passThreshold: number | null;
  posX?: number;
  posY?: number;
  parentConceptId?: string | null;
}

export interface Link {
  prereqId: string;
  conceptId: string;
}

export interface Lesson {
  id: string;
  conceptId: string;
  title: string;
  kind: 'text' | 'video';
  body: string;
  videoUrl?: string;
  durationMin: number;
  orderIndex: number;
}

export interface Facts {
  bestScore: Record<string, number>;
  everPassed: Set<string>;
  grants: Set<string>;
  completedLessons: Set<string>;
}

export interface Graph {
  concepts: Concept[];
  links: Link[];
  lessons: Lesson[];
  courseThreshold: number;
  quizMinutes: number;
}

export interface MissingPrerequisite {
  id: string;
  title: string;
  best: number | null;
  required: number;
}

export interface ConceptState {
  status: 'mastered' | 'unlocked' | 'locked';
  missing: MissingPrerequisite[];
  note?: string;
}

export interface PathStep {
  id: string;
  title: string;
  lessonMinutes: number;
  quizMinutes: number;
  unlocked: boolean;
}

export interface PathResult {
  steps: PathStep[];
  totalMinutes: number;
  alreadyMastered: boolean;
}

export interface Snapshot {
  states: Record<string, ConceptState['status']>;
  activeConceptIds: string[];
  path: string[];
  minutes: number;
  targetId: string | null;
}

export interface ChangeDiff {
  newlyUnlocked: string[];
  newlyLocked: string[];
  newConcepts: string[];
  archivedConcepts: string[];
  pathBefore: string[];
  pathAfter: string[];
  minutesBefore: number;
  minutesAfter: number;
  isEmpty: boolean;
}
