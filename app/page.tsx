"use client";

import { useAction, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import type { Id } from "../convex/_generated/dataModel";

type SearchResult = {
  _id: Id<"videos">;
  _creationTime: number;
  title: string;
  description: string;
  url: string;
  score: number;
};

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md p-4 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <h1 className="font-semibold text-slate-800 dark:text-slate-200 max-w-3xl mx-auto">
          🎬 Smart Search — semantic search over videos with Convex
        </h1>
      </header>
      <main className="p-8 flex flex-col gap-10 max-w-3xl mx-auto">
        <SemanticSearch />
        <div className="h-px bg-slate-200 dark:bg-slate-700" />
        <VideoManager />
      </main>
    </>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const terms = Array.from(
    new Set(
      query
        .trim()
        .split(/\s+/)
        .filter((term) => term.length > 0),
    ),
  ).sort((a, b) => b.length - a.length);

  if (terms.length === 0) return <>{text}</>;

  const escaped = terms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        terms.some((term) => term.toLowerCase() === part.toLowerCase()) ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-500/40 text-inherit rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function SemanticSearch() {
  const search = useAction(api.embeddings.search);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await search({ query });
      setResults(res);
      setSearchedQuery(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-bold text-xl text-slate-800 dark:text-slate-200">
        Semantic search
      </h2>
      <form onSubmit={runSearch} className="flex gap-2">
        <input
          className="flex-1 border border-slate-300 dark:border-slate-600 bg-transparent rounded-lg px-3 py-2 text-sm"
          placeholder="e.g. beginner tutorials about databases"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {results !== null && (
        <div className="flex flex-col gap-3">
          {results.length === 0 && (
            <p className="text-sm text-slate-500">No results.</p>
          )}
          {results.map((r) => (
            <div
              key={r._id}
              className="border border-slate-300 dark:border-slate-600 rounded-lg p-4"
            >
              <div className="flex justify-between items-start gap-2">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-slate-800 dark:text-slate-200 underline decoration-2 underline-offset-2"
                >
                  <HighlightedText text={r.title} query={searchedQuery} />
                </a>
                <span className="text-xs font-mono text-slate-500 shrink-0">
                  {r.score.toFixed(3)}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                <HighlightedText text={r.description} query={searchedQuery} />
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function VideoManager() {
  const { results: videos, status, loadMore } = usePaginatedQuery(
    api.videos.list,
    {},
    { initialNumItems: 10 },
  );
  const createVideo = useMutation(api.videos.create);
  const updateVideo = useMutation(api.videos.update);
  const removeVideo = useMutation(api.videos.remove);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [editingId, setEditingId] = useState<Id<"videos"> | null>(null);

  function resetForm() {
    setTitle("");
    setDescription("");
    setUrl("");
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !url.trim()) return;

    if (editingId !== null) {
      await updateVideo({ id: editingId, title, description, url });
    } else {
      await createVideo({ title, description, url });
    }
    resetForm();
  }

  function startEdit(video: {
    _id: Id<"videos">;
    title: string;
    description: string;
    url: string;
  }) {
    setEditingId(video._id);
    setTitle(video.title);
    setDescription(video.description);
    setUrl(video.url);
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-bold text-xl text-slate-800 dark:text-slate-200">
        Video library
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Add videos here — an embedding is generated automatically in the
        background so they become searchable above.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          className="border border-slate-300 dark:border-slate-600 bg-transparent rounded-lg px-3 py-2 text-sm"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="border border-slate-300 dark:border-slate-600 bg-transparent rounded-lg px-3 py-2 text-sm"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <input
          className="border border-slate-300 dark:border-slate-600 bg-transparent rounded-lg px-3 py-2 text-sm"
          placeholder="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {editingId !== null ? "Save changes" : "+ Add video"}
          </button>
          {editingId !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-3">
        {videos.map((video) => (
          <div
            key={video._id}
            className="border border-slate-300 dark:border-slate-600 rounded-lg p-4 flex justify-between items-start gap-3"
          >
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {video.title}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {video.description}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {video.embedding !== undefined
                  ? "✅ embedded"
                  : "⏳ embedding…"}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => startEdit(video)}
                className="text-xs px-3 py-1 rounded border border-slate-300 dark:border-slate-600"
              >
                Edit
              </button>
              <button
                onClick={() => removeVideo({ id: video._id })}
                className="text-xs px-3 py-1 rounded border border-red-300 text-red-600 dark:border-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {status === "CanLoadMore" && (
        <button
          onClick={() => loadMore(10)}
          className="text-sm px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 self-start"
        >
          Load more
        </button>
      )}
    </section>
  );
}
