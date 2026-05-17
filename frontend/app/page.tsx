"use client"

import { useEffect, useState } from "react"
import { type Article, getAllArticles, getLastSync } from "@/lib/db"
import { syncFromServer, type SyncStatus } from "@/lib/sync"
import ArticleCard from "@/components/ArticleCard"
import FilterBar from "@/components/FilterBar"

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([])
  const [filtered, setFiltered] = useState<Article[]>([])
  const [status, setStatus] = useState<SyncStatus>("idle")
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [minRelevance, setMinRelevance] = useState(1)
  const [query, setQuery] = useState("")

  useEffect(() => {
    // carica prima da IndexedDB (istantaneo, funziona offline)
    getAllArticles().then(setArticles)
    getLastSync().then(setLastSync)

    // poi prova a sincronizzare dal server
    syncFromServer(setStatus).then((all) => {
      setArticles(all)
      getLastSync().then(setLastSync)
    })

    // ri-sincronizza quando torna connettività
    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [])

  function handleOnline() {
    syncFromServer(setStatus).then((all) => {
      setArticles(all)
      getLastSync().then(setLastSync)
    })
  }

  useEffect(() => {
    let result = articles
    if (activeTag) result = result.filter((a) => a.tags.includes(activeTag))
    if (minRelevance > 1) result = result.filter((a) => a.relevance >= minRelevance)
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary?.toLowerCase().includes(q) ||
          a.source.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [articles, activeTag, minRelevance, query])

  const allTags = [...new Set(articles.flatMap((a) => a.tags))].sort()

  return (
    <main className="max-w-2xl mx-auto px-4 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold tracking-tight">AI Feed</h1>
          <SyncBadge status={status} lastSync={lastSync} />
        </div>

        <input
          type="search"
          placeholder="Cerca articoli..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 mb-3"
        />

        <FilterBar
          tags={allTags}
          activeTag={activeTag}
          onTag={setActiveTag}
          minRelevance={minRelevance}
          onRelevance={setMinRelevance}
        />
      </div>

      {/* Count */}
      <p className="text-xs text-slate-500 my-3">
        {filtered.length} articoli{activeTag ? ` · ${activeTag}` : ""}
        {minRelevance > 1 ? ` · rilevanza ≥ ${minRelevance}` : ""}
      </p>

      {/* Articles */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-16">
            {articles.length === 0 ? "Nessun articolo in cache. Connettiti al PC per sincronizzare." : "Nessun risultato."}
          </p>
        )}
        {filtered.map((a) => (
          <ArticleCard key={a.id} article={a} onTagClick={setActiveTag} />
        ))}
      </div>
    </main>
  )
}

function SyncBadge({ status, lastSync }: { status: SyncStatus; lastSync: string | null }) {
  const map: Record<SyncStatus, { color: string; label: string }> = {
    idle:    { color: "bg-slate-600", label: "—" },
    syncing: { color: "bg-yellow-500 animate-pulse", label: "sync..." },
    ok:      { color: "bg-emerald-500", label: "aggiornato" },
    offline: { color: "bg-slate-600", label: "offline" },
    error:   { color: "bg-red-500", label: "errore" },
  }
  const { color, label } = map[status]
  const ago = lastSync ? relativeTime(lastSync) : null

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      {ago && <span>{ago}</span>}
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "adesso"
  if (m < 60) return `${m}m fa`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h fa`
  return `${Math.floor(h / 24)}g fa`
}
