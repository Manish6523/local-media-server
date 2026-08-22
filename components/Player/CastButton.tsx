"use client";

import { useEffect, useState, RefObject } from "react";
import { Cast } from "lucide-react";

interface CastButtonProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoSrc: string | undefined;
  title: string;
}

export default function CastButton({ videoRef, videoSrc, title }: CastButtonProps) {
  const [canAirPlay, setCanAirPlay] = useState(false);
  const [showChromecast, setShowChromecast] = useState(false);

  useEffect(() => {
    // AirPlay Support
    if (window.WebKitPlaybackTargetAvailabilityEvent) {
      const listener = (e: any) => {
        if (e.availability === "available") {
          setCanAirPlay(true);
        }
      };
      videoRef.current?.addEventListener("webkitplaybacktargetavailabilitychanged", listener);
    } else if (videoRef.current && (videoRef.current as any).webkitShowPlaybackTargetPicker) {
      setCanAirPlay(true);
    }

    // Chromecast Support
    const setupChromecast = () => {
      const cast = (window as any).cast;
      if (cast && cast.framework && chrome.cast) {
        setShowChromecast(true);
        const context = cast.framework.CastContext.getInstance();
        
        const sessionListener = (e: any) => {
          if (
            e.sessionState === cast.framework.SessionState.SESSION_STARTED ||
            e.sessionState === cast.framework.SessionState.SESSION_RESUMED
          ) {
            const session = context.getCurrentSession();
            if (session && videoSrc) {
              const absoluteSrc = new URL(videoSrc, window.location.origin).toString();
              const mediaInfo = new chrome.cast.media.MediaInfo(absoluteSrc, "video/mp4");
              mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
              mediaInfo.metadata.title = title;

              const request = new chrome.cast.media.LoadRequest(mediaInfo);
              session.loadMedia(request).catch((err: any) => console.error("Cast load failed:", err));
            }
          }
        };

        context.addEventListener(
          cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
          sessionListener
        );

        return () => {
          context.removeEventListener(
            cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            sessionListener
          );
        };
      }
    };

    let cleanup: (() => void) | undefined;
    
    // Poll for Cast framework
    const interval = setInterval(() => {
      if ((window as any).cast?.framework) {
        clearInterval(interval);
        cleanup = setupChromecast();
      }
    }, 500);

    return () => {
      clearInterval(interval);
      if (cleanup) cleanup();
    };
  }, [videoRef, videoSrc, title]);

  const handleAirPlay = () => {
    if (videoRef.current && (videoRef.current as any).webkitShowPlaybackTargetPicker) {
      (videoRef.current as any).webkitShowPlaybackTargetPicker();
    }
  };

  return (
    <div className="flex items-center gap-1">
      {canAirPlay && (
        <button
          onClick={handleAirPlay}
          className="p-1.5 md:p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center justify-center"
          title="AirPlay"
        >
          <Cast className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      )}
      {showChromecast && (
        <div className="flex items-center justify-center p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-all">
          {/* @ts-expect-error custom element */}
          <google-cast-launcher style={{ width: "20px", height: "20px", cursor: "pointer", "--connected-color": "#fff", "--disconnected-color": "rgba(255,255,255,0.7)" } as any} />
        </div>
      )}
    </div>
  );
}
