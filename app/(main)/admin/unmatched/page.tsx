"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Film,
  Tv,
  Search,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ListChecks,
} from "lucide-react";
import AdminPinGate from "@/components/AdminPinGate";
import ReviewCheckbox from "@/components/ReviewCheckbox";
import { ReviewPreviewButton } from "@/components/ReviewFilePreview";

interface QueueFile {
  id: number;
  mediaId: number | null;
  filename: string;
  folder: string;
  size: number | null;
  type: string;
  season: number | null;
  episode: number | null;
  episodeEnd: number | null;
}
interface Result {
  imdbID: string;
  Title: string;
  Year: string;
  Poster: string;
}
interface Numbers {
  season: string;
  episode: string;
  episodeEnd: string;
}
const inputStyle =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-red-500/60";
const buttonStyle =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed";

export default function UnmatchedPage() {
  return (
    <AdminPinGate requireSession>
      <Queue />
    </AdminPinGate>
  );
}

function Queue() {
  const [files, setFiles] = useState<QueueFile[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [type, setType] = useState<"movie" | "episode">("movie");
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [choice, setChoice] = useState<Result | null>(null);
  const [numbers, setNumbers] = useState<Record<number, Numbers>>({});
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const batch = files.filter((file) => selected.includes(file.id));

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/manual-match", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFiles(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load files.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/manual-match", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        setFiles(data.files);
        setLoading(false);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  function begin() {
    setType(
      batch.length > 1 || batch[0]?.type === "episode" ? "episode" : "movie",
    );
    setNumbers(
      Object.fromEntries(
        batch.map((f) => [
          f.id,
          {
            season: String(f.season ?? 1),
            episode: f.episode === null ? "" : String(f.episode),
            episodeEnd: f.episodeEnd === null ? "" : String(f.episodeEnd),
          },
        ]),
      ),
    );
    setChoice(null);
    setResults([]);
    setQuery("");
    setError("");
    setEditing(true);
  }
  async function search(event: React.FormEvent) {
    event.preventDefault();
    setSearching(true);
    setError("");
    setChoice(null);
    setResults([]);
    try {
      const res = await fetch(
        `/api/admin/manual-match?${new URLSearchParams({ q: query, type: type === "episode" ? "series" : "movie" })}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!choice) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/manual-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imdbId: choice.imdbID,
          type,
          files: batch.map((f) => ({
            id: f.id,
            ...(type === "episode"
              ? {
                  season: Number(numbers[f.id].season),
                  episode: Number(numbers[f.id].episode),
                  ...(numbers[f.id].episodeEnd
                    ? { episodeEnd: Number(numbers[f.id].episodeEnd) }
                    : {}),
                }
              : {}),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFiles((previous) => previous.filter((f) => !selected.includes(f.id)));
      setNotice(
        `${data.saved} ${data.saved === 1 ? "file" : "files"} matched. Your library is updated.`,
      );
      setEditing(false);
      setSelected([]);
      setChoice(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }
  function update(id: number, key: keyof Numbers, value: string) {
    setNumbers((previous) => ({
      ...previous,
      [id]: { ...previous[id], [key]: value },
    }));
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-16 pt-32 text-white md:px-10">
      <Link
        href="/settings"
        className="mb-6 inline-flex items-center gap-2 text-sm text-white/45 hover:text-white"
      >
        <ArrowLeft size={16} /> Settings
      </Link>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-400">
            <ListChecks size={16} /> Library management
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            Needs review
          </h1>
          <p className="mt-3 text-sm text-white/45">
            Give unidentified files a title. Match one movie or a whole set of
            episodes.
          </p>
        </div>
        <button
          className={buttonStyle}
          disabled={loading || editing}
          onClick={() => void load()}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300"
        >
          <Check size={18} /> {notice}
          <Link
            href={type === "episode" ? "/shows" : "/movies"}
            className="underline"
          >
            View library
          </Link>
        </div>
      )}

      {!editing ? (
        <section className="glass-md overflow-hidden rounded-3xl border border-white/10">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
            <p className="text-sm text-white/50">
              {files.length} awaiting a match · {selected.length} selected
            </p>
            <button
              className={`${buttonStyle} bg-white text-black hover:bg-white/90 w-full sm:w-auto`}
              disabled={!selected.length || selected.length > 200}
              onClick={begin}
            >
              {selected.length > 1 ? <Tv size={16} /> : <Search size={16} />}
              {selected.length > 1
                ? "Match as episodes of the same show"
                : "Match selected file"}
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center p-16">
              <Loader2 className="animate-spin text-white/40" />
            </div>
          ) : !files.length ? (
            <div className="p-16 text-center">
              <Check className="mx-auto mb-4 text-emerald-400" size={36} />
              <h2 className="text-xl font-bold">All caught up</h2>
              <p className="mt-2 text-sm text-white/40">
                There are no unmatched files in your library.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.025] text-xs uppercase tracking-wider text-white/35">
                  <tr>
                    <th className="w-12 p-5">
                      <ReviewCheckbox
                        label="Select all files"
                        checked={
                          files.length > 0 && selected.length === files.length
                        }
                        mixed={
                          selected.length > 0 && selected.length < files.length
                        }
                        onChange={(checked) =>
                          setSelected(checked ? files.map((f) => f.id) : [])
                        }
                      />
                    </th>
                    <th className="py-4">File</th>
                    <th className="hidden sm:table-cell p-4">Size</th>
                    <th className="hidden sm:table-cell p-4">Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr
                      key={f.id}
                      className={`border-t border-white/[0.06] transition hover:bg-white/[0.03] ${selected.includes(f.id) ? "bg-red-500/[0.06]" : ""}`}
                    >
                      <td className="p-5">
                        <ReviewCheckbox
                          label={`Select ${f.filename}`}
                          checked={selected.includes(f.id)}
                          onChange={(checked) =>
                            setSelected((previous) =>
                              checked
                                ? [...previous, f.id]
                                : previous.filter((id) => id !== f.id),
                            )
                          }
                        />
                      </td>
                      <td className="max-w-lg py-5 pr-4">
                        <div className="flex items-center gap-3 font-semibold">
                          <ReviewPreviewButton file={f} />
                          <span className="break-all">{f.filename}</span>
                        </div>
                        <p className="mt-1 break-all pl-7 text-xs text-white/30">
                          {f.folder}
                        </p>
                      </td>
                      <td className="hidden sm:table-cell whitespace-nowrap p-4 text-white/45">
                        {f.size === null
                          ? "Unavailable"
                          : f.size >= 1073741824
                            ? `${(f.size / 1073741824).toFixed(2)} GB`
                            : `${(f.size / 1048576).toFixed(1)} MB`}
                      </td>
                      <td className="hidden sm:table-cell p-4 text-white/45">
                        {f.type === "episode" ? "Episode" : "Movie"}
                        <span className="block text-xs text-white/25">
                          Unconfirmed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <div className="glass-md rounded-3xl border border-white/10 p-5 md:p-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold">
              Match {batch.length} {batch.length === 1 ? "file" : "episodes"}
            </h2>
            <button
              className={`${buttonStyle} w-full sm:w-auto`}
              disabled={saving || searching}
              onClick={() => setEditing(false)}
            >
              Back to queue
            </button>
          </div>
          <div
            className="mb-6 grid gap-3 sm:grid-cols-2"
            role="group"
            aria-label="Identify as"
          >
            {(["movie", "episode"] as const).map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={type === value}
                disabled={
                  saving || searching || (value === "movie" && batch.length > 1)
                }
                onClick={() => {
                  setType(value);
                  setChoice(null);
                  setResults([]);
                }}
                className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition focus-visible:outline-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-30 ${type === value ? "border-red-500/50 bg-red-500/10" : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/5"}`}
              >
                <span
                  className={`rounded-xl p-3 ${type === value ? "bg-red-500/15 text-red-400" : "bg-white/5 text-white/40"}`}
                >
                  {value === "movie" ? <Film size={22} /> : <Tv size={22} />}
                </span>
                <span>
                  <span className="block font-bold">
                    {value === "movie" ? "Movie" : "TV episode"}
                  </span>
                  <span className="mt-1 block text-xs text-white/40">
                    {value === "movie"
                      ? "Match a standalone film"
                      : "Choose a show, then assign episode numbers"}
                  </span>
                </span>
                <Check
                  size={18}
                  className={`ml-auto shrink-0 ${type === value ? "text-red-400" : "invisible"}`}
                />
              </button>
            ))}
          </div>
          <div className="mb-6 flex flex-wrap gap-3">
            {batch.map((file) => (
              <div
                key={file.id}
                className="flex max-w-xs items-center gap-3 rounded-xl bg-white/[0.025] p-2"
              >
                <ReviewPreviewButton file={file} />
                <span className="truncate pr-2 text-xs text-white/50">
                  {file.filename}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={search} className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1">
              <span className="sr-only">Search title</span>
              <input
                className={inputStyle}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  type === "episode"
                    ? "Search for the show title…"
                    : "Search for the movie title…"
                }
                required
                minLength={2}
                maxLength={200}
                disabled={saving || searching}
              />
            </label>
            <button
              className={`${buttonStyle} bg-white text-black hover:bg-white/90 w-full sm:w-auto`}
              disabled={searching || saving}
            >
              {searching ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}{" "}
              Search
            </button>
          </form>
          <div className="my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <button
                key={r.imdbID}
                disabled={saving}
                onClick={() => setChoice(r)}
                aria-pressed={choice?.imdbID === r.imdbID}
                className={`group/result flex items-center gap-4 rounded-2xl border p-3 text-left transition duration-200 focus-visible:outline-2 focus-visible:outline-red-400 disabled:pointer-events-none ${choice?.imdbID === r.imdbID ? "border-red-500/60 bg-red-500/10" : "border-white/10 hover:border-white/30 hover:bg-white/[0.07] hover:shadow-lg"}`}
              >
                {r.Poster && r.Poster !== "N/A" ? (
                  <img
                    src={r.Poster}
                    alt=""
                    className="h-20 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg bg-white/5">
                    <Film className="text-white/25" />
                  </div>
                )}
                <div>
                  <p className="font-bold">{r.Title}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {r.Year} · {r.imdbID}
                  </p>
                </div>
                {choice?.imdbID === r.imdbID && (
                  <Check size={18} className="ml-auto shrink-0 text-red-400" />
                )}
              </button>
            ))}
          </div>
          {choice && (
            <form onSubmit={save} className="border-t border-white/10 pt-6">
              <h3 className="font-bold">
                {choice.Title}{" "}
                <span className="font-normal text-white/40">
                  ({choice.Year})
                </span>
              </h3>
              {type === "episode" && (
                <>
                  <p className="mt-2 text-sm text-white/40">
                    Check each filename and episode assignment before
                    confirming. Season 0 is for specials.
                  </p>
                  {batch.length > 1 && (
                    <button
                      type="button"
                      disabled={saving}
                      className={`${buttonStyle} my-4`}
                      onClick={() => {
                        const first = numbers[batch[0].id];
                        const start = Number(first.episode);
                        if (!Number.isInteger(start) || start < 1) {
                          setError(
                            "Enter the starting episode in the first row.",
                          );
                          return;
                        }
                        setNumbers(
                          Object.fromEntries(
                            batch.map((f, i) => [
                              f.id,
                              {
                                season: first.season,
                                episode: String(start + i),
                                episodeEnd: "",
                              },
                            ]),
                          ),
                        );
                      }}
                    >
                      Fill sequentially from first row
                    </button>
                  )}
                  <div className="my-4 space-y-3">
                    {batch.map((f) => (
                      <div
                        key={f.id}
                        className="grid items-center gap-3 rounded-xl bg-white/[0.025] p-4 md:grid-cols-[1fr_100px_100px_110px]"
                      >
                        <p className="break-all text-sm text-white/70">
                          {f.filename}
                        </p>
                        {(["season", "episode", "episodeEnd"] as const).map(
                          (key) => (
                            <label key={key} className="text-xs text-white/40">
                              {key === "episodeEnd"
                                ? "End (optional)"
                                : key === "season"
                                  ? "Season"
                                  : "Episode"}
                              <input
                                className={`${inputStyle} mt-1 px-3`}
                                type="number"
                                step={1}
                                min={
                                  key === "season"
                                    ? 0
                                    : key === "episodeEnd"
                                      ? Number(numbers[f.id].episode) || 1
                                      : 1
                                }
                                required={key !== "episodeEnd"}
                                value={numbers[f.id][key]}
                                onChange={(e) =>
                                  update(f.id, key, e.target.value)
                                }
                                disabled={saving}
                              />
                            </label>
                          ),
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {type === "movie" && (
                <p className="my-4 break-all text-sm text-white/50">
                  {batch[0]?.filename}
                </p>
              )}
              <button
                className={`${buttonStyle} mt-4 bg-white text-black hover:bg-white/90`}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                {saving
                  ? "Saving matches…"
                  : `Confirm ${batch.length === 1 ? "match" : "all matches"}`}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
