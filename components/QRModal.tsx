"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Copy, Check, Smartphone, Wifi } from "lucide-react";
import QRCode from "qrcode";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QRModal({ isOpen, onClose }: QRModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const fetchAndGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/local-ip");
      const data = await res.json();
      setLocalUrl(data.url);

      const dataUrl = await QRCode.toDataURL(data.url, {
        width: 200,
        margin: 2,
        color: {
          dark: "#ffffff",
          light: "#00000000",
        },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setError("Could not detect local IP");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAndGenerate();
      setCopied(false);
    }
  }, [isOpen, fetchAndGenerate]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for HTTP contexts
      const ta = document.createElement("textarea");
      ta.value = localUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-sm animate-in zoom-in-95 fade-in duration-300"
        style={{
          background: "linear-gradient(145deg, #1a1a2e 0%, #141414 50%, #0d0d1a 100%)",
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(139,92,246,0.08)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 pt-7 pb-6 flex flex-col items-center">
          {/* Icon header */}
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-5 h-5 text-violet-400" />
            <Wifi className="w-4 h-4 text-cyan-400" />
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-white tracking-tight mb-0.5">
            Watch on Other Devices
          </h2>
          <p className="text-sm text-white/40 mb-5">
            Connect to the same WiFi and scan
          </p>

          {/* QR Code area */}
          <div
            className="relative rounded-2xl p-4 mb-5"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.08) 100%)",
              border: "1px solid rgba(139,92,246,0.15)",
            }}
          >
            {loading ? (
              <div className="w-[200px] h-[200px] flex items-center justify-center">
                <div
                  className="w-8 h-8 rounded-full border-2 border-violet-400/30 border-t-violet-400 animate-spin"
                />
              </div>
            ) : error ? (
              <div className="w-[200px] h-[200px] flex items-center justify-center">
                <p className="text-sm text-red-400 text-center">{error}</p>
              </div>
            ) : (
              <img
                src={qrDataUrl || ""}
                alt="QR Code for local network access"
                width={200}
                height={200}
                className="block"
                style={{ imageRendering: "pixelated" }}
              />
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full mb-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-white/25 font-medium uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* URL + Copy */}
          <div
            className="flex items-center gap-2 w-full rounded-xl px-3 py-2.5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <code className="flex-1 text-sm text-white/70 font-mono truncate select-all">
              {loading ? "Detecting..." : localUrl}
            </code>
            <button
              onClick={handleCopy}
              disabled={loading || !!error}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                copied
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/10 border border-white/[0.06]"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
