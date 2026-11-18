import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, Layers, Search } from 'lucide-react';
import { usePathForge } from '../context/PathForgeContext';
import { buildCourseGraph } from '../lib/store/pathforgeStore';

export function CoursesCataloguePage() {
  const { db, currentUser, isAuthenticated, enroll, unenroll, showToast } = usePathForge();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const loggedIn = isAuthenticated && currentUser !== null;

  const published = useMemo(
    () =>
      db.courses.filter(
        (c) =>
          c.published &&
          (c.title.toLowerCase().includes(query.toLowerCase()) ||
            c.description.toLowerCase().includes(query.toLowerCase()))
      ),
    [db.courses, query]
  );

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-bg text-text-primary pt-28 pb-24 px-6 md:px-10 lg:px-16"
    >
      <div className="max-w-[1200px] mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-stroke">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#89AACC] mb-2">
              Course Catalogue
            </p>
            <h1 className="text-4xl sm:text-6xl font-display italic text-text-primary leading-none">
              Prerequisite-Aware Curricula
            </h1>
            <p className="text-sm text-muted mt-3 max-w-xl leading-relaxed">
              Enroll in structured concept graphs. Unenrolling preserves your quiz mastery and
              lesson completions if you return later.
            </p>
          </div>

          <label className="relative block w-full md:w-72">
            <span className="sr-only">Search courses</span>
            <Search
              className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses..."
              className="w-full rounded-full bg-surface border border-stroke pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-[#89AACC]"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {published.map((course) => {
            const graph = buildCourseGraph(db, course.id);
            const activeConcepts = graph.concepts.filter((c) => c.status === 'active');
            const isEnrolled = loggedIn
              ? db.enrollments.some(
                  (e) => e.learnerId === currentUser.id && e.courseId === course.id
                )
              : false;

            return (
              <div
                key={course.id}
                className="rounded-3xl bg-surface border border-stroke p-6 flex flex-col justify-between gap-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5 text-[#89AACC]">
                      <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Graph v{course.graphVersion}</span>
                    </span>
                    <span className="tabular-nums">Pass &ge; {course.passThreshold}%</span>
                  </div>

                  <h2 className="text-2xl font-display italic text-text-primary">
                    {course.title}
                  </h2>
                  <p className="text-xs text-muted leading-relaxed">{course.description}</p>

                  <div className="flex items-center gap-3 text-xs text-muted pt-1 tabular-nums">
                    <span>{activeConcepts.length} concepts</span>
                    <span aria-hidden="true">·</span>
                    <span>{graph.links.length} prerequisite links</span>
                    <span aria-hidden="true">·</span>
                    <span>{graph.lessons.length} lessons</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-stroke">
                  {!loggedIn ? (
                    <button
                      type="button"
                      onClick={() => {
                        showToast(
                          'Sign in required',
                          'Please sign in as a Learner to enroll, access lessons, and track mastery.',
                          'info'
                        );
                        navigate('/auth');
                      }}
                      className="w-full py-2.5 px-4 rounded-full bg-text-primary text-bg text-xs font-medium hover:opacity-90 cursor-pointer"
                    >
                      Sign In to Enroll
                    </button>
                  ) : currentUser.role === 'instructor' ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/instructor/courses/${course.id}`)}
                      className="w-full py-2.5 px-4 rounded-full bg-text-primary text-bg text-xs font-medium hover:opacity-90 cursor-pointer"
                    >
                      Manage in Instructor Studio
                    </button>
                  ) : isEnrolled ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(`/learner/courses/${course.id}`)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-full bg-text-primary text-bg text-xs font-medium hover:opacity-90 cursor-pointer whitespace-nowrap"
                      >
                        <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Open Course</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => unenroll(course.id)}
                        className="inline-flex items-center gap-1 py-2.5 px-3.5 rounded-full bg-bg border border-stroke text-xs text-muted hover:text-rose-300 cursor-pointer whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        <span>Unenroll</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        enroll(course.id);
                        navigate(`/learner/courses/${course.id}`);
                      }}
                      className="w-full py-2.5 px-4 rounded-full bg-text-primary text-bg text-xs font-medium hover:opacity-90 cursor-pointer"
                    >
                      Enroll &amp; Start Learning
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.main>
  );
}
