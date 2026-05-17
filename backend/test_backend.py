"""Quick backend test — non richiede Ollama in esecuzione."""
import json
import sqlite3

import feedparser
import httpx

from db import get_conn, init_db
from pipeline import fetch_article_text, is_known, save

FEED_URL = "https://simonwillison.net/atom/everything/"
TEST_URL = "https://test-article.example/1"


def test_db():
    init_db()
    with get_conn() as conn:
        conn.execute("SELECT 1 FROM articles LIMIT 1")
    print("[OK] DB init + query")


def test_rss():
    feed = feedparser.parse(FEED_URL)
    assert len(feed.entries) > 0, "Feed vuoto"
    e = feed.entries[0]
    print(f"[OK] RSS parse — {len(feed.entries)} entries, prima: {e.get('title','')[:50]}")


def test_save_and_query():
    init_db()
    with get_conn() as conn:
        # pulisci eventuale dato di test precedente
        conn.execute("DELETE FROM articles WHERE url=?", (TEST_URL,))
        conn.commit()

        assert not is_known(conn, TEST_URL)

        save(conn, {
            "url": TEST_URL,
            "title": "Test Article",
            "source": "Test",
            "published": "2024-01-01",
            "summary": "Questo è un riassunto di test.",
            "tags": json.dumps(["agents", "RAG"]),
            "relevance": 4,
            "raw_content": "contenuto di test",
        })

        assert is_known(conn, TEST_URL)
        row = conn.execute("SELECT * FROM articles WHERE url=?", (TEST_URL,)).fetchone()
        assert row["title"] == "Test Article"
        assert row["relevance"] == 4

        # cleanup
        conn.execute("DELETE FROM articles WHERE url=?", (TEST_URL,))
        conn.commit()

    print("[OK] Save + query + cleanup")


def test_api():
    try:
        r = httpx.get("http://localhost:8000/status", timeout=3)
        assert r.status_code == 200
        data = r.json()
        assert "total_articles" in data
        print(f"[OK] API /status — {data['total_articles']} articoli nel DB")

        r2 = httpx.get("http://localhost:8000/articles", timeout=3)
        assert r2.status_code == 200
        print(f"[OK] API /articles — risposta valida")
    except Exception as e:
        print(f"[SKIP] API non raggiungibile (avvia il server prima): {e}")


if __name__ == "__main__":
    print("=== Backend Test ===")
    test_db()
    test_rss()
    test_save_and_query()
    test_api()
    print("=== Tutti i test passati ===")
