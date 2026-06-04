"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, RefreshCw, Check, AlertCircle, Film, Tv, FileVideo, HardDrive, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FolderPicker from "@/components/FolderPicker";

interface ScanResult {
  success: boolean;
  summary?: { totalFiles: number; new: number; updated: number; skipped: number; errors: number; deleted: number; hddConnected: boolean };
  error?: string;
}

export default function SettingsPage() {
  const [localPath, setLocalPath] = useState("");
  const [hddPath, setHddPath] = useState("");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalMovies: 0, totalShows: 0, totalFiles: 0 });
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [osPlatform, setOsPlatform] = useState<string>("");
  const [hddExists, setHddExists] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/system-info")
      .then(r => r.json())
      .then(data => setOsPlatform(data.platform))
      .catch(console.error);

    fetch("/api/media?stats=true")
      .then((r) => r.json())
      .then((data) => {
        setStats({ totalMovies: data.totalMovies || 0, totalShows: data.totalShows || 0, totalFiles: data.totalFiles || 0 });
        setLastScan(data.lastScan);
        setLocalPath(data.localPath || "");
        setHddPath(data.hddPath || "");
      })
      .catch(console.error);
  }, []);

  // Check HDD status whenever hddPath changes
  useEffect(() => {
    if (!hddPath) {
      setHddExists(null);
      return;
    }
    fetch(`/api/validate-path?path=${encodeURIComponent(hddPath)}`)
      .then(r => r.json())
      .then(data => setHddExists(data.valid))
      .catch(() => setHddExists(false));
  }, [hddPath]);

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/scan");
      const data = await res.json();
      setScanResult(data);
      // Refresh stats
      const statsRes = await fetch("/api/media?stats=true");
      const statsData = await statsRes.json();
      setStats({ totalMovies: statsData.totalMovies || 0, totalShows: statsData.totalShows || 0, totalFiles: statsData.totalFiles || 0 });
      setLastScan(statsData.lastScan);
    } catch (err) {
      setScanResult({ success: false, error: String(err) });
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ localPath, hddPath }) });
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

  return (
    <div className="min-h-screen  pt-24 px-4 md:px-8 lg:px-12 pb-16">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-[#E50914]" />
              <h1 className="text-3xl font-bold text-white">Settings</h1>
            </div>
            <Button onClick={handleSave} disabled={saving} className="bg-white text-black hover:bg-white/90">
              {saving ? "Saving..." : (saved ? <><Check className="w-4 h-4 mr-2" /> Saved</> : "Save Changes")}
            </Button>
          </div>
          <p className="text-white/50 text-lg">Configure your media library sources and preferences</p>
        </div>

        {/* Section 1 - Media Sources */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white/90 border-b border-white/10 pb-2">Media Sources</h2>
          
          <Card className="bg-black/30 border-white/10">
            <CardContent className="p-6">
              <div className="mb-4">
                <p className="text-white/60 text-sm mb-4">Your primary media storage — always scanned.</p>
                <FolderPicker 
                  label="Local Media Folder"
                  value={localPath}
                  onChange={(val) => { setLocalPath(val); setSaved(false); }}
                  osPlatform={osPlatform}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/30 border-white/10">
            <CardContent className="p-6">
              <div className="mb-4">
                <p className="text-white/60 text-sm mb-4">Only scanned when connected (e.g. portable drives).</p>
                <FolderPicker 
                  label="External HDD"
                  value={hddPath}
                  optional={true}
                  onChange={(val) => { setHddPath(val); setSaved(false); }}
                  osPlatform={osPlatform}
                />
              </div>
              
              {hddPath && (
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${hddExists === true ? "bg-green-500" : hddExists === false ? "bg-zinc-600" : "bg-transparent"}`} />
                  <span className="text-sm text-white/70">
                    {hddExists === true ? "Connected & Ready" : hddExists === false ? "Not connected — will scan when plugged in" : "Checking status..."}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 2 - Library */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white/90 border-b border-white/10 pb-2">Library</h2>
          
          <Card className="bg-black/30 border-white/10 overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/10 border-b border-white/10">
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
                <span className={`text-sm font-bold ${hddExists ? "text-green-400" : "text-white/40"}`}>
                  {hddExists ? "Online" : "Offline"}
                </span>
                <span className="text-xs text-white/50 uppercase tracking-wide">HDD Status</span>
              </div>
            </div>

            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm text-white/50">Last scanned: {lastScan ? new Date(lastScan).toLocaleString() : "Never"}</span>
              </div>

              <Button 
                onClick={handleScan} 
                disabled={scanning} 
                className="w-full h-14 text-lg font-medium bg-[#E50914] hover:bg-[#f6121d] text-white transition-all"
              >
                {scanning ? <><RefreshCw className="w-5 h-5 mr-3 animate-spin" /> Scanning Library...</> : "Scan for New Files"}
              </Button>

              {scanResult && (
                <div className={`mt-6 p-4 rounded-lg ${scanResult.success ? "bg-[#46d369]/10 border border-[#46d369]/20" : "bg-[#E50914]/10 border border-[#E50914]/20"}`}>
                  {scanResult.success && scanResult.summary ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2"><Check className="w-5 h-5 text-[#46d369]" /><span className="text-base font-medium text-[#46d369]">Scan Complete</span></div>
                      <div className="flex flex-wrap gap-4 mt-3">
                        <div className="flex flex-col"><span className="text-xs text-white/50 uppercase">Total Found</span> <span className="text-lg text-white font-mono">{scanResult.summary.totalFiles}</span></div>
                        <div className="flex flex-col"><span className="text-xs text-white/50 uppercase">Added</span> <span className="text-lg text-[#46d369] font-mono">{scanResult.summary.new}</span></div>
                        {scanResult.summary.deleted > 0 && (
                          <div className="flex flex-col"><span className="text-xs text-white/50 uppercase">Removed</span> <span className="text-lg text-[#e87c03] font-mono">{scanResult.summary.deleted}</span></div>
                        )}
                        <div className="flex flex-col"><span className="text-xs text-white/50 uppercase">Skipped</span> <span className="text-lg text-white/70 font-mono">{scanResult.summary.skipped}</span></div>
                        <div className="flex flex-col"><span className="text-xs text-white/50 uppercase">Errors</span> <span className={`text-lg font-mono ${scanResult.summary.errors > 0 ? "text-[#E50914]" : "text-white/70"}`}>{scanResult.summary.errors}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-[#E50914]" /><span className="text-sm text-[#E50914]">{scanResult.error}</span></div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 3 - Danger Zone */}
        <section className="space-y-4 pt-8">
          <h2 className="text-xl font-semibold text-red-500 border-b border-red-500/20 pb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Danger Zone
          </h2>
          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium mb-1">Clear Media Library</h3>
                <p className="text-sm text-white/60">This wipes the database but will NOT delete your actual video files.</p>
              </div>
              <Button onClick={clearLibrary} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white shrink-0">
                Clear Database
              </Button>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}
