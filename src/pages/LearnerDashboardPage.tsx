import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FolderOpen,
  Lock,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { usePathForge } from '../context/PathForgeContext';
import {
  computePath,
  conceptStates,
  formatDurationMinutes,
} from '../lib/graph';
import {
  buildCourseGraph,
  buildLearnerFacts,
  createEmptyFacts,
} from '../lib/store/pathforgeStore';
import { PrerequisiteGraph } from '../components/graph/PrerequisiteGraph';
import { ConceptStudyModal } from '../components/pathforge/ConceptStudyModal';
import { SignInRequiredModal } from '../components/pathforge/SignInRequiredModal';

export function LearnerDashboardPage() {
  const { courseId: paramCourseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const { db, currentUser, isAuthenticated, enroll, setTarget } = usePathForge();

  const loggedIn = isAuthenticated && currentUser !== null;

  const [studyConceptId, setStudyConceptId] = useState<string | null>(null);
  const [guestTargetId, setGuestTargetId] = useState<string | null>(null);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unlocked' | 'mastered' | 'locked'>(
    'all'
  );

  const myEnrollments = useMemo(
    () => (loggedIn ? db.enrollments.filter((e) => e.learnerId === currentUser.id) : []),
    [loggedIn, db.enrollments, currentUser]
  );

  const activeCourseId = useMemo(() => {
    if (paramCourseId && db.courses.some((c) => c.id === paramCourseId)) {
      return paramCourseId;
    }
    return myEnrollments[0]?.courseId ?? db.courses[0]?.id ?? null;
  }, [paramCourseId, myEnrollments, db.courses]);

  const activeCourse = useMemo(
    () => db.courses.find((c) => c.id === activeCourseId) ?? null,
    [db.courses, activeCourseId]
  );

  const activeEnrollment = useMemo(
    () => (loggedIn ? myEnrollments.find((e) => e.courseId === activeCourseId) ?? null : null),
    [loggedIn, myEnrollments, activeCourseId]
  );

  const graph = useMemo(
    () => (activeCourseId ? buildCourseGraph(db, activeCourseId) : null),
    [db, activeCourseId]
  );

  const facts = useMemo(
    () => (loggedIn ? buildLearnerFacts(db, currentUser.id) : createEmptyFacts()),
    [loggedIn, db, currentUser]
  );

  const states = useMemo(
    () => (graph && loggedIn ? conceptStates(graph, facts) : {}),
    [graph, loggedIn, facts]
  );

  const activeConcepts = useMemo(
    () =>
      (graph?.concepts ?? [])
        .filter((c) => c.status === 'active')
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [graph]
  );

  const resolvedTargetId = useMemo(() => {
    if (!loggedIn && guestTargetId && activeConcepts.some((c) => c.id === guestTargetId)) {
      return guestTargetId;
    }
    if (
      activeEnrollment?.targetConceptId &&
      activeConcepts.some((c) => c.id === activeEnrollment.targetConceptId)
    ) {
      return activeEnrollment.targetConceptId;
    }
    return activeConcepts[activeConcepts.length - 1]?.id ?? null;
  }, [loggedIn, guestTargetId, activeEnrollment, activeConcepts]);

  const pathResult = useMemo(() => {
    if (!graph || !resolvedTargetId) return null;
    return computePath(graph, facts, resolvedTargetId);
  }, [graph, facts, resolvedTargetId]);

  // Per-course metrics (ENR-05)
  const metrics = useMemo(() => {
    if (!graph) return { mastered: 0, totalConcepts: 0, completedLessons: 0, totalLessons: 0 };
    const totalConcepts = activeConcepts.length;
    const mastered = loggedIn
      ? activeConcepts.filter((c) => states[c.id]?.status === 'mastered').length
      : 0;
    const activeIds = new Set(activeConcepts.map((c) => c.id));
    const activeLessons = graph.lessons.filter((l) => activeIds.has(l.conceptId));
    const completedLessons = loggedIn
      ? activeLessons.filter((l) => facts.completedLessons.has(l.id)).length
      : 0;
    return {
      mastered,
      totalConcepts,
      completedLessons,
      totalLessons: activeLessons.length,
    };
  }, [graph, activeConcepts, loggedIn, states, facts.completedLessons]);

  const filteredConcepts = useMemo(() => {
    if (!loggedIn || filterStatus === 'all') return activeConcepts;
    return activeConcepts.filter((c) => states[c.id]?.status === filterStatus);
  }, [loggedIn, activeConcepts, states, filterStatus]);

  const firstUnlockedStep = loggedIn
    ? pathResult?.steps.find((s) => states[s.id]?.status === 'unlocked')
    : undefined;

  const handleConceptClick = (conceptId: string) => {
    if (!loggedIn) {
      setSignInPromptOpen(true);
      return;
    }
    setStudyConceptId(conceptId);
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-bg text-text-primary pt-28 pb-24 px-6 md:px-10 lg:px-16"
    >
      <div className="max-w-[1240px] mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stroke">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#89AACC] mb-2">
              {loggedIn
                ? `Learner Workspace · ${currentUser.fullName}`
                : 'Guest Preview · Sign in required'}
            </p>
            <h1 className="text-4xl sm:text-5xl font-display italic text-text-primary leading-none">
              {activeCourse ? activeCourse.title : 'Your Enrolled Courses'}
            </h1>
            {activeCourse && (
              <p className="text-xs sm:text-sm text-muted mt-2 max-w-2xl">
                {activeCourse.description} · Graph v{activeCourse.graphVersion}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/courses')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface border border-stroke hover:border-[#89AACC] text-xs text-text-primary cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#89AACC]" aria-hidden="true" />
            <span>Browse All Courses</span>
          </button>
        </div>

        {/* Enrolled Course Folders Strip */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
            <FolderOpen className="w-4 h-4 text-[#89AACC]" aria-hidden="true" />
            <span>
              {loggedIn ? `My Course Folders (${myEnrollments.length})` : 'Course Preview Mode'}
            </span>
          </div>

          {!loggedIn ? (
            <div className="rounded-3xl bg-surface border border-[#89AACC]/40 p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-text-primary">
                  Sign in to unlock concepts, study lessons, and save quiz mastery.
                </p>
                <p className="text-xs text-muted">
                  Please sign in as a Learner to enroll, access lessons, and track mastery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="px-5 py-2.5 rounded-full bg-text-primary text-bg text-xs font-medium cursor-pointer shrink-0"
              >
                Sign In via Account
              </button>
            </div>
          ) : myEnrollments.length === 0 ? (
            <div className="rounded-3xl bg-surface border border-stroke p-8 text-center space-y-4">
              <p className="text-sm text-muted">
                You are not enrolled in any courses yet. Enroll in Programming Foundations to explore
                the 14-concept prerequisite graph.
              </p>
              <button
                type="button"
                onClick={() => {
                  enroll('course-prog');
                  navigate('/learner/courses/course-prog');
                }}
                className="px-5 py-2.5 rounded-full bg-text-primary text-bg text-xs font-medium cursor-pointer"
              >
                Enroll in Programming Foundations
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myEnrollments.map((enr) => {
                const c = db.courses.find((course) => course.id === enr.courseId);
                if (!c) return null;
                const g = buildCourseGraph(db, c.id);
                const st = conceptStates(g, facts);
                const act = g.concepts.filter((x) => x.status === 'active');
                const mast = act.filter((x) => st[x.id]?.status === 'mastered').length;
                const pct = act.length > 0 ? Math.round((mast / act.length) * 100) : 0;
                const selected = c.id === activeCourseId;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => navigate(`/learner/courses/${c.id}`)}
                    className={`text-left rounded-2xl border p-4 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-surface border-[#89AACC]'
                        : 'bg-surface/60 border-stroke hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {c.title}
                      </span>
                      <span className="text-xs text-[#89AACC] tabular-nums shrink-0">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-bg overflow-hidden">
                      <div
                        className="h-full accent-gradient transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted mt-2 tabular-nums">
                      {mast}/{act.length} concepts mastered · v{c.graphVersion}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Course Progress + Graph + Learning Path */}
        {activeCourse && graph && (
          <>
            {loggedIn && !activeEnrollment && (
              <div className="rounded-2xl bg-surface border border-[#89AACC]/40 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-text-primary">
                  Previewing <span className="font-medium">{activeCourse.title}</span>. Enroll to
                  save quiz attempts and track your personalized route.
                </p>
                <button
                  type="button"
                  onClick={() => enroll(activeCourse.id)}
                  className="px-4 py-2 rounded-full bg-text-primary text-bg text-xs font-medium cursor-pointer"
                >
                  Enroll Now
                </button>
              </div>
            )}

            {/* Metrics Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-surface border border-stroke p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Concepts Mastered</p>
                <p className="text-3xl font-display italic text-text-primary tabular-nums mt-1">
                  {metrics.mastered} / {metrics.totalConcepts}
                </p>
              </div>
              <div className="rounded-2xl bg-surface border border-stroke p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Lessons Complete</p>
                <p className="text-3xl font-display italic text-text-primary tabular-nums mt-1">
                  {metrics.completedLessons} / {metrics.totalLessons}
                </p>
              </div>
              <div className="rounded-2xl bg-surface border border-stroke p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Path Steps Left</p>
                <p
                  data-testid="path-steps-count"
                  className="text-3xl font-display italic text-text-primary tabular-nums mt-1"
                >
                  {pathResult?.steps.length ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-surface border border-stroke p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Estimated Time</p>
                <p
                  data-testid="path-total-time"
                  className="text-3xl font-display italic text-[#89AACC] tabular-nums mt-1"
                >
                  {pathResult ? formatDurationMinutes(pathResult.totalMinutes) : '0 min'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Personalized Learning Path Panel */}
              <div className="lg:col-span-4 space-y-6">
                <div className="rounded-3xl bg-surface border border-stroke p-6 space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#89AACC] mb-1">
                      Personalized Route
                    </p>
                    <h2 className="text-2xl font-display italic text-text-primary">
                      Shortest Valid Path
                    </h2>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-xs text-muted">Target Concept</span>
                    <select
                      aria-label="Target concept"
                      data-testid="target-concept-select"
                      value={resolvedTargetId ?? ''}
                      onChange={(e) => {
                        const nextId = e.target.value || null;
                        if (!loggedIn) {
                          setGuestTargetId(nextId);
                          return;
                        }
                        if (activeEnrollment) {
                          setTarget(activeCourse.id, nextId);
                        }
                      }}
                      className="w-full rounded-xl bg-bg border border-stroke px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-[#89AACC]"
                    >
                      {activeConcepts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  {loggedIn && pathResult && pathResult.steps.length === 0 ? (
                    <div
                      data-testid="target-mastered-state"
                      className="rounded-2xl bg-bg border border-emerald-500/35 p-4 text-xs text-emerald-300 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Target mastered — pick a new target concept to keep advancing.</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <ol data-testid="learning-path-list" className="space-y-2">
                        {pathResult?.steps.map((step, idx) => {
                          const st = loggedIn ? states[step.id] : undefined;
                          const isNext = firstUnlockedStep?.id === step.id;
                          return (
                            <li
                              key={step.id}
                              className={`rounded-2xl border p-3.5 transition-colors ${
                                isNext
                                  ? 'bg-bg border-[#89AACC]'
                                  : 'bg-bg border-stroke'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleConceptClick(step.id)}
                                  className="text-left flex items-center gap-2 min-w-0 cursor-pointer"
                                >
                                  <span className="text-xs font-mono text-[#89AACC] tabular-nums shrink-0">
                                    {idx + 1}.
                                  </span>
                                  <span className="text-sm font-medium text-text-primary truncate hover:underline">
                                    {step.title}
                                  </span>
                                </button>

                                {isNext && (
                                  <button
                                    type="button"
                                    data-testid="start-next-step-btn"
                                    onClick={() => handleConceptClick(step.id)}
                                    className="inline-flex items-center gap-1 rounded-full bg-text-primary text-bg px-3 py-1 text-[11px] font-medium cursor-pointer shrink-0"
                                  >
                                    <span>Start</span>
                                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-muted mt-1.5 tabular-nums">
                                <span>
                                  {!loggedIn
                                    ? 'Sign in to start'
                                    : st?.status === 'unlocked'
                                      ? 'Unlocked now'
                                      : `Waiting on ${st?.missing.length ?? 0} prereq`}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" aria-hidden="true" />
                                  <span>{step.lessonMinutes + step.quizMinutes} min</span>
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </div>

                {/* Accessible Concept Directory (NFR-08 keyboard parity with canvas) */}
                <div className="rounded-3xl bg-surface border border-stroke p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-text-primary">All Concepts</h3>
                    {loggedIn ? (
                      <div className="flex items-center gap-1 text-[11px]">
                        {(['all', 'unlocked', 'mastered', 'locked'] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setFilterStatus(tab)}
                            className={`px-2.5 py-1 rounded-full capitalize cursor-pointer ${
                              filterStatus === tab
                                ? 'bg-text-primary text-bg font-medium'
                                : 'text-muted hover:text-text-primary'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted">Preview · Sign in required</span>
                    )}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {filteredConcepts.map((c) => {
                      const st = loggedIn ? states[c.id] : undefined;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleConceptClick(c.id)}
                          className="w-full text-left flex items-center justify-between gap-2 rounded-xl bg-bg border border-stroke hover:border-[#89AACC]/60 px-3.5 py-2.5 text-xs cursor-pointer"
                        >
                          <span className="text-text-primary font-medium truncate">{c.title}</span>
                          <span className="shrink-0 inline-flex items-center gap-1 text-[11px]">
                            {!loggedIn ? (
                              <>
                                <Lock className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                                <span className="text-muted">Sign in to start</span>
                              </>
                            ) : st?.status === 'mastered' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                                <span className="text-emerald-400">Mastered</span>
                              </>
                            ) : st?.status === 'unlocked' ? (
                              <>
                                <PlayCircle className="w-3.5 h-3.5 text-[#89AACC]" aria-hidden="true" />
                                <span className="text-[#89AACC]">Unlocked</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
                                <span className="text-muted">Locked</span>
                              </>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Interactive Prerequisite Graph */}
              <div className="lg:col-span-8">
                <PrerequisiteGraph
                  mode="learner"
                  guestPreview={!loggedIn}
                  concepts={db.concepts.filter((c) => c.courseId === activeCourse.id)}
                  links={db.prerequisites.filter((l) => l.courseId === activeCourse.id)}
                  states={loggedIn ? states : undefined}
                  pathConceptIds={pathResult?.steps.map((s) => s.id) ?? []}
                  targetConceptId={resolvedTargetId}
                  selectedConceptId={loggedIn ? studyConceptId : null}
                  onSelectConcept={handleConceptClick}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {loggedIn && activeCourse && (
        <ConceptStudyModal
          courseId={activeCourse.id}
          conceptId={studyConceptId}
          state={studyConceptId ? states[studyConceptId] : undefined}
          onClose={() => setStudyConceptId(null)}
          onSelectConcept={(cid) => setStudyConceptId(cid)}
        />
      )}

      <SignInRequiredModal
        open={signInPromptOpen}
        onClose={() => setSignInPromptOpen(false)}
      />
    </motion.main>
  );
}
