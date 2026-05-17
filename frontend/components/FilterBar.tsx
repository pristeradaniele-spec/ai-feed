export default function FilterBar({
  tags,
  activeTag,
  onTag,
  minRelevance,
  onRelevance,
}: {
  tags: string[]
  activeTag: string | null
  onTag: (tag: string | null) => void
  minRelevance: number
  onRelevance: (n: number) => void
}) {
  return (
    <div className="space-y-2">
      {/* Relevance filter */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="shrink-0">Rilevanza min:</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onRelevance(n)}
            className={`w-7 h-7 rounded-lg font-semibold transition-colors ${
              minRelevance === n ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Tag pills */}
      <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-0.5">
        <button
          onClick={() => onTag(null)}
          className={`text-xs px-2.5 py-1 rounded-full shrink-0 transition-colors ${
            activeTag === null ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          Tutti
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => onTag(activeTag === tag ? null : tag)}
            className={`text-xs px-2.5 py-1 rounded-full shrink-0 transition-colors ${
              activeTag === tag ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}
