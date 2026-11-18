import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  Clock,
  GitBranch,
  GitFork,
  History,
  Link2,
  Plus,
  Users,
} from 'lucide-react';
import { usePathForge } from '../context/PathForgeContext';
import {
  computePath,
  conceptStates,
  formatDurationMinutes,
  validateNewLink,
} from '../lib/graph';
import {
  buildCourseGraph,
  buildLearnerFacts,
  type ImpactPreview,
} from '../lib/store/pathforgeStore';
import { PrerequisiteGraph } from '../components/graph/PrerequisiteGraph';
import { ImpactPreviewModal } from '../components/pathforge/ImpactPreviewModal';
import { SplitConceptModal } from '../components/pathforge/SplitConceptModal';

type PendingMutation =
  | {
      kind: 'add_link';
      prereqId: string;
      conceptId: string;
      title: string;
      description: string;
      impact: ImpactPreview | null;
    }
  | {
      kind: 'remove_link';
      prereqId: string;
      conceptId: string;
      title: string;
      description: string;
      impact: ImpactPreview | null;
    }
  | {
      kind: 'archive';
      conceptId: string;
      title: string;
      description: string;
      impact: ImpactPreview | null;
    };

export function InstructorDashboardPage({ defaultTab = 'graph' }: { defaultTab?: 'graph' | 'content' | 'history' | 'cohort' }) {
  const { courseId: paramCourseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const {
    db,
    currentUser,
    isAuthenticated,
    signOut,
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
    setThreshold,
    archiveConcept,
    previewAddLinkImpact,
    previewRemoveLinkImpact,
  } = usePathForge();

  const ownedCourses = useMemo(() => {
    if (!currentUser) return db.courses;
    const owned = db.courses.filter((c) => c.instructorId === currentUser.id);
    return owned.length > 0 ? owned : db.courses;
  }, [db.courses, currentUser]);

  const activeCourse = useMemo(
    () => ownedCourses.find((c) => c.id === paramCourseId) ?? ownedCourses[0] ?? null,
    [ownedCourses, paramCourseId]
  );

  const [activeTab, setActiveTab] = useState<'graph' | 'content' | 'history' | 'cohort'>(
    defaultTab
  );
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [splitConceptId, setSplitConceptId] = useState<string | null>(null);

  // Cycle rejection alert state (GRF-05, MST)
  const [cycleError, setCycleError] = useState<string | null>(null);
  const [cycleLoopIds, setCycleLoopIds] = useState<string[] | null>(null);

  // Pending Impact Preview confirmation
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);

  // Add Prerequisite Link form state
  const [linkPrereqId, setLinkPrereqId] = useState<string>('');
  const [linkTargetId, setLinkTargetId] = useState<string>('');

  // Create Course state
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseThreshold, setNewCourseThreshold] = useState(70);

  // Create Concept state
  const [newConceptTitle, setNewConceptTitle] = useState('');
  const [newConceptDesc, setNewConceptDesc] = useState('');

  // Add Lesson state
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonKind, setLessonKind] = useState<'text' | 'video'>('text');
  const [lessonMinutes, setLessonMinutes] = useState(12);
  const [lessonBody, setLessonBody] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');

  // Add Quiz Question state
  const [qPrompt, setQPrompt] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrectIdx, setQCorrectIdx] = useState(0);

  const activeConcepts = useMemo(
    () =>
      activeCourse
        ? db.concepts
            .filter((c) => c.courseId === activeCourse.id && c.status === 'active')
            .sort((a, b) => a.orderIndex - b.orderIndex)
        : [],
    [db.concepts, activeCourse]
  );

  const resolvedSelectedConcept = useMemo(
    () =>
      activeConcepts.find((c) => c.id === selectedConceptId) ?? activeConcepts[0] ?? null,
    [activeConcepts, selectedConceptId]
  );

  const courseGraph = useMemo(
    () => (activeCourse ? buildCourseGraph(db, activeCourse.id) : null),
    [db, activeCourse]
  );

  const courseChanges = useMemo(
    () =>
      activeCourse
        ? db.courseChanges
            .filter((ch) => ch.courseId === activeCourse.id)
            .sort((a, b) => b.version - a.version)
        : [],
    [db.courseChanges, activeCourse]
  );

  const cohortRows = useMemo(() => {
    if (!activeCourse || !courseGraph) return [];
    const enrollments = db.enrollments.filter((e) => e.courseId === activeCourse.id);
    return enrollments.map((enr) => {
      const user = db.users.find((u) => u.id === enr.learnerId);
      const facts = buildLearnerFacts(db, enr.learnerId);
      const st = conceptStates(courseGraph, facts);
      const mastered = activeConcepts.filter((c) => st[c.id]?.status === 'mastered').length;
      const targetTitle =
        activeConcepts.find((c) => c.id === enr.targetConceptId)?.title ?? 'None';
      const path = enr.targetConceptId
        ? computePath(courseGraph, facts, enr.targetConceptId)
        : null;
      return {
        learnerId: enr.learnerId,
        name: user?.fullName ?? 'Learner',
        email: user?.email ?? '',
        mastered,
        totalConcepts: activeConcepts.length,
        targetTitle,
        remainingMin: path?.totalMinutes ?? 0,
      };
    });
  }, [activeCourse, courseGraph, db.enrollments, db.users, db, activeConcepts]);

  const conceptTitle = (id: string) =>
    activeConcepts.find((c) => c.id === id)?.title ?? id;

  const triggerAddLink = (prereqId: string, conceptId: string) => {
    if (!activeCourse || !courseGraph || !isAuthenticated || !currentUser) return;
    setCycleError(null);
    setCycleLoopIds(null);

    const validation = validateNewLink(courseGraph, prereqId, conceptId);
    if (!validation.ok) {
      setCycleError(validation.message);
      if (validation.loop && validation.loop.length > 0) {
        setCycleLoopIds(validation.loop);
        window.setTimeout(() => {
          setCycleLoopIds(null);
        }, 6500);
      }
      return;
    }

    const impact = previewAddLinkImpact(activeCourse.id, prereqId, conceptId);
    setPendingMutation({
      kind: 'add_link',
      prereqId,
      conceptId,
      title: `Add link: ${conceptTitle(prereqId)} → ${conceptTitle(conceptId)}`,
      description:
        'Learners who have not mastered the prerequisite will see updated lock states and recalculated target paths.',
      impact,
    });
  };

  const triggerRemoveLink = (prereqId: string, conceptId: string) => {
    if (!activeCourse) return;
    const impact = previewRemoveLinkImpact(activeCourse.id, prereqId, conceptId);
    setPendingMutation({
      kind: 'remove_link',
      prereqId,
      conceptId,
      title: `Remove link: ${conceptTitle(prereqId)} → ${conceptTitle(conceptId)}`,
      description:
        'Soft-deletes this prerequisite link in the next graph version and immediately recomputes unlocked topics.',
      impact,
    });
  };

  const confirmPendingMutation = () => {
    if (!activeCourse || !pendingMutation) return;
    if (pendingMutation.kind === 'add_link') {
      const res = addPrerequisite(
        activeCourse.id,
        pendingMutation.prereqId,
        pendingMutation.conceptId
      );
      if (!res.ok) {
        setCycleError(res.message);
        if (res.loop) setCycleLoopIds(res.loop);
      }
    } else if (pendingMutation.kind === 'remove_link') {
      removePrerequisite(
        activeCourse.id,
        pendingMutation.prereqId,
        pendingMutation.conceptId
      );
    } else if (pendingMutation.kind === 'archive') {
      archiveConcept(activeCourse.id, pendingMutation.conceptId);
    }
    setPendingMutation(null);
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;
    const created = createCourse({
      title: newCourseTitle,
      description: newCourseDesc || 'Structured concept graph course.',
      passThreshold: newCourseThreshold,
    });
    if (!created) return;
    setNewCourseTitle('');
    setNewCourseDesc('');
    setShowNewCourse(false);
    navigate(`/instructor/courses/${created.id}`);
  };

  const handleCreateConcept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !newConceptTitle.trim()) return;
    createConcept(activeCourse.id, {
      title: newConceptTitle,
      description: newConceptDesc || 'Concept module and mastery quiz.',
    });
    setNewConceptTitle('');
    setNewConceptDesc('');
  };

  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedSelectedConcept || !lessonTitle.trim()) return;
    createLesson(resolvedSelectedConcept.id, {
      title: lessonTitle.trim(),
      kind: lessonKind,
      durationMin: lessonMinutes,
      body: lessonBody.trim() || `Lesson materials for ${lessonTitle.trim()}.`,
      videoUrl: lessonKind === 'video' ? lessonVideoUrl.trim() : undefined,
    });
    setLessonTitle('');
    setLessonBody('');
    setLessonVideoUrl('');
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedSelectedConcept || !qPrompt.trim() || qOptions.some((o) => !o.trim())) return;
    addQuizQuestion(resolvedSelectedConcept.id, {
      prompt: qPrompt.trim(),
      options: qOptions.map((o) => o.trim()),
      correctIndex: qCorrectIdx,
    });
    setQPrompt('');
    setQOptions(['', '', '', '']);
    setQCorrectIdx(0);
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <main className="min-h-screen bg-bg text-text-primary pt-32 px-6">
        <div className="max-w-lg mx-auto rounded-3xl bg-surface border border-stroke p-8 text-center space-y-4">
          <GitBranch className="w-8 h-8 text-[#89AACC] mx-auto" aria-hidden="true" />
          <h1 className="text-3xl font-display italic">Instructor Studio</h1>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            Please sign in as an Instructor via Account to build concept graphs, manage
            prerequisites, and restructure courses live.
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="px-6 py-2.5 rounded-full bg-text-primary text-bg text-xs sm:text-sm font-medium cursor-pointer"
          >
            Sign In via Account
          </button>
        </div>
      </main>
    );
  }

  if (currentUser.role !== 'instructor') {
    return (
      <main className="min-h-screen bg-bg text-text-primary pt-32 px-6">
        <div className="max-w-lg mx-auto rounded-3xl bg-surface border border-stroke p-8 text-center space-y-4">
          <GitBranch className="w-8 h-8 text-[#89AACC] mx-auto" aria-hidden="true" />
          <h1 className="text-3xl font-display italic">Instructor Studio</h1>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            You are currently signed in as learner{' '}
            <span className="text-text-primary">{currentUser.fullName}</span>. Sign out and sign in
            as an instructor to manage graphs and restructure courses live.
          </p>
          <button
            type="button"
            onClick={() => {
              signOut();
              navigate('/auth');
            }}
            className="px-6 py-2.5 rounded-full bg-text-primary text-bg text-xs sm:text-sm font-medium cursor-pointer"
          >
            Sign Out &amp; Switch Account
          </button>
        </div>
      </main>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-bg text-text-primary pt-28 pb-24 px-6 md:px-10 lg:px-16"
    >
      <div className="max-w-[1260px] mx-auto space-y-8">
        {/* Top Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-stroke">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#89AACC] mb-2">
              Instructor Graph Studio · {currentUser.fullName}
            </p>
            <h1 className="text-4xl sm:text-5xl font-display italic text-text-primary leading-none">
              {activeCourse ? activeCourse.title : 'Instructor Courses'}
            </h1>
            {activeCourse && (
              <p className="text-xs sm:text-sm text-muted mt-2">
                Graph v{activeCourse.graphVersion} · Default pass threshold:{' '}
                {activeCourse.passThreshold}% ·{' '}
                {activeCourse.published ? 'Published' : 'Draft'}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Select course"
              value={activeCourse?.id ?? ''}
              onChange={(e) => navigate(`/instructor/courses/${e.target.value}`)}
              className="rounded-full bg-surface border border-stroke px-4 py-2 text-xs text-text-primary focus:outline-none focus:border-[#89AACC]"
            >
              {ownedCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} (v{c.graphVersion})
                </option>
              ))}
            </select>

            {activeCourse && (
              <button
                type="button"
                onClick={() => togglePublishCourse(activeCourse.id)}
                className="px-4 py-2 rounded-full bg-surface border border-stroke hover:border-[#89AACC] text-xs text-text-primary cursor-pointer"
              >
                {activeCourse.published ? 'Set Draft' : 'Publish Course'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowNewCourse((s) => !s)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-text-primary text-bg text-xs font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>New Course</span>
            </button>
          </div>
        </div>

        {/* Inline New Course Drawer */}
        {showNewCourse && (
          <form
            onSubmit={handleCreateCourse}
            className="rounded-3xl bg-surface border border-[#89AACC]/40 p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
          >
            <label className="block space-y-1">
              <span className="text-xs text-muted">Course Title</span>
              <input
                type="text"
                required
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                placeholder="Algorithms & Graphs"
                className="w-full rounded-xl bg-bg border border-stroke px-3.5 py-2 text-sm text-text-primary"
              />
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-xs text-muted">Description</span>
              <input
                type="text"
                value={newCourseDesc}
                onChange={(e) => setNewCourseDesc(e.target.value)}
                placeholder="Master trees, shortest paths, and dynamic programming."
                className="w-full rounded-xl bg-bg border border-stroke px-3.5 py-2 text-sm text-text-primary"
              />
            </label>
            <div className="flex items-center gap-2">
              <label className="block space-y-1 w-24">
                <span className="text-xs text-muted">Pass %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newCourseThreshold}
                  onChange={(e) => setNewCourseThreshold(Number(e.target.value))}
                  className="w-full rounded-xl bg-bg border border-stroke px-3 py-2 text-sm text-text-primary"
                />
              </label>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-full bg-text-primary text-bg text-xs font-medium cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'graph', label: 'Graph & Prerequisites', icon: GitBranch },
            { id: 'content', label: 'Concepts, Lessons & Quizzes', icon: BookOpen },
            { id: 'history', label: `Change History (${courseChanges.length})`, icon: History },
            { id: 'cohort', label: `Learner Cohort (${cohortRows.length})`, icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm cursor-pointer transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-text-primary text-bg font-medium'
                    : 'bg-surface border border-stroke text-muted hover:text-text-primary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cycle Rejection Alert Banner */}
        {cycleError && (
          <div
            role="alert"
            data-testid="cycle-error-banner"
            className="rounded-2xl bg-rose-500/15 border border-rose-500/50 px-5 py-4 flex items-start gap-3 text-rose-200"
          >
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <p className="font-semibold text-rose-100">Prerequisite Link Rejected (Cycle Guard)</p>
              <p className="mt-0.5">{cycleError}</p>
            </div>
          </div>
        )}

        {activeCourse && courseGraph && activeTab === 'graph' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Inspector & Link Controls */}
            <div className="lg:col-span-4 space-y-5">
              {/* Explicit Add Link Form (accessible alternative to canvas click-to-link) */}
              <div className="rounded-3xl bg-surface border border-stroke p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#89AACC]" aria-hidden="true" />
                  <h2 className="text-lg font-display italic text-text-primary">
                    Add Prerequisite Link
                  </h2>
                </div>

                <label className="block space-y-1">
                  <span className="text-xs text-muted">Must be mastered first (Prerequisite)</span>
                  <select
                    aria-label="Prerequisite concept"
                    data-testid="add-link-prereq-select"
                    value={linkPrereqId || activeConcepts[0]?.id || ''}
                    onChange={(e) => setLinkPrereqId(e.target.value)}
                    className="w-full rounded-xl bg-bg border border-stroke px-3 py-2 text-xs sm:text-sm text-text-primary"
                  >
                    {activeConcepts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs text-muted">Unlocks dependent concept</span>
                  <select
                    aria-label="Dependent concept"
                    data-testid="add-link-target-select"
                    value={linkTargetId || activeConcepts[1]?.id || ''}
                    onChange={(e) => setLinkTargetId(e.target.value)}
                    className="w-full rounded-xl bg-bg border border-stroke px-3 py-2 text-xs sm:text-sm text-text-primary"
                  >
                    {activeConcepts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  data-testid="add-link-submit-btn"
                  onClick={() =>
                    triggerAddLink(
                      linkPrereqId || activeConcepts[0]?.id || '',
                      linkTargetId || activeConcepts[1]?.id || ''
                    )
                  }
                  className="w-full py-2.5 rounded-full bg-text-primary text-bg text-xs sm:text-sm font-medium hover:opacity-90 cursor-pointer"
                >
                  Validate &amp; Add Link
                </button>
              </div>

              {/* Selected Concept Quick Actions */}
              {resolvedSelectedConcept && (
                <div className="rounded-3xl bg-surface border border-stroke p-5 space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
                      Selected Concept
                    </p>
                    <h3 className="text-2xl font-display italic text-text-primary mt-0.5">
                      {resolvedSelectedConcept.title}
                    </h3>
                    <p className="text-xs text-muted mt-1">{resolvedSelectedConcept.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stroke">
                    <button
                      type="button"
                      data-testid="open-split-wizard-btn"
                      onClick={() => setSplitConceptId(resolvedSelectedConcept.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-bg border border-stroke hover:border-[#89AACC] text-xs text-text-primary cursor-pointer"
                    >
                      <GitFork className="w-3.5 h-3.5 text-[#89AACC]" aria-hidden="true" />
                      <span>Split Concept</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPendingMutation({
                          kind: 'archive',
                          conceptId: resolvedSelectedConcept.id,
                          title: `Archive "${resolvedSelectedConcept.title}"?`,
                          description:
                            'Concept is soft-archived and removed from future paths, while all past quiz attempts remain in history.',
                          impact: null,
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-bg border border-stroke hover:border-rose-400 text-xs text-muted hover:text-rose-300 cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Archive</span>
                    </button>
                  </div>

                  {/* Course Default Threshold Editor */}
                  <div className="pt-3 border-t border-stroke flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted">Course pass threshold:</span>
                    <div className="flex items-center gap-1.5">
                      {[60, 70, 80, 90].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setThreshold(activeCourse.id, pct)}
                          className={`px-2.5 py-1 rounded-full border cursor-pointer tabular-nums ${
                            activeCourse.passThreshold === pct
                              ? 'border-[#89AACC] text-[#89AACC] bg-[#89AACC]/10'
                              : 'border-stroke text-muted hover:text-text-primary'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Interactive DAG Editor */}
            <div className="lg:col-span-8">
              <PrerequisiteGraph
                mode="editor"
                concepts={db.concepts.filter((c) => c.courseId === activeCourse.id)}
                links={db.prerequisites.filter((l) => l.courseId === activeCourse.id)}
                selectedConceptId={resolvedSelectedConcept?.id ?? null}
                cycleLoopIds={cycleLoopIds}
                onSelectConcept={(cid) => setSelectedConceptId(cid)}
                onUpdateNodePosition={updateConceptPosition}
                onAutoLayout={() => autoLayoutCourse(activeCourse.id)}
                onAddLink={triggerAddLink}
                onRemoveLink={triggerRemoveLink}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Concepts, Lessons & Quizzes */}
        {activeCourse && activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 space-y-5">
              <form
                onSubmit={handleCreateConcept}
                className="rounded-3xl bg-surface border border-stroke p-5 space-y-3"
              >
                <h2 className="text-lg font-display italic text-text-primary">Add Concept</h2>
                <input
                  type="text"
                  required
                  value={newConceptTitle}
                  onChange={(e) => setNewConceptTitle(e.target.value)}
                  placeholder="Concept title (e.g. Memoization)"
                  className="w-full rounded-xl bg-bg border border-stroke px-3.5 py-2 text-sm text-text-primary"
                />
                <input
                  type="text"
                  value={newConceptDesc}
                  onChange={(e) => setNewConceptDesc(e.target.value)}
                  placeholder="Short description..."
                  className="w-full rounded-xl bg-bg border border-stroke px-3.5 py-2 text-sm text-text-primary"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-full bg-text-primary text-bg text-xs font-medium cursor-pointer"
                >
                  Create Concept
                </button>
              </form>

              <div className="rounded-3xl bg-surface border border-stroke p-5 space-y-2 max-h-96 overflow-y-auto">
                <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2">
                  Select Concept to Edit
                </p>
                {activeConcepts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedConceptId(c.id)}
                    className={`w-full text-left rounded-xl px-3.5 py-2.5 text-xs border cursor-pointer ${
                      resolvedSelectedConcept?.id === c.id
                        ? 'bg-bg border-[#89AACC] text-text-primary font-medium'
                        : 'bg-bg/50 border-stroke text-muted hover:text-text-primary'
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>

            {resolvedSelectedConcept && (
              <div className="lg:col-span-8 space-y-6">
                <div className="rounded-3xl bg-surface border border-stroke p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-display italic text-text-primary">
                      Lessons in &ldquo;{resolvedSelectedConcept.title}&rdquo;
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSplitConceptId(resolvedSelectedConcept.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-bg border border-stroke hover:border-[#89AACC] text-xs text-text-primary cursor-pointer"
                    >
                      <GitFork className="w-3.5 h-3.5 text-[#89AACC]" aria-hidden="true" />
                      <span>Split into smaller concepts</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {db.lessons
                      .filter((l) => l.conceptId === resolvedSelectedConcept.id)
                      .map((lesson) => (
                        <div
                          key={lesson.id}
                          className="rounded-2xl bg-bg border border-stroke px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <p className="text-sm font-medium text-text-primary">{lesson.title}</p>
                            <p className="text-muted mt-0.5 tabular-nums">
                              {lesson.kind} · {lesson.durationMin} min
                            </p>
                          </div>
                          <label className="inline-flex items-center gap-2 text-muted">
                            <span>Move to:</span>
                            <select
                              value={lesson.conceptId}
                              onChange={(e) => moveLesson(lesson.id, e.target.value)}
                              className="rounded-lg bg-surface border border-stroke px-2.5 py-1 text-text-primary"
                            >
                              {activeConcepts.map((target) => (
                                <option key={target.id} value={target.id}>
                                  {target.title}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ))}
                  </div>

                  <form
                    onSubmit={handleCreateLesson}
                    className="pt-4 border-t border-stroke grid grid-cols-1 sm:grid-cols-4 gap-3"
                  >
                    <input
                      type="text"
                      required
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      placeholder="New lesson title"
                      className="sm:col-span-2 rounded-xl bg-bg border border-stroke px-3.5 py-2 text-xs text-text-primary"
                    />
                    <select
                      value={lessonKind}
                      onChange={(e) => setLessonKind(e.target.value as 'text' | 'video')}
                      className="rounded-xl bg-bg border border-stroke px-3 py-2 text-xs text-text-primary"
                    >
                      <option value="text">Text Lesson</option>
                      <option value="video">Video Link</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={240}
                      value={lessonMinutes}
                      onChange={(e) => setLessonMinutes(Number(e.target.value))}
                      className="rounded-xl bg-bg border border-stroke px-3 py-2 text-xs text-text-primary"
                    />
                    {lessonKind === 'video' && (
                      <input
                        type="url"
                        value={lessonVideoUrl}
                        onChange={(e) => setLessonVideoUrl(e.target.value)}
                        placeholder="https://video-link..."
                        className="sm:col-span-4 rounded-xl bg-bg border border-stroke px-3.5 py-2 text-xs text-text-primary"
                      />
                    )}
                    <textarea
                      rows={2}
                      value={lessonBody}
                      onChange={(e) => setLessonBody(e.target.value)}
                      placeholder="Lesson summary or text notes..."
                      className="sm:col-span-3 rounded-xl bg-bg border border-stroke px-3.5 py-2 text-xs text-text-primary"
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-text-primary text-bg text-xs font-medium py-2 px-4 cursor-pointer self-end"
                    >
                      Attach Lesson
                    </button>
                  </form>
                </div>

                {/* Add Quiz Question */}
                <form
                  onSubmit={handleAddQuestion}
                  className="rounded-3xl bg-surface border border-stroke p-6 space-y-3"
                >
                  <h3 className="text-xl font-display italic text-text-primary">
                    Quiz Bank ({db.quizQuestions.filter((q) => q.conceptId === resolvedSelectedConcept.id).length} questions)
                  </h3>
                  <input
                    type="text"
                    required
                    value={qPrompt}
                    onChange={(e) => setQPrompt(e.target.value)}
                    placeholder="Add a multiple-choice question prompt..."
                    className="w-full rounded-xl bg-bg border border-stroke px-3.5 py-2 text-xs sm:text-sm text-text-primary"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {qOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="new-q-correct"
                          checked={qCorrectIdx === idx}
                          onChange={() => setQCorrectIdx(idx)}
                          aria-label={`Mark option ${idx + 1} as correct`}
                          className="accent-[#89AACC]"
                        />
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) =>
                            setQOptions((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                          }
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 rounded-xl bg-bg border border-stroke px-3 py-1.5 text-xs text-text-primary"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-text-primary text-bg text-xs font-medium cursor-pointer"
                  >
                    Add Question
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Change History Timeline (RST-06) */}
        {activeCourse && activeTab === 'history' && (
          <div className="rounded-3xl bg-surface border border-stroke p-6 space-y-4">
            <h2 className="text-2xl font-display italic text-text-primary">
              Immutable Curriculum History
            </h2>
            {courseChanges.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted py-6">
                No restructuring edits recorded yet. Add/remove prerequisite links or split a
                concept to generate audited graph versions.
              </p>
            ) : (
              <div className="divide-y divide-stroke">
                {courseChanges.map((ch) => (
                  <div key={ch.id} className="py-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#89AACC] mb-1">
                        <span className="font-mono">v{ch.version}</span>
                        <span aria-hidden="true">·</span>
                        <span className="uppercase tracking-wider">{ch.kind.replace('_', ' ')}</span>
                      </div>
                      <p className="text-sm text-text-primary">{ch.summary}</p>
                    </div>
                    <span className="text-xs text-muted tabular-nums">
                      {new Date(ch.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Cohort Progress */}
        {activeCourse && activeTab === 'cohort' && (
          <div className="rounded-3xl bg-surface border border-stroke p-6 space-y-4">
            <h2 className="text-2xl font-display italic text-text-primary">
              Enrolled Learners
            </h2>
            {cohortRows.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted py-4">No enrolled learners yet.</p>
            ) : (
              <div className="space-y-3">
                {cohortRows.map((row) => (
                  <div
                    key={row.learnerId}
                    className="rounded-2xl bg-bg border border-stroke px-5 py-4 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm"
                  >
                    <div>
                      <p className="font-medium text-text-primary">{row.name}</p>
                      <p className="text-xs text-muted">{row.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-5 text-xs text-muted tabular-nums">
                      <span>
                        Mastered: <strong className="text-text-primary">{row.mastered}/{row.totalConcepts}</strong>
                      </span>
                      <span>
                        Target: <strong className="text-[#89AACC]">{row.targetTitle}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{formatDurationMinutes(row.remainingMin)} remaining</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ImpactPreviewModal
        open={pendingMutation !== null}
        title={pendingMutation?.title ?? ''}
        description={pendingMutation?.description ?? ''}
        impact={pendingMutation?.impact ?? null}
        onCancel={() => setPendingMutation(null)}
        onConfirm={confirmPendingMutation}
      />

      {activeCourse && (
        <SplitConceptModal
          courseId={activeCourse.id}
          conceptId={splitConceptId}
          onClose={() => setSplitConceptId(null)}
        />
      )}
    </motion.main>
  );
}
