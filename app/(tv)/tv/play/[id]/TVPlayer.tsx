"use client";

import { useEffect, useRef } from "react";

interface TVPlayerProps {
  title: string;
  episodeLabel: string;
  metaText: string;
  streamUrl: string;
  overview: string;
}

export default function TVPlayer(props: TVPlayerProps) {
  var videoRef = useRef<HTMLVideoElement>(null);

  useEffect(function setupKeyboard() {
    function handleKeyDown(e: KeyboardEvent) {
      var key = e.key;
      var keyCode = e.keyCode;
      var video = videoRef.current;

      // Back / Escape — navigate back to /tv
      if (key === "Backspace" || key === "Escape" || key === "XF86Back" || keyCode === 461) {
        e.preventDefault();
        window.location.href = "/tv";
        return;
      }

      if (!video) {
        return;
      }

      if (key === "ArrowRight") {
        e.preventDefault();
        video.currentTime = video.currentTime + 10;
      } else if (key === "ArrowLeft") {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (key === "Enter" || key === " ") {
        e.preventDefault();
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      } else if (key === "ArrowUp") {
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
      } else if (key === "ArrowDown") {
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return function cleanup() {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="play-container">
      <a href="/tv" className="play-back-link">
        &larr; Back to Library
      </a>

      <h1 className="play-title">
        {props.title}
        {props.episodeLabel ? " — " + props.episodeLabel : ""}
      </h1>

      {props.metaText ? <div className="play-meta">{props.metaText}</div> : null}

      <video
        ref={videoRef}
        className="play-video"
        controls
        width="100%"
        src={props.streamUrl}
        preload="metadata"
        autoPlay
      >
        Your browser does not support the video tag.
      </video>

      {props.overview ? (
        <div className="play-overview">{props.overview}</div>
      ) : null}

      <div className="play-meta" style={{ marginTop: "16px", fontSize: "12px", color: "#555555" }}>
        ← → Seek 10s &nbsp;·&nbsp; ↑ ↓ Volume &nbsp;·&nbsp; Enter Play/Pause &nbsp;·&nbsp; Esc Back
      </div>
    </div>
  );
}
