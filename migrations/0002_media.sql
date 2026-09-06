CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'arsiv',
  tags TEXT NOT NULL DEFAULT '[]',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  alt_text TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 0,
  slot TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);
CREATE INDEX IF NOT EXISTS idx_media_published ON media(published);
CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_slot ON media(slot);
