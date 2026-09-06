"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";

interface ScanResult {
  success: boolean;
  summary?: { totalFiles: number; new: number; updated: number; skipped: number; errors: number; deleted: number; hddConnected: boolean };
  error?: string;
}

interface ScanContextType {
  scanning: boolean;
  scanProgress: { message: string; percent: number };
  scanResult: ScanResult | null;
  startScan: () => void;
  clearResult: () => void;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export function ScanProvider({ children }: { children: ReactNode }) {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ message: "", percent: 0 });
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const clearResult = () => setScanResult(null);

  const startScan = () => {
    if (scanning) return;
    setScanning(true);
    setScanResult(null);
    setScanProgress({ message: "Connecting...", percent: 0 });

    try {
      const source = new EventSource("/api/scan");
      sourceRef.current = source;

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
          setTimeout(() => setScanning(false), 2000); // Give time for the UI to show 100%
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

  // Cleanup on full unmount (not page navigation)
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        sourceRef.current.close();
      }
    };
  }, []);

  return (
    <ScanContext.Provider value={{ scanning, scanProgress, scanResult, startScan, clearResult }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const context = useContext(ScanContext);
  if (context === undefined) {
    throw new Error("useScan must be used within a ScanProvider");
  }
  return context;
}
