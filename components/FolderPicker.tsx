"use client";

import { useState, useEffect } from "react";
import { FolderSearch, CheckCircle, XCircle, Loader2, X } from "lucide-react";
import FolderBrowserModal from "./FolderBrowserModal";

interface FolderPickerProps {
  label: string;
  value: string;
  optional?: boolean;
  onChange: (path: string) => void;
  osPlatform?: string;
}

export default function FolderPicker({ label, value, optional = false, onChange, osPlatform }: FolderPickerProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; count: number; error?: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Validate path on mount or when value changes externally
  useEffect(() => {
    if (!value) {
      setValidationResult(null);
      return;
    }
    
    // Only validate if it looks like a path (at least 2 chars)
    if (value.length > 1) {
      validatePath(value);
    }
  }, [value]);

  const validatePath = async (pathToValidate: string) => {
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch(`/api/validate-path?path=${encodeURIComponent(pathToValidate)}`);
      const data = await res.json();
      
      if (data.normalizedPath && data.normalizedPath !== pathToValidate && data.valid) {
        // If server normalized the path differently, update the input seamlessly
        onChange(data.normalizedPath);
      }
      
      setValidationResult({
        valid: data.valid,
        count: data.fileCount || 0,
        error: data.error
      });
    } catch (err) {
      setValidationResult({ valid: false, count: 0, error: "Validation failed" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleBrowse = () => {
    setIsModalOpen(true);
  };

  const handleFolderSelect = (path: string) => {
    onChange(path);
    setIsModalOpen(false);
    validatePath(path);
  };

  const getPlaceholder = () => {
    if (osPlatform === "win32") {
      return optional ? "D:\\Movies\\" : "C:\\Users\\John\\Videos\\";
    } else {
      return optional ? "/run/media/user/DRIVE/" : "/home/user/Videos/";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white/90 flex items-center gap-2">
          {label}
          {optional && <span className="bg-white/10 text-white/50 text-[10px] uppercase px-1.5 py-0.5 rounded tracking-wide font-bold">Optional</span>}
        </label>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => value && validatePath(value)}
            placeholder={getPlaceholder()}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-white/50 pr-8"
          />
          {value && (
            <button 
              onClick={() => onChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <button
          onClick={handleBrowse}
          className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-colors shrink-0"
        >
          <FolderSearch className="w-4 h-4" />
          Browse
        </button>
      </div>

      <div className="h-5 flex items-center">
        {isValidating ? (
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Validating path...
          </div>
        ) : validationResult ? (
          validationResult.valid ? (
            <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              Path found · {validationResult.count} videos detected
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
              <XCircle className="w-3.5 h-3.5" />
              Path not found or inaccessible
            </div>
          )
        ) : null}
      </div>

      <FolderBrowserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleFolderSelect}
        initialPath={value}
      />
    </div>
  );
}
