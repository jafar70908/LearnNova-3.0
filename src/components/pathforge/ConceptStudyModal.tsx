import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Lock,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import { usePathForge } from '../../context/PathForgeContext';
import { effectiveThreshold, type ConceptState } from '../../lib/graph';
import {
  gradeQuizAttempt,
  type QuizSubmissionResult,
} from '../../lib/store/pathforgeStore';

interface ConceptStudyModalProps {
  courseId: string;
  conceptId: string | null;
  state: ConceptState | undefined;
  onClose: () => void;
  onSelectConcept: (conceptId: string) => void;
}

export function ConceptStudyModal({
  courseId,
  conceptId,
  state,
  onClose,
  onSelectConcept,
}: ConceptStudyModalProps) {
  const { db, currentUser, isAuthenticated, enroll, toggleLesson, submitQuiz } = usePathForge();
  const modalScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'lessons' | 'quiz'>('lessons');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<QuizSubmissionResult | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);

  const concept = useMemo(
    () => db.concepts.find((c) => c.id === conceptId && c.courseId === courseId) ?? null,
    [db.concepts, conceptId, courseId]
  );

  const lessons = useMemo(
    () =>
      concept
        ? db.lessons
            .filter((l) => l.conceptId === concept.id)
            .sort((a, b) => a.orderIndex - b.orderIndex)
        : [],
    [db.lessons, concept]
  );

  // Never query quizAnswerKeys here — answers stay isolated in store grading
  const questions = useMemo(
    () =>
      concept
        ? db.quizQuestions
            .filter((q) => q.conceptId === concept.id)
            .sort((a, b) => a.orderIndex - b.orderIndex)
        : [],
    [db.quizQuestions, concept]
  );

  const completedSet = useMemo(
    () =>
      new Set(
        currentUser
          ? db.lessonCompletions
              .filter((lc) => lc.learnerId === currentUser.id)
              .map((lc) => lc.lessonId)
          : []
      ),
    [db.lessonCompletions, currentUser]
  );

  const course = useMemo(
    () => db.courses.find((c) => c.id === courseId) ?? null,
    [db.courses, courseId]
  );

  const pastAttempts = useMemo(
    () =>
      concept && currentUser
        ? db.quizAttempts
            .filter((a) => a.learnerId === currentUser.id && a.conceptId === concept.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [db.quizAttempts, currentUser, concept]
  );

  const thresholdValue = useMemo(() => {
    if (!concept) return course?.passThreshold ?? 70;
    return effectiveThreshold(
      {
        id: concept.id,
        title: concept.title,
        orderIndex: concept.orderIndex,
        status: concept.status,
        passThreshold: concept.passThreshold,
      },
      course?.passThreshold ?? 70
    );
  }, [concept, course]);

  const bestScore = useMemo(() => {
    if (pastAttempts.length === 0) return null;
    return Math.max(...pastAttempts.map((a) => a.score));
  }, [pastAttempts]);

  const isEnrolled = useMemo(
    () =>
      Boolean(
        currentUser &&
          db.enrollments.some((e) => e.learnerId === currentUser.id && e.courseId === courseId)
      ),
    [db.enrollments, currentUser, courseId]
  );

  useEffect(() => {
    setSelectedAnswers({});
    setQuizResult(null);
    setQuizError(null);
    setActiveTab('lessons');
  }, [conceptId]);

  useEffect(() => {
    if (!conceptId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [conceptId, onClose]);

  if (!isAuthenticated || !currentUser || !concept || !state) return null;

  const isLocked = state.status === 'locked';
  const isMastered = state.status === 'mastered';

  const scrollModalToTop = () => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuizError(null);
    if (questions.length === 0) {
      setQuizError('No quiz questions are available for this concept yet.');
      return;
    }

    const answers = questions.map((_, idx) => selectedAnswers[idx] ?? -1);
    const firstMissingIdx = answers.findIndex((a) => a < 0);
    if (firstMissingIdx >= 0) {
      setQuizError(
        `Please answer question ${firstMissingIdx + 1} (and all remaining questions) before submitting.`
      );
      const missingEl = document.getElementById(`quiz-question-${questions[firstMissingIdx].id}`);
      missingEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const res = submitQuiz(concept.id, answers);
    if (!res.ok) {
      setQuizError(res.message);
      return;
    }

    setQuizResult(res.data);
    window.requestAnimationFrame(scrollModalToTop);
  };

  const handleViewLastAttempt = () => {
    const latest = pastAttempts[0];
    if (!latest || !concept) return;
    const graded = gradeQuizAttempt(db, concept.id, latest.answers ?? []);
    setQuizError(null);
    setQuizResult({
      ...graded,
      score: latest.score,
      percentage: latest.score,
      passed: latest.passed,
      thresholdUsed: latest.thresholdUsed,
    });
    window.requestAnimationFrame(scrollModalToTop);
  };

  const handleRetakeQuiz = () => {
    setQuizResult(null);
    setQuizError(null);
    setSelectedAnswers({});
    window.requestAnimationFrame(scrollModalToTop);
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-modal-title"
      onClick={onClose}
    >
      <div
        ref={modalScrollRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-3xl bg-surface border border-stroke shadow-2xl p-6 sm:p-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-stroke">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs mb-2">
              {isMastered ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Mastered</span>
                </span>
              ) : isLocked ? (
                <span className="inline-flex items-center gap-1.5 text-muted font-medium">
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Locked</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[#89AACC] font-medium">
                  <PlayCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Unlocked</span>
                </span>
              )}
              <span className="text-muted" aria-hidden="true">
                ·
              </span>
              <span className="text-muted tabular-nums">
                Pass threshold: {thresholdValue}%
              </span>
              {bestScore !== null && (
                <>
                  <span className="text-muted" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-text-primary/80 tabular-nums">
                    Best score: {bestScore}%
                  </span>
                </>
              )}
            </div>

            <h2
              id="study-modal-title"
              className="text-2xl sm:text-4xl font-display italic text-text-primary leading-tight"
            >
              {concept.title}
            </h2>
            <p className="text-sm text-muted mt-2 leading-relaxed">{concept.description}</p>
            {state.note && (
              <p className="mt-2 text-xs text-[#89AACC] font-medium">{state.note}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close concept view"
            className="p-2 rounded-full border border-stroke bg-bg text-muted hover:text-text-primary cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Locked View (MST-05) */}
        {isLocked ? (
          <div className="py-6 space-y-5" data-testid="locked-concept-panel">
            <div className="rounded-2xl bg-bg border border-stroke p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-text-primary mb-2">
                <Lock className="w-4 h-4 text-[#89AACC]" aria-hidden="true" />
                <span>Complete prerequisites to unlock &ldquo;{concept.title}&rdquo;</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                This concept unlocks automatically once you prove mastery of all direct prerequisite
                topics below.
              </p>

              <div className="mt-4 space-y-2.5">
                {state.missing.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface border border-stroke px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{m.title}</p>
                      <p className="text-xs text-muted mt-0.5 tabular-nums">
                        Your best:{' '}
                        {m.best === null ? 'Not attempted' : `${m.best}%`} · Required:{' '}
                        {m.required}%
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectConcept(m.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-bg border border-stroke hover:border-[#89AACC] px-3.5 py-1.5 text-xs text-text-primary cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>Open {m.title}</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Unlocked / Mastered View */
          <div className="pt-5">
            <div className="flex items-center gap-2 border-b border-stroke pb-4 mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('lessons')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'lessons'
                    ? 'bg-text-primary text-bg font-medium'
                    : 'bg-bg border border-stroke text-muted hover:text-text-primary'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Lessons ({lessons.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('quiz')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'quiz'
                    ? 'bg-text-primary text-bg font-medium'
                    : 'bg-bg border border-stroke text-muted hover:text-text-primary'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Mastery Quiz ({questions.length} questions)</span>
              </button>
            </div>

            {activeTab === 'lessons' ? (
              <div className="space-y-4">
                {lessons.length === 0 ? (
                  <p className="text-sm text-muted py-6 text-center">
                    No lessons attached yet. Proceed to the mastery quiz when ready.
                  </p>
                ) : (
                  lessons.map((lesson) => {
                    const done = completedSet.has(lesson.id);
                    const safeVideo =
                      lesson.kind === 'video' &&
                      lesson.videoUrl &&
                      lesson.videoUrl.startsWith('https://')
                        ? lesson.videoUrl
                        : null;

                    return (
                      <div
                        key={lesson.id}
                        className={`rounded-2xl border p-5 transition-colors ${
                          done
                            ? 'bg-bg/80 border-emerald-500/35'
                            : 'bg-bg border-stroke'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted mb-1.5">
                              <span className="inline-flex items-center gap-1 uppercase tracking-wider">
                                {lesson.kind === 'video' ? (
                                  <Video className="w-3 h-3" aria-hidden="true" />
                                ) : (
                                  <BookOpen className="w-3 h-3" aria-hidden="true" />
                                )}
                                <span>{lesson.kind}</span>
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Clock className="w-3 h-3" aria-hidden="true" />
                                <span>{lesson.durationMin} min</span>
                              </span>
                            </div>
                            <h3 className="text-base font-medium text-text-primary">
                              {lesson.title}
                            </h3>
                          </div>

                          <label className="inline-flex items-center gap-2 cursor-pointer shrink-0 select-none">
                            <input
                              type="checkbox"
                              checked={done}
                              onChange={() => toggleLesson(lesson.id)}
                              className="sr-only"
                            />
                            <span
                              aria-hidden="true"
                              className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200 ${
                                done
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 scale-105'
                                  : 'border-stroke bg-surface text-transparent hover:border-[#89AACC]'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                            <span className="text-xs text-muted">
                              {done ? 'Completed' : 'Mark complete'}
                            </span>
                          </label>
                        </div>

                        <p className="text-sm text-text-primary/80 mt-3 leading-relaxed">
                          {lesson.body}
                        </p>

                        {safeVideo && (
                          <div className="mt-3 pt-3 border-t border-stroke/60">
                            <a
                              href={safeVideo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-[#89AACC] hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Open video resource</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('quiz')}
                    className="inline-flex items-center gap-2 rounded-full bg-text-primary text-bg px-5 py-2.5 text-xs sm:text-sm font-medium cursor-pointer hover:opacity-90"
                  >
                    <span>Continue to Mastery Quiz</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : quizResult ? (
              /* Dedicated Quiz Results & Answer Review View */
              <div className="space-y-6" data-testid="quiz-result-panel">
                {/* Summary Scoreboard */}
                <div
                  data-testid="quiz-result-banner"
                  className={`rounded-2xl border p-5 sm:p-6 space-y-5 ${
                    quizResult.passed
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-rose-500/10 border-rose-500/35'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
                        {quizResult.passed ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                            <span>Passed · Concept Mastered</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-300 font-medium">
                            <XCircle className="w-4 h-4" aria-hidden="true" />
                            <span>Not Passed · Need {quizResult.thresholdUsed}% to Master</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-display italic text-text-primary">
                        Quiz Results — {concept.title}
                      </h3>
                      <p className="text-xs text-muted">
                        {quizResult.passed
                          ? 'Dependent concepts are unlocked immediately and your learning path has recalculated.'
                          : 'Review your right and wrong answers below, revisit the lessons if needed, and retake the quiz.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      data-testid="retake-quiz-btn"
                      onClick={handleRetakeQuiz}
                      className="inline-flex items-center gap-2 rounded-full bg-bg border border-stroke hover:border-[#89AACC] px-4 py-2 text-xs font-medium text-text-primary cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#89AACC]" aria-hidden="true" />
                      <span>Retake Quiz</span>
                    </button>
                  </div>

                  {/* Marks & Percentage Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-bg/90 border border-stroke px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted">Obtained Marks</p>
                      <p
                        data-testid="quiz-obtained-marks"
                        className="text-2xl font-display italic text-text-primary mt-1 tabular-nums"
                      >
                        {quizResult.obtainedMarks}
                      </p>
                    </div>

                    <div className="rounded-xl bg-bg/90 border border-stroke px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted">Maximum Marks</p>
                      <p
                        data-testid="quiz-max-marks"
                        className="text-2xl font-display italic text-text-primary mt-1 tabular-nums"
                      >
                        {quizResult.maxMarks}
                      </p>
                    </div>

                    <div className="rounded-xl bg-bg/90 border border-stroke px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted">Marks</p>
                      <p
                        data-testid="quiz-marks-fraction"
                        className="text-2xl font-display italic text-text-primary mt-1 tabular-nums"
                      >
                        {quizResult.obtainedMarks} / {quizResult.maxMarks}
                      </p>
                    </div>

                    <div className="rounded-xl bg-bg/90 border border-stroke px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted">Percentage</p>
                      <p
                        data-testid="quiz-percentage"
                        className={`text-2xl font-display italic mt-1 tabular-nums ${
                          quizResult.passed ? 'text-emerald-400' : 'text-rose-300'
                        }`}
                      >
                        {quizResult.percentage}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar & Right/Wrong Tally */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-4">
                        <span
                          data-testid="quiz-right-count"
                          className="inline-flex items-center gap-1.5 text-emerald-400 font-medium tabular-nums"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{quizResult.correct} Right</span>
                        </span>
                        <span
                          data-testid="quiz-wrong-count"
                          className="inline-flex items-center gap-1.5 text-rose-300 font-medium tabular-nums"
                        >
                          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{quizResult.wrongCount} Wrong</span>
                        </span>
                      </div>
                      <span className="text-muted tabular-nums">
                        Passing target: {quizResult.thresholdUsed}%
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-bg overflow-hidden border border-stroke">
                      <div
                        className={`h-full transition-all duration-500 ${
                          quizResult.passed ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                        style={{ width: `${quizResult.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Per-Question Right / Wrong Answer Breakdown */}
                <div className="space-y-3" data-testid="quiz-question-breakdown">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs uppercase tracking-[0.2em] text-muted">
                      Answer Breakdown ({quizResult.questionResults.length} Questions)
                    </h4>
                  </div>

                  {quizResult.questionResults.map((qr, qIdx) => (
                    <div
                      key={qr.questionId}
                      data-testid={`quiz-review-q-${qIdx + 1}`}
                      className={`rounded-2xl border p-5 space-y-3 ${
                        qr.isCorrect
                          ? 'bg-bg border-emerald-500/35'
                          : 'bg-bg border-rose-500/35'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="text-sm font-medium text-text-primary flex-1">
                          {qIdx + 1}. {qr.prompt}
                        </p>
                        {qr.isCorrect ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 text-xs font-medium text-emerald-300 shrink-0 tabular-nums">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Right · {qr.marksObtained}/{qr.maxMarks} mark</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/40 px-3 py-1 text-xs font-medium text-rose-300 shrink-0 tabular-nums">
                            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Wrong · {qr.marksObtained}/{qr.maxMarks} mark</span>
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {qr.options.map((opt, oIdx) => {
                          const isUserChoice = qr.selectedIndex === oIdx;
                          const isCorrectOption = qr.correctIndex === oIdx;

                          let rowStyle = 'border-stroke bg-surface/50 text-muted';
                          let tag: { label: string; tone: string } | null = null;

                          if (isCorrectOption && isUserChoice) {
                            rowStyle = 'border-emerald-500/60 bg-emerald-500/15 text-text-primary';
                            tag = { label: 'Your answer · Right', tone: 'text-emerald-300' };
                          } else if (isUserChoice && !isCorrectOption) {
                            rowStyle = 'border-rose-500/60 bg-rose-500/15 text-text-primary';
                            tag = { label: 'Your answer · Wrong', tone: 'text-rose-300' };
                          } else if (isCorrectOption) {
                            rowStyle = 'border-emerald-500/50 bg-emerald-500/10 text-text-primary';
                            tag = { label: 'Correct answer', tone: 'text-emerald-300' };
                          }

                          return (
                            <div
                              key={oIdx}
                              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm ${rowStyle}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {isCorrectOption ? (
                                  <CheckCircle2
                                    className="w-4 h-4 text-emerald-400 shrink-0"
                                    aria-hidden="true"
                                  />
                                ) : isUserChoice ? (
                                  <XCircle
                                    className="w-4 h-4 text-rose-400 shrink-0"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <span
                                    aria-hidden="true"
                                    className="w-4 h-4 rounded-full border border-stroke shrink-0"
                                  />
                                )}
                                <span className="break-words">{opt}</span>
                              </div>
                              {tag && (
                                <span className={`text-[11px] font-medium shrink-0 ${tag.tone}`}>
                                  {tag.label}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stroke">
                  <button
                    type="button"
                    onClick={() => setActiveTab('lessons')}
                    className="inline-flex items-center gap-2 rounded-full bg-bg border border-stroke hover:border-[#89AACC] px-4 py-2 text-xs text-text-primary cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#89AACC]" aria-hidden="true" />
                    <span>Review Lessons</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleRetakeQuiz}
                      className="inline-flex items-center gap-2 rounded-full bg-bg border border-stroke hover:border-[#89AACC] px-4 py-2 text-xs font-medium text-text-primary cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#89AACC]" aria-hidden="true" />
                      <span>Retake Quiz</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center gap-2 rounded-full bg-text-primary text-bg px-5 py-2 text-xs font-medium cursor-pointer hover:opacity-90"
                    >
                      <span>Back to Course Graph</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Quiz Runner Form */
              <form onSubmit={handleQuizSubmit} noValidate className="space-y-5">
                {!isEnrolled && (
                  <div className="rounded-2xl bg-[#89AACC]/10 border border-[#89AACC]/40 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-text-primary">
                      Enroll in this course to record your quiz attempt and unlock dependent concepts.
                    </p>
                    <button
                      type="button"
                      onClick={() => enroll(courseId)}
                      className="px-4 py-1.5 rounded-full bg-text-primary text-bg text-xs font-medium cursor-pointer shrink-0"
                    >
                      Enroll Now
                    </button>
                  </div>
                )}

                {questions.length === 0 ? (
                  <p className="text-sm text-muted py-8 text-center">
                    No quiz questions have been attached to this concept yet.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted rounded-xl bg-bg border border-stroke px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#89AACC]" aria-hidden="true" />
                        <span>
                          Total questions: {questions.length} · Maximum marks: {questions.length} ·
                          Passing score: {thresholdValue}%
                        </span>
                      </span>
                      <span className="tabular-nums">
                        Answered {Object.keys(selectedAnswers).length} / {questions.length}
                      </span>
                    </div>

                    {questions.map((q, qIdx) => (
                      <fieldset
                        key={q.id}
                        id={`quiz-question-${q.id}`}
                        className="rounded-2xl bg-bg border border-stroke p-5 space-y-3"
                      >
                        <legend className="text-sm font-medium text-text-primary px-1">
                          {qIdx + 1}. {q.prompt}
                        </legend>
                        <div className="space-y-2">
                          {q.options.map((opt, oIdx) => {
                            const checked = selectedAnswers[qIdx] === oIdx;
                            return (
                              <label
                                key={oIdx}
                                className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm cursor-pointer transition-colors ${
                                  checked
                                    ? 'border-[#89AACC] bg-[#89AACC]/10 text-text-primary'
                                    : 'border-stroke bg-surface/60 text-muted hover:text-text-primary'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question-${q.id}`}
                                  checked={checked}
                                  onChange={() => {
                                    setQuizError(null);
                                    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: oIdx }));
                                  }}
                                  className="mt-0.5 accent-[#89AACC]"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}

                    {quizError && (
                      <div
                        data-testid="quiz-error-banner"
                        role="alert"
                        className="rounded-xl bg-rose-500/10 border border-rose-500/40 px-4 py-3 text-xs text-rose-300"
                      >
                        {quizError}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span>
                          {pastAttempts.length > 0
                            ? `Past attempts: ${pastAttempts.length} (best ${bestScore ?? 0}%)`
                            : 'First attempt'}
                        </span>
                        {pastAttempts.length > 0 && (
                          <button
                            type="button"
                            data-testid="view-last-result-btn"
                            onClick={handleViewLastAttempt}
                            className="text-[#89AACC] hover:underline cursor-pointer"
                          >
                            View last result
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        data-testid="submit-quiz-btn"
                        className="relative group inline-flex items-center justify-center rounded-full cursor-pointer"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute -inset-[2px] rounded-full accent-gradient animate-gradient-shift opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        <span className="relative z-10 px-6 py-2.5 rounded-full bg-bg text-sm font-medium text-text-primary">
                          Submit Quiz
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
