import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock, Sparkles, Lock, Unlock, X } from 'lucide-react';
import { usePathForge } from '../../context/PathForgeContext';
import { formatDurationMinutes } from '../../lib/graph';

export function NotificationBell() {
  const {
    db,
    currentUser,
    isAuthenticated,
    myNotifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = usePathForge();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const titleById = (id: string) => db.concepts.find((c) => c.id === id)?.title ?? id;

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={open}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-bg/70 border border-stroke hover:border-[#89AACC]/60 text-text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC]"
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            data-testid="unread-notif-badge"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full accent-gradient text-[10px] font-semibold text-bg flex items-center justify-center tabular-nums"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Course update notifications"
          className="absolute right-0 mt-3 w-[340px] sm:w-[400px] max-h-[75vh] overflow-y-auto rounded-3xl bg-surface border border-stroke shadow-2xl p-4 z-[80]"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-stroke">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Updates</p>
              <h3 className="text-base font-medium text-text-primary">
                Curriculum Notifications
              </h3>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="inline-flex items-center gap-1.5 text-xs text-[#89AACC] hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {!isAuthenticated || !currentUser ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs text-muted">
                Sign in via Account to view your curriculum updates and path changes.
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/auth');
                }}
                className="px-4 py-1.5 rounded-full bg-text-primary text-bg text-xs font-medium cursor-pointer"
              >
                Go to Account
              </button>
            </div>
          ) : myNotifications.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted">
              No curriculum updates yet. Changes to your enrolled courses will appear here with path diffs.
            </p>
          ) : (
            <div className="divide-y divide-stroke/70 mt-2">
              {myNotifications.map((notif) => {
                const isUnread = notif.readAt === null;
                const deltaMin = notif.diff.minutesAfter - notif.diff.minutesBefore;
                return (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => markNotificationRead(notif.id)}
                    className={`w-full text-left py-3 px-2 rounded-xl transition-colors cursor-pointer ${
                      isUnread ? 'bg-[#89AACC]/[0.07] hover:bg-[#89AACC]/10' : 'hover:bg-bg/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-text-primary leading-snug">
                        {notif.title}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#89AACC] shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted mt-1 leading-relaxed">{notif.body}</p>

                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                      {notif.diff.newlyUnlocked.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <Unlock className="w-3 h-3" aria-hidden="true" />
                          <span>
                            Unlocked:{' '}
                            {notif.diff.newlyUnlocked.map(titleById).join(', ')}
                          </span>
                        </span>
                      )}
                      {notif.diff.newlyLocked.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <Lock className="w-3 h-3" aria-hidden="true" />
                          <span>
                            Locked: {notif.diff.newlyLocked.map(titleById).join(', ')}
                          </span>
                        </span>
                      )}
                      {deltaMin !== 0 && (
                        <span className="inline-flex items-center gap-1 text-[#89AACC] tabular-nums">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          <span>
                            {formatDurationMinutes(notif.diff.minutesBefore)} &rarr;{' '}
                            {formatDurationMinutes(notif.diff.minutesAfter)}
                          </span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ToastBanner() {
  const { toast, dismissToast } = usePathForge();
  if (!toast) return null;

  const borderTone =
    toast.tone === 'error'
      ? 'border-rose-500/60'
      : toast.tone === 'success'
        ? 'border-emerald-500/50'
        : 'border-[#89AACC]/50';

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="pathforge-toast"
      className={`fixed bottom-5 right-5 z-[90] max-w-sm rounded-2xl bg-surface/95 backdrop-blur-md border ${borderTone} shadow-2xl p-4 flex items-start gap-3`}
    >
      <Sparkles className="w-4 h-4 text-[#89AACC] shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-text-primary">{toast.title}</p>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{toast.body}</p>
      </div>
      <button
        type="button"
        onClick={dismissToast}
        aria-label="Dismiss notification"
        className="text-muted hover:text-text-primary cursor-pointer p-0.5 shrink-0"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
