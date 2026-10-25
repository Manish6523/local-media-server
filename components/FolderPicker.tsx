"use client";

import { useState, useEffect } from "react";
import { FolderSearch, CheckCircle2, AlertCircle, Loader2, X, Trash2, FolderCheck } from "lucide-react";
import FolderBrowserModal from "./FolderBrowserModal";

interface FolderPickerProps {
  label?: string;
  value: string;
  optional?: boolean;
  onChange: (path: string) => void;
  onRemove?: () => void;
  osPlatform?: string;
}

export default function FolderPicker({
  label,
  value,
  optional = false,
  onChange,
  onRemove,
  osPlatform
}: FolderPickerProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; count: number; error?: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!value) {
      setValidationResult(null);
      return;
    }
    if (value.trim().length > 1) {
      validatePath(value);
    }
  }, [value]);

  const validatePath = async (pathToValidate: string) => {
    if (!pathToValidate || pathToValidate.trim().length < 2) return;
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch(`/api/validate-path?path=${encodeURIComponent(pathToValidate.trim())}`);
      const data = await res.json();

      if (data.normalizedPath && data.normalizedPath !== pathToValidate && data.valid) {
        onChange(data.normalizedPath);
      }

      setValidationResult({
        valid: !!data.valid,
        count: data.fileCount || 0,
        error: data.error
      });
    } catch {
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
      return optional ? "D:\\Movies" : "C:\\Users\\Name\\Videos";
    } else {
      return optional ? "/media/user/DRIVE/Movies" : "/home/user/Videos";
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white/80 flex items-center gap-2">
            {label}
            {optional && (
              <span className="bg-white/10 text-white/50 text-[10px] uppercase px-1.5 py-0.5 rounded tracking-wide font-medium">
                Optional
              </span>
            )}
          </label>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-red-400/80 hover:text-red-300 text-xs font-medium flex items-center gap-1.5 transition-colors px-2 py-1 rounded-md hover:bg-red-500/10 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>
      )}

      {/* Input row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => value && validatePath(value)}
            placeholder={getPlaceholder()}
            className="w-full bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-violet-500/50 rounded-xl px-3.5 py-2.5 text-white text-xs sm:text-sm font-mono focus:outline-none transition-all placeholder:text-white/20 pr-9 shadow-inner"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors p-1 rounded-md cursor-pointer"
              aria-label="Clear path"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleBrowse}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer text-violet-200 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)] active:scale-[0.98]"
        >
          <FolderSearch className="w-4 h-4 text-violet-400" />
          <span>Browse Folder</span>
        </button>
      </div>

      {/* Status Feedback */}
      <div className="min-h-[22px] flex items-center">
        {isValidating ? (
          <div className="flex items-center gap-1.5 text-white/40 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
            <span>Scanning directory path...</span>
          </div>
        ) : validationResult ? (
          validationResult.valid ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Path verified · <strong>{validationResult.count}</strong> videos detected
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>Path not found or folder inaccessible</span>
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
