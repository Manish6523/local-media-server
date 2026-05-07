"use client";

interface PublicMember {
  name: string;
  isHost: boolean;
}

const COLORS = [
  "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500",
  "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500",
  "bg-orange-500", "bg-cyan-500",
];

export default function MembersList({ members, compact = false }: { members: PublicMember[]; compact?: boolean }) {
  return (
    <div className={`flex ${compact ? "gap-1" : "gap-2"} flex-wrap`}>
      {members.map((member, i) => (
        <div
          key={`${member.name}-${i}`}
          className="group relative"
          title={`${member.name}${member.isHost ? " (Host)" : ""}`}
        >
          <div
            className={`${compact ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs"} ${COLORS[i % COLORS.length]} rounded-full flex items-center justify-center font-bold text-white uppercase relative ring-2 ${
              member.isHost ? "ring-yellow-400" : "ring-transparent"
            }`}
          >
            {member.name.slice(0, 2)}
            {member.isHost && (
              <span className="absolute -top-1 -right-1 text-[10px]">👑</span>
            )}
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {member.name}{member.isHost ? " (Host)" : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
