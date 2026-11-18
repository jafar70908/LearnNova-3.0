import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePathForge } from '../context/PathForgeContext';
import { NotificationBell } from './pathforge/NotificationCenter';

interface NavbarProps {
  onOpenContact?: () => void;
}

export function Navbar(_props: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, signOut } = usePathForge();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (path: string) => {
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Courses', path: '/courses' },
  ];

  const isInstructor = currentUser?.role === 'instructor';
  const dashboardPath = isInstructor ? '/instructor' : '/learner';
  const accountActive = location.pathname.startsWith('/auth');
  const firstName = currentUser ? currentUser.fullName.split(' ')[0] : '';

  const handleSignOut = () => {
    signOut();
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between xl:grid xl:grid-cols-[1fr_auto_1fr] pt-4 md:pt-6 px-2.5 sm:px-6 lg:px-8 gap-1.5 sm:gap-3 pointer-events-none">
      {/* Top-Left Corner Brand Lockup */}
      <button
        type="button"
        data-testid="brand-top-left"
        onClick={() => handleNavClick('/')}
        aria-label="LearnNova home"
        className="pointer-events-auto justify-self-start inline-flex items-center gap-1.5 sm:gap-2.5 rounded-full bg-surface/85 backdrop-blur-md border border-white/10 hover:border-[#89AACC]/60 pl-1 sm:pl-1.5 pr-2.5 sm:pr-3.5 py-1 sm:py-1.5 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC] shrink-0"
      >
        <span className="relative w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-bg border border-stroke flex items-center justify-center shrink-0">
          <img
            src="/assets/aistudio/image_2a69ba30.png"
            alt="LearnNova logo"
            className="w-8 h-6 sm:w-9 sm:h-7 max-w-none object-cover object-[74%_50%] scale-110 mix-blend-screen"
          />
        </span>
        <span className="font-display italic text-base sm:text-xl text-text-primary tracking-tight leading-none whitespace-nowrap">
          LearnNova
        </span>
      </button>

      <nav
        aria-label="Primary navigation"
        className={`pointer-events-auto justify-self-center inline-flex items-center max-w-full rounded-full backdrop-blur-md border border-white/10 bg-surface px-1 sm:px-2 py-1 sm:py-2 transition-shadow duration-300 ${
          scrolled ? 'shadow-md shadow-black/10' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => handleNavClick('/')}
          aria-label="LearnNova home"
          className="hidden sm:inline-flex relative group w-8 h-8 sm:w-9 sm:h-9 rounded-full p-[1.5px] transition-transform duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC] shrink-0 cursor-pointer"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full accent-gradient transition-opacity duration-300 group-hover:opacity-0"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full accent-gradient-reverse opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
          <span className="relative z-10 w-full h-full rounded-full bg-bg overflow-hidden flex items-center justify-center">
            <img
              src="/assets/aistudio/image_2a69ba30.png"
              alt="LearnNova"
              className="w-9 h-7 max-w-none object-cover object-[74%_50%] scale-110 mix-blend-screen -ml-[12px]"
            />
          </span>
        </button>

        <span aria-hidden="true" className="hidden sm:block w-px h-5 bg-stroke mx-1" />

        <div className="flex items-center gap-0.5 sm:gap-1 mx-0.5 sm:mx-0">
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavClick(item.path)}
                aria-current={isActive ? 'page' : undefined}
                className={`text-[11px] sm:text-sm rounded-full px-2 sm:px-3.5 py-1 sm:py-1.5 transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC] ${
                  isActive
                    ? 'text-text-primary bg-stroke/50'
                    : 'text-muted hover:text-text-primary hover:bg-stroke/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {isAuthenticated ? (
            <button
              type="button"
              data-testid="nav-signout-btn"
              onClick={handleSignOut}
              className="text-[11px] sm:text-sm rounded-full px-2 sm:px-3.5 py-1 sm:py-1.5 text-muted hover:text-text-primary hover:bg-stroke/50 transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC]"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              data-testid="nav-account-btn"
              onClick={() => handleNavClick('/auth')}
              aria-current={accountActive ? 'page' : undefined}
              className={`text-[11px] sm:text-sm rounded-full px-2 sm:px-3.5 py-1 sm:py-1.5 transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC] ${
                accountActive
                  ? 'text-text-primary bg-stroke/50'
                  : 'text-muted hover:text-text-primary hover:bg-stroke/50'
              }`}
            >
              Account
            </button>
          )}
        </div>

        <span aria-hidden="true" className="hidden md:block w-px h-5 bg-stroke mx-1" />

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {isAuthenticated && currentUser && (
            <button
              type="button"
              data-testid="user-dashboard-badge"
              onClick={() => handleNavClick(dashboardPath)}
              title={`Open ${isInstructor ? 'Instructor' : 'Learner'} workspace for ${currentUser.fullName}`}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-bg border border-stroke hover:border-[#89AACC] px-3 py-1.5 text-xs text-text-primary whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#89AACC]" aria-hidden="true" />
              <span>
                {firstName} · {isInstructor ? 'Instructor' : 'Learner'}
              </span>
            </button>
          )}

          <NotificationBell />

          <button
            type="button"
            data-testid="nav-explore-graph-btn"
            onClick={() =>
              handleNavClick(isAuthenticated && currentUser ? dashboardPath : '/auth')
            }
            className="hidden lg:inline-flex relative group rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#89AACC] shrink-0"
          >
            <span
              aria-hidden="true"
              className="absolute -inset-[2px] rounded-full accent-gradient animate-gradient-shift opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
            />
            <span className="relative z-10 inline-flex items-center gap-1 bg-surface rounded-full backdrop-blur-md text-xs sm:text-sm px-3.5 py-1.5 text-text-primary whitespace-nowrap shrink-0">
              <span>Explore Graph</span>
              <span aria-hidden="true">↗</span>
            </span>
          </button>
        </div>
      </nav>
      <div className="hidden xl:block justify-self-end" aria-hidden="true" />
    </header>
  );
}
