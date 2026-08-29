"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FolderPicker from "@/components/FolderPicker";
import { Film, CheckCircle2, ChevronRight, Settings } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [localPath, setLocalPath] = useState("");
  const [hddPath, setHddPath] = useState("");
  const [startOnLogin, setStartOnLogin] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      // 1. Save paths to backend config API (assuming you have a config API, or directly via server action)
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          settings: [
            { key: "local_media_path", value: localPath },
            { key: "hdd_path", value: hddPath }
          ]
        }),
      });

      // 2. Trigger first scan
      await fetch("/api/scan", { method: "POST" });

      // 3. Inform Electron main process that setup is complete
      if (typeof window !== "undefined" && (window as any).electronAPI) {
        (window as any).electronAPI.completeSetup();
      }

      // Navigate home
      router.push("/");
    } catch (error) {
      console.error("Setup failed:", error);
      setIsFinishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl bg-[#111] border border-white/10 rounded-2xl p-10 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(220,38,38,0.4)]">
            <Film className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">Welcome to VidLock</h1>
          <p className="text-white/50 text-lg">Your personal media server. Let's get things set up.</p>
        </div>

        {step === 1 ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center text-sm">1</span>
                Where are your movies and shows?
              </h2>
              <div className="space-y-6">
                <FolderPicker
                  label="Local Media Folder"
                  value={localPath}
                  onChange={setLocalPath}
                />
                <FolderPicker
                  label="External HDD Folder"
                  value={hddPath}
                  onChange={setHddPath}
                  optional
                />
              </div>
            </div>
            
            <button
              onClick={() => setStep(2)}
              disabled={!localPath}
              className="w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center text-sm">2</span>
                Quick Settings
              </h2>
              
              <div className="bg-black/30 border border-white/5 rounded-xl p-6 space-y-6">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="space-y-1">
                    <p className="font-medium text-white group-hover:text-red-400 transition-colors flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Start VidLock on Login
                    </p>
                    <p className="text-sm text-white/50">Run automatically in the background when you turn on your computer.</p>
                  </div>
                  <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input 
                      type="checkbox" 
                      name="toggle" 
                      id="toggle" 
                      checked={startOnLogin}
                      onChange={(e) => setStartOnLogin(e.target.checked)}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-[#222] appearance-none cursor-pointer transition-transform duration-200 ease-in-out"
                      style={{ transform: startOnLogin ? 'translateX(100%)' : 'translateX(0)', borderColor: startOnLogin ? '#dc2626' : '#222' }}
                    />
                    <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-6 rounded-full bg-[#222] cursor-pointer transition-colors duration-200 ease-in-out ${startOnLogin ? 'bg-red-600' : ''}`}></label>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-4 rounded-xl font-semibold text-lg border border-white/10 hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={isFinishing}
                className="flex-1 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
              >
                {isFinishing ? (
                  <span className="animate-pulse">Setting up...</span>
                ) : (
                  <>Finish Setup <CheckCircle2 className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
