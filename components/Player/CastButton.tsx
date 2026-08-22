"use client";

import { useEffect, useState, RefObject } from "react";
import { Cast } from "lucide-react";

declare const chrome: any;

interface CastButtonProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoSrc: string | undefined;
  title: string;
  className?: string;
  iconClassName?: string;
}

export default function CastButton({ videoRef, videoSrc, title, className, iconClassName }: CastButtonProps) {
  const [canAirPlay, setCanAirPlay] = useState(false);
  const [showChromecast, setShowChromecast] = useState(false);

  const defaultBtnClass = "p-1.5 md:p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all flex items-center justify-center";
  const btnClass = className || defaultBtnClass;
  const iconClass = iconClassName || "w-4 h-4 md:w-5 md:h-5";

  useEffect(() => {
    // AirPlay Support
    if ((window as any).WebKitPlaybackTargetAvailabilityEvent) {
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

        // We don't hide the button anymore so the user can always click it
        // to force the browser to scan for connectable devices.
        setShowChromecast(true);

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

  const handleChromecast = async () => {
    const cast = (window as any).cast;
    if (cast && cast.framework) {
      try {
        await cast.framework.CastContext.getInstance().requestSession();
      } catch (err) {
        console.error("Cast session request failed:", err);
      }
    }
  };

  return (
    <div className="flex items-center gap-1">
      {canAirPlay && (
        <button
          onClick={handleAirPlay}
          className={btnClass}
          title="AirPlay"
        >
          <Cast className={iconClass} />
        </button>
      )}
      {showChromecast && (
        <button
          onClick={handleChromecast}
          className={btnClass}
          title="Cast to Screen"
        >
          <Cast className={iconClass} />
        </button>
      )}
    </div>
  );
}
