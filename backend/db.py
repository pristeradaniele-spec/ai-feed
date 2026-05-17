import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "feed.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS articles (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                url         TEXT UNIQUE NOT NULL,
                title       TEXT NOT NULL,
                source      TEXT NOT NULL,
                published   TEXT,
                summary     TEXT,
                tags        TEXT,
                relevance   INTEGER DEFAULT 3,
                raw_content TEXT,
                created_at  TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_created ON articles(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_relevance ON articles(relevance DESC);
        """)
