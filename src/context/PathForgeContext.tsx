import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createSeedDatabase,
  type CourseRecord,
  type LessonRecord,
  type NotificationRecord,
  type PathForgeDatabase,
  type QuizQuestionRecord,
  type UserProfile,
  type UserRole,
} from '../data/seedPathForge';
import { computeDagLayout } from '../lib/graph';
import {
  applyAddPrerequisite,
  applyArchiveConcept,
  applyCreateLesson,
  applyEnroll,
  applyRemovePrerequisite,
  applySetTarget,
  applySetThreshold,
  applySplitConcept,
  applySubmitQuiz,
  applyToggleLesson,
  applyUnenroll,
  previewImpactDryRun,
  type ImpactPreview,
  type QuizSubmissionResult,
  type SplitChildInput,
  type StoreResult,
} from '../lib/store/pathforgeStore';

const DB_STORAGE_KEY = 'pathforge_db_v1';
const USER_STORAGE_KEY = 'pathforge_user_v1';
const AUTH_STORAGE_KEY = 'pathforge_auth_v1';

interface ToastBanner {
  id: string;
  title: string;
  body: string;
  tone: 'info' | 'success' | 'error';
}

interface PathForgeContextValue {
  db: PathForgeDatabase;
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  unreadCount: number;
  myNotifications: NotificationRecord[];
  toast: ToastBanner | null;
  dismissToast: () => void;
  showToast: (title: string, body: string, tone?: ToastBanner['tone']) => void;
  loginWithPassword: (
    email: string,
    password: string
  ) => { ok: true; user: UserProfile } | { ok: false; error: string };
  signupWithStepper: (input: {
    role: UserRole;
    fullName: string;
    email: string;
    password: string;
  }) => { ok: true; user: UserProfile } | { ok: false; error: string };
  signOut: () => void;
  switchDemoUser: (userId: string) => void;
  resetDemoData: () => void;
  enroll: (courseId: string) => void;
  unenroll: (courseId: string) => void;
  setTarget: (courseId: string, conceptId: string | null) => void;
  toggleLesson: (lessonId: string) => void;
  submitQuiz: (
    conceptId: string,
    answers: number[]
  ) => StoreResult<QuizSubmissionResult>;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  createCourse: (input: {
    title: string;
    description: string;
    passThreshold: number;
  }) => CourseRecord | null;
  togglePublishCourse: (courseId: string) => void;
  createConcept: (
    courseId: string,
    input: { title: string; description: string; passThreshold?: number | null }
  ) => void;
  updateConceptPosition: (conceptId: string, posX: number, posY: number) => void;
  autoLayoutCourse: (courseId: string) => void;
  createLesson: (
    conceptId: string,
    lesson: Omit<LessonRecord, 'id' | 'conceptId' | 'orderIndex'>
  ) => void;
  moveLesson: (lessonId: string, targetConceptId: string) => void;
  addQuizQuestion: (
    conceptId: string,
    input: { prompt: string; options: string[]; correctIndex: number }
  ) => void;
  addPrerequisite: (
    courseId: string,
    prereqId: string,
    conceptId: string
  ) => StoreResult<{ version: number }>;
  removePrerequisite: (
    courseId: string,
    prereqId: string,
    conceptId: string
  ) => StoreResult<{ version: number }>;
  splitConcept: (
    courseId: string,
    parentConceptId: string,
    children: SplitChildInput[]
  ) => StoreResult<{ version: number; childIds: string[] }>;
  setThreshold: (
    courseId: string,
    threshold: number,
    conceptId?: string
  ) => StoreResult<{ version: number }>;
  archiveConcept: (
    courseId: string,
    conceptId: string
  ) => StoreResult<{ version: number }>;
  previewAddLinkImpact: (
    courseId: string,
    prereqId: string,
    conceptId: string
  ) => ImpactPreview | null;
  previewRemoveLinkImpact: (
    courseId: string,
    prereqId: string,
    conceptId: string
  ) => ImpactPreview | null;
  previewSplitImpact: (
    courseId: string,
    parentConceptId: string,
    children: SplitChildInput[]
  ) => ImpactPreview | null;
}

const PathForgeContext = createContext<PathForgeContextValue | null>(null);

function loadInitialDb(): PathForgeDatabase {
  if (typeof window === 'undefined') return createSeedDatabase();
  try {
    const raw = window.localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PathForgeDatabase;
      if (parsed && Array.isArray(parsed.courses) && Array.isArray(parsed.concepts)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to clean seed
  }
  return createSeedDatabase();
}

export function PathForgeProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [db, setDb] = useState<PathForgeDatabase>(loadInitialDb);
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'user-learner';
    return window.localStorage.getItem(USER_STORAGE_KEY) || 'user-learner';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(AUTH_STORAGE_KEY) !== 'false';
  });
  const [toast, setToast] = useState<ToastBanner | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Ignore quota issues in strict sandboxes
    }
  }, [db]);

  useEffect(() => {
    try {
      window.localStorage.setItem(USER_STORAGE_KEY, currentUserId);
    } catch {
      // Ignore
    }
  }, [currentUserId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, isAuthenticated ? 'true' : 'false');
    } catch {
      // Ignore
    }
  }, [isAuthenticated]);

  const currentUser = useMemo<UserProfile | null>(() => {
    if (!isAuthenticated) return null;
    return (
      db.users.find((u) => u.id === currentUserId) ??
      db.users.find((u) => u.id === 'user-learner') ??
      db.users[0] ??
      null
    );
  }, [isAuthenticated, db.users, currentUserId]);

  const myNotifications = useMemo(() => {
    if (!currentUser) return [];
    return db.notifications
      .filter((n) => n.userId === currentUser.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [db.notifications, currentUser]);

  const unreadCount = useMemo(
    () => myNotifications.filter((n) => n.readAt === null).length,
    [myNotifications]
  );

  const dismissToast = useCallback(() => setToast(null), []);

  const showToast = useCallback(
    (title: string, body: string, tone: ToastBanner['tone'] = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToast({ id, title, body, tone });
      window.setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 6000);
    },
    []
  );

  const requireAuth = useCallback(
    (message = 'Please sign in as a Learner to enroll, access lessons, and track mastery.') => {
      showToast('Sign in required', message, 'error');
      navigate('/auth');
    },
    [navigate, showToast]
  );

  const loginWithPassword = useCallback(
    (email: string, password: string) => {
      const normalized = email.trim().toLowerCase();
      const user = db.users.find(
        (u) => u.email.toLowerCase() === normalized && u.password === password
      );
      if (!user) {
        return { ok: false as const, error: 'Invalid email or password.' };
      }
      setCurrentUserId(user.id);
      setIsAuthenticated(true);
      return { ok: true as const, user };
    },
    [db.users]
  );

  const signupWithStepper = useCallback(
    (input: { role: UserRole; fullName: string; email: string; password: string }) => {
      const normalized = input.email.trim().toLowerCase();
      if (db.users.some((u) => u.email.toLowerCase() === normalized)) {
        return { ok: false as const, error: 'An account with this email already exists.' };
      }
      const newUser: UserProfile = {
        id: `user-${Date.now().toString(36)}`,
        email: input.email.trim(),
        password: input.password,
        fullName: input.fullName.trim(),
        role: input.role,
        createdAt: new Date().toISOString(),
      };
      setDb((prev) => ({ ...prev, users: [...prev.users, newUser] }));
      setCurrentUserId(newUser.id);
      setIsAuthenticated(true);
      return { ok: true as const, user: newUser };
    },
    [db.users]
  );

  const signOut = useCallback(() => {
    setIsAuthenticated(false);
    showToast('Signed out', 'Use Account to sign back in as Learner or Instructor.', 'info');
  }, [showToast]);

  const switchDemoUser = useCallback(
    (userId: string) => {
      const target = db.users.find((u) => u.id === userId);
      if (!target) return;
      setCurrentUserId(target.id);
      setIsAuthenticated(true);
      const unread = db.notifications.filter(
        (n) => n.userId === target.id && n.readAt === null
      );
      if (unread.length > 0) {
        showToast(
          unread[0].title,
          unread[0].body,
          unread[0].diff.newlyUnlocked.length > 0 ? 'success' : 'info'
        );
      } else {
        showToast(
          `Signed in as ${target.fullName}`,
          `Active workspace role: ${target.role}`,
          'info'
        );
      }
    },
    [db.users, db.notifications, showToast]
  );

  const resetDemoData = useCallback(() => {
    const fresh = createSeedDatabase();
    setDb(fresh);
    setCurrentUserId('user-learner');
    setIsAuthenticated(true);
    showToast('Demo state reset', 'Seeded 14-concept graph and learner progress restored.', 'info');
  }, [showToast]);

  const enroll = useCallback(
    (courseId: string) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth();
        return;
      }
      const res = applyEnroll(db, currentUser.id, courseId);
      if (res.ok) {
        setDb(res.db);
        const title = db.courses.find((c) => c.id === courseId)?.title ?? 'Course';
        showToast('Enrolled', `You are now enrolled in ${title}.`, 'success');
      }
    },
    [isAuthenticated, currentUser, db, requireAuth, showToast]
  );

  const unenroll = useCallback(
    (courseId: string) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth();
        return;
      }
      const res = applyUnenroll(db, currentUser.id, courseId);
      if (res.ok) {
        setDb(res.db);
        showToast('Unenrolled', 'Your progress is safely retained if you return later.', 'info');
      }
    },
    [isAuthenticated, currentUser, db, requireAuth, showToast]
  );

  const setTarget = useCallback(
    (courseId: string, conceptId: string | null) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth();
        return;
      }
      const res = applySetTarget(db, currentUser.id, courseId, conceptId);
      if (res.ok) setDb(res.db);
    },
    [isAuthenticated, currentUser, db, requireAuth]
  );

  const toggleLesson = useCallback(
    (lessonId: string) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth();
        return;
      }
      const res = applyToggleLesson(db, currentUser.id, lessonId);
      if (res.ok) setDb(res.db);
    },
    [isAuthenticated, currentUser, db, requireAuth]
  );

  const submitQuiz = useCallback(
    (conceptId: string, answers: number[]) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth();
        return {
          ok: false as const,
          code: 'FORBIDDEN' as const,
          message: 'Please sign in as a Learner to enroll, access lessons, and track mastery.',
        };
      }
      const res = applySubmitQuiz(db, currentUser.id, conceptId, answers);
      if (res.ok) {
        setDb(res.db);
        if (res.data.passed) {
          showToast(
            'Concept mastered',
            `Scored ${res.data.percentage}% (${res.data.obtainedMarks}/${res.data.maxMarks} marks) — dependent concepts unlocked.`,
            'success'
          );
        } else {
          showToast(
            'Quiz submitted',
            `Scored ${res.data.percentage}% (${res.data.obtainedMarks}/${res.data.maxMarks} marks). Need ${res.data.thresholdUsed}% to master.`,
            'info'
          );
        }
      } else {
        showToast('Could not submit quiz', res.message, 'error');
      }
      return res;
    },
    [isAuthenticated, currentUser, db, requireAuth, showToast]
  );

  const markNotificationRead = useCallback(
    (notifId: string) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth();
        return;
      }
      const now = new Date().toISOString();
      setDb((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === notifId && n.userId === currentUser.id && n.readAt === null
            ? { ...n, readAt: now }
            : n
        ),
      }));
    },
    [isAuthenticated, currentUser, requireAuth]
  );

  const markAllNotificationsRead = useCallback(() => {
    if (!isAuthenticated || !currentUser) {
      requireAuth();
      return;
    }
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.userId === currentUser.id && n.readAt === null ? { ...n, readAt: now } : n
      ),
    }));
  }, [isAuthenticated, currentUser, requireAuth]);

  const createCourse = useCallback(
    (input: { title: string; description: string; passThreshold: number }) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth('Please sign in as an Instructor to create courses.');
        return null;
      }
      const created: CourseRecord = {
        id: `course-${Date.now().toString(36)}`,
        instructorId: currentUser.id,
        title: input.title.trim(),
        description: input.description.trim(),
        passThreshold: Math.max(0, Math.min(100, Math.round(input.passThreshold))),
        quizMinutes: 5,
        published: true,
        graphVersion: 1,
        createdAt: new Date().toISOString(),
      };
      setDb((prev) => ({ ...prev, courses: [created, ...prev.courses] }));
      showToast('Course created', `${created.title} is live for concept authoring.`, 'success');
      return created;
    },
    [isAuthenticated, currentUser, requireAuth, showToast]
  );

  const togglePublishCourse = useCallback(
    (courseId: string) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth('Please sign in as an Instructor to manage courses.');
        return;
      }
      setDb((prev) => ({
        ...prev,
        courses: prev.courses.map((c) =>
          c.id === courseId ? { ...c, published: !c.published } : c
        ),
      }));
    },
    [isAuthenticated, currentUser, requireAuth]
  );

  const createConcept = useCallback(
    (
      courseId: string,
      input: { title: string; description: string; passThreshold?: number | null }
    ) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth('Please sign in as an Instructor to add concepts.');
        return;
      }
      setDb((prev) => {
        const siblings = prev.concepts.filter((c) => c.courseId === courseId);
        const newId = `c-${Date.now().toString(36)}`;
        const created = {
          id: newId,
          courseId,
          title: input.title.trim(),
          description: input.description.trim(),
          status: 'active' as const,
          orderIndex: siblings.length + 1,
          posX: 120 + (siblings.length % 4) * 240,
          posY: 80 + Math.floor(siblings.length / 4) * 140,
          passThreshold: input.passThreshold ?? null,
          parentConceptId: null,
        };
        const qId = `${newId}-q1`;
        const q2Id = `${newId}-q2`;
        const q3Id = `${newId}-q3`;
        const starterQuestions: QuizQuestionRecord[] = [
          {
            id: qId,
            conceptId: newId,
            prompt: `Core principle of ${created.title}?`,
            options: ['Apply structured design', 'Skip validation', 'Ignore outputs', 'None'],
            orderIndex: 1,
          },
          {
            id: q2Id,
            conceptId: newId,
            prompt: `How does ${created.title} integrate with dependent topics?`,
            options: ['Clear prerequisites', 'Random jumps', 'Hidden state', 'Manual guesses'],
            orderIndex: 2,
          },
          {
            id: q3Id,
            conceptId: newId,
            prompt: `Best way to verify ${created.title}?`,
            options: ['Practice & check edge cases', 'Avoid testing', 'Copy blindly', 'Guess'],
            orderIndex: 3,
          },
        ];
        return {
          ...prev,
          concepts: [...prev.concepts, created],
          quizQuestions: [...prev.quizQuestions, ...starterQuestions],
          quizAnswerKeys: {
            ...prev.quizAnswerKeys,
            [qId]: 0,
            [q2Id]: 0,
            [q3Id]: 0,
          },
        };
      });
    },
    [isAuthenticated, currentUser, requireAuth]
  );

  const updateConceptPosition = useCallback(
    (conceptId: string, posX: number, posY: number) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth('Please sign in as an Instructor to edit the graph.');
        return;
      }
      setDb((prev) => ({
        ...prev,
        concepts: prev.concepts.map((c) =>
          c.id === conceptId ? { ...c, posX: Math.round(posX), posY: Math.round(posY) } : c
        ),
      }));
    },
    [isAuthenticated, currentUser, requireAuth]
  );

  const autoLayoutCourse = useCallback(
    (courseId: string) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth('Please sign in as an Instructor to edit the graph.');
        return;
      }
      setDb((prev) => {
        const courseConcepts = prev.concepts.filter((c) => c.courseId === courseId);
        const courseLinks = prev.prerequisites.filter(
          (l) => l.courseId === courseId && l.removedAt === null
        );
        const positions = computeDagLayout(courseConcepts, courseLinks);
        return {
          ...prev,
          concepts: prev.concepts.map((c) =>
            c.courseId === courseId && positions[c.id]
              ? { ...c, posX: positions[c.id].x, posY: positions[c.id].y }
              : c
          ),
        };
      });
    },
    [isAuthenticated, currentUser, requireAuth]
  );

  const createLesson = useCallback(
    (
      conceptId: string,
      lesson: Omit<LessonRecord, 'id' | 'conceptId' | 'orderIndex'>
    ) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth('Please sign in as an Instructor to add lessons.');
        return;
      }
      setDb((prev) => applyCreateLesson(prev, conceptId, lesson));
    },
    [isAuthenticated, currentUser, requireAuth]
  );

  const moveLesson = useCallback(
    (lessonId: string, targetConceptId: string) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth('Please sign in as an Instructor to move lessons.');
        return;
      }
      setDb((prev) => ({
        ...prev,
        lessons: prev.lessons.map((l) =>
          l.id === lessonId ? { ...l, conceptId: targetConceptId } : l
        ),
      }));
    },
    [isAuthenticated, currentUser, requireAuth]
  );

  const addQuizQuestion = useCallback(
    (
      conceptId: string,
      input: { prompt: string; options: string[]; correctIndex: number }
    ) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth('Please sign in as an Instructor to add quiz questions.');
        return;
      }
      setDb((prev) => {
        const count = prev.quizQuestions.filter((q) => q.conceptId === conceptId).length;
        const qId = `${conceptId}-q-${Date.now().toString(36)}`;
        return {
          ...prev,
          quizQuestions: [
            ...prev.quizQuestions,
            {
              id: qId,
              conceptId,
              prompt: input.prompt.trim(),
              options: input.options,
              orderIndex: count + 1,
            },
          ],
          quizAnswerKeys: {
            ...prev.quizAnswerKeys,
            [qId]: input.correctIndex,
          },
        };
      });
    },
    [isAuthenticated, currentUser, requireAuth]
  );

  const addPrerequisite = useCallback(
    (courseId: string, prereqId: string, conceptId: string) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth('Please sign in as an Instructor to modify prerequisites.');
        return {
          ok: false as const,
          code: 'FORBIDDEN' as const,
          message: 'Please sign in as an Instructor first.',
        };
      }
      const course = db.courses.find((c) => c.id === courseId);
      const res = applyAddPrerequisite(
        db,
        currentUser.id,
        courseId,
        prereqId,
        conceptId,
        course?.graphVersion
      );
      if (res.ok) {
        setDb(res.db);
        showToast(
          'Prerequisite link added',
          `Graph updated to v${res.data.version}. Affected learners notified.`,
          'success'
        );
      } else {
        showToast('Link rejected', res.message, 'error');
      }
      return res;
    },
    [isAuthenticated, currentUser, db, requireAuth, showToast]
  );

  const removePrerequisite = useCallback(
    (courseId: string, prereqId: string, conceptId: string) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth('Please sign in as an Instructor to modify prerequisites.');
        return {
          ok: false as const,
          code: 'FORBIDDEN' as const,
          message: 'Please sign in as an Instructor first.',
        };
      }
      const course = db.courses.find((c) => c.id === courseId);
      const res = applyRemovePrerequisite(
        db,
        currentUser.id,
        courseId,
        prereqId,
        conceptId,
        course?.graphVersion
      );
      if (res.ok) {
        setDb(res.db);
        showToast(
          'Prerequisite removed',
          `Soft-deleted link in v${res.data.version}. States recomputed.`,
          'info'
        );
      }
      return res;
    },
    [isAuthenticated, currentUser, db, requireAuth, showToast]
  );

  const splitConcept = useCallback(
    (courseId: string, parentConceptId: string, children: SplitChildInput[]) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth('Please sign in as an Instructor to split concepts.');
        return {
          ok: false as const,
          code: 'FORBIDDEN' as const,
          message: 'Please sign in as an Instructor first.',
        };
      }
      const course = db.courses.find((c) => c.id === courseId);
      const res = applySplitConcept(
        db,
        currentUser.id,
        courseId,
        parentConceptId,
        children,
        course?.graphVersion
      );
      if (res.ok) {
        setDb(res.db);
        showToast(
          'Concept split applied',
          `Graph updated to v${res.data.version}. Existing mastery and lesson completions preserved.`,
          'success'
        );
      } else {
        showToast('Split failed', res.message, 'error');
      }
      return res;
    },
    [isAuthenticated, currentUser, db, requireAuth, showToast]
  );

  const setThreshold = useCallback(
    (courseId: string, threshold: number, conceptId?: string) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth('Please sign in as an Instructor to edit thresholds.');
        return {
          ok: false as const,
          code: 'FORBIDDEN' as const,
          message: 'Please sign in as an Instructor first.',
        };
      }
      const res = applySetThreshold(db, currentUser.id, courseId, threshold, conceptId);
      if (res.ok) {
        setDb(res.db);
        showToast(
          'Threshold updated',
          `Pass threshold saved (${threshold}%). Prior mastery preserved.`,
          'info'
        );
      }
      return res;
    },
    [isAuthenticated, currentUser, db, requireAuth, showToast]
  );

  const archiveConcept = useCallback(
    (courseId: string, conceptId: string) => {
      if (!isAuthenticated || !currentUser) {
        requireAuth('Please sign in as an Instructor to archive concepts.');
        return {
          ok: false as const,
          code: 'FORBIDDEN' as const,
          message: 'Please sign in as an Instructor first.',
        };
      }
      const res = applyArchiveConcept(db, currentUser.id, courseId, conceptId);
      if (res.ok) {
        setDb(res.db);
        showToast(
          'Concept archived',
          `Version bumped to v${res.data.version}. Attempts retained in history.`,
          'info'
        );
      }
      return res;
    },
    [isAuthenticated, currentUser, db, requireAuth, showToast]
  );

  const previewAddLinkImpact = useCallback(
    (courseId: string, prereqId: string, conceptId: string) => {
      if (!isAuthenticated || !currentUser) return null;
      const sim = applyAddPrerequisite(db, currentUser.id, courseId, prereqId, conceptId);
      return previewImpactDryRun(db, sim, courseId);
    },
    [isAuthenticated, currentUser, db]
  );

  const previewRemoveLinkImpact = useCallback(
    (courseId: string, prereqId: string, conceptId: string) => {
      if (!isAuthenticated || !currentUser) return null;
      const sim = applyRemovePrerequisite(db, currentUser.id, courseId, prereqId, conceptId);
      return previewImpactDryRun(db, sim, courseId);
    },
    [isAuthenticated, currentUser, db]
  );

  const previewSplitImpact = useCallback(
    (courseId: string, parentConceptId: string, children: SplitChildInput[]) => {
      if (!isAuthenticated || !currentUser) return null;
      const sim = applySplitConcept(db, currentUser.id, courseId, parentConceptId, children);
      return previewImpactDryRun(db, sim, courseId);
    },
    [isAuthenticated, currentUser, db]
  );

  const value: PathForgeContextValue = {
    db,
    currentUser,
    isAuthenticated,
    unreadCount,
    myNotifications,
    toast,
    dismissToast,
    showToast,
    loginWithPassword,
    signupWithStepper,
    signOut,
    switchDemoUser,
    resetDemoData,
    enroll,
    unenroll,
    setTarget,
    toggleLesson,
    submitQuiz,
    markNotificationRead,
    markAllNotificationsRead,
    createCourse,
    togglePublishCourse,
    createConcept,
    updateConceptPosition,
    autoLayoutCourse,
    createLesson,
    moveLesson,
    addQuizQuestion,
    addPrerequisite,
    removePrerequisite,
    splitConcept,
    setThreshold,
    archiveConcept,
    previewAddLinkImpact,
    previewRemoveLinkImpact,
    previewSplitImpact,
  };

  return <PathForgeContext.Provider value={value}>{children}</PathForgeContext.Provider>;
}

export function usePathForge(): PathForgeContextValue {
  const ctx = useContext(PathForgeContext);
  if (!ctx) {
    throw new Error('usePathForge must be used within a PathForgeProvider');
  }
  return ctx;
}
