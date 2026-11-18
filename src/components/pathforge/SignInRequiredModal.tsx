import { useEffect } from 'react';
import { ArrowRight, KeyRound, Lock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SignInRequiredModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function SignInRequiredModal({
  open,
  onClose,
  title = 'Sign In Required',
  message = 'Please sign in as a Learner to enroll, access lessons, and track mastery.',
}: SignInRequiredModalProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-required-title"
      data-testid="signin-required-modal"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-surface border border-stroke shadow-2xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-bg border border-[#89AACC]/40 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-[#89AACC]" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#89AACC]">
                Authentication Required
              </p>
              <h2
                id="signin-required-title"
                className="text-2xl sm:text-3xl font-display italic text-text-primary leading-tight"
              >
                {title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in prompt"
            className="p-2 rounded-full border border-stroke bg-bg text-muted hover:text-text-primary cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-sm text-muted leading-relaxed">{message}</p>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-stroke">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-full bg-bg border border-stroke text-xs text-muted hover:text-text-primary cursor-pointer"
          >
            Continue Preview
          </button>
          <button
            type="button"
            data-testid="signin-modal-go-account-btn"
            onClick={() => {
              onClose();
              navigate('/auth');
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-text-primary text-bg text-xs sm:text-sm font-medium hover:opacity-90 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign In via Account</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
