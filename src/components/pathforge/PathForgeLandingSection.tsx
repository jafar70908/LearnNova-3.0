import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FolderOpen,
  GitBranch,
  GraduationCap,
  Layers,
  Lock,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { usePathForge } from '../../context/PathForgeContext';
import {
  computePath,
  conceptStates,
  formatDurationMinutes,
} from '../../lib/graph';
import {
  buildCourseGraph,
  buildLearnerFacts,
  createEmptyFacts,
} from '../../lib/store/pathforgeStore';
import { PrerequisiteGraph } from '../graph/PrerequisiteGraph';
import { SignInRequiredModal } from './SignInRequiredModal';

export function PathForgeLandingSection() {
  const { db, currentUser, isAuthenticated, enroll } = usePathForge();
  const navigate = useNavigate();

  const loggedIn = isAuthenticated && currentUser !== null;

  const publishedCourses = useMemo(
    () => db.courses.filter((c) => c.published),
    [db.courses]
  );

  const [previewCourseId, setPreviewCourseId] = useState<string>('course-prog');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('c11');
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);

  const activeCourse =
    publishedCourses.find((c) => c.id === previewCourseId) ?? publishedCourses[0];

  const previewGraph = useMemo(
    () => (activeCourse ? buildCourseGraph(db, activeCourse.id) : null),
    [db, activeCourse]
  );

  const learnerFacts = useMemo(
    () => (loggedIn ? buildLearnerFacts(db, currentUser.id) : createEmptyFacts()),
    [loggedIn, db, currentUser]
  );

  const previewStates = useMemo(
    () => (previewGraph && loggedIn ? conceptStates(previewGraph, learnerFacts) : {}),
    [previewGraph, loggedIn, learnerFacts]
  );

  const enrollment = useMemo(
    () =>
      loggedIn && activeCourse
        ? db.enrollments.find(
            (e) => e.learnerId === currentUser.id && e.courseId === activeCourse.id
          )
        : undefined,
    [loggedIn, db.enrollments, currentUser, activeCourse]
  );

  const targetId = selectedNodeId ?? enrollment?.targetConceptId ?? 'c11';

  const previewPath = useMemo(() => {
    if (!previewGraph || !targetId) return null;
    if (!previewGraph.concepts.some((c) => c.id === targetId && c.status === 'active')) {
      return null;
    }
    return computePath(previewGraph, learnerFacts, targetId);
  }, [previewGraph, learnerFacts, targetId]);

  const handleOpenCourseWorkspace = (courseId: string) => {
    if (!loggedIn) {
      navigate('/auth');
      return;
    }
    if (currentUser.role === 'instructor') {
      navigate(`/instructor/courses/${courseId}`);
      return;
    }
    const isEnrolled = db.enrollments.some(
      (e) => e.learnerId === currentUser.id && e.courseId === courseId
    );
    if (!isEnrolled) {
      enroll(courseId);
    }
    navigate(`/learner/courses/${courseId}`);
  };

  return (
    <section
      id="pathforge-platform"
      aria-label="LearnNova Prerequisite-Aware Learning Platform"
      className="relative bg-bg py-20 md:py-28 border-t border-stroke"
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16 space-y-16">
        {/* Section Heading + Quick Role Entry */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <p className="text-xs text-[#89AACC] uppercase tracking-[0.28em] mb-3">
              LearnNova · Prerequisite-Aware Learning
            </p>
            <h2
              className="text-4xl md:text-6xl font-display italic text-text-primary leading-[1.02] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Knowledge modeled as a living graph.
            </h2>
            <p className="text-sm md:text-base text-muted max-w-2xl mt-4 leading-relaxed">
              Learners unlock concepts only by proving mastery of prerequisites, follow shortest
              estimated paths to any target topic, and keep every completion intact when instructors
              restructure courses live.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!loggedIn) {
                  navigate('/auth');
                  return;
                }
                navigate('/learner/courses/course-prog');
              }}
              className="relative group inline-flex items-center justify-center rounded-full cursor-pointer whitespace-nowrap shrink-0"
            >
              <span
                aria-hidden="true"
                className="absolute -inset-[2px] rounded-full accent-gradient animate-gradient-shift opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              <span className="relative z-10 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-text-primary text-bg group-hover:bg-bg group-hover:text-text-primary transition-colors text-xs sm:text-sm font-medium">
                <GraduationCap className="w-4 h-4" aria-hidden="true" />
                <span>Learner Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!loggedIn) {
                  navigate('/auth');
                  return;
                }
                navigate('/instructor/courses/course-prog');
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-surface border border-stroke hover:border-[#89AACC] text-xs sm:text-sm text-text-primary transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <GitBranch className="w-4 h-4 text-[#89AACC]" aria-hidden="true" />
              <span>Instructor Graph Studio</span>
            </button>
          </div>
        </div>

        {/* Interactive Course Folders Grid */}
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
              <FolderOpen className="w-4 h-4 text-[#89AACC]" aria-hidden="true" />
              <span>Active Course Folders ({publishedCourses.length})</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/courses')}
              className="text-xs text-[#89AACC] hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              Browse full catalogue &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {publishedCourses.map((course) => {
              const graph = buildCourseGraph(db, course.id);
              const activeConcepts = graph.concepts.filter((c) => c.status === 'active');
              const states = loggedIn ? conceptStates(graph, learnerFacts) : {};
              const masteredCount = loggedIn
                ? activeConcepts.filter((c) => states[c.id]?.status === 'mastered').length
                : 0;
              const unlockedCount = loggedIn
                ? activeConcepts.filter((c) => states[c.id]?.status === 'unlocked').length
                : 0;
              const isSelected = activeCourse?.id === course.id;

              return (
                <div
                  key={course.id}
                  className={`group rounded-3xl bg-surface border p-6 flex flex-col justify-between transition-all duration-300 ${
                    isSelected
                      ? 'border-[#89AACC]/70 shadow-[0_0_24px_rgba(137,170,204,0.12)]'
                      : 'border-stroke hover:border-white/25'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-muted">
                        <Layers className="w-3.5 h-3.5 text-[#89AACC]" aria-hidden="true" />
                        <span>v{course.graphVersion}</span>
                      </span>
                      <span className="text-xs text-muted tabular-nums">
                        {activeConcepts.length} concepts · {graph.links.length} links
                      </span>
                    </div>

                    <h3 className="text-2xl font-display italic text-text-primary leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-xs text-muted mt-2 leading-relaxed line-clamp-2">
                      {course.description}
                    </p>
                  </div>

                  <div className="pt-5 mt-5 border-t border-stroke/80 space-y-3">
                    {loggedIn ? (
                      <div className="flex items-center justify-between text-xs text-muted tabular-nums">
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{masteredCount} mastered</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#89AACC]">
                          <PlayCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{unlockedCount} ready</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" aria-hidden="true" />
                          <span>
                            {Math.max(0, activeConcepts.length - masteredCount - unlockedCount)} locked
                          </span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Preview · Sign in required to track mastery</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewCourseId(course.id);
                          const last = activeConcepts[activeConcepts.length - 1];
                          setSelectedNodeId(last?.id ?? null);
                        }}
                        className={`flex-1 py-2 px-3 rounded-full text-xs border transition-colors cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? 'bg-bg border-[#89AACC] text-[#89AACC]'
                            : 'bg-bg border-stroke text-muted hover:text-text-primary'
                        }`}
                      >
                        Preview graph
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCourseWorkspace(course.id)}
                        className="flex-1 py-2 px-3 rounded-full bg-text-primary text-bg text-xs font-medium hover:opacity-90 cursor-pointer whitespace-nowrap"
                      >
                        {loggedIn ? 'Open workspace' : 'Sign in to start'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Graph & Shortest Path Preview */}
        {activeCourse && previewGraph && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 rounded-3xl bg-surface border border-stroke p-6 space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#89AACC] mb-1">
                  Live Path Explorer
                </p>
                <h3 className="text-2xl font-display italic text-text-primary">
                  {activeCourse.title}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {loggedIn ? (
                    <>
                      Viewing as <span className="text-text-primary">{currentUser.fullName}</span> (
                      {currentUser.role})
                    </>
                  ) : (
                    'Guest Preview · Sign in required'
                  )}
                </p>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs text-muted block">Target Concept</span>
                <select
                  value={targetId ?? ''}
                  onChange={(e) => setSelectedNodeId(e.target.value || null)}
                  className="w-full rounded-xl bg-bg border border-stroke px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-[#89AACC]"
                >
                  {previewGraph.concepts
                    .filter((c) => c.status === 'active')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                </select>
              </label>

              {previewPath && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs border-y border-stroke py-2.5">
                    <span className="text-muted">Shortest valid route</span>
                    <span className="inline-flex items-center gap-1.5 text-[#89AACC] font-medium tabular-nums">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{formatDurationMinutes(previewPath.totalMinutes)}</span>
                    </span>
                  </div>

                  {loggedIn && previewPath.steps.length === 0 ? (
                    <div className="rounded-2xl bg-bg border border-emerald-500/30 p-4 text-xs text-emerald-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Target mastered — zero remaining steps needed.</span>
                    </div>
                  ) : (
                    <ol className="space-y-2">
                      {previewPath.steps.map((step, idx) => (
                        <li key={step.id}>
                          <button
                            type="button"
                            onClick={() => {
                              if (!loggedIn) {
                                setSignInPromptOpen(true);
                              } else {
                                handleOpenCourseWorkspace(activeCourse.id);
                              }
                            }}
                            className="w-full flex items-center justify-between gap-2 rounded-xl bg-bg border border-stroke hover:border-[#89AACC]/60 px-3.5 py-2.5 text-xs cursor-pointer transition-colors text-left"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-[#89AACC] font-mono tabular-nums shrink-0">
                                {idx + 1}.
                              </span>
                              <span className="text-text-primary truncate">{step.title}</span>
                            </span>
                            <span className="text-muted tabular-nums shrink-0">
                              {step.lessonMinutes + step.quizMinutes} min
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => handleOpenCourseWorkspace(activeCourse.id)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-text-primary text-bg py-3 text-xs sm:text-sm font-medium hover:opacity-90 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>
                  {!loggedIn
                    ? 'Sign In to Study & Take Quizzes'
                    : currentUser.role === 'instructor'
                      ? 'Edit Graph in Instructor Studio'
                      : 'Study & Take Quizzes'}
                </span>
              </button>
            </div>

            <div className="lg:col-span-8">
              <PrerequisiteGraph
                mode="learner"
                guestPreview={!loggedIn}
                concepts={db.concepts.filter((c) => c.courseId === activeCourse.id)}
                links={db.prerequisites.filter((l) => l.courseId === activeCourse.id)}
                states={loggedIn ? previewStates : undefined}
                pathConceptIds={previewPath?.steps.map((s) => s.id) ?? []}
                targetConceptId={targetId}
                selectedConceptId={selectedNodeId}
                onSelectConcept={(cid) => {
                  if (!loggedIn) {
                    setSignInPromptOpen(true);
                    return;
                  }
                  setSelectedNodeId(cid);
                }}
              />
            </div>
          </div>
        )}
      </div>

      <SignInRequiredModal
        open={signInPromptOpen}
        onClose={() => setSignInPromptOpen(false)}
      />
    </section>
  );
}
