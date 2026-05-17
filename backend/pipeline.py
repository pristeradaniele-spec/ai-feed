"""
RSS ingestion pipeline: fetch → extract → summarize with Ollama → save to SQLite.
Run manually or via Windows Task Scheduler.
"""

import json
import logging
import sqlite3
from datetime import datetime

import feedparser
import httpx
from bs4 import BeautifulSoup

from db import get_conn, init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:7b"  # cambia con il modello che hai scaricato

FEEDS = [
    ("Anthropic Blog",       "https://www.anthropic.com/rss.xml"),
    ("Hugging Face Blog",    "https://huggingface.co/blog/feed.xml"),
    ("LangChain Blog",       "https://blog.langchain.dev/rss/"),
    ("Simon Willison",       "https://simonwillison.net/atom/everything/"),
    ("The Batch",            "https://read.deeplearning.ai/the-batch/rss/"),
    ("arXiv cs.AI",          "https://export.arxiv.org/rss/cs.AI"),
    ("arXiv cs.CL",          "https://export.arxiv.org/rss/cs.CL"),
]

TAGS = [
    "agents", "RAG", "retrieval", "tool use", "reasoning",
    "multimodal", "fine-tuning", "evaluation", "LLM", "vector DB",
    "prompt engineering", "memory", "planning", "benchmark", "safety",
]

SUMMARY_PROMPT = """Sei un assistente per AI Engineers specializzati in LLM e sistemi agentici.
Analizza questo articolo e rispondi SOLO con un oggetto JSON valido (nessun testo extra):

{{
  "summary": "riassunto chiaro in 3-4 frasi in italiano, focalizzato sugli aspetti tecnici",
  "tags": ["tag1", "tag2"],
  "relevance": 4
}}

Dove:
- tags: scegli 1-4 tag tra: {tags}
- relevance: da 1 (poco rilevante) a 5 (molto rilevante per un AI Engineer senior)

Articolo:
Titolo: {title}
Contenuto: {content}
"""


def fetch_article_text(url: str) -> str:
    try:
        r = httpx.get(url, timeout=10, follow_redirects=True,
                      headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "aside"]):
            tag.decompose()
        return soup.get_text(" ", strip=True)[:5000]
    except Exception as e:
        log.warning(f"Failed to fetch {url}: {e}")
        return ""


def summarize(title: str, content: str) -> dict:
    prompt = SUMMARY_PROMPT.format(
        tags=", ".join(TAGS),
        title=title,
        content=content[:4000],
    )
    try:
        r = httpx.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "format": "json",
            "stream": False,
        }, timeout=120)
        data = json.loads(r.json()["response"])
        return {
            "summary": data.get("summary", ""),
            "tags": json.dumps(data.get("tags", [])),
            "relevance": int(data.get("relevance", 3)),
        }
    except Exception as e:
        log.warning(f"Ollama error for '{title}': {e}")
        return {"summary": "", "tags": "[]", "relevance": 3}


def is_known(conn: sqlite3.Connection, url: str) -> bool:
    return conn.execute("SELECT 1 FROM articles WHERE url=?", (url,)).fetchone() is not None


def save(conn: sqlite3.Connection, article: dict):
    conn.execute("""
        INSERT OR IGNORE INTO articles
            (url, title, source, published, summary, tags, relevance, raw_content)
        VALUES
            (:url, :title, :source, :published, :summary, :tags, :relevance, :raw_content)
    """, article)
    conn.commit()


def run():
    init_db()
    log.info("Pipeline started")

    with get_conn() as conn:
        for source, feed_url in FEEDS:
            log.info(f"Fetching {source}")
            feed = feedparser.parse(feed_url)

            for entry in feed.entries[:15]:
                url = entry.get("link", "")
                if not url or is_known(conn, url):
                    continue

                title = entry.get("title", "No title")
                published = entry.get("published", datetime.utcnow().isoformat())
                log.info(f"  Processing: {title[:60]}")

                content = fetch_article_text(url)
                if not content:
                    content = entry.get("summary", "")

                result = summarize(title, content)

                save(conn, {
                    "url": url,
                    "title": title,
                    "source": source,
                    "published": published,
                    "raw_content": content[:2000],
                    **result,
                })
                log.info(f"  Saved (relevance={result['relevance']}, tags={result['tags']})")

    log.info("Pipeline finished")


if __name__ == "__main__":
    run()
