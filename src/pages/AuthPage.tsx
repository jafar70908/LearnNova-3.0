import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  GraduationCap,
  KeyRound,
  RotateCcw,
  UserPlus,
} from 'lucide-react';
import { usePathForge } from '../context/PathForgeContext';
import type { UserRole } from '../data/seedPathForge';

export function AuthPage() {
  const { db, currentUser, loginWithPassword, signupWithStepper, switchDemoUser, resetDemoData } =
    usePathForge();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loginEmail, setLoginEmail] = useState('learner@demo.com');
  const [loginPassword, setLoginPassword] = useState('Demo@1234');
  const [authError, setAuthError] = useState<string | null>(null);

  // 4-step Sign-up Stepper state (E1, AUTH-01..07)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [role, setRole] = useState<UserRole>('learner');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = loginWithPassword(loginEmail, loginPassword);
    if (!res.ok) {
      setAuthError(res.error);
      return;
    }
    navigate(res.user.role === 'instructor' ? '/instructor' : '/learner');
  };

  const handleNextStep = () => {
    setAuthError(null);
    if (step === 2) {
      if (fullName.trim().length < 2) {
        setAuthError('Please enter your full name.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setAuthError('Please enter a valid email address.');
        return;
      }
    }
    if (step === 3) {
      if (password.length < 8) {
        setAuthError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4);
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = signupWithStepper({ role, fullName, email, password });
    if (!res.ok) {
      setAuthError(res.error);
      return;
    }
    navigate(res.user.role === 'instructor' ? '/instructor' : '/learner');
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-bg text-text-primary pt-28 pb-20 px-6 md:px-10"
    >
      <div className="max-w-[1000px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Auth Card */}
        <div className="lg:col-span-7 rounded-3xl bg-surface border border-stroke p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stroke pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#89AACC] mb-1">
                Account Access
              </p>
              <h1 className="text-3xl sm:text-4xl font-display italic text-text-primary">
                {mode === 'login' ? 'Sign in to LearnNova' : 'Create your account'}
              </h1>
            </div>

            <div className="inline-flex rounded-full bg-bg border border-stroke p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setAuthError(null);
                }}
                className={`px-4 py-1.5 rounded-full text-xs cursor-pointer transition-colors ${
                  mode === 'login'
                    ? 'bg-text-primary text-bg font-medium'
                    : 'text-muted hover:text-text-primary'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setAuthError(null);
                }}
                className={`px-4 py-1.5 rounded-full text-xs cursor-pointer transition-colors ${
                  mode === 'signup'
                    ? 'bg-text-primary text-bg font-medium'
                    : 'text-muted hover:text-text-primary'
                }`}
              >
                Sign up
              </button>
            </div>
          </div>

          {authError && (
            <div
              role="alert"
              className="rounded-2xl bg-rose-500/10 border border-rose-500/40 px-4 py-3 text-xs text-rose-300"
            >
              {authError}
            </div>
          )}

          {mode === 'login' ? (
            /* AUTH-04: Login accepts only Email and Password; redirects by stored profile.role */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs text-muted">Email address</span>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-xl bg-bg border border-stroke px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-[#89AACC]"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-muted">Password</span>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-xl bg-bg border border-stroke px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-[#89AACC]"
                />
              </label>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-text-primary text-bg py-3 text-sm font-medium hover:opacity-90 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" aria-hidden="true" />
                <span>Sign in</span>
              </button>
            </form>
          ) : (
            /* 4-step Sign-up Stepper (Role -> Name+Email -> Password+Confirm -> Review) */
            <form onSubmit={handleSignupSubmit} className="space-y-6">
              <div className="flex items-center justify-between gap-2 text-xs">
                {[
                  { n: 1, label: 'Role' },
                  { n: 2, label: 'Details' },
                  { n: 3, label: 'Security' },
                  { n: 4, label: 'Confirm' },
                ].map((s) => (
                  <div
                    key={s.n}
                    className={`flex-1 rounded-full py-1.5 px-2 text-center border ${
                      step === s.n
                        ? 'border-[#89AACC] bg-[#89AACC]/10 text-text-primary font-medium'
                        : step > s.n
                          ? 'border-emerald-500/40 text-emerald-400'
                          : 'border-stroke text-muted'
                    }`}
                  >
                    {s.n}. {s.label}
                  </div>
                ))}
              </div>

              {step === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('learner')}
                    className={`rounded-2xl border p-5 text-left transition-colors cursor-pointer ${
                      role === 'learner'
                        ? 'border-[#89AACC] bg-[#89AACC]/10'
                        : 'border-stroke bg-bg hover:border-white/25'
                    }`}
                  >
                    <GraduationCap className="w-6 h-6 text-[#89AACC] mb-3" aria-hidden="true" />
                    <p className="text-base font-medium text-text-primary">Learner</p>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Enroll in courses, complete lessons, unlock mastery quizzes, and follow custom
                      paths.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('instructor')}
                    className={`rounded-2xl border p-5 text-left transition-colors cursor-pointer ${
                      role === 'instructor'
                        ? 'border-[#89AACC] bg-[#89AACC]/10'
                        : 'border-stroke bg-bg hover:border-white/25'
                    }`}
                  >
                    <GitBranch className="w-6 h-6 text-[#89AACC] mb-3" aria-hidden="true" />
                    <p className="text-base font-medium text-text-primary">Instructor</p>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Build concept graphs, manage prerequisites, split concepts live, and track
                      cohorts.
                    </p>
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-muted">Full Name</span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ada Lovelace"
                      className="w-full rounded-xl bg-bg border border-stroke px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-[#89AACC]"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-muted">Email address</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ada@example.com"
                      className="w-full rounded-xl bg-bg border border-stroke px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-[#89AACC]"
                    />
                  </label>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-muted">Password (min 8 characters)</span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl bg-bg border border-stroke px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-[#89AACC]"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-muted">Confirm Password</span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl bg-bg border border-stroke px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-[#89AACC]"
                    />
                  </label>
                </div>
              )}

              {step === 4 && (
                <div className="rounded-2xl bg-bg border border-stroke p-5 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium mb-2">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Ready to create account</span>
                  </div>
                  <p className="text-xs text-muted">
                    Role: <span className="text-text-primary capitalize">{role}</span>
                  </p>
                  <p className="text-xs text-muted">
                    Name: <span className="text-text-primary">{fullName}</span>
                  </p>
                  <p className="text-xs text-muted">
                    Email: <span className="text-text-primary">{email}</span>
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-bg border border-stroke text-xs text-muted hover:text-text-primary cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Back</span>
                  </button>
                ) : (
                  <span />
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-text-primary text-bg text-xs sm:text-sm font-medium hover:opacity-90 cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-text-primary text-bg text-xs sm:text-sm font-medium hover:opacity-90 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" aria-hidden="true" />
                    <span>Create Account</span>
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Right: Quick Demo Accounts & Reset */}
        <div className="lg:col-span-5 rounded-3xl bg-surface border border-stroke p-6 sm:p-8 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted mb-1">
              Instant Demo Switcher
            </p>
            <h2 className="text-2xl font-display italic text-text-primary">
              Pre-seeded personas
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              {currentUser ? (
                <>
                  Signed in right now as{' '}
                  <span className="text-text-primary font-medium">{currentUser.fullName}</span> (
                  {currentUser.role}). Switch anytime to test cross-role curriculum updates.
                </>
              ) : (
                'Not currently signed in. Choose a demo persona below or sign in with email and password.'
              )}
            </p>
          </div>

          <div className="space-y-2.5">
            {db.users.slice(0, 3).map((u) => {
              const active = currentUser ? u.id === currentUser.id : false;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    switchDemoUser(u.id);
                    navigate(u.role === 'instructor' ? '/instructor' : '/learner');
                  }}
                  className={`w-full text-left rounded-2xl border p-4 transition-colors cursor-pointer ${
                    active
                      ? 'border-[#89AACC] bg-[#89AACC]/10'
                      : 'border-stroke bg-bg hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary">{u.fullName}</span>
                    <span className="text-[11px] uppercase tracking-wider text-[#89AACC]">
                      {u.role}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{u.email} · Password: {u.password}</p>
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-stroke flex items-center justify-between gap-3">
            <span className="text-xs text-muted">Restore clean 14-concept seed</span>
            <button
              type="button"
              onClick={resetDemoData}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-bg border border-stroke hover:border-[#89AACC] text-xs text-text-primary cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Demo</span>
            </button>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
