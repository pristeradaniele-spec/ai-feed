import { openDB, type DBSchema, type IDBPDatabase } from "idb"

export interface Article {
  id: number
  url: string
  title: string
  source: string
  published: string | null
  summary: string | null
  tags: string[]
  relevance: number
  created_at: string
}

interface FeedDB extends DBSchema {
  articles: {
    key: number
    value: Article
    indexes: { by_created: string; by_relevance: number }
  }
  meta: {
    key: string
    value: string
  }
}

let _db: IDBPDatabase<FeedDB> | null = null

async function getDB() {
  if (_db) return _db
  _db = await openDB<FeedDB>("ai-feed", 1, {
    upgrade(db) {
      const store = db.createObjectStore("articles", { keyPath: "id" })
      store.createIndex("by_created", "created_at")
      store.createIndex("by_relevance", "relevance")
      db.createObjectStore("meta")
    },
  })
  return _db
}

export async function saveArticles(articles: Article[]) {
  const db = await getDB()
  const tx = db.transaction("articles", "readwrite")
  await Promise.all(articles.map((a) => tx.store.put(a)))
  await tx.done
}

export async function getAllArticles(): Promise<Article[]> {
  const db = await getDB()
  const all = await db.getAll("articles")
  return all.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getLastSync(): Promise<string | null> {
  const db = await getDB()
  return (await db.get("meta", "last_sync")) ?? null
}

export async function setLastSync(iso: string) {
  const db = await getDB()
  await db.put("meta", iso, "last_sync")
}
