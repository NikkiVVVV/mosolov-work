"""Durable bot library, import previews and polling cursor."""
import hashlib
import json
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

BLOCKED = {'bookmark-search-api-production.up.railway.app'}

def canonical_url(value):
    if not isinstance(value, str) or len(value) > 2048:
        raise ValueError('Некорректная ссылка')
    value = value.strip()
    if '://' not in value:
        value = 'https://' + value
    u = urlsplit(value)
    host = (u.hostname or '').lower().removeprefix('www.')
    if (u.scheme != 'https' or not host or '.' not in host or u.username or u.password
            or u.port not in (None, 443) or host in BLOCKED or host.endswith('.local')
            or re.fullmatch(r'[0-9.]+', host) or ':' in host):
        raise ValueError('Нужна публичная HTTPS-ссылка')
    if any(k in u.query.lower() for k in ('token=', 'key=', 'password=', 'secret=')):
        raise ValueError('Ссылка содержит секретный параметр')
    return urlunsplit(('https', host, u.path.rstrip('/'), u.query, ''))

def record(entry):
    url = canonical_url(entry.get('url'))
    def field(name, limit, required=True):
        value = entry.get(name, '')
        if not isinstance(value, str) or len(value) > limit or (required and not value.strip()):
            raise ValueError('Не заполнено поле ' + name)
        return value.strip()
    tags = entry.get('tags', [])
    if not isinstance(tags, list) or not 1 <= len(tags) <= 24 or any(not isinstance(t, str) or not 0 < len(t) <= 50 for t in tags):
        raise ValueError('Некорректные теги')
    return {'id': hashlib.sha256(url.encode()).hexdigest()[:16], 'url': url,
            'title': field('title', 120), 'ownerNote': field('ownerNote', 600),
            'noteEN': field('noteEN', 600), 'tags': list(dict.fromkeys(tags)),
            'domain': urlsplit(url).hostname, 'status': 'kept',
            'privacyHint': 'public', 'reviewHint': 'curated', 'featuredRank': 0}

class Store:
    def __init__(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.path = str(path)
        with self.connect() as db:
            db.executescript("""
            CREATE TABLE IF NOT EXISTS cursor (id INTEGER PRIMARY KEY CHECK(id=1), value INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS imports (token TEXT PRIMARY KEY, owner INTEGER NOT NULL,
              update_id INTEGER UNIQUE NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending',
              created REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS saved (url TEXT PRIMARY KEY, payload TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS limits (owner INTEGER NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL,
              PRIMARY KEY(owner,day));
            """)
    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        try:
            db.execute('PRAGMA journal_mode=WAL')
            with db:
                yield db
        finally:
            db.close()
    def offset(self):
        with self.connect() as db:
            row = db.execute('SELECT value FROM cursor WHERE id=1').fetchone()
        return row[0] if row else 0
    def advance(self, value):
        with self.connect() as db:
            db.execute('INSERT INTO cursor VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=MAX(value,excluded.value)', (value,))
    def spend_vision(self, owner, maximum=20):
        day = time.strftime('%Y-%m-%d', time.gmtime())
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM limits WHERE day<>?', (day,))
            db.execute('INSERT OR IGNORE INTO limits VALUES(?,?,0)', (owner, day))
            count = db.execute('SELECT count FROM limits WHERE owner=? AND day=?', (owner, day)).fetchone()[0]
            if count >= maximum:
                raise ValueError('Лимит скриншотов на сегодня исчерпан')
            db.execute('UPDATE limits SET count=count+1 WHERE owner=? AND day=?', (owner, day))
    def preview(self, owner, update_id, entries):
        if not isinstance(entries, list) or not 1 <= len(entries) <= 20:
            raise ValueError('На скрине не найдены ссылки или их больше 20')
        unique = {}
        for entry in entries:
            item = record(entry)
            unique[item['url']] = item
        with self.connect() as db:
            old = db.execute('SELECT token FROM imports WHERE update_id=? AND owner=?', (update_id, owner)).fetchone()
            if old:
                return old[0]
            token = secrets.token_hex(12)
            db.execute('INSERT INTO imports(token,owner,update_id,payload,created) VALUES(?,?,?,?,?)',
                       (token, owner, update_id, json.dumps(list(unique.values()), ensure_ascii=False), time.time()))
        return token
    def draft(self, token, owner):
        with self.connect() as db:
            row = db.execute('SELECT payload,state,created FROM imports WHERE token=? AND owner=?', (token, owner)).fetchone()
        if not row or row[1] != 'pending' or time.time()-row[2] > 86400:
            raise ValueError('Этот импорт уже обработан или устарел')
        return json.loads(row[0])
    def confirm(self, token, owner, save):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT payload,state,created FROM imports WHERE token=? AND owner=?', (token, owner)).fetchone()
            if not row or row[1] != 'pending' or time.time()-row[2] > 86400:
                return 0
            entries = json.loads(row[0])
            if save:
                for item in entries:
                    db.execute('INSERT OR IGNORE INTO saved VALUES(?,?)', (item['url'], json.dumps(item, ensure_ascii=False)))
            db.execute('UPDATE imports SET state=? WHERE token=?', ('saved' if save else 'cancelled', token))
        return len(entries) if save else 0
    def items(self):
        with self.connect() as db:
            return [json.loads(row[0]) for row in db.execute('SELECT payload FROM saved ORDER BY url')]

def search(query, catalog, additions, limit=6):
    def norm(value):
        return re.sub(r'[^\w]+', ' ', value.lower().replace('ё', 'е')).strip()
    aliases = {
        'платеж': ['оплат', 'paywall', 'pricing', 'checkout', 'тариф'],
        'оплат': ['платеж', 'paywall', 'pricing', 'checkout', 'тариф'],
        'типограф': ['шрифт', 'font', 'typeface', 'typograph'],
        'шрифт': ['font', 'typeface', 'типограф'],
        'анимац': ['animation', 'motion', 'микроанимац'],
        'animation': ['анимац', 'motion'], 'font': ['шрифт', 'типограф'],
    }
    words = norm(query).split()[:20]
    if not words:
        return []
    groups = []
    for word in words:
        related = [word]
        for stem, variants in aliases.items():
            if word.startswith(stem):
                related += variants
        groups.append(related)
    unique = {}
    for item in [*catalog, *additions]:
        try:
            key = canonical_url(item['url'])
        except (ValueError, TypeError):
            continue
        unique.setdefault(key, item)
    scored = []
    for item in unique.values():
        primary = norm(' '.join(str(item.get(k, '')) for k in ('title', 'domain', 'ownerNote', 'noteEN')))
        text = primary + ' ' + norm(' '.join(item.get('tags', [])))
        hits = sum(any(term in text for term in group) for group in groups)
        # Ignore generic qualifiers if the specific subject has evidence.
        if hits:
            scored.append((hits * 10 + sum(word in primary for word in words), item))
    return [item for _, item in sorted(scored, key=lambda pair: -pair[0])[:limit]]
