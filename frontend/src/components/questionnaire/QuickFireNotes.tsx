"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  rectIntersection,
  type DragEndEvent,
  type DragStartEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { NOTE_CHOICES } from "@/lib/kiosk-options";
import { Icon } from "@/lib/icons";
import { FaHeart, FaTimes } from "react-icons/fa";

interface QuickFireNotesProps {
  selectedLikes: string[];
  selectedDislikes: string[];
  maxSelections: number;
  onToggleLike: (noteId: string) => void;
  onToggleDislike: (noteId: string) => void;
}

type NoteChoice = (typeof NOTE_CHOICES)[number];

const BASKETS = new Set(["like-basket", "dislike-basket"]);

const basketOnlyCollision: CollisionDetection = (args) => {
  const droppables = args.droppableContainers.filter((c) =>
    BASKETS.has(String(c.id))
  );
  return rectIntersection({ ...args, droppableContainers: droppables });
};

export default function QuickFireNotes({
  selectedLikes,
  selectedDislikes,
  maxSelections,
  onToggleLike,
  onToggleDislike,
}: QuickFireNotesProps) {
  const notes = useMemo(() => NOTE_CHOICES.slice(0, 12), []);
  const [activeId, setActiveId] = useState<string | null>(null);

  const availableNotes = useMemo(
    () =>
      notes.filter(
        (n) =>
          !selectedLikes.includes(n.value) &&
          !selectedDislikes.includes(n.value)
      ),
    [notes, selectedLikes, selectedDislikes]
  );

  const likedNotes = useMemo(
    () => notes.filter((n) => selectedLikes.includes(n.value)),
    [notes, selectedLikes]
  );

  const dislikedNotes = useMemo(
    () => notes.filter((n) => selectedDislikes.includes(n.value)),
    [notes, selectedDislikes]
  );

  const canAddLike = selectedLikes.length < maxSelections;
  const canAddDislike = selectedDislikes.length < maxSelections;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const noteId = String(active.id);
    const dropZone = over?.id ? String(over.id) : null;

    setActiveId(null);

    if (!dropZone) return;

    if (dropZone === "like-basket") {
      if (!canAddLike) return;

      // ensure mutual exclusivity
      if (selectedDislikes.includes(noteId)) onToggleDislike(noteId);
      if (!selectedLikes.includes(noteId)) onToggleLike(noteId);
      return;
    }

    if (dropZone === "dislike-basket") {
      if (!canAddDislike) return;

      // ensure mutual exclusivity
      if (selectedLikes.includes(noteId)) onToggleLike(noteId);
      if (!selectedDislikes.includes(noteId)) onToggleDislike(noteId);
      return;
    }
  };

  const handleDragCancel = () => setActiveId(null);

  const handleRemove = (noteId: string, type: "like" | "dislike") => {
    if (type === "like") onToggleLike(noteId);
    else onToggleDislike(noteId);
  };

  const activeNote = activeId ? notes.find((n) => n.value === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={basketOnlyCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid h-full w-full grid-rows-[auto_1fr_auto] gap-2 sm:gap-3 overflow-hidden">
        {/* Header */}
        <div className="glass-surface backdrop-blur-xl glass-chip-gradient-border rounded-2xl px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-3 text-[10px] sm:text-xs">
            <span className="font-medium text-muted">
              {selectedLikes.length + selectedDislikes.length} از{" "}
              {maxSelections * 2} انتخاب شده
            </span>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1 sm:gap-1.5">
                <FaHeart className="text-[var(--color-accent)] text-[10px] sm:text-xs" />
                <span className="font-semibold">
                  {selectedLikes.length}/{maxSelections}
                </span>
              </span>
              <span className="text-muted">•</span>
              <span className="flex items-center gap-1 sm:gap-1.5">
                <FaTimes className="text-muted text-[10px] sm:text-xs" />
                <span className="font-semibold">
                  {selectedDislikes.length}/{maxSelections}
                </span>
              </span>
            </div>
          </div>

          <p className="m-0 mt-1.5 sm:mt-2 text-center text-[9px] sm:text-[10px] text-muted">
            رایحه‌ها را بکشید و در سبد مناسب رها کنید
          </p>
        </div>

        {/* Available grid */}
        <div className="glass-surface backdrop-blur-xl glass-chip-gradient-border min-h-0 rounded-2xl p-2 sm:p-4">
          <div className="mb-1.5 sm:mb-2 flex items-center justify-between">
            <h3 className="m-0 text-xs sm:text-sm font-semibold text-[var(--color-foreground)]">
              رایحه‌های موجود
            </h3>
            <span className="text-[10px] sm:text-xs text-muted">
              ({availableNotes.length})
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2.5 md:grid-cols-6">
            {availableNotes.map((note) => (
              <DraggableNote
                key={note.value}
                note={note}
                isActive={activeId === note.value}
              />
            ))}

            {availableNotes.length === 0 && (
              <div className="col-span-full flex items-center justify-center py-10 text-sm text-muted">
                همه رایحه‌ها انتخاب شدند!
              </div>
            )}
          </div>
        </div>

        {/* Baskets (slightly bigger) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <DropZone
            id="like-basket"
            title="دوست دارم"
            count={selectedLikes.length}
            maxCount={maxSelections}
            canDrop={canAddLike}
            icon={<FaHeart className="text-sm text-[var(--color-accent)]" />}
            items={likedNotes}
            onRemove={(noteId) => handleRemove(noteId, "like")}
            theme="like"
          />

          <DropZone
            id="dislike-basket"
            title="دوست ندارم"
            count={selectedDislikes.length}
            maxCount={maxSelections}
            canDrop={canAddDislike}
            icon={<FaTimes className="text-sm text-muted" />}
            items={dislikedNotes}
            onRemove={(noteId) => handleRemove(noteId, "dislike")}
            theme="dislike"
          />
        </div>
      </div>

      {/* ✅ Portal overlay to body to avoid transform-offset issues */}
      {typeof document !== "undefined" &&
        createPortal(
          <DragOverlay adjustScale={false}>
            {activeNote ? (
              <motion.div
                initial={{ scale: 0.98, rotate: 0 }}
                animate={{ scale: 1.03, rotate: 2 }}
                className={[
                  "glass-card backdrop-blur-xl glass-button-gradient-border",
                  // match tile size
                  "flex h-[65px] sm:h-[96px] w-[85px] sm:w-[120px] flex-col items-center justify-center gap-0 sm:gap-1 rounded-2xl sm:rounded-3xl px-0.5 py-0.5 sm:px-2 sm:py-2 shadow-strong",
                ].join(" ")}
              >
                {activeNote.icon && (
                  <span className="w-5 h-5 sm:w-[30px] sm:h-[30px] flex items-center justify-center">
                    <Icon emoji={activeNote.icon} size={20} className="w-full h-full" />
                  </span>
                )}
                <span className="line-clamp-1 text-[9px] sm:text-[10px] font-semibold text-center text-[var(--color-foreground)] leading-normal">
                  {activeNote.label}
                </span>
              </motion.div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
}

/**
 * ✅ Tight tiles + FIX duplicate drag:
 * When isDragging, we DO NOT apply transform (so it doesn’t follow the cursor),
 * we keep a faint placeholder in the grid instead.
 */
function DraggableNote({
  note,
  isActive,
}: {
  note: NoteChoice;
  isActive: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: note.value,
    });

  // If using DragOverlay, don't move the original tile.
  const style: React.CSSProperties = isDragging
    ? {}
    : { transform: CSS.Transform.toString(transform) };

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      {...listeners}
      {...attributes}
      className={[
        "glass-card backdrop-blur-xl glass-button-gradient-border",
        "flex h-[65px] sm:h-[96px] w-full flex-col items-center justify-center gap-0 sm:gap-1 rounded-2xl sm:rounded-3xl px-0.5 py-0.5 sm:px-2 sm:py-2",
        "select-none touch-none cursor-grab active:cursor-grabbing",
        "transition-transform duration-200 hover:scale-[1.015]",
        isActive || isDragging ? "opacity-25" : "opacity-100",
      ].join(" ")}
    >
      {note.icon && (
        <span className="w-5 h-5 sm:w-[30px] sm:h-[30px] flex items-center justify-center">
          <Icon emoji={note.icon} size={20} className="w-full h-full" />
        </span>
      )}
      <span className="line-clamp-1 text-[9px] sm:text-[10px] font-semibold text-center text-[var(--color-foreground)] leading-normal">
        {note.label}
      </span>
    </button>
  );
}

function DropZone({
  id,
  title,
  count,
  maxCount,
  canDrop,
  icon,
  items,
  onRemove,
  theme,
}: {
  id: string;
  title: string;
  count: number;
  maxCount: number;
  canDrop: boolean;
  icon: React.ReactNode;
  items: NoteChoice[];
  onRemove: (noteId: string) => void;
  theme: "like" | "dislike";
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !canDrop,
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        "glass-surface backdrop-blur-xl glass-button-gradient-border",
        // slightly bigger basket
        "rounded-2xl px-3 py-2 sm:px-5 sm:py-4",
        "min-h-[120px] sm:min-h-[170px]",
        "transition-all duration-200",
        isOver && canDrop
          ? theme === "like"
            ? "ring-2 ring-[var(--color-accent)] bg-[var(--color-accent-soft)]/18"
            : "ring-2 ring-red-500/40 bg-red-500/10"
          : "",
        !canDrop ? "opacity-70" : "",
      ].join(" ")}
    >
      <div className="mb-1.5 sm:mb-2 flex items-center justify-center gap-1 sm:gap-1.5">
        {icon}
        <span className="text-[10px] sm:text-xs font-semibold text-[var(--color-foreground)]">
          {title} ({count}/{maxCount})
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5">
        <AnimatePresence initial={false}>
          {items.map((note) => (
            <motion.button
              key={note.value}
              type="button"
              onClick={() => onRemove(note.value)}
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              className={[
                "glass-chip glass-chip--compact group flex items-center gap-1 rounded-full px-2 py-1",
                "text-[10px] font-semibold transition-transform hover:scale-[1.03]",
                theme === "like"
                  ? "glass-chip--accent bg-[var(--color-accent-soft)]"
                  : "bg-red-500/10 text-red-700 border border-red-500/20",
              ].join(" ")}
              title="حذف"
            >
              {note.icon && <Icon emoji={note.icon} size={12} />}
              <span className="leading-tight">{note.label}</span>
              <span className="opacity-0 group-hover:opacity-100 text-[9px] transition-opacity">
                ✕
              </span>
            </motion.button>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="flex h-10 w-full items-center justify-center text-[10px] text-muted">
            اینجا رها کنید
          </div>
        )}
      </div>
    </div>
  );
}
