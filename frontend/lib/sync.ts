import { type Article, getAllArticles, getLastSync, saveArticles, setLastSync } from "./db"

// Imposta l'IP Tailscale del tuo PC (o localhost se testi in locale)
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"

export type SyncStatus = "idle" | "syncing" | "ok" | "offline" | "error"

export async function syncFromServer(
  onStatus: (s: SyncStatus) => void
): Promise<Article[]> {
  onStatus("syncing")

  try {
    const since = await getLastSync()
    const url = since
      ? `${API_BASE}/articles?since=${encodeURIComponent(since)}&limit=500`
      : `${API_BASE}/articles?limit=500`

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const fresh: Article[] = await res.json()
    if (fresh.length > 0) {
      await saveArticles(fresh)
      await setLastSync(new Date().toISOString())
    }

    onStatus("ok")
  } catch {
    onStatus("offline")
  }

  return getAllArticles()
}
