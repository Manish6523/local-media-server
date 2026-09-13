"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, ExternalLink, FolderPlus, KeyRound, RefreshCw, ScanLine, X } from "lucide-react";
import FolderPicker from "@/components/FolderPicker";
import { useScan } from "@/components/ScanProvider";

const ONBOARDING_SEEN_KEY = "vidlock_onboarding_seen";

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function shouldShowOnboarding() {
  return typeof window !== "undefined" && localStorage.getItem(ONBOARDING_SEEN_KEY) !== "true";
}

export default function OnboardingModal({ open, onOpenChange }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [mediaPaths, setMediaPaths] = useState<string[]>([""]);
  const [omdbApiKey, setOmdbApiKey] = useState("");
  const [fanartTvApiKey, setFanartTvApiKey] = useState("");
  const [opensubtitlesApiKey, setOpensubtitlesApiKey] = useState("");
  const [osPlatform, setOsPlatform] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { scanning, scanProgress, scanResult, startScan, clearResult } = useScan();

  useEffect(() => {
    if (!open) return;

    Promise.all([
      fetch("/api/config", { cache: "no-store" }).then(response => response.json()),
      fetch("/api/system-info").then(response => response.json()),
    ]).then(([config, system]) => {
      setMediaPaths(config.mediaPaths?.length ? config.mediaPaths : [""]);
      setOmdbApiKey(config.omdbApiKey || "");
      setFanartTvApiKey(config.fanartTvApiKey || "");
      setOpensubtitlesApiKey(config.opensubtitlesApiKey || "");
      setOsPlatform(system.platform || "");
    }).catch(() => setError("Could not load the current setup."));
  }, [open]);

  const close = () => {
    localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
    onOpenChange(false);
  };

  const saveConfig = async (body: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Your changes could not be saved.");
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Your changes could not be saved.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const continueFromFolders = async () => {
    const paths = mediaPaths.map(path => path.trim()).filter(Boolean);
    if (!paths.length) return setError("Choose at least one media folder.");
    if (await saveConfig({ mediaPaths: paths })) setStep(2);
  };

  const continueFromKeys = async () => {
    if (!omdbApiKey.trim() || !fanartTvApiKey.trim()) {
      return setError("OMDB and Fanart.tv API keys are required.");
    }
    if (await saveConfig({
      omdbApiKey: omdbApiKey.trim(),
      fanartTvApiKey: fanartTvApiKey.trim(),
      opensubtitlesApiKey: opensubtitlesApiKey.trim(),
    })) {
      clearResult();
      setStep(3);
    }
  };

  const updatePath = (index: number, value: string) => {
    setMediaPaths(current => current.map((path, pathIndex) => pathIndex === index ? value : path));
    setError(null);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="glass-heavy relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
        <div className="border-b border-white/10 px-6 py-5 md:px-8">
          <button onClick={close} className="absolute right-5 top-5 rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white" aria-label="Close onboarding">
            <X className="h-5 w-5" />
          </button>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-red-500">Set up VidLock</p>
          <h2 id="onboarding-title" className="pr-12 text-2xl font-black text-white md:text-3xl">
            {step === 1 && "Choose your media folders"}
            {step === 2 && "Connect your metadata services"}
            {step === 3 && "Build your library"}
          </h2>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {["Folders", "API keys", "Scan"].map((label, index) => {
              const number = index + 1;
              return (
                <div key={label} className="space-y-2">
                  <div className={`h-1 rounded-full ${number <= step ? "bg-red-500" : "bg-white/10"}`} />
                  <span className={`text-xs font-medium ${number === step ? "text-white" : "text-white/30"}`}>{number}. {label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-6 md:px-8 md:py-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <FolderPlus className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <p className="text-sm leading-relaxed text-white/60">Select the folders that contain your movies and shows. You can add internal drives, external drives, or both.</p>
              </div>
              <div className="space-y-5">
                {mediaPaths.map((path, index) => (
                  <div key={index} className="relative">
                    <FolderPicker label={`Media Folder ${index + 1}`} value={path} onChange={value => updatePath(index, value)} osPlatform={osPlatform} />
                    {mediaPaths.length > 1 && (
                      <button onClick={() => setMediaPaths(paths => paths.filter((_, pathIndex) => pathIndex !== index))} className="mt-1 text-xs text-red-400/70 hover:text-red-400">Remove folder</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setMediaPaths(paths => [...paths, ""])} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-sm font-semibold text-white/50 transition hover:border-red-500/40 hover:text-white">
                <FolderPlus className="h-4 w-4" /> Add another folder
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-start gap-4 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.06] p-4">
                <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
                <p className="text-sm leading-relaxed text-white/60">These services add titles, descriptions, posters, and backdrops to your files. Keys remain on your server.</p>
              </div>
              <ApiKeyField label="OMDB API Key" value={omdbApiKey} onChange={setOmdbApiKey} link="https://www.omdbapi.com/apikey.aspx" linkLabel="Get OMDB key" required />
              <ApiKeyField label="Fanart.tv API Key" value={fanartTvApiKey} onChange={setFanartTvApiKey} link="https://fanart.tv/get-an-api-key/" linkLabel="Get Fanart key" required />
              <ApiKeyField label="OpenSubtitles API Key" value={opensubtitlesApiKey} onChange={setOpensubtitlesApiKey} link="https://www.opensubtitles.com/en/consumers" linkLabel="Get subtitle key" />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-500/20 bg-emerald-500/10">
                {scanning ? <RefreshCw className="h-9 w-9 animate-spin text-emerald-400" /> : <ScanLine className="h-9 w-9 text-emerald-400" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{scanning ? scanProgress.message : scanResult?.success ? "Your library is ready" : "Ready to scan"}</h3>
                <p className="mt-2 text-sm text-white/45">VidLock will find video files and fetch their artwork and metadata.</p>
              </div>
              {(scanning || scanResult?.success) && (
                <div className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${scanning ? scanProgress.percent : 100}%` }} /></div>
                  <p className="text-xs text-white/40">{scanning ? `${scanProgress.percent}%` : `${scanResult?.summary?.totalFiles || 0} files found`}</p>
                </div>
              )}
              {scanResult && !scanResult.success && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{scanResult.error}</p>}
              {!scanResult?.success ? (
                <button onClick={startScan} disabled={scanning} className="relative flex min-h-14 w-full items-center justify-center overflow-hidden rounded-full bg-white px-6 py-4 font-bold text-black transition hover:bg-white/90 disabled:cursor-wait">
                  {scanning && (
                    <span className="absolute inset-y-0 left-0 bg-emerald-500/25 transition-all duration-300" style={{ width: `${scanProgress.percent}%` }} />
                  )}
                  {scanning ? (
                    <span className="relative z-10 flex min-w-0 items-center justify-center gap-3">
                      <RefreshCw className="h-5 w-5 shrink-0 animate-spin" />
                      <span className="truncate">{scanProgress.message}</span>
                      <span className="shrink-0 text-black/55">({scanProgress.percent}%)</span>
                    </span>
                  ) : scanResult ? "Try scan again" : "Start scanning"}
                </button>
              ) : (
                <button onClick={() => { close(); window.location.reload(); }} className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-4 font-bold text-black transition hover:bg-emerald-400">
                  <Check className="h-5 w-5" /> Go to my library
                </button>
              )}
            </div>
          )}

          {error && <p role="alert" className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
        </div>

        {step < 3 && (
          <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 md:px-8">
            <button onClick={() => { setError(null); setStep(current => Math.max(1, current - 1)); }} disabled={step === 1 || saving} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white/45 transition hover:text-white disabled:invisible">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={step === 1 ? continueFromFolders : continueFromKeys} disabled={saving} className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-white/90 disabled:opacity-60">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <>Continue <ChevronRight className="h-4 w-4" /></>}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function ApiKeyField({ label, value, onChange, link, linkLabel, required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  link: string;
  linkLabel: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-white/80">{label} {!required && <span className="font-medium text-white/30">(optional)</span>}</span>
        <a href={link} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300">
          {linkLabel} <ExternalLink className="h-3 w-3" />
        </a>
      </span>
      <input type="password" value={value} onChange={event => onChange(event.target.value)} placeholder={required ? "Required" : "Optional"} autoComplete="off" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-cyan-500/50" />
    </label>
  );
}
