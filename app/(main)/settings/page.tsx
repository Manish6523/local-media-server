"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, RefreshCw, Check, AlertCircle, Film, Tv, FileVideo, HardDrive, AlertTriangle, Cpu, Zap, Eye, EyeOff, Lock, Unlock, MonitorPlay } from "lucide-react";
import AdminPinGate from "@/components/AdminPinGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FolderPicker from "@/components/FolderPicker";

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
  const [mediaPaths, setMediaPaths] = useState<string[]>([]);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalMovies: 0, totalShows: 0, totalFiles: 0 });
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ message: "", percent: 0 });
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [osPlatform, setOsPlatform] = useState<string>("");
  const [appVersion, setAppVersion] = useState<string>("");
  const [gpuInfo, setGpuInfo] = useState<{ type: string; label: string; encoder: string } | null>(null);
  const [showOfflineMedia, setShowOfflineMedia] = useState(true);
  const [showPlayOnPc, setShowPlayOnPc] = useState(true);
  const [enableAutoTrailerBg, setEnableAutoTrailerBg] = useState(true);
  const [showDiscoverTab, setShowDiscoverTab] = useState(true);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [customVideoPlayers, setCustomVideoPlayers] = useState<CustomVideoPlayer[]>([]);

  useEffect(() => {
    fetch("/api/system-info")
      .then(r => r.json())
      .then(data => {
        setOsPlatform(data.platform);
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
        if (data.customVideoPlayers) setCustomVideoPlayers(data.customVideoPlayers);
      })
      .catch(console.error);

    fetch(`/api/admin/pin-status?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => setPinEnabled(data.enabled))
      .catch(console.error);
  }, []);

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    setScanResult(null);
    setScanProgress({ message: "Connecting...", percent: 0 });

    try {
      const source = new EventSource("/api/scan");

      source.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          setScanResult({ success: false, error: data.error });
          source.close();
          setScanning(false);
        } else if (data.done) {
          setScanResult({ success: true, summary: data.summary });
          setScanProgress({ message: "Scan complete", percent: 100 });
          source.close();
          
          fetch("/api/media?stats=true")
            .then(res => res.json())
            .then(statsData => {
              setStats({ totalMovies: statsData.totalMovies || 0, totalShows: statsData.totalShows || 0, totalFiles: statsData.totalFiles || 0 });
              setLastScan(statsData.lastScan);
            });
            
          setTimeout(() => setScanning(false), 1000);
        } else {
          setScanProgress({ message: data.message || "Scanning...", percent: data.progress || 0 });
        }
      };

      source.onerror = () => {
        setScanResult({ success: false, error: "Connection to scan server lost" });
        source.close();
        setScanning(false);
      };
    } catch (err) {
      setScanResult({ success: false, error: String(err) });
      setScanning(false);
    }
  };

  const handlePathsChange = async (newPaths: string[]) => {
    // Remove duplicates
    const uniquePaths = Array.from(new Set(newPaths.filter(p => p.trim() !== "")));
    setMediaPaths(uniquePaths);
    
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/config", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ mediaPaths: uniquePaths }) 
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
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

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaPaths: mediaPaths.filter(p => p.trim() !== ""), customVideoPlayers, showPlayOnPc, enableAutoTrailerBg, showDiscoverTab }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
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
      // Refresh context or force a reload so components can pick it up
      // window.location.reload();
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
      <div className="min-h-screen pt-28 px-4 md:px-8 lg:px-14 pb-16">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Settings
            </h1>
            {appVersion && (
              <Badge variant="outline" className="border-white/10 text-white/50 px-3 py-1 text-xs rounded-full font-bold">
                v{appVersion}
              </Badge>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-white text-black hover:bg-white/90 font-bold px-6 rounded-full transition-all">
            {saving ? "Saving..." : (saved ? <><Check className="w-4 h-4 mr-2" /> Saved</> : "Save Changes")}
          </Button>
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

        {/* Section 1 - Media Sources */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 border-b border-white/10 pb-4">
            <SettingsIcon className="w-5 h-5 text-violet-400" />
            Media Sources
          </h2>
          
          <div className="glass-card overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="mb-4">
                <p className="text-white/60 text-sm mb-6">Add any number of folders containing your movies and TV shows. VidLock will scan all of them.</p>
                <div className="space-y-6">
                  {mediaPaths.map((path, idx) => (
                    <div key={idx} className="relative group">
                      <FolderPicker 
                        label={`Media Folder ${idx + 1}`}
                        value={path}
                        onChange={(val) => handleUpdatePath(idx, val)}
                        osPlatform={osPlatform}
                      />
                      <button
                        onClick={() => handleRemovePath(idx)}
                        className="absolute -top-1 -right-1 p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full"
                        title="Remove Folder"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <Button onClick={handleAddPath} className="mt-6 bg-white/10 hover:bg-white/20 text-white border border-white/10 w-full rounded-xl py-6">
                  + Add Another Folder
                </Button>
              </div>
              <div className="mt-6 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {showOfflineMedia ? (
                      <Eye className="w-4 h-4 text-white/50" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-white/50" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">Show offline HDD media</p>
                      <p className="text-xs text-white/40 mt-0.5">Display movies/shows from disconnected drives as unavailable</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOfflineToggle(!showOfflineMedia)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      showOfflineMedia ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                    role="switch"
                    aria-checked={showOfflineMedia}
                    id="show-offline-toggle"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ease-in-out ${
                        showOfflineMedia ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium text-sm">Discover Tab</h3>
                    <p className="text-white/50 text-xs mt-0.5 max-w-sm">
                      Show or hide the Discover tab in the navigation menu.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDiscoverTabToggle(!showDiscoverTab)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      showDiscoverTab ? "bg-emerald-500" : "bg-zinc-700"
                    }`}
                    role="switch"
                    aria-checked={showDiscoverTab}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showDiscoverTab ? "translate-x-5" : "translate-x-0"
                      } ml-1`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 - Library */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 border-b border-white/10 pb-4">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
            Library Scan
          </h2>
          
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
                onClick={handleScan} 
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

        {/* Section 1.5 - Custom Video Players */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 border-b border-white/10 pb-4">
            <MonitorPlay className="w-5 h-5 text-blue-400" />
            Custom Video Players
          </h2>
          
          <div className="glass-card overflow-hidden">
            <div className="p-6 md:p-8 space-y-6">
              
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
                            setSaved(false);
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
                      setSaved(false);
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
