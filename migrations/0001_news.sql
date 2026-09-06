CREATE TABLE IF NOT EXISTS news (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 slug TEXT NOT NULL UNIQUE,
 title TEXT NOT NULL,
 excerpt TEXT,
 body TEXT NOT NULL DEFAULT '',
 category TEXT,
 author TEXT,
 cover_url TEXT,
 video_url TEXT,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 published_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_news_status_date ON news(status, published_at);
CREATE TABLE IF NOT EXISTS media (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 object_key TEXT NOT NULL UNIQUE,
 title TEXT,
 mime_type TEXT,
 size_bytes INTEGER,
 alt_text TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
