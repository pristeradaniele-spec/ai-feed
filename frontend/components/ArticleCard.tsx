import type { Article } from "@/lib/db"

const RELEVANCE_COLOR = ["", "bg-slate-700", "bg-slate-600", "bg-blue-700", "bg-indigo-600", "bg-violet-600"]

export default function ArticleCard({
  article: a,
  onTagClick,
}: {
  article: Article
  onTagClick: (tag: string) => void
}) {
  return (
    <article className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
      {/* top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs text-slate-500 shrink-0">{a.source}</span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium ${RELEVANCE_COLOR[a.relevance] ?? "bg-slate-700"}`}
          title="Rilevanza"
        >
          {"★".repeat(a.relevance)}
        </span>
      </div>

      {/* title */}
      <a
        href={a.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm font-semibold leading-snug hover:text-indigo-400 transition-colors mb-2"
      >
        {a.title}
      </a>

      {/* summary */}
      {a.summary && (
        <p className="text-sm text-slate-300 leading-relaxed mb-3">{a.summary}</p>
      )}

      {/* tags */}
      {a.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {a.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick(tag)}
              className="text-xs bg-slate-800 hover:bg-indigo-900 text-slate-300 hover:text-indigo-300 px-2 py-0.5 rounded-full transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}
