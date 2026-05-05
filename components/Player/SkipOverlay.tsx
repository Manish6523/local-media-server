"use client";

interface SkipOverlayProps {
  direction: "left" | "right" | null;
}

export default function SkipOverlay({ direction }: SkipOverlayProps) {
  if (!direction) return null;

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 text-white/90 text-lg font-semibold
        animate-[fadeInOut_0.6s_ease-out_forwards] pointer-events-none ${
          direction === "left" ? "left-[15%]" : "right-[15%]"
        }`}
    >
      {direction === "left" ? (
        <>
          <span className="text-2xl">◀◀</span>
          <span>10s</span>
        </>
      ) : (
        <>
          <span>10s</span>
          <span className="text-2xl">▶▶</span>
        </>
      )}
    </div>
  );
}
