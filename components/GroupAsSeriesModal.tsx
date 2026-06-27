"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  X,
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Tv,
  Loader2,
  AlertTriangle,
  HardDrive,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  ChevronsRight,
} from "lucide-react";
import type { MediaEntry } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────

interface DragItem {
  id: string;
  mediaId: number;
  filename: string;
  source: string;
  episodeName: string;
}

interface Season {
  seasonNumber: number;
  episodes: DragItem[];
  collapsed: boolean;
}

interface GroupAsSeriesModalProps {
  selectedMedia: MediaEntry[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: {
    seriesTitle: string;
    seriesSlug: string;
    updated: number;
    seasonCount: number;
  }) => void;
}

// ─── Sortable Episode Item ─────────────────────────────────────

function SortableEpisodeItem({
  item,
  episodeNumber,
  showEpisodeNumber,
  onNameChange,
  isChecked,
  onCheck,
  showCheckbox,
}: {
  item: DragItem;
  episodeNumber?: number;
  showEpisodeNumber: boolean;
  onNameChange: (id: string, name: string) => void;
  isChecked?: boolean;
  onCheck?: (id: string) => void;
  showCheckbox?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.25 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] group/item hover:bg-white/[0.06] transition-colors ${
        isDragging ? "shadow-xl shadow-violet-500/20 z-50" : ""
      } ${isChecked ? "border-violet-500/40 bg-violet-500/[0.06]" : ""}`}
    >
      {/* Checkbox for bulk selection */}
      {showCheckbox && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCheck?.(item.id);
          }}
          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
            isChecked
              ? "bg-violet-500 border-violet-500"
              : "border-white/20 hover:border-white/40"
          }`}
        >
          {isChecked && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 transition-colors touch-none shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Episode number */}
      {showEpisodeNumber && episodeNumber !== undefined && (
        <span className="text-[11px] font-bold text-violet-400/80 bg-violet-500/10 px-2 py-0.5 rounded-md min-w-[40px] text-center shrink-0">
          E{String(episodeNumber).padStart(2, "0")}
        </span>
      )}

      {/* Filename */}
      <span
        className="text-sm text-white/70 font-medium truncate flex-1 min-w-0"
        title={item.filename}
      >
        {item.filename}
      </span>

      {/* Source badge */}
      <span className="flex items-center gap-1 text-[10px] text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium uppercase shrink-0">
        {item.source === "hdd" ? (
          <HardDrive className="w-3 h-3" />
        ) : (
          <FolderOpen className="w-3 h-3" />
        )}
        {item.source}
      </span>

      {/* Episode name input (shown in seasons only) */}
      {showEpisodeNumber && (
        <input
          type="text"
          value={item.episodeName}
          onChange={(e) => onNameChange(item.id, e.target.value)}
          placeholder="Episode name"
          maxLength={100}
          className="w-28 lg:w-36 text-xs text-white/60 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2 py-1.5 placeholder:text-white/20 focus:outline-none focus:border-violet-500/30 focus:bg-white/[0.06] transition-all shrink-0"
        />
      )}
    </div>
  );
}

// ─── Droppable Container (uses useDroppable hook) ──────────────

function DroppableZone({
  id,
  children,
  label,
}: {
  id: string;
  children: React.ReactNode;
  label: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[60px] rounded-xl border-2 border-dashed transition-all duration-200 p-1.5 ${
        isOver
          ? "border-violet-500/50 bg-violet-500/[0.08]"
          : "border-white/[0.04] bg-transparent"
      }`}
    >
      {children}
      {React.Children.count(children) === 0 && (
        <div
          className={`flex items-center justify-center h-[50px] text-xs ${
            isOver ? "text-violet-400/60" : "text-white/20"
          }`}
        >
          {isOver ? `Drop to add to ${label}` : "Drag episodes here"}
        </div>
      )}
    </div>
  );
}

import React from "react";

// ─── Main Modal ────────────────────────────────────────────────

export default function GroupAsSeriesModal({
  selectedMedia,
  isOpen,
  onClose,
  onComplete,
}: GroupAsSeriesModalProps) {
  const [seriesName, setSeriesName] = useState("");
  const [fetchMetadata, setFetchMetadata] = useState(true);
  const [unassigned, setUnassigned] = useState<DragItem[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([
    { seasonNumber: 1, episodes: [], collapsed: false },
  ]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // Checked items in unassigned (for bulk move)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Initialize from selectedMedia
  useEffect(() => {
    if (isOpen && selectedMedia.length > 0) {
      const items: DragItem[] = selectedMedia.map((m) => ({
        id: `item-${m.id}`,
        mediaId: m.id,
        filename: m.filename || m.title,
        source: m.source || "local",
        episodeName: "",
      }));
      setUnassigned(items);
      setSeasons([{ seasonNumber: 1, episodes: [], collapsed: false }]);
      setSeriesName(selectedMedia[0]?.title || "");
      setError(null);
      setSubmitting(false);
      setShowDiscardConfirm(false);
      setCheckedIds(new Set());
    }
  }, [isOpen, selectedMedia]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── Helper: find which container an item belongs to ──
  const findContainer = useCallback(
    (itemId: string): string | null => {
      if (unassigned.some((i) => i.id === itemId)) return "unassigned";
      for (const s of seasons) {
        if (s.episodes.some((i) => i.id === itemId))
          return `season-${s.seasonNumber}`;
      }
      // Is the id itself a container?
      if (itemId === "unassigned") return "unassigned";
      if (itemId.startsWith("season-")) return itemId;
      return null;
    },
    [unassigned, seasons]
  );

  // ── Helper: find an item by id ──
  const findItem = useCallback(
    (itemId: string): DragItem | undefined => {
      const found = unassigned.find((i) => i.id === itemId);
      if (found) return found;
      for (const s of seasons) {
        const ep = s.episodes.find((i) => i.id === itemId);
        if (ep) return ep;
      }
      return undefined;
    },
    [unassigned, seasons]
  );

  const activeItem = activeId ? findItem(activeId) : null;

  // ── Get all items in a container ──
  const getContainerItems = useCallback(
    (containerId: string): DragItem[] => {
      if (containerId === "unassigned") return unassigned;
      const seasonNum = parseInt(containerId.replace("season-", ""));
      const season = seasons.find((s) => s.seasonNumber === seasonNum);
      return season?.episodes || [];
    },
    [unassigned, seasons]
  );

  // ── Set items in a container ──
  const setContainerItems = useCallback(
    (containerId: string, items: DragItem[]) => {
      if (containerId === "unassigned") {
        setUnassigned(items);
      } else {
        const seasonNum = parseInt(containerId.replace("season-", ""));
        setSeasons((prev) =>
          prev.map((s) =>
            s.seasonNumber === seasonNum ? { ...s, episodes: items } : s
          )
        );
      }
    },
    []
  );

  // ── Drag Start ──
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // ── Drag Over (cross-container move) ──
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Determine containers
      const activeContainer = findContainer(activeId);
      // For 'over', check if it IS a container first, then find which container it belongs to
      let overContainer: string | null = null;
      if (overId === "unassigned" || overId.startsWith("season-")) {
        overContainer = overId;
      } else {
        overContainer = findContainer(overId);
      }

      if (!activeContainer || !overContainer || activeContainer === overContainer)
        return;

      // Cross-container move
      const activeItems = getContainerItems(activeContainer);
      const overItems = getContainerItems(overContainer);

      const activeIndex = activeItems.findIndex((i) => i.id === activeId);
      const overIndex = overItems.findIndex((i) => i.id === overId);

      if (activeIndex === -1) return;

      const item = activeItems[activeIndex];
      const newActiveItems = activeItems.filter((i) => i.id !== activeId);
      const newOverItems = [...overItems];

      // Insert at the position of the 'over' item, or at the end
      if (overIndex >= 0) {
        newOverItems.splice(overIndex, 0, item);
      } else {
        newOverItems.push(item);
      }

      setContainerItems(activeContainer, newActiveItems);
      setContainerItems(overContainer, newOverItems);
    },
    [findContainer, getContainerItems, setContainerItems]
  );

  // ── Drag End (same-container reorder) ──
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;
      if (active.id === over.id) return;

      const activeContainer = findContainer(active.id as string);
      const overContainer = findContainer(over.id as string);

      if (!activeContainer || !overContainer) return;

      // Same container reorder
      if (activeContainer === overContainer) {
        const items = getContainerItems(activeContainer);
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          setContainerItems(activeContainer, arrayMove(items, oldIndex, newIndex));
        }
      }
    },
    [findContainer, getContainerItems, setContainerItems]
  );

  // ── Bulk move: checked items → season ──
  const moveCheckedToSeason = useCallback(
    (seasonNum: number) => {
      if (checkedIds.size === 0) return;
      const toMove = unassigned.filter((i) => checkedIds.has(i.id));
      const remaining = unassigned.filter((i) => !checkedIds.has(i.id));
      setUnassigned(remaining);
      setSeasons((prev) =>
        prev.map((s) =>
          s.seasonNumber === seasonNum
            ? { ...s, episodes: [...s.episodes, ...toMove] }
            : s
        )
      );
      setCheckedIds(new Set());
    },
    [checkedIds, unassigned]
  );

  // ── Move ALL unassigned → season ──
  const moveAllToSeason = useCallback(
    (seasonNum: number) => {
      if (unassigned.length === 0) return;
      setSeasons((prev) =>
        prev.map((s) =>
          s.seasonNumber === seasonNum
            ? { ...s, episodes: [...s.episodes, ...unassigned] }
            : s
        )
      );
      setUnassigned([]);
      setCheckedIds(new Set());
    },
    [unassigned]
  );

  // ── Toggle check ──
  const toggleCheck = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Select All / Deselect All ──
  const toggleSelectAll = useCallback(() => {
    if (checkedIds.size === unassigned.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(unassigned.map((i) => i.id)));
    }
  }, [checkedIds.size, unassigned]);

  // ── Season management ──
  const addSeason = useCallback(() => {
    setSeasons((prev) => {
      if (prev.length >= 20) return prev;
      const nextNum = Math.max(...prev.map((s) => s.seasonNumber), 0) + 1;
      return [
        ...prev,
        { seasonNumber: nextNum, episodes: [], collapsed: false },
      ];
    });
  }, []);

  const deleteSeason = useCallback(
    (seasonNum: number) => {
      const season = seasons.find((s) => s.seasonNumber === seasonNum);
      if (!season) return;

      if (season.episodes.length > 0) {
        setShowDeleteConfirm(seasonNum);
        return;
      }

      if (seasons.length <= 1) return;
      setSeasons((prev) => prev.filter((s) => s.seasonNumber !== seasonNum));
    },
    [seasons]
  );

  const confirmDeleteSeason = useCallback(() => {
    if (showDeleteConfirm === null) return;
    const season = seasons.find((s) => s.seasonNumber === showDeleteConfirm);
    if (!season) return;
    setUnassigned((prev) => [...prev, ...season.episodes]);
    setSeasons((prev) =>
      prev.filter((s) => s.seasonNumber !== showDeleteConfirm)
    );
    setShowDeleteConfirm(null);
  }, [showDeleteConfirm, seasons]);

  const toggleSeasonCollapse = useCallback((seasonNum: number) => {
    setSeasons((prev) =>
      prev.map((s) =>
        s.seasonNumber === seasonNum ? { ...s, collapsed: !s.collapsed } : s
      )
    );
  }, []);

  // ── Episode name change ──
  const handleEpisodeNameChange = useCallback(
    (itemId: string, name: string) => {
      setUnassigned((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, episodeName: name } : i))
      );
      setSeasons((prev) =>
        prev.map((s) => ({
          ...s,
          episodes: s.episodes.map((i) =>
            i.id === itemId ? { ...i, episodeName: name } : i
          ),
        }))
      );
    },
    []
  );

  // ── Computed ──
  const totalAssigned = useMemo(
    () => seasons.reduce((sum, s) => sum + s.episodes.length, 0),
    [seasons]
  );

  const canSubmit = useMemo(
    () =>
      seriesName.trim().length > 0 &&
      unassigned.length === 0 &&
      totalAssigned >= 2 &&
      !submitting,
    [seriesName, unassigned.length, totalAssigned, submitting]
  );

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      seriesName: seriesName.trim(),
      fetchMetadata,
      seasons: seasons
        .filter((s) => s.episodes.length > 0)
        .map((s) => ({
          seasonNumber: s.seasonNumber,
          episodes: s.episodes.map((ep, idx) => ({
            mediaId: ep.mediaId,
            episodeNumber: idx + 1,
            episodeName: ep.episodeName.trim() || undefined,
          })),
        })),
    };

    try {
      const res = await fetch("/api/group-as-series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create series");
        setSubmitting(false);
        return;
      }

      onComplete({
        seriesTitle: data.seriesTitle,
        seriesSlug: data.seriesSlug,
        updated: data.updated,
        seasonCount: payload.seasons.length,
      });
    } catch (err: any) {
      setError(err.message || "Network error");
      setSubmitting(false);
    }
  }, [canSubmit, seriesName, fetchMetadata, seasons, onComplete]);

  // ── Close handler ──
  const handleClose = useCallback(() => {
    if (totalAssigned > 0) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [totalAssigned, onClose]);

  const confirmDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    onClose();
  }, [onClose]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, handleClose]);

  // All sortable IDs
  const unassignedIds = useMemo(
    () => unassigned.map((i) => i.id),
    [unassigned]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-5xl max-h-[90vh] rounded-[24px] bg-[#0d0d0d] border border-white/[0.06] shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── Header ─────────────────────────────── */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.05] shrink-0">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Tv className="w-5 h-5 text-violet-400" />
                </div>
                Organize as Series
              </h2>
              <p className="text-sm text-white/40 mt-1 ml-[52px]">
                Select episodes and move them into seasons
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* ─── Body ───────────────────────────────── */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* ── Left Panel: Unassigned ── */}
              <div className="w-[38%] border-r border-white/[0.05] flex flex-col min-h-0">
                <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white/80">
                      Unassigned
                    </h3>
                    <span className="text-[11px] font-bold text-white/40 bg-white/[0.04] px-2 py-0.5 rounded-md">
                      {unassigned.length}
                    </span>
                  </div>
                  {unassigned.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleSelectAll}
                        className="text-[11px] font-bold text-violet-400/80 hover:text-violet-300 transition-colors"
                      >
                        {checkedIds.size === unassigned.length
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Bulk action buttons */}
                {unassigned.length > 0 && seasons.length > 0 && (
                  <div className="px-4 py-2.5 border-b border-white/[0.04] flex flex-wrap gap-2 shrink-0">
                    {seasons.map((s) => (
                      <div key={s.seasonNumber} className="flex items-center gap-1">
                        {checkedIds.size > 0 ? (
                          <button
                            onClick={() => moveCheckedToSeason(s.seasonNumber)}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-white/50 hover:text-violet-300 bg-white/[0.03] hover:bg-violet-500/10 border border-white/[0.05] hover:border-violet-500/20 px-2.5 py-1.5 rounded-lg transition-all"
                          >
                            <ArrowRight className="w-3 h-3" />
                            {checkedIds.size} → S{s.seasonNumber}
                          </button>
                        ) : (
                          <button
                            onClick={() => moveAllToSeason(s.seasonNumber)}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-white/50 hover:text-violet-300 bg-white/[0.03] hover:bg-violet-500/10 border border-white/[0.05] hover:border-violet-500/20 px-2.5 py-1.5 rounded-lg transition-all"
                          >
                            <ChevronsRight className="w-3 h-3" />
                            All → S{s.seasonNumber}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
                  <SortableContext
                    items={unassignedIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableZone id="unassigned" label="Unassigned">
                      <div className="flex flex-col gap-1.5">
                        {unassigned.map((item) => (
                          <SortableEpisodeItem
                            key={item.id}
                            item={item}
                            showEpisodeNumber={false}
                            onNameChange={handleEpisodeNameChange}
                            showCheckbox={true}
                            isChecked={checkedIds.has(item.id)}
                            onCheck={toggleCheck}
                          />
                        ))}
                      </div>
                    </DroppableZone>
                  </SortableContext>
                </div>

                {unassigned.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-white/[0.04] shrink-0">
                    <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      Assign all episodes to continue
                    </p>
                  </div>
                )}
              </div>

              {/* ── Right Panel: Seasons ── */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-bold text-white/80">Seasons</h3>
                  <button
                    onClick={addSeason}
                    disabled={seasons.length >= 20}
                    className="flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Season
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  {seasons.map((season) => {
                    const seasonContainerId = `season-${season.seasonNumber}`;
                    const episodeIds = season.episodes.map((i) => i.id);

                    return (
                      <div
                        key={season.seasonNumber}
                        className="rounded-2xl border border-white/[0.05] bg-white/[0.02] overflow-hidden"
                      >
                        {/* Season Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02]">
                          <button
                            onClick={() =>
                              toggleSeasonCollapse(season.seasonNumber)
                            }
                            className="flex items-center gap-2.5 text-sm font-bold text-white/80 hover:text-white transition-colors"
                          >
                            {season.collapsed ? (
                              <ChevronRight className="w-4 h-4 text-white/40" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-white/40" />
                            )}
                            Season {season.seasonNumber}
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-white/40 bg-white/[0.04] px-2 py-0.5 rounded-md">
                              {season.episodes.length} ep
                              {season.episodes.length !== 1 ? "s" : ""}
                            </span>
                            {season.episodes.length > 0 && (
                              <button
                                onClick={() => {
                                  // Move all episodes from this season back to unassigned
                                  setUnassigned((prev) => [
                                    ...prev,
                                    ...season.episodes,
                                  ]);
                                  setSeasons((prev) =>
                                    prev.map((s) =>
                                      s.seasonNumber === season.seasonNumber
                                        ? { ...s, episodes: [] }
                                        : s
                                    )
                                  );
                                }}
                                className="flex items-center gap-1 text-[11px] font-bold text-white/30 hover:text-amber-400 transition-colors"
                              >
                                <ArrowLeft className="w-3 h-3" />
                                Unassign all
                              </button>
                            )}
                            {seasons.length > 1 && (
                              <button
                                onClick={() =>
                                  deleteSeason(season.seasonNumber)
                                }
                                className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 transition-colors group/del"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-white/30 group-hover/del:text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Season Episodes */}
                        {!season.collapsed && (
                          <div className="px-3 pb-3 pt-1">
                            <SortableContext
                              items={episodeIds}
                              strategy={verticalListSortingStrategy}
                            >
                              <DroppableZone
                                id={seasonContainerId}
                                label={`Season ${season.seasonNumber}`}
                              >
                                <div className="flex flex-col gap-1.5">
                                  {season.episodes.map((item, idx) => (
                                    <SortableEpisodeItem
                                      key={item.id}
                                      item={item}
                                      episodeNumber={idx + 1}
                                      showEpisodeNumber={true}
                                      onNameChange={handleEpisodeNameChange}
                                    />
                                  ))}
                                </div>
                              </DroppableZone>
                            </SortableContext>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay dropAnimation={null}>
              {activeItem && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#1a1a2e] border border-violet-500/30 shadow-2xl shadow-violet-500/20 backdrop-blur-xl max-w-sm">
                  <GripVertical className="w-4 h-4 text-violet-400" />
                  <span className="text-sm text-white/90 font-medium truncate">
                    {activeItem.filename}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* ─── Footer ─────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.05] bg-white/[0.01] shrink-0">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex-1 max-w-xs">
                <input
                  type="text"
                  value={seriesName}
                  onChange={(e) => setSeriesName(e.target.value)}
                  placeholder="Enter series name..."
                  className="w-full text-sm text-white bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-all font-medium"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer shrink-0">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={fetchMetadata}
                    onChange={(e) => setFetchMetadata(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 rounded-full bg-white/[0.08] peer-checked:bg-violet-500/60 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white/60 peer-checked:bg-white peer-checked:translate-x-4 transition-all" />
                </div>
                <span className="text-xs text-white/50 font-medium">
                  Fetch OMDB
                </span>
              </label>
            </div>

            {error && (
              <p
                className="text-xs text-red-400 mr-4 max-w-[200px] truncate"
                title={error}
              >
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleClose}
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-bold text-white/60 hover:text-white transition-colors disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-6 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>Create Series ({totalAssigned} episodes)</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Discard Confirmation ────────────── */}
      {showDiscardConfirm && (
        <>
          <div className="fixed inset-0 z-[110] bg-black/50" />
          <div className="fixed inset-0 z-[111] flex items-center justify-center">
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-base font-bold text-white mb-2">
                Discard changes?
              </h3>
              <p className="text-sm text-white/50 mb-6">
                You have {totalAssigned} episode
                {totalAssigned !== 1 ? "s" : ""} assigned to seasons. This will
                be lost.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
                >
                  Keep editing
                </button>
                <button
                  onClick={confirmDiscard}
                  className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Delete Season Confirmation ──────── */}
      {showDeleteConfirm !== null && (
        <>
          <div className="fixed inset-0 z-[110] bg-black/50" />
          <div className="fixed inset-0 z-[111] flex items-center justify-center">
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-base font-bold text-white mb-2">
                Delete Season {showDeleteConfirm}?
              </h3>
              <p className="text-sm text-white/50 mb-6">
                Episodes in this season will be moved back to Unassigned.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSeason}
                  className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors"
                >
                  Delete & Unassign
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
