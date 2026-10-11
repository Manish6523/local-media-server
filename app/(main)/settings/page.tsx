"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, RefreshCw, LogOut, Check, AlertCircle, Image as ImageIcon, Video, Monitor, Tv, Laptop, Smartphone, Speaker, Eye, EyeOff, Compass, Film, FileVideo, HardDrive, AlertTriangle, Cpu, Zap, Lock, Unlock, MonitorPlay, ExternalLink, Pencil } from "lucide-react";
import AdminPinGate from "@/components/AdminPinGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FolderPicker from "@/components/FolderPicker";
import { useScan } from "@/components/ScanProvider";
import { useBackground, BgMode } from "@/components/BackgroundContext";
import { Palette, Upload, Loader2, Trash2 } from "lucide-react";

interface ScanResult {
  success: boolean;
  summary?: { totalFiles: number; new: number; updated: number; skipped: number; errors: number; deleted: number; hddConnected: boolean };
  error?: string;
}

export interface CustomVideoPlayer {
  id: string;
  name: string;
  path: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [mediaPaths, setMediaPaths] = useState<string[]>([]);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalMovies: 0, totalShows: 0, totalFiles: 0 });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const configLoaded = useRef(false);
  const [osPlatform, setOsPlatform] = useState<string>("");
  const [appVersion, setAppVersion] = useState<string>("");
  const [gpuInfo, setGpuInfo] = useState<{ type: string; label: string; encoder: string } | null>(null);
  const [showOfflineMedia, setShowOfflineMedia] = useState(true);
  const [showPlayOnPc, setShowPlayOnPc] = useState(true);
  const [enableAutoTrailerBg, setEnableAutoTrailerBg] = useState(true);
  const [showDiscoverTab, setShowDiscoverTab] = useState(true);
  const [enableEditMode, setEnableEditMode] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [customVideoPlayers, setCustomVideoPlayers] = useState<CustomVideoPlayer[]>([]);
  const [omdbApiKey, setOmdbApiKey] = useState("");
  const [fanartTvApiKey, setFanartTvApiKey] = useState("");
  const [opensubtitlesApiKey, setOpensubtitlesApiKey] = useState("");
  const [showOmdbKey, setShowOmdbKey] = useState(false);
  const [showFanartKey, setShowFanartKey] = useState(false);
  const [showOpensubtitlesKey, setShowOpensubtitlesKey] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<{ percent: number, bytesPerSecond: number, total: number, transferred: number } | null>(null);

  const { bgMode, setBgMode, customWallpaper, setCustomWallpaper, bgDim, setBgDim, bgBlur, setBgBlur, saveBgConfig } = useBackground();
  const [wallpaperInput, setWallpaperInput] = useState(customWallpaper);
  const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);
  const [isSavingWallpaper, setIsSavingWallpaper] = useState(false);
  const wallpaperFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWallpaperInput(customWallpaper);
  }, [customWallpaper]);

  const { scanning, scanProgress, scanResult, startScan } = useScan();

  useEffect(() => {
    fetch("/api/system-info")
      .then(r => r.json())
      .then(data => {
        if (data.platform) setOsPlatform(data.platform);
        if (data.version) setAppVersion(data.version);
        if (data.gpu) setGpuInfo(data.gpu);
      })
      .catch(console.error);

    fetch("/api/media?stats=true")
      .then((r) => r.json())
      .then((data) => {
        setStats({ totalMovies: data.totalMovies || 0, totalShows: data.totalShows || 0, totalFiles: data.totalFiles || 0 });
        setLastScan(data.lastScan);
      })
      .catch(console.error);

    fetch(`/api/config?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (data.mediaPaths !== undefined) setMediaPaths(data.mediaPaths);
        if (data.showOfflineMedia !== undefined) setShowOfflineMedia(data.showOfflineMedia);
        if (data.showPlayOnPc !== undefined) setShowPlayOnPc(data.showPlayOnPc);
        if (data.enableAutoTrailerBg !== undefined) setEnableAutoTrailerBg(data.enableAutoTrailerBg);
        if (data.showDiscoverTab !== undefined) setShowDiscoverTab(data.showDiscoverTab);
        if (data.enableEditMode !== undefined) setEnableEditMode(data.enableEditMode);
        if (data.customVideoPlayers) setCustomVideoPlayers(data.customVideoPlayers);
        if (data.omdbApiKey !== undefined) setOmdbApiKey(data.omdbApiKey);
        if (data.fanartTvApiKey !== undefined) setFanartTvApiKey(data.fanartTvApiKey);
        if (data.opensubtitlesApiKey !== undefined) setOpensubtitlesApiKey(data.opensubtitlesApiKey);
        configLoaded.current = true;
      })
      .catch((error) => {
        console.error(error);
        setSaveStatus("error");
      });

    fetch(`/api/admin/pin-status?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => setPinEnabled(data.enabled))
      .catch(console.error);

    if (typeof window !== "undefined" && (window as any).electronAPI?.onUpdateProgress) {
      (window as any).electronAPI.onUpdateProgress((progress: any) => {
        setUpdateProgress(progress);
      });
    }
  }, []);

  // Text fields, folder paths, and custom players autosave together after the
  // user pauses editing. The initial config load is deliberately ignored.
  useEffect(() => {
    if (!configLoaded.current) return;

    setSaveStatus("saving");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            mediaPaths: mediaPaths.filter(path => path.trim() !== ""),
            customVideoPlayers,
            omdbApiKey,
            fanartTvApiKey,
            opensubtitlesApiKey,
          }),
        });
        if (!response.ok) throw new Error("Autosave failed");
        setSaveStatus("saved");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error(error);
        setSaveStatus("error");
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [mediaPaths, customVideoPlayers, omdbApiKey, fanartTvApiKey, opensubtitlesApiKey]);

  const handlePathsChange = (newPaths: string[]) => {
    // Remove duplicates
    const uniquePaths = Array.from(new Set(newPaths.filter(p => p.trim() !== "")));
    setMediaPaths(uniquePaths);
  };

  const handleAddPath = () => {
    if (!mediaPaths.includes("")) {
      setMediaPaths([...mediaPaths, ""]);
    }
  };

  const handleUpdatePath = (index: number, newPath: string) => {
    const updated = [...mediaPaths];
    updated[index] = newPath;
    handlePathsChange(updated);
  };

  const handleRemovePath = (index: number) => {
    const updated = [...mediaPaths];
    updated.splice(index, 1);
    handlePathsChange(updated);
  };

  const clearLibrary = async () => {
    if (!confirm("Are you sure you want to clear the entire library? This will wipe the SQLite database, but your media files will NOT be deleted.")) return;
    try {
      await fetch("/api/clear-db", { method: "POST" });
      setStats({ totalMovies: 0, totalShows: 0, totalFiles: 0 });
      setLastScan(null);
      alert("Library successfully cleared.");
    } catch (err) {
      alert("Failed to clear library.");
      console.error(err);
    }
  };

  const handleOfflineToggle = async (newValue: boolean) => {
    setShowOfflineMedia(newValue);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOfflineMedia: newValue }),
      });
    } catch (err) {
      console.error(err);
      setShowOfflineMedia(!newValue); // revert on failure
    }
  };

  const handlePlayOnPcToggle = async (newValue: boolean) => {
    setShowPlayOnPc(newValue);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showPlayOnPc: newValue }),
      });
      router.refresh();
    } catch (err) {
      console.error(err);
      setShowPlayOnPc(!newValue); // revert on failure
    }
  };

  const handleDiscoverTabToggle = async (newValue: boolean) => {
    setShowDiscoverTab(newValue);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showDiscoverTab: newValue }),
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
      setShowDiscoverTab(!newValue);
    }
  };

  const handleEditModeToggle = async (newValue: boolean) => {
    setEnableEditMode(newValue);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableEditMode: newValue }),
      });
      router.refresh(); // Soft refresh to apply changes everywhere (PosterCards)
    } catch (err) {
      console.error(err);
      setEnableEditMode(!newValue);
    }
  };

  const handleAutoTrailerToggle = async (newValue: boolean) => {
    setEnableAutoTrailerBg(newValue);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableAutoTrailerBg: newValue }),
      });
    } catch (err) {
      console.error(err);
      setEnableAutoTrailerBg(!newValue); // revert on failure
    }
  };

  const handleSetPin = async () => {
    if (newPin.length < 4) return alert("PIN must be at least 4 digits");
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-pin", pin: newPin })
      });
      setPinEnabled(true);
      setNewPin("");
      alert("PIN saved successfully!");
    } catch (err) {
      alert("Failed to set PIN");
    }
  };

  const handleDisablePin = async () => {
    if (!confirm("Are you sure you want to disable PIN protection?")) return;
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable-pin" })
      });
      setPinEnabled(false);
      alert("PIN protection disabled.");
    } catch (err) {
      alert("Failed to disable PIN");
    }
  };

  return (
    <AdminPinGate>
      <div className="min-h-screen pt-20 md:pt-28 px-4 md:px-8 lg:px-14 pb-28 md:pb-16">

        {/* System Update Progress */}
        {updateProgress && (
          <section className="space-y-6 mb-8">
            <h2 className="text-xl font-bold text-white border-b border-white/10 pb-4 flex items-center gap-2 tracking-tight">
              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" /> System Update Downloading
            </h2>
            <div className="glass-card">
              <div className="p-6 md:p-8">
                <div className="flex justify-between text-sm text-white/70 mb-2">
                  <span>Downloading... {Math.round(updateProgress.percent)}%</span>
                  <span>{(updateProgress.transferred / 1024 / 1024).toFixed(1)} / {(updateProgress.total / 1024 / 1024).toFixed(1)} MB ({(updateProgress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s)</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${updateProgress.percent}%` }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

      <div className="max-w-4xl mx-auto space-y-12">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Settings
            </h1>
            {appVersion && (
              <Badge variant="outline" className="border-white/10 text-white/50 px-2.5 py-0.5 text-xs rounded-full font-bold">
                v{appVersion}
              </Badge>
            )}
          </div>
          <div aria-live="polite" className={`flex items-center gap-2 text-xs sm:text-sm font-medium ${
            saveStatus === "error" ? "text-red-400" : "text-white/40"
          }`}>
            {saveStatus === "saving" && <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>}
            {saveStatus === "saved" && <><Check className="w-4 h-4 text-emerald-400" /> Saved automatically</>}
            {saveStatus === "error" && <><AlertCircle className="w-4 h-4" /> Autosave failed</>}
            {saveStatus === "idle" && <span>Changes save automatically</span>}
          </div>
        </div>

        {/* Section 0 - Hardware Acceleration */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 border-b border-white/10 pb-4">
            <Zap className="w-5 h-5 text-amber-400" />
            Hardware Acceleration
          </h2>

          <div className="glass-card overflow-hidden">
            <div className="p-6 md:p-8">
              {gpuInfo ? (
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    gpuInfo.type !== "cpu"
                      ? "bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                      : "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                  }`} />
                  <div className="flex items-center gap-3">
                    {gpuInfo.type !== "cpu" ? (
                      <Zap className="w-5 h-5 text-green-400" />
                    ) : (
                      <Cpu className="w-5 h-5 text-amber-400" />
                    )}
                    <div>
                      <p className="text-white font-bold">{gpuInfo.label}</p>
                      <p className="text-white/40 text-xs mt-0.5">
                        Encoder: <span className="text-white/60 font-mono">{gpuInfo.encoder}</span>
                        {gpuInfo.type === "cpu" && " — No GPU acceleration (slower transcoding)"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-white/20 animate-pulse" />
                  <span className="text-white/50 text-sm">Detecting hardware encoder...</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <Link href="/admin/unmatched" className="glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 transition hover:bg-white/5">
          <div><h2 className="font-bold text-white">Review unmatched files</h2><p className="mt-1 text-sm text-white/45">Find the right movie or match a batch of episodes to a show.</p></div>
          <span className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-sm text-white">Needs review →</span>
        </Link>
        <section className="space-y-6 mt-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 border-b border-white/10 pb-4">
            <SettingsIcon className="w-5 h-5 text-violet-400" />
            Media Sources
          </h2>

          <div className="md:glass-card md:bg-white/[0.03] md:backdrop-blur-xl md:border md:border-white/[0.06] md:rounded-2xl md:overflow-hidden">
            <div className="p-0 md:p-8">
              <div className="mb-4">
                <p className="text-white/60 text-sm mb-6">Add any number of folders containing your movies and TV shows. VidLock will scan all of them.</p>
                <div className="space-y-6">
                  {mediaPaths.map((path, idx) => (
                    <FolderPicker
                      key={idx}
                      label={`Media Folder ${idx + 1}`}
                      value={path}
                      onChange={(val) => handleUpdatePath(idx, val)}
                      onRemove={() => handleRemovePath(idx)}
                      osPlatform={osPlatform}
                    />
                  ))}
                </div>

                <Button onClick={handleAddPath} className="mt-6 bg-white/10 hover:bg-white/20 text-white border border-white/10 w-full rounded-xl py-6">
                  + Add Another Folder
                </Button>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/10 border-b border-white/10 bg-black/20">
              <div className="p-4 flex flex-col items-center justify-center">
                <Film className="w-5 h-5 text-white/40 mb-1" />
                <span className="text-2xl font-bold text-white">{stats.totalMovies}</span>
                <span className="text-xs text-white/50 uppercase tracking-wide">Movies</span>
              </div>
              <div className="p-4 flex flex-col items-center justify-center">
                <Tv className="w-5 h-5 text-white/40 mb-1" />
                <span className="text-2xl font-bold text-white">{stats.totalShows}</span>
                <span className="text-xs text-white/50 uppercase tracking-wide">Shows</span>
              </div>
              <div className="p-4 flex flex-col items-center justify-center">
                <FileVideo className="w-5 h-5 text-white/40 mb-1" />
                <span className="text-2xl font-bold text-white">{stats.totalFiles}</span>
                <span className="text-xs text-white/50 uppercase tracking-wide">Files</span>
              </div>
              <div className="p-4 flex flex-col items-center justify-center">
                <HardDrive className="w-5 h-5 text-white/40 mb-1" />
                <span className="text-2xl font-bold text-white">{mediaPaths.length}</span>
                <span className="text-xs text-white/50 uppercase tracking-wide">Folders</span>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-white/50">Last scanned: {lastScan ? new Date(lastScan).toLocaleString() : "Never"}</span>
              </div>

              <Button
                onClick={startScan}
                disabled={scanning}
                className="w-full h-14 text-base font-bold bg-white text-black hover:bg-white/90 rounded-full transition-all relative overflow-hidden"
              >
                {scanning ? (
                  <>
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-emerald-500/20 transition-all duration-300"
                      style={{ width: `${scanProgress.percent}%` }}
                    />
                    <RefreshCw className="w-5 h-5 mr-3 animate-spin relative z-10" />
                    <span className="relative z-10">{scanProgress.message} ({scanProgress.percent}%)</span>
                  </>
                ) : "Scan for New Files"}
              </Button>

              {scanResult && (
                <div className={`mt-6 p-5 rounded-2xl border ${scanResult.success ? "bg-[#46d369]/5 border-[#46d369]/20" : "bg-red-500/5 border-red-500/20"}`}>
                  {scanResult.success && scanResult.summary ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2"><Check className="w-5 h-5 text-[#46d369]" /><span className="text-base font-bold text-[#46d369]">Scan Complete</span></div>
                      <div className="flex flex-wrap gap-6 mt-3">
                        <div className="flex flex-col"><span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Total Found</span> <span className="text-lg text-white font-mono">{scanResult.summary.totalFiles}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Added</span> <span className="text-lg text-[#46d369] font-mono">{scanResult.summary.new}</span></div>
                        {scanResult.summary.deleted > 0 && (
                          <div className="flex flex-col"><span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Removed</span> <span className="text-lg text-[#e87c03] font-mono">{scanResult.summary.deleted}</span></div>
                        )}
                        <div className="flex flex-col"><span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Skipped</span> <span className="text-lg text-white/70 font-mono">{scanResult.summary.skipped}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Errors</span> <span className={`text-lg font-mono ${scanResult.summary.errors > 0 ? "text-red-400" : "text-white/70"}`}>{scanResult.summary.errors}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-500" /><span className="text-sm font-medium text-red-500">{scanResult.error}</span></div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 1.2 - API Keys */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 border-b border-white/10 pb-4">
            <Lock className="w-5 h-5 text-indigo-400" />
            Metadata & API Keys
          </h2>

          <div className="glass-card overflow-hidden">
            <div className="p-6 md:p-8 space-y-6">
              <p className="text-white/60 text-sm">
                Configure your API keys to automatically fetch movie details, posters, and high-quality landscape backdrops.
              </p>

              <div className="space-y-4">
                {/* OMDB API Key */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-white/80">OMDB API Key</label>
                    <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                      Get OMDB Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showOmdbKey ? "text" : "password"}
                      value={omdbApiKey}
                      onChange={(e) => {
                        setOmdbApiKey(e.target.value);
                      }}
                      placeholder="Enter your 8-digit OMDB key"
                      className="bg-white/5 border border-white/10 rounded-lg pl-4 pr-11 py-2.5 text-white focus:outline-none focus:border-indigo-500 w-full font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOmdbKey(!showOmdbKey)}
                      className="absolute right-3 text-white/40 hover:text-white transition-colors p-1"
                      title={showOmdbKey ? "Hide key" : "Show key"}
                    >
                      {showOmdbKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Fanart.tv API Key */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-white/80">Fanart.tv API Key</label>
                    <a href="https://fanart.tv/get-an-api-key/" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                      Get Fanart Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showFanartKey ? "text" : "password"}
                      value={fanartTvApiKey}
                      onChange={(e) => {
                        setFanartTvApiKey(e.target.value);
                      }}
                      placeholder="Enter your 32-character Fanart.tv personal API key"
                      className="bg-white/5 border border-white/10 rounded-lg pl-4 pr-11 py-2.5 text-white focus:outline-none focus:border-indigo-500 w-full font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFanartKey(!showFanartKey)}
                      className="absolute right-3 text-white/40 hover:text-white transition-colors p-1"
                      title={showFanartKey ? "Hide key" : "Show key"}
                    >
                      {showFanartKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* OpenSubtitles API Key */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-white/80">OpenSubtitles API Key</label>
                    <a href="https://www.opensubtitles.com/en/consumers" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                      Get OpenSubtitles Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showOpensubtitlesKey ? "text" : "password"}
                      value={opensubtitlesApiKey}
                      onChange={(e) => {
                        setOpensubtitlesApiKey(e.target.value);
                      }}
                      placeholder="Enter your OpenSubtitles consumer API key"
                      className="bg-white/5 border border-white/10 rounded-lg pl-4 pr-11 py-2.5 text-white focus:outline-none focus:border-indigo-500 w-full font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpensubtitlesKey(!showOpensubtitlesKey)}
                      className="absolute right-3 text-white/40 hover:text-white transition-colors p-1"
                      title={showOpensubtitlesKey ? "Hide key" : "Show key"}
                    >
                      {showOpensubtitlesKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 1.5 - UI & Display Preferences */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 border-b border-white/10 pb-4">
            <Monitor className="w-5 h-5 text-emerald-400" />
            Display Preferences
          </h2>

          <div className="md:glass-card md:bg-white/[0.03] md:backdrop-blur-xl md:border md:border-white/[0.06] md:rounded-2xl md:overflow-hidden">
            <div className="p-0 md:p-8 space-y-6">

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <MonitorPlay className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Show "Play on PC" buttons</p>
                    <p className="text-xs text-white/40 mt-0.5">Display local playback options on movie posters and details pages</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePlayOnPcToggle(!showPlayOnPc)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${
                    showPlayOnPc ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                  role="switch"
                  aria-checked={showPlayOnPc}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ease-in-out ${
                      showPlayOnPc ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle Auto Trailer Button */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Film className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Enable Auto-Trailer Backgrounds</p>
                    <p className="text-xs text-white/40 mt-0.5">Automatically play silent background trailers on movie details pages</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAutoTrailerToggle(!enableAutoTrailerBg)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${
                    enableAutoTrailerBg ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                  role="switch"
                  aria-checked={enableAutoTrailerBg}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ease-in-out ${
                      enableAutoTrailerBg ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle Discover Tab */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Discover Tab</p>
                    <p className="text-xs text-white/40 mt-0.5">Show or hide the Discover tab in the navigation menu</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDiscoverTabToggle(!showDiscoverTab)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${
                    showDiscoverTab ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                  role="switch"
                  aria-checked={showDiscoverTab}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ease-in-out ${
                      showDiscoverTab ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle Offline Media */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                    {showOfflineMedia ? (
                      <Eye className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Show Offline HDD Media</p>
                    <p className="text-xs text-white/40 mt-0.5">Display movies/shows from disconnected drives as unavailable</p>
                  </div>
                </div>
                <button
                  onClick={() => handleOfflineToggle(!showOfflineMedia)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${
                    showOfflineMedia ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                  role="switch"
                  aria-checked={showOfflineMedia}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ease-in-out ${
                      showOfflineMedia ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle Edit Mode */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Pencil className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Enable Edit Mode</p>
                    <p className="text-xs text-white/40 mt-0.5">Show edit buttons on posters to fix metadata and posters</p>
                  </div>
                </div>
                <button
                  onClick={() => handleEditModeToggle(!enableEditMode)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${
                    enableEditMode ? "bg-emerald-500" : "bg-zinc-700"
                  }`}
                  role="switch"
                  aria-checked={enableEditMode}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ease-in-out ${
                      enableEditMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Background Wallpaper System */}
              <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Palette className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Home Screen Background Wallpaper</p>
                    <p className="text-xs text-white/40 mt-0.5">Customize ambient backdrop styling and wallpaper across your media library</p>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => saveBgConfig({ bgMode: "dynamic" })}
                    className={`p-3.5 rounded-xl text-left border transition-all ${
                      bgMode === "dynamic"
                        ? "bg-white/10 border-white text-white shadow-lg"
                        : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider">Dynamic Media</span>
                      {bgMode === "dynamic" && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Smoothly crossfades backdrops from your movies and shows.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => saveBgConfig({ bgMode: "custom" })}
                    className={`p-3.5 rounded-xl text-left border transition-all ${
                      bgMode === "custom"
                        ? "bg-white/10 border-white text-white shadow-lg"
                        : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider">Custom Wallpaper</span>
                      {bgMode === "custom" && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Use your own uploaded wallpaper or custom image URL.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => saveBgConfig({ bgMode: "dark" })}
                    className={`p-3.5 rounded-xl text-left border transition-all ${
                      bgMode === "dark"
                        ? "bg-white/10 border-white text-white shadow-lg"
                        : "bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider">Pure Dark</span>
                      {bgMode === "dark" && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Deep cinematic minimalist black without background imagery.
                    </p>
                  </button>
                </div>

                {/* Custom Wallpaper Upload / Input & Preview */}
                {bgMode === "custom" && (
                  <div className="space-y-4 pt-2 border-t border-white/[0.06] animate-in fade-in duration-200">
                    <label className="text-xs font-medium text-white/70 block">
                      Custom Wallpaper Image
                    </label>

                    {/* Preview thumbnail if wallpaper is present */}
                    {customWallpaper && (
                      <div className="relative w-full max-w-md aspect-video rounded-2xl overflow-hidden border border-white/10 group shadow-lg bg-black/40">
                        <img
                          src={customWallpaper}
                          alt="Custom Wallpaper Preview"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          style={{
                            filter: `blur(${Math.round(bgBlur / 3)}px)`,
                          }}
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
                          <button
                            type="button"
                            onClick={async () => {
                              setIsSavingWallpaper(true);
                              setWallpaperInput("");
                              await saveBgConfig({ customWallpaper: "" });
                              setIsSavingWallpaper(false);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-red-500/30 hover:bg-red-500/50 text-red-200 text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg border border-red-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove Wallpaper
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] text-white/80 font-medium flex items-center gap-1.5 border border-white/10 shadow-md">
                          <Check className="w-3 h-3 text-emerald-400 stroke-[3]" /> Active Preview
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={wallpaperInput}
                        onChange={(e) => setWallpaperInput(e.target.value)}
                        placeholder="Paste image URL (or upload from computer)..."
                        className="flex-1 glass rounded-xl px-4 py-2 text-white text-xs border border-white/10 focus:outline-none focus:border-white/30"
                      />
                      <button
                        type="button"
                        disabled={isSavingWallpaper || isUploadingWallpaper || !wallpaperInput.trim()}
                        onClick={async () => {
                          setIsSavingWallpaper(true);
                          try {
                            await saveBgConfig({ customWallpaper: wallpaperInput.trim() });
                          } finally {
                            setIsSavingWallpaper(false);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-white text-black hover:bg-white/90 disabled:opacity-40 text-xs font-semibold transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
                      >
                        {isSavingWallpaper ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                            Applying...
                          </>
                        ) : (
                          "Apply URL"
                        )}
                      </button>
                      <input
                        type="file"
                        ref={wallpaperFileRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploadingWallpaper(true);
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const b64 = ev.target?.result as string;
                            if (b64) {
                              setWallpaperInput(b64);
                              await saveBgConfig({ customWallpaper: b64 });
                            }
                            setIsUploadingWallpaper(false);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => wallpaperFileRef.current?.click()}
                        disabled={isUploadingWallpaper || isSavingWallpaper}
                        className="px-4 py-2 rounded-xl glass hover:bg-white/10 disabled:opacity-40 text-white text-xs font-medium transition-all flex items-center justify-center gap-2 border border-white/10 shrink-0"
                      >
                        {isUploadingWallpaper ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white/70" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            Upload File
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Sliders: Blur & Dim Intensity */}
                {bgMode !== "dark" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-white/[0.06]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white/70">Background Blur</span>
                        <span className="text-white/40 font-mono">{bgBlur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="2"
                        value={bgBlur}
                        onChange={(e) => setBgBlur(parseInt(e.target.value, 10))}
                        onMouseUp={() => saveBgConfig({ bgBlur })}
                        onTouchEnd={() => saveBgConfig({ bgBlur })}
                        className="w-full accent-white h-1.5 bg-white/10 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-white/30">
                        <span>Sharp (0px)</span>
                        <span>Frosted (50px)</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white/70">Darkness Overlay (Dim)</span>
                        <span className="text-white/40 font-mono">{bgDim}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="95"
                        step="5"
                        value={bgDim}
                        onChange={(e) => setBgDim(parseInt(e.target.value, 10))}
                        onMouseUp={() => saveBgConfig({ bgDim })}
                        onTouchEnd={() => saveBgConfig({ bgDim })}
                        className="w-full accent-white h-1.5 bg-white/10 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-white/30">
                        <span>Bright (20%)</span>
                        <span>Subtle Ambient (95%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>

        {/* Section 1.6 - Custom Video Players */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 border-b border-white/10 pb-4">
            <MonitorPlay className="w-5 h-5 text-blue-400" />
            Custom Video Players
          </h2>

          <div className="glass-card overflow-hidden">
            <div className="p-6 md:p-8 space-y-6">

              <div>
                <h3 className="text-white font-bold mb-2">Added Players</h3>
                {customVideoPlayers.length === 0 ? (
                  <p className="text-sm text-white/50 italic">No custom players added yet. VLC and the default system player are always available.</p>
                ) : (
                  <ul className="space-y-2">
                    {customVideoPlayers.map(player => (
                      <li key={player.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 gap-3">
                        <div>
                          <p className="text-white font-medium text-sm">{player.name}</p>
                          <p className="text-white/50 text-xs font-mono truncate max-w-sm">{player.path}</p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setCustomVideoPlayers(prev => prev.filter(p => p.id !== player.id));
                          }}
                          className="bg-red-500/20 text-red-500 hover:bg-red-500/40 w-fit shrink-0"
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-4 border-t border-white/5">
                <h3 className="text-white font-bold mb-2">Add New Player</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const name = fd.get("playerName") as string;
                    const execPath = fd.get("playerPath") as string;
                    if (name && execPath) {
                      setCustomVideoPlayers(prev => [...prev, { id: Date.now().toString(), name, path: execPath }]);
                      e.currentTarget.reset();
                    }
                  }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      name="playerName"
                      placeholder="Player Name (e.g., Haruna)"
                      required
                      className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 flex-1"
                    />
                    <input
                      type="text"
                      name="playerPath"
                      placeholder="Executable Path"
                      required
                      className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 flex-[2]"
                    />
                    <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold">
                      Add Player
                    </Button>
                  </div>
                </form>
              </div>

              {/* OS Guide */}
              <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-bold text-blue-400">Path Guide</h4>
                </div>
                <ul className="text-xs text-white/70 space-y-2 list-disc list-inside">
                  <li><strong>Windows:</strong> Usually located in <code className="text-white/90 bg-black/30 px-1 py-0.5 rounded">C:\Program Files\</code> (e.g. <code className="text-white/90 bg-black/30 px-1 py-0.5 rounded">C:\Program Files\MPC-HC\mpc-hc64.exe</code>)</li>
                  <li><strong>Mac:</strong> Point to the executable inside the .app package (e.g. <code className="text-white/90 bg-black/30 px-1 py-0.5 rounded">/Applications/IINA.app/Contents/MacOS/iina-cli</code>)</li>
                  <li><strong>Linux:</strong> The command name if in PATH (e.g. <code className="text-white/90 bg-black/30 px-1 py-0.5 rounded">haruna</code> or <code className="text-white/90 bg-black/30 px-1 py-0.5 rounded">mpv</code>)</li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* Section 2.5 - Security */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 border-b border-white/10 pb-4">
            <Lock className="w-5 h-5 text-indigo-400" />
            Security
          </h2>
          <div className="glass-card overflow-hidden">
            <div className="p-6 md:p-8">
              {!pinEnabled ? (
                <div>
                  <h3 className="text-white font-bold mb-2">Set an admin PIN</h3>
                  <p className="text-sm text-white/60 mb-4">Protects Settings and Edit actions from other people on your network</p>
                  <div className="flex items-center gap-4">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 4-6 digits"
                      className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 w-48"
                    />
                    <Button onClick={handleSetPin} disabled={newPin.length < 4} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold">
                      Save PIN
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                    <span className="text-sm font-medium text-white/70">Admin PIN is enabled</span>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <h3 className="text-white font-bold mb-2">Change PIN</h3>
                    <div className="flex items-center gap-4">
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter new 4-6 digits"
                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 w-48"
                      />
                      <Button onClick={handleSetPin} disabled={newPin.length < 4} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold">
                        Change PIN
                      </Button>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <Button onClick={handleDisablePin} variant="destructive" className="bg-red-500/20 text-red-500 hover:bg-red-500/40">
                      Disable PIN protection
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 3 - Danger Zone */}
        <section className="space-y-6 pt-4">
          <h2 className="text-xl font-bold text-red-500 border-b border-red-500/20 pb-4 flex items-center gap-2 tracking-tight">
            <AlertTriangle className="w-5 h-5" /> Danger Zone
          </h2>
          <div className="glass-card border-red-500/20 bg-red-500/5">
            <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-white font-bold mb-1">Clear Media Library</h3>
                <p className="text-sm text-white/60">This wipes the database but will NOT delete your actual video files.</p>
              </div>
              <Button onClick={clearLibrary} variant="destructive" className="bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/30 shrink-0 font-bold rounded-full">
                Clear Database
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
    </AdminPinGate>
  );
}
