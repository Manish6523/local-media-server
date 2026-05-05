"use client";

import { useState, useRef, useCallback } from "react";
import { Volume2, VolumeX, Volume1 } from "lucide-react";

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
}

export default function VolumeControl({ volume, isMuted, onVolumeChange, onToggleMute }: VolumeControlProps) {
  const [showSlider, setShowSlider] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const displayVolume = isMuted ? 0 : volume;

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const handleSliderClick = useCallback(
    (e: React.MouseEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      onVolumeChange(x / rect.width);
    },
    [onVolumeChange]
  );

  const handleSliderDrag = useCallback(
    (e: React.MouseEvent) => {
      handleSliderClick(e);
      const onMove = (ev: MouseEvent) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(ev.clientX - rect.left, rect.width));
        onVolumeChange(x / rect.width);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [handleSliderClick, onVolumeChange]
  );

  return (
    <div
      className="flex items-center gap-1 group/vol"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      <button
        onClick={onToggleMute}
        className="p-1.5 text-white/70 hover:text-white transition-all"
        title={isMuted ? "Unmute" : "Mute"}
      >
        <VolumeIcon className="w-6 h-6" />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          showSlider ? "w-20 opacity-100" : "w-0 opacity-0"
        }`}
      >
        <div
          ref={sliderRef}
          className="w-20 h-[4px] bg-white/20 rounded-full cursor-pointer relative"
          onMouseDown={handleSliderDrag}
        >
          <div
            className="absolute inset-y-0 left-0 bg-white rounded-full"
            style={{ width: `${displayVolume * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow"
            style={{ left: `${displayVolume * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
