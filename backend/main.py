"""
FastAPI server — espone gli articoli alla PWA.
Avvia con: uvicorn main:app --host 0.0.0.0 --port 8000
"""

import json
from datetime import datetime, timezone

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from db import get_conn, init_db

app = FastAPI(title="AI Feed")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restringi all'IP Tailscale se vuoi
    allow_methods=["GET"],
    allow_headers=["*"],
)


class Article(BaseModel):
    id: int
    url: str
    title: str
    source: str
    published: str | None
    summary: str | None
    tags: list[str]
    relevance: int
    created_at: str


def row_to_article(row) -> Article:
    tags = []
    try:
        tags = json.loads(row["tags"] or "[]")
    except Exception:
        pass
    return Article(
        id=row["id"],
        url=row["url"],
        title=row["title"],
        source=row["source"],
        published=row["published"],
        summary=row["summary"],
        tags=tags,
        relevance=row["relevance"],
        created_at=row["created_at"],
    )


@app.on_event("startup")
def startup():
    init_db()


@app.get("/articles", response_model=list[Article])
def list_articles(
    since: str | None = Query(None, description="ISO datetime — restituisce solo articoli più recenti"),
    tag: str | None = Query(None, description="Filtra per tag"),
    min_relevance: int = Query(1, ge=1, le=5),
    limit: int = Query(100, le=500),
):
    with get_conn() as conn:
        filters = ["relevance >= ?"]
        params: list = [min_relevance]

        if since:
            filters.append("created_at > ?")
            params.append(since)

        if tag:
            filters.append("tags LIKE ?")
            params.append(f'%"{tag}"%')

        where = "WHERE " + " AND ".join(filters)
        rows = conn.execute(
            f"SELECT * FROM articles {where} ORDER BY created_at DESC LIMIT ?",
            params + [limit],
        ).fetchall()

    return [row_to_article(r) for r in rows]


@app.get("/articles/{article_id}", response_model=Article)
def get_article(article_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM articles WHERE id=?", (article_id,)).fetchone()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(404, "Article not found")
    return row_to_article(row)


@app.get("/tags")
def list_tags():
    with get_conn() as conn:
        rows = conn.execute("SELECT tags FROM articles WHERE tags IS NOT NULL").fetchall()
    counts: dict[str, int] = {}
    for row in rows:
        try:
            for tag in json.loads(row["tags"]):
                counts[tag] = counts.get(tag, 0) + 1
        except Exception:
            pass
    return sorted([{"tag": k, "count": v} for k, v in counts.items()], key=lambda x: -x["count"])


@app.get("/status")
def status():
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
        latest = conn.execute("SELECT created_at FROM articles ORDER BY created_at DESC LIMIT 1").fetchone()
    return {
        "total_articles": total,
        "latest_ingested": latest[0] if latest else None,
        "server_time": datetime.now(timezone.utc).isoformat(),
    }
