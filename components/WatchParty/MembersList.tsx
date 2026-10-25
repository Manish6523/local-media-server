"use client";

interface PublicMember {
  name: string;
  isHost: boolean;
}

const GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-purple-500 to-rose-600",
];

export default function MembersList({
  members,
  compact = false,
}: {
  members: PublicMember[];
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2.5"} flex-wrap`}>
      {members.map((member, i) => (
        <div
          key={`${member.name}-${i}`}
          className="group relative"
          title={`${member.name}${member.isHost ? " (Host)" : ""}`}
        >
          <div
            className={`${
              compact ? "w-8 h-8 text-[11px]" : "w-10 h-10 text-xs"
            } bg-gradient-to-br ${
              GRADIENTS[i % GRADIENTS.length]
            } rounded-full flex items-center justify-center font-bold text-white uppercase relative ring-2 ${
              member.isHost
                ? "ring-amber-400/90 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                : "ring-white/20"
            } transition-all hover:scale-110 shadow-md`}
          >
            {member.name.slice(0, 2)}
            {member.isHost && (
              <span className="absolute -top-1.5 -right-1 text-[11px] drop-shadow-md">👑</span>
            )}
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 glass-md text-white text-[10px] font-semibold rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-xl">
            {member.name} {member.isHost ? "👑 (Host)" : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
