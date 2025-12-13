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
import { useKioskMode } from "@/lib/hooks";
import { cn } from "@/lib/utils";

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
  const isKiosk = useKioskMode();

  const dragging = activeId !== null;

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
    useSensor(PointerSensor, {
      activationConstraint: { distance: isKiosk ? 10 : 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: isKiosk ? 8 : 6 },
    })
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
      if (selectedDislikes.includes(noteId)) onToggleDislike(noteId);
      if (!selectedLikes.includes(noteId)) onToggleLike(noteId);
      return;
    }

    if (dropZone === "dislike-basket") {
      if (!canAddDislike) return;
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
      {/* Layout:
          - Kiosk: notes LEFT, baskets RIGHT (forced via direction:ltr on container)
          - Non-kiosk: header / grid / baskets bottom
      */}
      <div
        className={cn(
          "h-full w-full min-h-0 overflow-hidden",
          isKiosk
            ? [
                // ✅ keep column order LTR so left column is truly left (notes)
                "[direction:ltr]",
                // ✅ make baskets narrower to give more space to notes
                "grid grid-cols-[minmax(0,1fr)_minmax(200px,260px)] grid-rows-[auto_minmax(0,1fr)] gap-4",
              ].join(" ")
            : "grid grid-rows-[auto_minmax(0,1fr)_auto] gap-2 sm:gap-3"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "glass-surface backdrop-blur-xl glass-chip-gradient-border rounded-2xl",
            isKiosk ? "col-span-2 px-6 py-4" : "px-3 py-2 sm:px-4 sm:py-3"
          )}
          dir="rtl"
        >
          <div
            className={cn(
              "flex items-center justify-between",
              isKiosk ? "text-sm" : "text-[10px] sm:text-xs"
            )}
          >
            <span className="font-medium text-muted">
              {selectedLikes.length + selectedDislikes.length} از{" "}
              {maxSelections * 2} انتخاب شده
            </span>

            <div
              className={cn(
                "flex items-center",
                isKiosk ? "gap-5" : "gap-2 sm:gap-3"
              )}
            >
              <span className="flex items-center gap-2">
                <FaHeart
                  className={cn(
                    "text-[var(--color-accent)]",
                    isKiosk ? "text-base" : "text-[10px] sm:text-xs"
                  )}
                />
                <span className="font-semibold">
                  {selectedLikes.length}/{maxSelections}
                </span>
              </span>
              <span className="text-muted">•</span>
              <span className="flex items-center gap-2">
                <FaTimes
                  className={cn(
                    "text-muted",
                    isKiosk ? "text-base" : "text-[10px] sm:text-xs"
                  )}
                />
                <span className="font-semibold">
                  {selectedDislikes.length}/{maxSelections}
                </span>
              </span>
            </div>
          </div>

          <p
            className={cn(
              "m-0 mt-2 text-center text-muted",
              isKiosk ? "text-xs" : "text-[9px] sm:text-[10px]"
            )}
          >
            رایحه‌ها را بکشید و در سبد مناسب رها کنید
          </p>
        </div>

        {/* Available grid (LEFT on kiosk) */}
        <div
          dir="rtl"
          className={cn(
            "relative glass-surface backdrop-blur-xl glass-chip-gradient-border min-h-0 rounded-2xl",
            isKiosk ? "p-6" : "p-2 sm:p-4",
            "flex flex-col"
          )}
        >
          {/* Dim panel while dragging */}
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-200",
              dragging ? "opacity-100" : "opacity-0",
              "bg-[radial-gradient(900px_circle_at_50%_10%,rgba(0,0,0,0.10),transparent_55%)]"
            )}
          />
          <div
            className={cn(
              "transition-opacity duration-200",
              dragging && "opacity-60"
            )}
          >
            <div className="flex items-center justify-between">
              <h3
                className={cn(
                  "m-0 font-semibold text-[var(--color-foreground)]",
                  isKiosk ? "text-base" : "text-xs sm:text-sm"
                )}
              >
                رایحه‌های موجود
              </h3>
              <span
                className={cn(
                  "text-muted",
                  isKiosk ? "text-sm" : "text-[10px] sm:text-xs"
                )}
              >
                ({availableNotes.length})
              </span>
            </div>

            <div
              className={cn(
                "mt-4 grid min-h-0 flex-1",
                !isKiosk &&
                  "grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2.5 md:grid-cols-6",
                // ✅ kiosk: fewer per row (3) BUT make rows tall so tiles are bigger
                isKiosk &&
                  "grid-cols-3 grid-rows-[repeat(4,minmax(120px,1fr))] gap-5"
              )}
            >
              {availableNotes.map((note) => (
                <DraggableNote
                  key={note.value}
                  note={note}
                  isActive={activeId === note.value}
                  isKiosk={isKiosk}
                />
              ))}

              {availableNotes.length === 0 && (
                <div className="col-span-full row-span-full flex items-center justify-center text-muted">
                  همه رایحه‌ها انتخاب شدند!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Baskets (RIGHT on kiosk) */}
        {isKiosk ? (
          <div dir="rtl" className="min-h-0 flex flex-col gap-4">
            <DropZone
              id="like-basket"
              title="دوست دارم"
              count={selectedLikes.length}
              maxCount={maxSelections}
              canDrop={canAddLike}
              icon={<FaHeart className="text-[var(--color-accent)]" />}
              items={likedNotes}
              onRemove={(noteId) => handleRemove(noteId, "like")}
              theme="like"
              isKiosk
              dragActive={dragging}
            />
            <DropZone
              id="dislike-basket"
              title="دوست ندارم"
              count={selectedDislikes.length}
              maxCount={maxSelections}
              canDrop={canAddDislike}
              icon={<FaTimes className="text-muted" />}
              items={dislikedNotes}
              onRemove={(noteId) => handleRemove(noteId, "dislike")}
              theme="dislike"
              isKiosk
              dragActive={dragging}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3" dir="rtl">
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
              dragActive={dragging}
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
              dragActive={dragging}
            />
          </div>
        )}
      </div>

      {/* Overlay via portal to avoid transform offset */}
      {typeof document !== "undefined" &&
        createPortal(
          <DragOverlay adjustScale={false}>
            {activeNote ? (
              <motion.div
                initial={{ scale: 0.98, rotate: 0 }}
                animate={{ scale: 1.03, rotate: 2 }}
                className={cn(
                  "glass-card backdrop-blur-xl glass-button-gradient-border",
                  "flex flex-col items-center justify-center rounded-3xl shadow-strong",
                  isKiosk
                    ? "h-[156px] w-[156px] gap-3 px-5 py-5"
                    : "h-[96px] w-[120px] gap-1 px-2 py-2"
                )}
              >
                {activeNote.icon && (
                  <span className="flex items-center justify-center">
                    <Icon emoji={activeNote.icon} size={isKiosk ? 38 : 22} />
                  </span>
                )}
                <span
                  className={cn(
                    "line-clamp-1 font-semibold text-center text-[var(--color-foreground)]",
                    isKiosk ? "text-base" : "text-[10px]"
                  )}
                >
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
 * When using DragOverlay, keep the original tile in place (faint placeholder),
 * and let the overlay follow the pointer.
 */
function DraggableNote({
  note,
  isActive,
  isKiosk = false,
}: {
  note: NoteChoice;
  isActive: boolean;
  isKiosk?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: note.value,
    });

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
      className={cn(
        "glass-card backdrop-blur-xl glass-button-gradient-border",
        "select-none touch-none cursor-grab active:cursor-grabbing",
        "transition-transform duration-200 hover:scale-[1.015]",
        "flex h-full w-full flex-col items-center justify-center rounded-3xl",
        isKiosk ? "gap-3 px-5 py-5" : "gap-1 px-2 py-2",
        isActive || isDragging ? "opacity-25" : "opacity-100"
      )}
    >
      {note.icon && (
        <span className="flex items-center justify-center">
          <Icon emoji={note.icon} size={isKiosk ? 34 : 20} />
        </span>
      )}
      <span
        className={cn(
          "line-clamp-1 font-semibold text-center text-[var(--color-foreground)] leading-normal",
          isKiosk ? "text-base" : "text-[10px]"
        )}
      >
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
  isKiosk = false,
  dragActive = false,
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
  isKiosk?: boolean;
  dragActive?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !canDrop,
  });

  // ✅ dashed like your upload dropzone (and visible)
  const baseBorder = "border-[rgba(0,0,0,0.18)]";
  const overBorder =
    isOver && canDrop
      ? theme === "like"
        ? "border-[rgba(212,175,55,0.85)]"
        : "border-red-500/70"
      : baseBorder;

  // Pulse both baskets during drag (subtle)
  const pulseOnDrag = dragActive && canDrop && !isOver;

  const baseShadow = "0 18px 48px rgba(0,0,0,0.10)";
  const glowShadow =
    theme === "like"
      ? "0 20px 70px rgba(212,175,55,0.16)"
      : "0 20px 70px rgba(239,68,68,0.16)";

  return (
    <motion.div
      ref={setNodeRef}
      className={cn(
        // ✅ dashed border style
        "relative rounded-2xl border-2 border-dashed bg-white/6 backdrop-blur-xl",
        // ✅ add an inner dashed ring for that “upload box” vibe
        "after:content-[''] after:pointer-events-none after:absolute after:inset-[10px] after:rounded-[1.15rem] after:border after:border-dashed after:border-[rgba(0,0,0,0.12)]",
        "transition-colors duration-200",
        // ✅ not tiny: bigger than your last one, but not huge
        isKiosk
          ? "flex-1 min-h-[240px] px-6 py-5"
          : "px-3 py-2 sm:px-5 sm:py-4",
        !isKiosk && "min-h-[120px] sm:min-h-[170px]",
        overBorder,
        !canDrop && "opacity-70",
        "flex flex-col"
      )}
      animate={
        pulseOnDrag
          ? { boxShadow: [baseShadow, glowShadow, baseShadow] }
          : { boxShadow: baseShadow }
      }
      transition={
        pulseOnDrag
          ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.2 }
      }
    >
      {/* faint center icon for drop target */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07]"
      >
        <span className={cn(isKiosk ? "text-7xl" : "text-5xl")}>{icon}</span>
      </div>

      <div
        className={cn(
          "relative flex items-center justify-center gap-2",
          isKiosk ? "mb-4" : "mb-2"
        )}
      >
        <span className={cn(isKiosk ? "text-base" : "text-sm")}>{icon}</span>
        <span
          className={cn(
            "font-semibold text-[var(--color-foreground)]",
            isKiosk ? "text-sm" : "text-[10px] sm:text-xs"
          )}
        >
          {title} ({count}/{maxCount})
        </span>
      </div>

      <div
        className={cn(
          "relative flex flex-1 flex-wrap justify-center content-start",
          isKiosk ? "gap-2.5" : "gap-1.5"
        )}
      >
        <AnimatePresence initial={false}>
          {items.map((note) => (
            <motion.button
              key={note.value}
              type="button"
              onClick={() => onRemove(note.value)}
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              className={cn(
                "group flex items-center rounded-full font-semibold transition-transform hover:scale-[1.03]",
                isKiosk
                  ? "gap-2 px-3 py-2 text-sm"
                  : "gap-1 px-2 py-1 text-[10px]",
                theme === "like"
                  ? "border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)]/30 text-[var(--color-foreground)]"
                  : "border border-red-500/20 bg-red-500/10 text-red-700"
              )}
              title="حذف"
            >
              {note.icon && <Icon emoji={note.icon} size={isKiosk ? 14 : 12} />}
              <span className="leading-tight">{note.label}</span>
              <span className="opacity-0 transition-opacity group-hover:opacity-100">
                ✕
              </span>
            </motion.button>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-muted">
            {canDrop
              ? dragActive
                ? "رها کنید"
                : "اینجا رها کنید"
              : "ظرفیت تکمیل شد"}
          </div>
        )}
      </div>
    </motion.div>
  );
}
