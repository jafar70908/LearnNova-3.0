import { useEffect } from 'react';
import { AlertTriangle, Clock, Lock, Unlock, Users, X } from 'lucide-react';
import { formatDurationMinutes } from '../../lib/graph';
import type { ImpactPreview } from '../../lib/store/pathforgeStore';

interface ImpactPreviewModalProps {
  open: boolean;
  title: string;
  description: string;
  impact: ImpactPreview | null;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ImpactPreviewModal({
  open,
  title,
  description,
  impact,
  confirmLabel = 'Confirm & Notify Learners',
  onCancel,
  onConfirm,
}: ImpactPreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="impact-modal-title"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl bg-surface border border-stroke shadow-2xl p-6 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-stroke">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#89AACC] mb-1">
              Dry-Run Impact Preview
            </p>
            <h2
              id="impact-modal-title"
              className="text-2xl font-display italic text-text-primary"
            >
              {title}
            </h2>
            <p className="text-xs text-muted mt-1">{description}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close impact preview"
            className="p-2 rounded-full border border-stroke bg-bg text-muted hover:text-text-primary cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {impact ? (
          <div className="py-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-bg border border-stroke p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
                  <Users className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Affected</span>
                </div>
                <p className="text-xl font-display italic text-text-primary tabular-nums">
                  {impact.affectedLearners} {impact.affectedLearners === 1 ? 'learner' : 'learners'}
                </p>
              </div>
              <div className="rounded-2xl bg-bg border border-stroke p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-1">
                  <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Unlocked</span>
                </div>
                <p className="text-xl font-display italic text-text-primary tabular-nums">
                  +{impact.newlyUnlockedCount}
                </p>
              </div>
              <div className="rounded-2xl bg-bg border border-stroke p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-amber-300 mb-1">
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Locked</span>
                </div>
                <p className="text-xl font-display italic text-text-primary tabular-nums">
                  {impact.newlyLockedCount}
                </p>
              </div>
            </div>

            {impact.pathShifts.length === 0 ? (
              <p className="text-xs text-muted py-2">
                No active enrolled learners have changed target paths from this edit, though the
                course version will still increment cleanly.
              </p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {impact.pathShifts.map((shift, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-bg border border-stroke px-4 py-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-text-primary">{shift.learnerName}</span>
                      <span className="inline-flex items-center gap-1 text-[#89AACC] tabular-nums">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        <span>
                          {formatDurationMinutes(shift.minutesBefore)} &rarr;{' '}
                          {formatDurationMinutes(shift.minutesAfter)}
                        </span>
                      </span>
                    </div>
                    {shift.newlyUnlockedTitles.length > 0 && (
                      <p className="text-emerald-400">
                        Newly unlocked: {shift.newlyUnlockedTitles.join(', ')}
                      </p>
                    )}
                    {shift.newlyLockedTitles.length > 0 && (
                      <p className="text-amber-300">
                        Newly locked: {shift.newlyLockedTitles.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 flex items-center gap-2 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Preview unavailable for this operation.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stroke">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full bg-bg border border-stroke text-xs sm:text-sm text-muted hover:text-text-primary cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="confirm-impact-btn"
            onClick={onConfirm}
            className="px-5 py-2 rounded-full bg-text-primary text-bg text-xs sm:text-sm font-medium hover:opacity-90 cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
