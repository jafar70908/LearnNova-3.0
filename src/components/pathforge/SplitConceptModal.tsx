import { useEffect, useMemo, useState } from 'react';
import { GitFork, Plus, Trash2, X } from 'lucide-react';
import { usePathForge } from '../../context/PathForgeContext';
import type { ImpactPreview, SplitChildInput } from '../../lib/store/pathforgeStore';

interface SplitConceptModalProps {
  courseId: string;
  conceptId: string | null;
  onClose: () => void;
}

export function SplitConceptModal({
  courseId,
  conceptId,
  onClose,
}: SplitConceptModalProps) {
  const { db, previewSplitImpact, splitConcept } = usePathForge();

  const concept = useMemo(
    () => db.concepts.find((c) => c.id === conceptId && c.courseId === courseId) ?? null,
    [db.concepts, conceptId, courseId]
  );

  const conceptLessons = useMemo(
    () =>
      concept
        ? db.lessons
            .filter((l) => l.conceptId === concept.id)
            .sort((a, b) => a.orderIndex - b.orderIndex)
        : [],
    [db.lessons, concept]
  );

  const [children, setChildren] = useState<SplitChildInput[]>([]);
  const [preview, setPreview] = useState<ImpactPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!concept) return;
    const mid = Math.ceil(conceptLessons.length / 2);
    setChildren([
      {
        title: `${concept.title} Basics`,
        description: `Core concepts and foundations of ${concept.title}.`,
        lessonIds: conceptLessons.slice(0, mid).map((l) => l.id),
        isEntry: true,
        isExit: false,
      },
      {
        title: `${concept.title} Applied`,
        description: `Advanced patterns and compositions of ${concept.title}.`,
        lessonIds: conceptLessons.slice(mid).map((l) => l.id),
        isEntry: false,
        isExit: true,
      },
    ]);
    setPreview(null);
    setError(null);
  }, [concept, conceptLessons]);

  useEffect(() => {
    if (!conceptId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [conceptId, onClose]);

  if (!concept) return null;

  const assignLessonToChild = (lessonId: string, targetIdx: number) => {
    setChildren((prev) =>
      prev.map((ch, idx) => ({
        ...ch,
        lessonIds:
          idx === targetIdx
            ? Array.from(new Set([...ch.lessonIds, lessonId]))
            : ch.lessonIds.filter((id) => id !== lessonId),
      }))
    );
  };

  const addChildSlot = () => {
    if (children.length >= 5) return;
    setChildren((prev) => [
      ...prev,
      {
        title: `${concept.title} Part ${prev.length + 1}`,
        description: '',
        lessonIds: [],
        isEntry: false,
        isExit: false,
      },
    ]);
  };

  const removeChildSlot = (idx: number) => {
    if (children.length <= 2) return;
    setChildren((prev) => {
      const removedLessons = prev[idx].lessonIds;
      const filtered = prev.filter((_, i) => i !== idx);
      filtered[0] = {
        ...filtered[0],
        lessonIds: [...filtered[0].lessonIds, ...removedLessons],
      };
      return filtered;
    });
  };

  const validateChildren = (): string | null => {
    if (children.some((c) => c.title.trim().length === 0)) {
      return 'Every child concept must have a title.';
    }
    if (!children.some((c) => c.isEntry)) {
      return 'Select at least one entry child concept.';
    }
    if (!children.some((c) => c.isExit)) {
      return 'Select one exit child concept.';
    }
    return null;
  };

  const handlePreview = () => {
    const err = validateChildren();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setPreview(previewSplitImpact(courseId, concept.id, children));
  };

  const handleApplySplit = () => {
    const err = validateChildren();
    if (err) {
      setError(err);
      return;
    }
    const res = splitConcept(courseId, concept.id, children);
    if (res.ok) {
      onClose();
    } else {
      setError(res.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="split-modal-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl bg-surface border border-stroke shadow-2xl p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-stroke">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#89AACC] mb-1">
              Split Concept Wizard
            </p>
            <h2
              id="split-modal-title"
              className="text-2xl sm:text-3xl font-display italic text-text-primary"
            >
              Split &ldquo;{concept.title}&rdquo;
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Existing learner mastery is granted to every child concept and existing lesson IDs are
              reassigned so completions remain intact.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close split wizard"
            className="p-2 rounded-full border border-stroke bg-bg text-muted hover:text-text-primary cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="py-5 space-y-5">
          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/40 px-4 py-2.5 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-muted">
                Child Concepts ({children.length} / 5)
              </span>
              {children.length < 5 && (
                <button
                  type="button"
                  onClick={addChildSlot}
                  className="inline-flex items-center gap-1 text-xs text-[#89AACC] hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add child</span>
                </button>
              )}
            </div>

            {children.map((child, idx) => (
              <div key={idx} className="rounded-2xl bg-bg border border-stroke p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted">Child {idx + 1}</span>
                  {children.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeChildSlot(idx)}
                      aria-label={`Remove child ${idx + 1}`}
                      className="text-muted hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <label className="block">
                  <span className="sr-only">Child concept title</span>
                  <input
                    type="text"
                    value={child.title}
                    onChange={(e) =>
                      setChildren((prev) =>
                        prev.map((c, i) => (i === idx ? { ...c, title: e.target.value } : c))
                      )
                    }
                    placeholder="Child concept title"
                    className="w-full rounded-xl bg-surface border border-stroke px-3.5 py-2 text-sm text-text-primary focus:outline-none focus:border-[#89AACC]"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={child.isEntry}
                      onChange={(e) =>
                        setChildren((prev) =>
                          prev.map((c, i) =>
                            i === idx ? { ...c, isEntry: e.target.checked } : c
                          )
                        )
                      }
                      className="accent-[#89AACC]"
                    />
                    <span>Entry (receives incoming links)</span>
                  </label>

                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="split-exit-child"
                      checked={child.isExit}
                      onChange={() =>
                        setChildren((prev) =>
                          prev.map((c, i) => ({ ...c, isExit: i === idx }))
                        )
                      }
                      className="accent-[#89AACC]"
                    />
                    <span>Exit (connects to outgoing links)</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {conceptLessons.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-xs uppercase tracking-[0.2em] text-muted block">
                Reassign Existing Lessons (completions preserved)
              </span>
              {conceptLessons.map((lesson) => {
                const ownerIdx = Math.max(
                  0,
                  children.findIndex((c) => c.lessonIds.includes(lesson.id))
                );
                return (
                  <div
                    key={lesson.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-bg border border-stroke px-3.5 py-2.5 text-xs"
                  >
                    <span className="text-text-primary font-medium">{lesson.title}</span>
                    <label className="inline-flex items-center gap-2">
                      <span className="text-muted">Assign to:</span>
                      <select
                        value={ownerIdx}
                        onChange={(e) => assignLessonToChild(lesson.id, Number(e.target.value))}
                        className="rounded-lg bg-surface border border-stroke px-2.5 py-1 text-text-primary focus:outline-none focus:border-[#89AACC]"
                      >
                        {children.map((c, cIdx) => (
                          <option key={cIdx} value={cIdx}>
                            {c.title || `Child ${cIdx + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>
          )}

          {preview && (
            <div className="rounded-2xl bg-bg border border-[#89AACC]/40 p-4 text-xs space-y-1.5">
              <p className="font-semibold text-[#89AACC]">
                Dry-run impact: {preview.affectedLearners} learners notified · +
                {preview.newlyUnlockedCount} unlocked · {preview.newlyLockedCount} locked
              </p>
              {preview.pathShifts.map((s, i) => (
                <p key={i} className="text-muted">
                  {s.learnerName}: {s.minutesBefore} min &rarr; {s.minutesAfter} min
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stroke">
          <button
            type="button"
            onClick={handlePreview}
            className="px-4 py-2 rounded-full bg-bg border border-stroke text-xs sm:text-sm text-text-primary hover:border-[#89AACC] cursor-pointer"
          >
            Preview Impact
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-bg border border-stroke text-xs sm:text-sm text-muted hover:text-text-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="apply-split-btn"
              onClick={handleApplySplit}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-text-primary text-bg text-xs sm:text-sm font-medium hover:opacity-90 cursor-pointer"
            >
              <GitFork className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Apply Split</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
