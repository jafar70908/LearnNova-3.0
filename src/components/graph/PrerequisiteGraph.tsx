import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  CheckCircle2,
  Crosshair,
  LayoutGrid,
  Lock,
  Maximize2,
  PlayCircle,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ConceptRecord, PrerequisiteRecord } from '../../data/seedPathForge';
import type { ConceptState } from '../../lib/graph';

interface PrerequisiteGraphProps {
  mode: 'learner' | 'editor';
  guestPreview?: boolean;
  concepts: ConceptRecord[];
  links: PrerequisiteRecord[];
  states?: Record<string, ConceptState>;
  pathConceptIds?: string[];
  targetConceptId?: string | null;
  selectedConceptId?: string | null;
  cycleLoopIds?: string[] | null;
  onSelectConcept: (conceptId: string) => void;
  onUpdateNodePosition?: (conceptId: string, x: number, y: number) => void;
  onAutoLayout?: () => void;
  onAddLink?: (prereqId: string, conceptId: string) => void;
  onRemoveLink?: (prereqId: string, conceptId: string) => void;
}

const NODE_WIDTH = 204;
const NODE_HEIGHT = 76;

export function PrerequisiteGraph({
  mode,
  guestPreview = false,
  concepts,
  links,
  states,
  pathConceptIds = [],
  targetConceptId = null,
  selectedConceptId = null,
  cycleLoopIds = null,
  onSelectConcept,
  onUpdateNodePosition,
  onAutoLayout,
  onAddLink,
  onRemoveLink,
}: PrerequisiteGraphProps) {
  const activeConcepts = useMemo(
    () => concepts.filter((c) => c.status === 'active'),
    [concepts]
  );

  const activeIds = useMemo(
    () => new Set(activeConcepts.map((c) => c.id)),
    [activeConcepts]
  );

  const activeLinks = useMemo(
    () =>
      links.filter(
        (l) => l.removedAt === null && activeIds.has(l.prereqId) && activeIds.has(l.conceptId)
      ),
    [links, activeIds]
  );

  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 24, y: 20 });
  const [selectedEdge, setSelectedEdge] = useState<{ prereqId: string; conceptId: string } | null>(
    null
  );
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    type: 'node' | 'pan';
    conceptId?: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    liveX?: number;
    liveY?: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const pathSet = useMemo(() => new Set(pathConceptIds), [pathConceptIds]);
  const pathOrderMap = useMemo(() => {
    const map: Record<string, number> = {};
    pathConceptIds.forEach((id, idx) => {
      map[id] = idx + 1;
    });
    return map;
  }, [pathConceptIds]);

  const cycleEdgeSet = useMemo(() => {
    const set = new Set<string>();
    if (cycleLoopIds && cycleLoopIds.length >= 2) {
      for (let i = 0; i < cycleLoopIds.length - 1; i++) {
        set.add(`${cycleLoopIds[i]}->${cycleLoopIds[i + 1]}`);
      }
      // Also highlight the closing rejected edge
      const last = cycleLoopIds[cycleLoopIds.length - 2];
      const first = cycleLoopIds[0];
      if (last && first) {
        set.add(`${last}->${first}`);
      }
    }
    return set;
  }, [cycleLoopIds]);

  const cycleNodeSet = useMemo(() => new Set(cycleLoopIds ?? []), [cycleLoopIds]);

  const getNodePos = (c: ConceptRecord) => {
    if (dragState?.type === 'node' && dragState.conceptId === c.id) {
      return {
        x: dragState.liveX ?? c.posX,
        y: dragState.liveY ?? c.posY,
      };
    }
    return { x: c.posX, y: c.posY };
  };

  const bounds = useMemo(() => {
    if (activeConcepts.length === 0) {
      return { minX: 0, minY: 0, maxX: 900, maxY: 600 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const c of activeConcepts) {
      minX = Math.min(minX, c.posX);
      minY = Math.min(minY, c.posY);
      maxX = Math.max(maxX, c.posX + NODE_WIDTH);
      maxY = Math.max(maxY, c.posY + NODE_HEIGHT);
    }
    return { minX, minY, maxX, maxY };
  }, [activeConcepts]);

  const handleFitView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const contentW = Math.max(400, bounds.maxX - bounds.minX + 80);
    const contentH = Math.max(300, bounds.maxY - bounds.minY + 80);
    const scaleX = rect.width / contentW;
    const scaleY = rect.height / contentH;
    const nextZoom = Math.max(0.45, Math.min(1.0, Math.min(scaleX, scaleY)));
    setZoom(Number(nextZoom.toFixed(2)));
    setPan({
      x: Math.round((rect.width - (bounds.maxX - bounds.minX) * nextZoom) / 2 - bounds.minX * nextZoom),
      y: Math.round(24 - bounds.minY * nextZoom),
    });
  }, [bounds]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => handleFitView());
    return () => cancelAnimationFrame(raf);
  }, [activeConcepts.length, handleFitView]);

  const handleBackgroundPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-node-card]')) return;
    setSelectedEdge(null);
    setDragState({
      type: 'pan',
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    });
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startClientX;
    const dy = e.clientY - dragState.startClientY;

    if (dragState.type === 'pan') {
      setPan({ x: dragState.origX + dx, y: dragState.origY + dy });
    } else if (dragState.type === 'node' && dragState.conceptId) {
      setDragState({
        ...dragState,
        liveX: dragState.origX + dx / zoom,
        liveY: dragState.origY + dy / zoom,
      });
    }
  };

  const handlePointerUp = () => {
    if (
      dragState?.type === 'node' &&
      dragState.conceptId &&
      typeof dragState.liveX === 'number' &&
      typeof dragState.liveY === 'number' &&
      onUpdateNodePosition
    ) {
      onUpdateNodePosition(dragState.conceptId, dragState.liveX, dragState.liveY);
    }
    setDragState(null);
  };

  const conceptMap = useMemo(() => {
    const map: Record<string, ConceptRecord> = {};
    for (const c of activeConcepts) map[c.id] = c;
    return map;
  }, [activeConcepts]);

  // Rejected closing edge preview when cycleLoopIds is set
  const rejectedEdge = useMemo(() => {
    if (!cycleLoopIds || cycleLoopIds.length < 2) return null;
    const conceptId = cycleLoopIds[0];
    const prereqId = cycleLoopIds[cycleLoopIds.length - 2];
    if (!prereqId || !conceptId) return null;
    return { prereqId, conceptId };
  }, [cycleLoopIds]);

  return (
    <div className="rounded-3xl bg-surface border border-stroke overflow-hidden flex flex-col">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-stroke bg-bg/60">
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="uppercase tracking-[0.2em] text-text-primary/90 font-medium">
            Concept Graph
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{activeConcepts.length} concepts</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{activeLinks.length} links</span>
          {mode === 'editor' && connectFromId && (
            <span className="text-[#89AACC] font-medium ml-2">
              Select target dependent concept for &ldquo;{conceptMap[connectFromId]?.title}&rdquo; (or click Cancel)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mode === 'editor' && connectFromId && (
            <button
              type="button"
              onClick={() => setConnectFromId(null)}
              className="px-3 py-1.5 rounded-full bg-bg border border-stroke text-xs text-muted hover:text-text-primary cursor-pointer"
            >
              Cancel link
            </button>
          )}

          {mode === 'editor' && selectedEdge && onRemoveLink && (
            <button
              type="button"
              onClick={() => {
                onRemoveLink(selectedEdge.prereqId, selectedEdge.conceptId);
                setSelectedEdge(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 hover:bg-rose-500/25 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Remove selected link</span>
            </button>
          )}

          {mode === 'editor' && onAutoLayout && (
            <button
              type="button"
              onClick={onAutoLayout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg border border-stroke text-xs text-text-primary hover:border-[#89AACC] cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Auto layout</span>
            </button>
          )}

          <div className="inline-flex items-center rounded-full bg-bg border border-stroke p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.1).toFixed(2))))}
              aria-label="Zoom out graph"
              className="p-1.5 text-muted hover:text-text-primary cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <span className="text-[11px] text-muted tabular-nums px-1.5">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
              aria-label="Zoom in graph"
              className="p-1.5 text-muted hover:text-text-primary cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleFitView}
              aria-label="Fit graph to view"
              className="p-1.5 text-muted hover:text-text-primary cursor-pointer border-l border-stroke"
            >
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Canvas */}
      <div
        ref={containerRef}
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative h-[520px] sm:h-[580px] w-full overflow-hidden bg-bg select-none cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {activeConcepts.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
            No active concepts yet. Add your first concept to begin modeling prerequisites.
          </div>
        ) : (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
            className="absolute top-0 left-0 w-[1600px] h-[1200px]"
          >
            {/* SVG Edges Layer */}
            <svg
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(255,255,255,0.28)" />
                </marker>
                <marker
                  id="arrow-path"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#89AACC" />
                </marker>
                <marker
                  id="arrow-cycle"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#EF4444" />
                </marker>
              </defs>

              {activeLinks.map((link) => {
                const from = conceptMap[link.prereqId];
                const to = conceptMap[link.conceptId];
                if (!from || !to) return null;

                const fromPos = getNodePos(from);
                const toPos = getNodePos(to);
                const x1 = fromPos.x + NODE_WIDTH / 2;
                const y1 = fromPos.y + NODE_HEIGHT;
                const x2 = toPos.x + NODE_WIDTH / 2;
                const y2 = toPos.y;

                const midY = (y1 + y2) / 2;
                const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

                const edgeKey = `${link.prereqId}->${link.conceptId}`;
                const isCycleEdge = cycleEdgeSet.has(edgeKey);
                const isPathEdge =
                  pathSet.has(link.prereqId) && pathSet.has(link.conceptId);
                const isSelected =
                  selectedEdge?.prereqId === link.prereqId &&
                  selectedEdge?.conceptId === link.conceptId;

                const strokeColor = isCycleEdge
                  ? '#EF4444'
                  : isSelected
                    ? '#F8FAFC'
                    : isPathEdge
                      ? '#89AACC'
                      : 'rgba(255,255,255,0.22)';

                const marker = isCycleEdge
                  ? 'url(#arrow-cycle)'
                  : isPathEdge
                    ? 'url(#arrow-path)'
                    : 'url(#arrow-default)';

                return (
                  <g key={link.id}>
                    <path
                      d={d}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isCycleEdge || isSelected ? 3 : isPathEdge ? 2.5 : 1.5}
                      markerEnd={marker}
                      className={isCycleEdge ? 'animate-pulse' : undefined}
                    />
                    {mode === 'editor' && (
                      <path
                        d={d}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={14}
                        className="pointer-events-auto cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEdge({ prereqId: link.prereqId, conceptId: link.conceptId });
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {rejectedEdge &&
                conceptMap[rejectedEdge.prereqId] &&
                conceptMap[rejectedEdge.conceptId] && (() => {
                  const fromPos = getNodePos(conceptMap[rejectedEdge.prereqId]);
                  const toPos = getNodePos(conceptMap[rejectedEdge.conceptId]);
                  const x1 = fromPos.x + NODE_WIDTH / 2;
                  const y1 = fromPos.y + NODE_HEIGHT;
                  const x2 = toPos.x + NODE_WIDTH / 2;
                  const y2 = toPos.y;
                  const d = `M ${x1} ${y1} C ${x1 + 140} ${(y1 + y2) / 2}, ${x2 + 140} ${(y1 + y2) / 2}, ${x2} ${y2}`;
                  return (
                    <path
                      d={d}
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth={3}
                      strokeDasharray="6 4"
                      markerEnd="url(#arrow-cycle)"
                      className="animate-pulse"
                    />
                  );
                })()}
            </svg>

            {/* Concept Nodes Layer */}
            {activeConcepts.map((concept) => {
              const pos = getNodePos(concept);
              const state = guestPreview ? undefined : states?.[concept.id];
              const status = state?.status ?? 'unlocked';
              const isTarget = targetConceptId === concept.id;
              const isInPath = pathSet.has(concept.id);
              const pathStepNum = pathOrderMap[concept.id];
              const isSelected = selectedConceptId === concept.id;
              const isCycleNode = cycleNodeSet.has(concept.id);
              const isConnectSource = connectFromId === concept.id;

              let borderClass = 'border-stroke';
              let bgClass = 'bg-surface';

              if (isCycleNode) {
                borderClass = 'border-rose-500 ring-2 ring-rose-500/40 animate-pulse';
              } else if (isConnectSource) {
                borderClass = 'border-[#89AACC] ring-2 ring-[#89AACC]/40';
              } else if (isSelected) {
                borderClass = 'border-white/70 ring-2 ring-white/20';
              } else if (isTarget) {
                borderClass = 'border-[#89AACC] ring-2 ring-[#89AACC]/30';
              } else if (isInPath) {
                borderClass = 'border-[#89AACC]/70';
              } else if (mode === 'learner' && !guestPreview && status === 'mastered') {
                borderClass = 'border-emerald-500/45';
              } else if (mode === 'learner' && !guestPreview && status === 'locked') {
                bgClass = 'bg-surface/60';
              }

              return (
                <div
                  key={concept.id}
                  data-node-card="true"
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: `${NODE_WIDTH}px`,
                    height: `${NODE_HEIGHT}px`,
                  }}
                  onPointerDown={(e) => {
                    if (mode !== 'editor') return;
                    if ((e.target as HTMLElement).closest('button')) return;
                    setDragState({
                      type: 'node',
                      conceptId: concept.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      origX: pos.x,
                      origY: pos.y,
                      liveX: pos.x,
                      liveY: pos.y,
                    });
                  }}
                  className={`absolute rounded-2xl border ${borderClass} ${bgClass} p-3 flex flex-col justify-between shadow-lg transition-colors duration-200 ${
                    mode === 'editor' ? 'cursor-move' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (mode === 'editor' && connectFromId && onAddLink) {
                        if (connectFromId !== concept.id) {
                          onAddLink(connectFromId, concept.id);
                          setConnectFromId(null);
                          return;
                        }
                      }
                      onSelectConcept(concept.id);
                    }}
                    className="w-full text-left flex items-start justify-between gap-2 cursor-pointer focus-visible:outline-none"
                  >
                    <span className="text-xs sm:text-[13px] font-medium text-text-primary leading-snug line-clamp-2">
                      {concept.title}
                    </span>

                    {mode === 'learner' && (
                      <span className="shrink-0 mt-0.5" aria-hidden="true">
                        {guestPreview ? (
                          <Lock className="w-4 h-4 text-muted" />
                        ) : status === 'mastered' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : status === 'unlocked' ? (
                          <PlayCircle className="w-4 h-4 text-[#89AACC]" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted" />
                        )}
                      </span>
                    )}
                  </button>

                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    {mode === 'learner' ? (
                      guestPreview ? (
                        <span className="text-muted">Sign in to start</span>
                      ) : (
                        <span
                          className={
                            status === 'mastered'
                              ? 'text-emerald-400'
                              : status === 'unlocked'
                                ? 'text-[#89AACC]'
                                : 'text-muted'
                          }
                        >
                          {status === 'mastered'
                            ? 'Mastered'
                            : status === 'unlocked'
                              ? 'Unlocked'
                              : `Locked (${state?.missing.length ?? 0})`}
                        </span>
                      )
                    ) : (
                      <span className="text-muted tabular-nums">
                        {concept.passThreshold ?? 'Default'}% pass
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {isTarget && (
                        <span className="inline-flex items-center gap-1 text-[#89AACC] font-medium">
                          <Crosshair className="w-3 h-3" aria-hidden="true" />
                          <span>Target</span>
                        </span>
                      )}
                      {!isTarget && isInPath && pathStepNum && (
                        <span className="text-[#89AACC] font-medium tabular-nums">
                          Step {pathStepNum}
                        </span>
                      )}
                      {mode === 'editor' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (connectFromId && connectFromId !== concept.id && onAddLink) {
                              onAddLink(connectFromId, concept.id);
                              setConnectFromId(null);
                            } else {
                              setConnectFromId(connectFromId === concept.id ? null : concept.id);
                            }
                          }}
                          className="text-[11px] text-[#89AACC] hover:underline cursor-pointer"
                        >
                          {connectFromId === concept.id
                            ? 'Pick target…'
                            : connectFromId
                              ? 'Connect here'
                              : '+ Link'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Accessible Legend (NFR-07: icons + text labels, not color alone) */}
      <div
        role="region"
        aria-label="Graph legend"
        className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-t border-stroke bg-bg/80 text-xs text-muted"
      >
        {guestPreview ? (
          <div className="flex flex-wrap items-center gap-5">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>Preview · Sign in required to track mastery</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-[#89AACC]" aria-hidden="true" />
              <span>Target &amp; Path</span>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-5">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span>Mastered</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <PlayCircle className="w-3.5 h-3.5 text-[#89AACC]" aria-hidden="true" />
              <span>Unlocked</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>Locked</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-[#89AACC]" aria-hidden="true" />
              <span>Target &amp; Path</span>
            </span>
          </div>
        )}
        <span>
          {guestPreview
            ? 'Drag canvas to pan · Click node to sign in'
            : 'Drag canvas to pan · Click node to inspect'}
        </span>
      </div>
    </div>
  );
}
