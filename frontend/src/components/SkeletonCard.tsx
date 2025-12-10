"use client";

export default function SkeletonCard() {
  return (
    <div className="glass-card flex h-full flex-col gap-5 rounded-3xl p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-16 rounded-full bg-white/30" />
        <div className="h-6 w-12 rounded bg-white/30" />
      </div>

      <div className="flex flex-grow items-center justify-center">
        <div className="h-[180px] w-full rounded-2xl bg-white/20" />
      </div>

      <div className="space-y-2">
        <div className="h-4 w-20 rounded bg-white/30" />
        <div className="h-6 w-3/4 rounded bg-white/30" />
        <div className="h-4 w-1/2 rounded bg-white/25" />
      </div>
    </div>
  );
}
