"use client";

interface PublicMember {
  name: string;
  isHost: boolean;
}

const COLORS = [
  "bg-violet-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-purple-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-amber-500",
];

export default function MembersList({ members, compact = false }: { members: PublicMember[]; compact?: boolean }) {
  return (
    <div className={`flex ${compact ? "gap-1" : "gap-2.5"} flex-wrap`}>
      {members.map((member, i) => (
        <div
          key={`${member.name}-${i}`}
          className="group relative"
          title={`${member.name}${member.isHost ? " (Host)" : ""}`}
        >
          <div
            className={`${compact ? "w-7 h-7 text-[10px]" : "w-10 h-10 text-xs"} ${COLORS[i % COLORS.length]} rounded-full flex items-center justify-center font-bold text-white uppercase relative ring-2 ring-offset-1 ring-offset-black/50 ${
              member.isHost ? "ring-amber-400" : "ring-white/10"
            } transition-transform hover:scale-110`}
          >
            {member.name.slice(0, 2)}
            {member.isHost && (
              <span className="absolute -top-1.5 -right-1.5 text-[10px] drop-shadow">👑</span>
            )}
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 px-2.5 py-1 glass-card text-white text-[10px] font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {member.name}{member.isHost ? " (Host)" : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
